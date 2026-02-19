import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
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

      // Overlay title text on the image
      const rawBuffer = Buffer.from(imageData.base64, 'base64');
      const finalBuffer = await this.overlayTitle(rawBuffer, blog.title);

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

  private async overlayTitle(imageBuffer: Buffer, title: string): Promise<Buffer> {
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 1280;
    const height = metadata.height || 720;

    // Calculate font size based on image width and title length
    const maxCharsPerLine = 35;
    const fontSize = Math.round(width / 22);
    const lineHeight = Math.round(fontSize * 1.3);
    const padding = Math.round(width * 0.06);

    // Word-wrap the title
    const lines = this.wrapText(title, maxCharsPerLine);
    const textBlockHeight = lines.length * lineHeight + padding * 2;

    // Position: bottom of image with gradient overlay
    const gradientTop = height - textBlockHeight - Math.round(padding * 0.5);
    const textY = height - textBlockHeight + padding * 0.5;

    // Build SVG overlay with gradient background + white text
    const textLines = lines
      .map(
        (line, i) =>
          `<text x="${padding}" y="${Math.round(textY + i * lineHeight + fontSize)}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700" fill="white" filter="url(#shadow)">${this.escapeXml(line)}</text>`,
      )
      .join('\n');

    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0)" />
      <stop offset="100%" stop-color="rgba(0,0,0,0.75)" />
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="1" dy="1" stdDeviation="3" flood-color="rgba(0,0,0,0.6)" />
    </filter>
  </defs>
  <rect x="0" y="${gradientTop}" width="${width}" height="${height - gradientTop}" fill="url(#grad)" />
  ${textLines}
</svg>`;

    return sharp(imageBuffer)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .png()
      .toBuffer();
  }

  private wrapText(text: string, maxChars: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= maxChars) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
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
      throw new Error(`OpenRouter image API error ${response.status}: ${errorBody.substring(0, 300)}`);
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

  private buildImagePrompt(title: string, tags: string[], industry: string): string {
    return `Create a high-quality, photorealistic blog cover image for: "${title}"

SCENE REQUIREMENTS:
- Show a realistic scene directly related to the topic. For education/finance: students in a university campus, a student studying with laptop and documents, a family discussing finances at a table, a graduation ceremony, a bank consultation scene, etc.
- The scene must clearly relate to "${title}" — a viewer should understand the topic from the image alone.
- Include realistic Indian people (students aged 18-25, parents aged 40-55) in natural poses.
- Setting: modern Indian context — university campus, library, home living room, bank office, or study desk.

STYLE:
- Professional editorial photography style, like a top business magazine cover.
- Warm, inviting lighting. Natural colors.
- Shallow depth of field with the main subject in sharp focus.
- Keep the BOTTOM THIRD of the image slightly darker or less busy — text will be placed there.
- 16:9 landscape aspect ratio, suitable as a website blog header.

STRICT RULES:
- Absolutely NO text, words, letters, numbers, watermarks, or logos anywhere in the image.
- No cartoons, illustrations, or clip art. Photorealistic only.
- No generic stock photo feel — make it look candid and authentic.

Industry: ${industry}. Related themes: ${tags.join(', ')}.`;
  }
}
