import { ContentRepository } from './content.repository';
import { orchestrator } from '../../agent/orchestrator';
import { NotFoundError, AppError } from '../../common/errors';
import { ContentTaskStatus } from '@prisma/client';
import { logger } from '../../config/logger';

export class ContentService {
  constructor(private repo: ContentRepository) {}

  async generateContent(tenantId: string, topic: string, keywords: string[] = []) {
    const task = await this.repo.createTask({ tenantId, topic, keywords });

    logger.info('Content task created', { taskId: task.id, tenantId, topic });

    // Execute asynchronously - don't await
    orchestrator.executeTask(task.id).catch((err) => {
      logger.error('Orchestrator execution failed', { taskId: task.id, error: err.message });
    });

    return task;
  }

  async getTask(taskId: string) {
    const task = await this.repo.findTaskById(taskId);
    if (!task) throw new NotFoundError('Content task');
    return task;
  }

  async listTasks(tenantId: string, page = 1, limit = 20, status?: ContentTaskStatus) {
    return this.repo.findTasksByTenant(tenantId, { page, limit, status });
  }

  async retryTask(taskId: string) {
    const task = await this.repo.findTaskById(taskId);
    if (!task) throw new NotFoundError('Content task');

    if (task.status !== ContentTaskStatus.FAILED) {
      throw new AppError('Only failed tasks can be retried', 400);
    }

    if (task.retryCount >= task.maxRetries) {
      throw new AppError('Maximum retry count exceeded', 400);
    }

    const updated = await this.repo.updateTaskForRetry(taskId);

    orchestrator.executeTask(taskId).catch((err) => {
      logger.error('Retry orchestrator execution failed', { taskId, error: err.message });
    });

    return updated;
  }
}
