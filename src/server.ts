import express from 'express';
import path from 'path';
import cors from 'cors';
import { errorHandler, requestLogger } from './common/middleware';
import { tenantRoutes } from './modules/tenant';
import { contentRoutes } from './modules/content';
import { webhookRoutes } from './modules/webhook';
import { registerSkills } from './agent/register-skills';

export function createApp() {
  const app = express();

  registerSkills();

  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);

  // Serve generated images
  app.use('/images', express.static(path.resolve(process.cwd(), 'public', 'images')));

  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/v1/tenants', tenantRoutes);
  app.use('/api/v1/content', contentRoutes);
  app.use('/api/v1/webhooks', webhookRoutes);

  app.use(errorHandler);

  // In production, serve the React dashboard from web/dist
  const webDist = path.resolve(process.cwd(), 'web', 'dist');
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(webDist));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(webDist, 'index.html'));
    });
  }

  return app;
}
