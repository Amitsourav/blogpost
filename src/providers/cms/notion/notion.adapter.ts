import { Client } from '@notionhq/client';
import { ICMSAdapter, CMSTrigger, CMSPublishResult } from '../cms-adapter.interface';
import { BlogOutput, SEOMetadata } from '../../../common/types';
import { CMSPublishError } from '../../../common/errors';
import { mapBlogToNotionProperties, markdownToNotionBlocks } from './notion.mapper';
import { logger } from '../../../config/logger';

export class NotionAdapter implements ICMSAdapter {
  private client: Client;
  private contentDatabaseId: string;
  private triggerDatabaseId: string;

  constructor(accessToken: string, contentDatabaseId: string, triggerDatabaseId = '') {
    this.client = new Client({ auth: accessToken });
    this.contentDatabaseId = contentDatabaseId;
    this.triggerDatabaseId = triggerDatabaseId;
  }

  async fetchPendingTriggers(): Promise<CMSTrigger[]> {
    if (!this.triggerDatabaseId) return [];

    try {
      const response = await this.client.databases.query({
        database_id: this.triggerDatabaseId,
        filter: {
          property: 'Status',
          select: { equals: 'Ready' },
        },
      });

      return response.results.map((page: any) => {
        const props = page.properties;
        return {
          id: page.id,
          topic: props.Topic?.title?.[0]?.plain_text || '',
          keywords: (props.Keywords?.rich_text?.[0]?.plain_text || '')
            .split(',')
            .map((k: string) => k.trim())
            .filter(Boolean),
        };
      });
    } catch (error: any) {
      logger.error('Failed to fetch Notion triggers', { error: error.message });
      return [];
    }
  }

  async publishContent(blog: BlogOutput, seo: SEOMetadata, coverImageUrl?: string): Promise<CMSPublishResult> {
    try {
      const properties = mapBlogToNotionProperties(blog, seo, coverImageUrl);
      const allBlocks = markdownToNotionBlocks(blog.content);

      // Notion limits page creation to 100 children blocks
      const firstBatch = allBlocks.slice(0, 100);
      const remainingBatches = allBlocks.slice(100);

      const page = await this.client.pages.create({
        parent: { database_id: this.contentDatabaseId },
        properties: properties as any,
        children: firstBatch as any,
      });

      // Append remaining blocks in batches of 100
      for (let i = 0; i < remainingBatches.length; i += 100) {
        const batch = remainingBatches.slice(i, i + 100);
        await this.client.blocks.children.append({
          block_id: page.id,
          children: batch as any,
        });
      }

      const url = (page as any).url || undefined;

      logger.info('Content published to Notion', { pageId: page.id, url });

      return { cmsId: page.id, url };
    } catch (error: any) {
      throw new CMSPublishError(error.message, 'notion');
    }
  }

  async markTriggerAsProcessing(triggerId: string): Promise<void> {
    await this.updateTriggerStatus(triggerId, 'Processing');
  }

  async markTriggerAsComplete(triggerId: string, pageId: string): Promise<void> {
    await this.client.pages.update({
      page_id: triggerId,
      properties: {
        Status: { select: { name: 'Published' } },
        'Published Page': {
          rich_text: [{ text: { content: pageId } }],
        },
      } as any,
    });
  }

  async markTriggerAsFailed(triggerId: string, error: string): Promise<void> {
    await this.client.pages.update({
      page_id: triggerId,
      properties: {
        Status: { select: { name: 'Failed' } },
        Error: {
          rich_text: [{ text: { content: error.substring(0, 200) } }],
        },
      } as any,
    });
  }

  private async updateTriggerStatus(triggerId: string, status: string): Promise<void> {
    try {
      await this.client.pages.update({
        page_id: triggerId,
        properties: {
          Status: { select: { name: status } },
        } as any,
      });
    } catch (error: any) {
      logger.error(`Failed to update trigger status to ${status}`, {
        triggerId,
        error: error.message,
      });
    }
  }
}
