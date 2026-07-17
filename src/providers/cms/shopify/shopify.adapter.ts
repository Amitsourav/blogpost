import { ICMSAdapter, CMSTrigger, CMSPublishResult } from '../cms-adapter.interface';
import { BlogOutput, SEOMetadata } from '../../../common/types';
import { CMSPublishError } from '../../../common/errors';
import { mapBlogToShopifyArticle } from './shopify.mapper';
import { logger } from '../../../config/logger';

const API_VERSION = '2026-07';

const ARTICLE_CREATE_MUTATION = `
  mutation CreateArticle($article: ArticleCreateInput!) {
    articleCreate(article: $article) {
      article {
        id
        handle
        title
        isPublished
        blog { id handle }
      }
      userErrors { field message code }
    }
  }
`;

const BLOGS_QUERY = `
  query ListBlogs {
    blogs(first: 50) {
      nodes { id handle title }
    }
  }
`;

export class ShopifyAdapter implements ICMSAdapter {
  private accessToken: string;
  private storeDomain: string;
  private blogRef: string;
  private resolvedBlogId?: string;

  /**
   * @param blogRef Either a blog GID (gid://shopify/Blog/123) or a blog handle
   *                such as "news". Empty means "use the store's first blog".
   */
  constructor(accessToken: string, storeDomain: string, blogRef = '') {
    this.accessToken = accessToken;
    this.storeDomain = normalizeDomain(storeDomain);
    this.blogRef = blogRef.trim();
  }

  /** Shopify has no trigger database — this tenant is driven by the scheduling queue. */
  async fetchPendingTriggers(): Promise<CMSTrigger[]> {
    return [];
  }

  async markTriggerAsProcessing(): Promise<void> {
    // No-op: no trigger database to update.
  }

  async markTriggerAsComplete(): Promise<void> {
    // No-op: no trigger database to update.
  }

  async markTriggerAsFailed(): Promise<void> {
    // No-op: no trigger database to update.
  }

  async publishContent(
    blog: BlogOutput,
    seo: SEOMetadata,
    coverImageUrl?: string
  ): Promise<CMSPublishResult> {
    try {
      const blogId = await this.resolveBlogId();
      const article = mapBlogToShopifyArticle(blog, seo, blogId, coverImageUrl);

      const data = await this.graphql(ARTICLE_CREATE_MUTATION, { article });
      const payload = data.articleCreate;

      // A 200 response can still carry userErrors with a null article — this is
      // Shopify's main silent-failure mode, so it has to be checked explicitly.
      if (payload.userErrors?.length) {
        const message = payload.userErrors
          .map((e: any) => `${e.code || 'ERROR'}: ${e.message}`)
          .join('; ');
        throw new Error(message);
      }

      if (!payload.article) {
        throw new Error('Shopify returned no article and no userErrors');
      }

      const created = payload.article;
      const url = `https://${this.storeDomain}/blogs/${created.blog.handle}/${created.handle}`;

      logger.info('Content published to Shopify', { articleId: created.id, url });

      return { cmsId: created.id, url };
    } catch (error: any) {
      throw new CMSPublishError(error.message, 'shopify');
    }
  }

  private async resolveBlogId(): Promise<string> {
    if (this.blogRef.startsWith('gid://shopify/Blog/')) return this.blogRef;
    if (this.resolvedBlogId) return this.resolvedBlogId;

    const data = await this.graphql(BLOGS_QUERY);
    const blogs = data.blogs?.nodes ?? [];

    if (blogs.length === 0) {
      throw new Error(
        `Store ${this.storeDomain} has no blogs. Create one under Online Store > Blog posts.`
      );
    }

    const match = this.blogRef
      ? blogs.find((b: any) => b.handle === this.blogRef)
      : blogs[0];

    if (!match) {
      const available = blogs.map((b: any) => b.handle).join(', ');
      throw new Error(`No blog with handle "${this.blogRef}". Available: ${available}`);
    }

    this.resolvedBlogId = match.id;
    return match.id;
  }

  private async graphql(query: string, variables?: Record<string, any>): Promise<any> {
    const response = await fetch(
      `https://${this.storeDomain}/admin/api/${API_VERSION}/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.accessToken,
        },
        body: JSON.stringify({ query, variables }),
      }
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Shopify API ${response.status}: ${body.slice(0, 300)}`);
    }

    const json: any = await response.json();

    if (json.errors?.length) {
      throw new Error(json.errors.map((e: any) => e.message).join('; '));
    }

    return json.data;
  }
}

function normalizeDomain(domain: string): string {
  return domain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
}
