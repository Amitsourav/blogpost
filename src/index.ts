import { config } from './config';
import { logger } from './config/logger';
import { createApp } from './server';
import { prisma } from './config/database';
import { notionPoller } from './providers/cms/notion/notion.poller';

async function bootstrap() {
  const app = createApp();

  await prisma.$connect();
  logger.info('Database connected');

  if (config.notion.pollingEnabled) {
    notionPoller.start();
  }

  const server = app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port} [${config.nodeEnv}]`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);
    notionPoller.stop();
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Server shut down');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  logger.error('Failed to start server', { error: err });
  process.exit(1);
});
