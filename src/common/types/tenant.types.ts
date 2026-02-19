import { Tenant, BrandProfile, CMSConnection, Prisma } from '@prisma/client';

export type TenantWithRelations = Tenant & {
  brandProfile: BrandProfile | null;
  cmsConnections: CMSConnection[];
};

export interface CreateTenantInput {
  name: string;
  slug: string;
}

export interface UpdateTenantInput {
  name?: string;
  isActive?: boolean;
}

export interface UpsertBrandProfileInput {
  companyName: string;
  industry: string;
  brandTone: string;
  targetAudience: string;
  writingGuidelines?: string;
  seoPreferences?: Prisma.InputJsonValue;
  defaultAuthor?: string;
  contentRules?: Prisma.InputJsonValue;
  customPrompt?: string;
}

export interface CreateCMSConnectionInput {
  provider?: string;
  accessToken: string;
  triggerDatabaseId?: string;
  contentDatabaseId: string;
  config?: Prisma.InputJsonValue;
}
