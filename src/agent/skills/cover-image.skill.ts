import fs from 'fs';
import path from 'path';
import { ISkill } from '../skill.interface';
import { AgentContext, PipelineArtifacts, SkillResult } from '../../common/types';
import { config } from '../../config';
import { logger } from '../../config/logger';

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
        logger.warn('No image data returned, continuing without cover image', {
          taskId: context.taskId,
        });
        return { success: true };
      }

      const rawBuffer = Buffer.from(imageData.base64, 'base64');
      const finalBuffer = rawBuffer;

      // Save image to disk locally
      fs.mkdirSync(IMAGES_DIR, { recursive: true });
      const filename = `cover-${context.taskId}.png`;
      const filepath = path.join(IMAGES_DIR, filename);
      fs.writeFileSync(filepath, finalBuffer);

      // Upload to tmpfiles.org for a public URL (Notion needs a publicly accessible URL)
      const publicUrl = await this.uploadToPublicHost(finalBuffer, filename);

      if (publicUrl) {
        artifacts.coverImageUrl = publicUrl;
        logger.info('Cover image uploaded to public host', {
          taskId: context.taskId,
          url: publicUrl,
        });
      } else {
        const localUrl = `http://localhost:${config.port}/images/${filename}`;
        artifacts.coverImageUrl = localUrl;
        logger.warn('Public upload failed, using local URL (Notion cover will not work)', {
          taskId: context.taskId,
          url: localUrl,
        });
      }

      return { success: true };
    } catch (error: any) {
      // Image generation failure should not block the pipeline
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
    const url = `${config.openai.baseUrl}/images/generations`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.imageGeneration.apiKey}`,
      },
      body: JSON.stringify({
        model: config.imageGeneration.model,
        prompt,
        n: 1,
        size: '1024x1024',
        response_format: 'b64_json',
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenRouter image API error ${response.status}: ${errorBody.substring(0, 300)}`);
    }

    const data: any = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'Unknown OpenRouter API error');
    }

    const b64 = data.data?.[0]?.b64_json;
    if (b64) {
      return { mimeType: 'image/png', base64: b64 };
    }

    return null;
  }

  private async uploadToPublicHost(imageBuffer: Buffer, filename: string): Promise<string | null> {
    try {
      // Use tmpfiles.org - free, no API key needed
      const formData = new FormData();
      const blob = new Blob([imageBuffer], { type: 'image/png' });
      formData.append('file', blob, filename);

      const response = await fetch('https://tmpfiles.org/api/v1/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) return null;

      const data: any = await response.json();
      const pageUrl = data?.data?.url;
      if (!pageUrl) return null;

      // Convert page URL to direct download URL with HTTPS
      // "http://tmpfiles.org/12345/file.png" -> "https://tmpfiles.org/dl/12345/file.png"
      const directUrl = pageUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
      return directUrl.replace('http://', 'https://');
    } catch {
      return null;
    }
  }

  private buildImagePrompt(title: string, tags: string[], _industry: string): string {
    const tagList = tags.slice(0, 3).join(', ');

    return `Flat vector blog cover illustration for an education-finance website. Topic: "${title}". Themes: ${tagList}. Style: modern minimal flat vector, soft blue-teal gradient background, abstract geometric shapes, relevant icons (banks=buildings, eligibility=checklists, abroad=globe, rates=graphs). No text, no humans, no faces. Colors: blue, teal, white, yellow accent. Clean edges, web-optimized.`;
  }
}
