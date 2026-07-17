import { marked } from 'marked';
import { BlogOutput, SEOMetadata } from '../../../common/types';

// Shopify truncates these silently, so we trim to the documented limits instead.
const SEO_TITLE_LIMIT = 70;
const SEO_DESCRIPTION_LIMIT = 320;
const HANDLE_LIMIT = 255;
const ALT_TEXT_LIMIT = 255;

export type ShopifyArticleInput = {
  blogId: string;
  title: string;
  author: { name: string };
  body: string;
  summary?: string;
  handle?: string;
  tags?: string[];
  isPublished: boolean;
  image?: { url: string; altText: string };
  metafields?: Array<{ namespace: string; key: string; type: string; value: string }>;
};

/**
 * Converts our post-processed markdown to the HTML Shopify's article `body` expects.
 * Tables already arrive as raw HTML from the post-processor and pass through untouched.
 */
export function markdownToHtml(markdown: string): string {
  return marked.parse(markdown, { async: false }) as string;
}

export function mapBlogToShopifyArticle(
  blog: BlogOutput,
  seo: SEOMetadata,
  blogId: string,
  coverImageUrl?: string
): ShopifyArticleInput {
  const article: ShopifyArticleInput = {
    blogId,
    title: blog.title,
    // Free-text name only. Supplying a user ID alongside it fails with AMBIGUOUS_AUTHOR,
    // and omitting both fails with AUTHOR_FIELD_REQUIRED.
    author: { name: blog.author },
    body: markdownToHtml(blog.content),
    summary: blog.excerpt,
    handle: truncate(blog.slug, HANDLE_LIMIT),
    tags: blog.tags,
    isPublished: true,
    metafields: [
      {
        namespace: 'global',
        key: 'title_tag',
        type: 'single_line_text_field',
        value: truncate(seo.metaTitle, SEO_TITLE_LIMIT),
      },
      {
        namespace: 'global',
        key: 'description_tag',
        type: 'single_line_text_field',
        value: truncate(seo.metaDescription, SEO_DESCRIPTION_LIMIT),
      },
    ],
  };

  if (coverImageUrl) {
    // Shopify fetches this URL server-side and re-hosts the asset, so the article
    // survives even if the origin later disappears. The URL must be public at create time.
    article.image = {
      url: coverImageUrl,
      altText: truncate(blog.title, ALT_TEXT_LIMIT),
    };
  }

  return article;
}

function truncate(text: string, limit: number): string {
  return text.length > limit ? text.slice(0, limit) : text;
}
