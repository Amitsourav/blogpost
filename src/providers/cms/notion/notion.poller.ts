import { prisma } from '../../../config/database';
import { logger } from '../../../config/logger';
import { config } from '../../../config';
import { getCMSAdapter } from '../cms-adapter.factory';
import { ContentRepository } from '../../../modules/content/content.repository';
import { orchestrator } from '../../../agent/orchestrator';

export class NotionPoller {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private contentRepo = new ContentRepository();

  start(): void {
    if (!config.notion.pollingEnabled) {
      logger.info('Notion polling is disabled');
      return;
    }

    logger.info(`Notion polling started (interval: ${config.notion.pollingIntervalMs}ms)`);

    // Run immediately, then on interval
    this.poll();
    this.intervalId = setInterval(() => this.poll(), config.notion.pollingIntervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Notion polling stopped');
    }
  }

  private async poll(): Promise<void> {
    try {
      const tenants = await prisma.tenant.findMany({
        where: { isActive: true },
        include: { brandProfile: true, cmsConnections: { where: { isActive: true } } },
      });

      for (const tenant of tenants) {
        for (const connection of tenant.cmsConnections) {
          if (connection.provider !== 'notion' || !connection.triggerDatabaseId) continue;

          try {
            await this.pollConnection(tenant.id, connection.id);
          } catch (error: any) {
            logger.error('Polling failed for connection', {
              tenantId: tenant.id,
              connectionId: connection.id,
              error: error.message,
            });
          }
        }
      }
    } catch (error: any) {
      logger.error('Polling cycle failed', { error: error.message });
    }
  }

  private async pollConnection(tenantId: string, connectionId: string): Promise<void> {
    const connection = await prisma.cMSConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) return;

    const adapter = getCMSAdapter(connection);
    const triggers = await adapter.fetchPendingTriggers();

    if (triggers.length === 0) return;

    logger.info(`Found ${triggers.length} pending triggers`, { tenantId, connectionId });

    for (const trigger of triggers) {
      try {
        await adapter.markTriggerAsProcessing(trigger.id);

        const task = await this.contentRepo.createTask({
          tenantId,
          topic: trigger.topic,
          keywords: trigger.keywords,
          triggerSource: 'notion',
        });

        logger.info('Task created from Notion trigger', {
          taskId: task.id,
          triggerId: trigger.id,
          topic: trigger.topic,
        });

        // Execute and update trigger status
        orchestrator
          .executeTask(task.id)
          .then(async () => {
            const updatedTask = await prisma.contentTask.findUnique({
              where: { id: task.id },
            });
            if (updatedTask?.publishedCmsId) {
              await adapter.markTriggerAsComplete(trigger.id, updatedTask.publishedCmsId);
            } else if (updatedTask?.status === 'FAILED') {
              await adapter.markTriggerAsFailed(trigger.id, updatedTask.errorMessage || 'Unknown error');
            }
          })
          .catch(async (err) => {
            await adapter.markTriggerAsFailed(trigger.id, err.message);
          });
      } catch (error: any) {
        logger.error('Failed to process trigger', {
          triggerId: trigger.id,
          error: error.message,
        });
        await adapter.markTriggerAsFailed(trigger.id, error.message).catch(() => {});
      }
    }
  }
}

export const notionPoller = new NotionPoller();
