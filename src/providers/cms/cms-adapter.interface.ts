import { BlogOutput, SEOMetadata } from '../../common/types';

export interface CMSTrigger {
  id: string;
  topic: string;
  keywords: string[];
}

export interface CMSPublishResult {
  cmsId: string;
  url?: string;
}

export interface ICMSAdapter {
  fetchPendingTriggers(): Promise<CMSTrigger[]>;
  publishContent(blog: BlogOutput, seo: SEOMetadata, coverImageUrl?: string): Promise<CMSPublishResult>;
  markTriggerAsProcessing(triggerId: string): Promise<void>;
  markTriggerAsComplete(triggerId: string, pageId: string): Promise<void>;
  markTriggerAsFailed(triggerId: string, error: string): Promise<void>;
}
