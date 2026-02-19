export interface BlogOutput {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  readTimeMinutes: number;
  tags: string[];
}

export interface SEOMetadata {
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  secondaryKeywords: string[];
  ogTitle: string;
  ogDescription: string;
}

export interface ContentOutput {
  blog: BlogOutput;
  seo: SEOMetadata;
  coverImageUrl?: string;
  publishedUrl?: string;
  publishedCmsId?: string;
}

export interface GenerateContentInput {
  topic: string;
  keywords?: string[];
  contentType?: string;
}
