import { z } from 'zod';

export const upsertScheduleConfigSchema = z.object({
  postsPerDay: z.number().int().min(1).max(10),
  timeOfDay: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm format'),
  timezone: z.string().min(1).max(100),
  isActive: z.boolean(),
});

export const addScheduledPostsSchema = z.object({
  posts: z
    .array(
      z.object({
        topic: z.string().min(3).max(500),
        keywords: z.array(z.string()).max(10).optional(),
      }),
    )
    .min(1)
    .max(150),
});

export const reorderPostSchema = z.object({
  newPosition: z.number().int().min(0),
});
