export type ContentTaskStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'GENERATING'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'FAILED'
  | 'CANCELLED';

export interface BrandProfile {
  id: string;
  tenantId: string;
  companyName: string;
  industry: string;
  brandTone: string;
  targetAudience: string;
  writingGuidelines: string;
  seoPreferences: Record<string, unknown>;
  defaultAuthor: string;
  contentRules: unknown[];
  customPrompt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CMSConnection {
  id: string;
  tenantId: string;
  provider: string;
  accessToken: string;
  triggerDatabaseId: string;
  contentDatabaseId: string;
  config: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  apiKey: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  brandProfile: BrandProfile | null;
  cmsConnections: CMSConnection[];
}

export interface TaskLog {
  id: string;
  taskId: string;
  level: string;
  stage: string;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

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

export interface ContentTask {
  id: string;
  tenantId: string;
  contentType: string;
  status: ContentTaskStatus;
  triggerSource: string;
  inputTopic: string;
  inputKeywords: string[];
  output: { blog?: BlogOutput; seo?: SEOMetadata } | null;
  publishedCmsId: string | null;
  retryCount: number;
  maxRetries: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  logs: TaskLog[];
}

export interface TaskListResponse {
  tasks: ContentTask[];
  total: number;
  page: number;
  limit: number;
}

export interface GenerateResponse {
  message: string;
  taskId: string;
  status: ContentTaskStatus;
}

export interface TenantConfig {
  apiKey: string;
  tenantId: string;
}
