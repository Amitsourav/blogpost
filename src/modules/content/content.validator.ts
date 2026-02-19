import { z } from 'zod';

export const generateContentSchema = z.object({
  topic: z.string().min(3).max(500),
  keywords: z.array(z.string()).max(10).optional(),
  contentType: z.string().optional().default('blog'),
});
