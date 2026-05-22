import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ISkill } from '../skill.interface';
import { AgentContext, PipelineArtifacts, SkillResult } from '../../common/types';
import { config } from '../../config';
import { logger } from '../../config/logger';
import { prisma } from '../../config/database';

async function dbLog(taskId: string, level: string, message: string, metadata: Record<string, unknown> = {}) {
  try {
    await prisma.taskLog.create({
      data: { taskId, level, stage: 'cover-image', message, metadata: metadata as any },
    });
  } catch {
    // ignore — logging must never break the pipeline
  }
}

const IMAGES_DIR = path.resolve(process.cwd(), 'public', 'images');

export class CoverImageSkill implements ISkill {
  name = 'cover-image';
  description = 'Generates a cover image for the blog post via OpenRouter';

  canExecute(_context: AgentContext, artifacts: PipelineArtifacts): boolean {
    return (
      !!artifacts.blogDraft &&
      config.imageGeneration.enabled &&
      !!config.imageGeneration.apiKey
    );
  }

  async execute(context: AgentContext, artifacts: PipelineArtifacts): Promise<SkillResult> {
    await dbLog(context.taskId, 'INFO', 'starting', {
      model: config.imageGeneration.model,
      enabled: config.imageGeneration.enabled,
      hasApiKey: !!config.imageGeneration.apiKey,
      hasCloudinary: !!config.cloudinary.cloudName && !!config.cloudinary.apiKey && !!config.cloudinary.apiSecret,
    });
    try {
      const blog = artifacts.blogDraft!;
      const prompt = this.buildImagePrompt(
        blog.title,
        blog.tags,
        context.brandProfile.industry,
      );

      logger.info('Generating cover image via OpenRouter', {
        taskId: context.taskId,
        model: config.imageGeneration.model,
      });

      const imageData = await this.generateImage(prompt);
      if (!imageData) {
        await dbLog(context.taskId, 'WARN', 'no image data returned from OpenRouter');
        logger.warn('No image data returned, continuing without cover image', {
          taskId: context.taskId,
        });
        return { success: true };
      }

      await dbLog(context.taskId, 'INFO', 'image generated', { mimeType: imageData.mimeType, base64Len: imageData.base64.length });

      const rawBuffer = Buffer.from(imageData.base64, 'base64');
      const finalBuffer = rawBuffer;

      // Save image to disk locally
      try {
        fs.mkdirSync(IMAGES_DIR, { recursive: true });
        const filename = `cover-${context.taskId}.png`;
        const filepath = path.join(IMAGES_DIR, filename);
        fs.writeFileSync(filepath, finalBuffer);
      } catch (fsErr: any) {
        await dbLog(context.taskId, 'WARN', 'local file save failed (non-fatal)', { error: fsErr.message });
      }

      const filename = `cover-${context.taskId}.png`;

      // Upload to Cloudinary for a public URL (Notion needs a publicly accessible URL)
      const uploadResult = await this.uploadToPublicHost(finalBuffer, filename, context.taskId);

      if (uploadResult) {
        artifacts.coverImageUrl = uploadResult;
        await dbLog(context.taskId, 'INFO', 'cloudinary upload ok', { url: uploadResult });
        logger.info('Cover image uploaded to public host', {
          taskId: context.taskId,
          url: uploadResult,
        });
      } else {
        await dbLog(context.taskId, 'WARN', 'cloudinary upload returned null (see prior log)');
        logger.warn('Public upload failed, skipping cover image', { taskId: context.taskId });
      }

      return { success: true };
    } catch (error: any) {
      await dbLog(context.taskId, 'ERROR', 'cover skill threw', { error: error.message, stack: error.stack?.split('\n').slice(0, 5).join(' | ') });
      logger.warn('Cover image generation failed, continuing without image', {
        taskId: context.taskId,
        error: error.message,
      });
      return { success: true };
    }
  }

  private async generateImage(
    prompt: string,
  ): Promise<{ base64: string; mimeType: string } | null> {
    const url = `${config.openai.baseUrl}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.imageGeneration.apiKey}`,
      },
      body: JSON.stringify({
        model: config.imageGeneration.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        modalities: ['image', 'text'],
        image_config: {
          aspect_ratio: '16:9',
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenRouter image API error ${response.status} ${response.statusText}: ${errorBody.substring(0, 400)}`);
    }

    const data: any = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'Unknown OpenRouter API error');
    }

    // OpenRouter returns images as base64 data URLs in choices[0].message.images
    const images = data.choices?.[0]?.message?.images;
    if (images && images.length > 0) {
      const dataUrl: string = images[0].image_url?.url || images[0].url || '';
      if (dataUrl.startsWith('data:')) {
        const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          return { mimeType: match[1], base64: match[2] };
        }
      }
    }

    return null;
  }

  private async uploadToPublicHost(imageBuffer: Buffer, filename: string, taskId?: string): Promise<string | null> {
    try {
      const { cloudName, apiKey, apiSecret } = config.cloudinary;
      if (!cloudName || !apiKey || !apiSecret) {
        if (taskId) await dbLog(taskId, 'WARN', 'cloudinary creds missing', { hasCloudName: !!cloudName, hasApiKey: !!apiKey, hasApiSecret: !!apiSecret });
        logger.warn('Cloudinary credentials not configured');
        return null;
      }

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const folder = 'blog-covers';
      const publicId = filename.replace(/\.[^.]+$/, '');

      // Generate signature for Cloudinary upload
      const signatureStr = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
      const signature = crypto.createHash('sha1').update(signatureStr).digest('hex');

      const formData = new FormData();
      const blob = new Blob([imageBuffer], { type: 'image/png' });
      formData.append('file', blob, filename);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);
      formData.append('folder', folder);
      formData.append('public_id', publicId);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: formData },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        if (taskId) await dbLog(taskId, 'ERROR', 'cloudinary upload HTTP error', { status: response.status, body: errorBody.substring(0, 300) });
        logger.warn('Cloudinary upload failed', { status: response.status, error: errorBody.substring(0, 200) });
        return null;
      }

      const data: any = await response.json();
      return data.secure_url || null;
    } catch (error: any) {
      if (taskId) await dbLog(taskId, 'ERROR', 'cloudinary upload threw', { error: error.message });
      logger.warn('Cloudinary upload error', { error: error.message });
      return null;
    }
  }

  private buildImagePrompt(title: string, tags: string[], _industry: string): string {
    const tagList = tags.slice(0, 3).join(', ');

    return `Create a photorealistic blog cover image for an education loan website. Landscape 16:9 ratio.

Title text at the top in large bold white and yellow font: "${title}"
Subtitle below in smaller white font: "A Complete ${new Date().getFullYear()} Guide"

Scene: wooden desk or table surface with photorealistic 3D objects related to "${title}" and themes: ${tagList}. Include props like graduation cap, books, globe, calculator, coins/currency, airplane (if abroad topic), university building in background.

Background: blurred cityscape or university campus with blue sky.

Style: photorealistic, high quality, professional blog cover. Text must be perfectly spelled and clearly readable. No humans or faces.`;
  }
}
