import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL || '',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: process.env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1',
    model: process.env.OPENAI_MODEL || 'openai/gpt-4o',
  },
  imageGeneration: {
    enabled: process.env.IMAGE_GENERATION_ENABLED !== 'false',
    apiKey: process.env.IMAGE_GENERATION_API_KEY || '',
    model: process.env.IMAGE_GENERATION_MODEL || 'google/gemini-2.5-flash-image',
  },
  notion: {
    apiKey: process.env.NOTION_API_KEY || '',
    contentDatabaseId: process.env.NOTION_CONTENT_DATABASE_ID || '',
    triggerDatabaseId: process.env.NOTION_TRIGGER_DATABASE_ID || '',
    pollingEnabled: process.env.NOTION_POLLING_ENABLED === 'true',
    pollingIntervalMs: parseInt(process.env.NOTION_POLLING_INTERVAL_MS || '60000', 10),
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  log: {
    level: process.env.LOG_LEVEL || 'info',
  },
} as const;
