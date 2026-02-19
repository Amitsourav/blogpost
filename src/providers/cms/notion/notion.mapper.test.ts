import { describe, it, expect } from 'vitest';
import { markdownToNotionBlocks, mapBlogToNotionProperties } from './notion.mapper';
import { BlogOutput, SEOMetadata } from '../../../common/types';

describe('markdownToNotionBlocks', () => {
  it('converts H1 headings', () => {
    const blocks = markdownToNotionBlocks('# Hello World');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('heading_1');
    expect(blocks[0].heading_1.rich_text[0].text.content).toBe('Hello World');
  });

  it('converts H2 headings', () => {
    const blocks = markdownToNotionBlocks('## Section Title');
    expect(blocks[0].type).toBe('heading_2');
  });

  it('converts H3 headings', () => {
    const blocks = markdownToNotionBlocks('### Subsection');
    expect(blocks[0].type).toBe('heading_3');
  });

  it('converts bullet lists', () => {
    const blocks = markdownToNotionBlocks('- Item one\n- Item two');
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe('bulleted_list_item');
    expect(blocks[1].type).toBe('bulleted_list_item');
  });

  it('converts numbered lists', () => {
    const blocks = markdownToNotionBlocks('1. First\n2. Second');
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe('numbered_list_item');
  });

  it('converts blockquotes', () => {
    const blocks = markdownToNotionBlocks('> This is a quote');
    expect(blocks[0].type).toBe('quote');
  });

  it('converts regular paragraphs', () => {
    const blocks = markdownToNotionBlocks('Just a paragraph');
    expect(blocks[0].type).toBe('paragraph');
  });

  it('handles bold text', () => {
    const blocks = markdownToNotionBlocks('This is **bold** text');
    const richText = blocks[0].paragraph.rich_text;
    expect(richText.length).toBeGreaterThan(1);
    const boldSegment = richText.find((s: any) => s.annotations?.bold);
    expect(boldSegment?.text.content).toBe('bold');
  });

  it('skips empty lines', () => {
    const blocks = markdownToNotionBlocks('Line 1\n\nLine 2');
    expect(blocks).toHaveLength(2);
  });
});

describe('mapBlogToNotionProperties', () => {
  const blog: BlogOutput = {
    title: 'Test Blog',
    slug: 'test-blog',
    excerpt: 'A test excerpt',
    content: 'Some content',
    author: 'Test Author',
    readTimeMinutes: 3,
    tags: ['tech', 'ai'],
  };

  const seo: SEOMetadata = {
    metaTitle: 'Test Blog | Site',
    metaDescription: 'A description',
    focusKeyword: 'test',
    secondaryKeywords: ['blog', 'ai'],
    ogTitle: 'OG Title',
    ogDescription: 'OG Description',
  };

  it('maps all properties correctly', () => {
    const props = mapBlogToNotionProperties(blog, seo);

    expect(props.Name.title[0].text.content).toBe('Test Blog');
    expect(props.Slug.rich_text[0].text.content).toBe('test-blog');
    expect(props.Tags.multi_select).toHaveLength(2);
    expect(props['Read Time'].number).toBe(3);
    expect(props['Meta Title'].rich_text[0].text.content).toBe('Test Blog | Site');
    expect(props.Status.select.name).toBe('Published');
  });
});
