import { z } from 'zod';
import { ISkill } from '../skill.interface';
import { AgentContext, PipelineArtifacts, SkillResult } from '../../common/types';
import { getAIProvider } from '../../providers/ai';
import { logger } from '../../config/logger';

const seoSchema = z.object({
  metaTitle: z.string(),
  metaDescription: z.string(),
  focusKeyword: z.string(),
  secondaryKeywords: z.array(z.string()),
  ogTitle: z.string(),
  ogDescription: z.string(),
});

export class SEOMetadataSkill implements ISkill {
  name = 'seo-metadata';
  description = 'Generates SEO metadata for a blog post';

  canExecute(_context: AgentContext, artifacts: PipelineArtifacts): boolean {
    return !!artifacts.blogDraft;
  }

  async execute(context: AgentContext, artifacts: PipelineArtifacts): Promise<SkillResult> {
    // If blog-generation already populated SEO metadata, skip the extra LLM call
    if (artifacts.seoMetadata) {
      logger.info('SEO metadata already populated by blog-generation skill, skipping', {
        taskId: context.taskId,
        focusKeyword: artifacts.seoMetadata.focusKeyword,
      });
      return { success: true };
    }

    try {
      const ai = getAIProvider();
      const blog = artifacts.blogDraft!;

      const systemPrompt = `You are an SEO specialist. Generate optimized metadata for the given blog post. Follow best practices:
- Meta title: 50-60 characters, include primary keyword
- Meta description: 150-160 characters, compelling and keyword-rich
- Focus keyword: The single most important keyword
- Secondary keywords: 3-5 related keywords
- OG title and description optimized for social sharing`;

      const userPrompt = `Generate SEO metadata for this blog post:

Title: ${blog.title}
Excerpt: ${blog.excerpt}
Tags: ${blog.tags.join(', ')}
${context.keywords.length > 0 ? `Target keywords: ${context.keywords.join(', ')}` : ''}

Content preview (first 500 chars):
${blog.content.substring(0, 500)}`;

      const result = await ai.generateStructured(systemPrompt, userPrompt, seoSchema, 'seo_metadata');

      artifacts.seoMetadata = result;

      logger.info('SEO metadata generated', {
        taskId: context.taskId,
        focusKeyword: result.focusKeyword,
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
