import { z } from 'zod';

export const createTenantSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
});

export const updateTenantSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

export const upsertBrandProfileSchema = z.object({
  companyName: z.string().min(1).max(200),
  industry: z.string().min(1).max(100),
  brandTone: z.string().min(1).max(500),
  targetAudience: z.string().min(1).max(500),
  writingGuidelines: z.string().max(2000).optional(),
  seoPreferences: z.record(z.unknown()).optional(),
  defaultAuthor: z.string().max(100).optional(),
  contentRules: z.array(z.unknown()).optional(),
  customPrompt: z.string().max(10000).optional(),
});

export const createCMSConnectionSchema = z.object({
  provider: z.string().optional().default('notion'),
  accessToken: z.string().min(1),
  triggerDatabaseId: z.string().optional(),
  contentDatabaseId: z.string().min(1),
  config: z.record(z.unknown()).optional(),
});
