import { BrandProfile, CMSConnection } from '@prisma/client';
import { BlogOutput, SEOMetadata } from './content.types';
import type { ReviewIssue } from '../../agent/content-review';

export interface AgentContext {
  taskId: string;
  tenantId: string;
  brandProfile: BrandProfile;
  cmsConnection: CMSConnection | null;
  topic: string;
  keywords: string[];
}

export interface PipelineArtifacts {
  blogDraft?: BlogOutput;
  seoMetadata?: SEOMetadata;
  coverImageUrl?: string;
  publishedCmsId?: string;
  publishedUrl?: string;
  reviewIssues?: ReviewIssue[];
}

export interface SkillResult {
  success: boolean;
  error?: string;
}
