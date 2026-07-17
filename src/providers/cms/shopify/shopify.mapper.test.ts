import { describe, it, expect } from 'vitest';
import { markdownToHtml, mapBlogToShopifyArticle } from './shopify.mapper';
import { BlogOutput, SEOMetadata } from '../../../common/types';

const blog: BlogOutput = {
  title: 'How to Fund Your MBA Abroad',
  slug: 'how-to-fund-your-mba-abroad',
  excerpt: 'A practical guide.',
  content: '## Intro\n\n- point one\n- point two\n',
  author: 'FundMyCampus Team',
  readTimeMinutes: 5,
  tags: ['education-loans', 'mba'],
};

const seo: SEOMetadata = {
  metaTitle: 'How to Fund Your MBA Abroad',
  metaDescription: 'A practical guide to education loans.',
  focusKeyword: 'mba education loan',
  secondaryKeywords: ['study abroad'],
  ogTitle: 'How to Fund Your MBA Abroad',
  ogDescription: 'A practical guide.',
};

const BLOG_GID = 'gid://shopify/Blog/123';

describe('markdownToHtml', () => {
  it('converts headings, lists and inline formatting', () => {
    const html = markdownToHtml('## Title\n\n- a\n\n**bold** text');
    expect(html).toContain('<h2>Title</h2>');
    expect(html).toContain('<li>a</li>');
    expect(html).toContain('<strong>bold</strong>');
  });

  it('passes through HTML tables from the post-processor untouched', () => {
    const table = '<table>\n<thead><tr><th>Bank</th></tr></thead>\n<tbody>\n<tr><td>HDFC</td></tr>\n</tbody>\n</table>';
    const html = markdownToHtml(table);
    expect(html).toContain('<th>Bank</th>');
    expect(html).toContain('<td>HDFC</td>');
    expect(html).not.toContain('&lt;table&gt;');
  });

  it('converts markdown links to anchors', () => {
    expect(markdownToHtml('[docs](https://example.com)')).toContain(
      '<a href="https://example.com">docs</a>'
    );
  });
});

describe('mapBlogToShopifyArticle', () => {
  it('sends a free-text author name and never a user ID', () => {
    const article = mapBlogToShopifyArticle(blog, seo, BLOG_GID);
    expect(article.author).toEqual({ name: 'FundMyCampus Team' });
    expect(article).not.toHaveProperty('userId');
    expect(article).not.toHaveProperty('user_id');
  });

  it('maps SEO into global metafields rather than an seo field', () => {
    const article = mapBlogToShopifyArticle(blog, seo, BLOG_GID);
    expect(article).not.toHaveProperty('seo');
    expect(article.metafields).toEqual([
      {
        namespace: 'global',
        key: 'title_tag',
        type: 'single_line_text_field',
        value: seo.metaTitle,
      },
      {
        namespace: 'global',
        key: 'description_tag',
        type: 'single_line_text_field',
        value: seo.metaDescription,
      },
    ]);
  });

  it('passes an external cover image URL straight through with alt text', () => {
    const url = 'https://res.cloudinary.com/deakozhja/image/upload/cover-1.png';
    const article = mapBlogToShopifyArticle(blog, seo, BLOG_GID, url);
    expect(article.image).toEqual({ url, altText: blog.title });
  });

  it('omits the image entirely when no cover URL is given', () => {
    expect(mapBlogToShopifyArticle(blog, seo, BLOG_GID).image).toBeUndefined();
  });

  it('renders body as HTML, not raw markdown', () => {
    const article = mapBlogToShopifyArticle(blog, seo, BLOG_GID);
    expect(article.body).toContain('<h2>Intro</h2>');
    expect(article.body).not.toContain('## Intro');
  });

  it('truncates SEO fields to Shopify limits', () => {
    const longSeo: SEOMetadata = {
      ...seo,
      metaTitle: 'x'.repeat(100),
      metaDescription: 'y'.repeat(400),
    };
    const article = mapBlogToShopifyArticle(blog, longSeo, BLOG_GID);
    expect(article.metafields![0].value).toHaveLength(70);
    expect(article.metafields![1].value).toHaveLength(320);
  });

  it('carries blogId, tags and published state', () => {
    const article = mapBlogToShopifyArticle(blog, seo, BLOG_GID);
    expect(article.blogId).toBe(BLOG_GID);
    expect(article.tags).toEqual(['education-loans', 'mba']);
    expect(article.isPublished).toBe(true);
    expect(article.handle).toBe('how-to-fund-your-mba-abroad');
  });
});
