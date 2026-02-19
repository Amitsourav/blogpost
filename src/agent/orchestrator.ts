import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { buildAgentContext } from './context';
import { Pipeline } from './pipeline';
import { skillRegistry } from './skill-registry';
import { PipelineArtifacts, ContentOutput } from '../common/types';
import { ContentTaskStatus, Prisma } from '@prisma/client';

const DEFAULT_PIPELINE = ['blog-generation', 'seo-metadata', 'cover-image', 'cms-publish'];
const RETRY_BASE_DELAY_MS = 2000;

export class Orchestrator {
  private pipeline: Pipeline;

  constructor() {
    this.pipeline = new Pipeline(skillRegistry);
  }

  async executeTask(taskId: string): Promise<void> {
    const task = await prisma.contentTask.findUnique({
      where: { id: taskId },
      include: {
        tenant: {
          include: { brandProfile: true, cmsConnections: true },
        },
      },
    });

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (!task.tenant.brandProfile) {
      await this.failTask(taskId, 'Tenant has no brand profile configured');
      return;
    }

    const cmsConnection = task.tenant.cmsConnections.find((c) => c.isActive) ?? null;

    await this.updateTaskStatus(taskId, ContentTaskStatus.IN_PROGRESS);
    await this.logTask(taskId, 'INFO', 'orchestrator', 'Task execution started');

    const context = buildAgentContext({
      task,
      brandProfile: task.tenant.brandProfile,
      cmsConnection,
    });

    const artifacts: PipelineArtifacts = {};

    const skillNames = DEFAULT_PIPELINE.filter((name) => {
      if (name === 'cms-publish' && !cmsConnection) return false;
      return skillRegistry.has(name);
    });

    try {
      await this.updateTaskStatus(taskId, ContentTaskStatus.GENERATING);
      await this.pipeline.run(skillNames, context, artifacts);

      const output: ContentOutput = {
        blog: artifacts.blogDraft!,
        seo: artifacts.seoMetadata!,
        coverImageUrl: artifacts.coverImageUrl,
        publishedUrl: artifacts.publishedUrl,
        publishedCmsId: artifacts.publishedCmsId,
      };

      const finalStatus = artifacts.publishedCmsId
        ? ContentTaskStatus.PUBLISHED
        : ContentTaskStatus.GENERATING;

      await prisma.contentTask.update({
        where: { id: taskId },
        data: {
          status: finalStatus,
          output: output as any,
          publishedCmsId: artifacts.publishedCmsId ?? null,
        },
      });

      await this.logTask(taskId, 'INFO', 'orchestrator', `Task completed with status ${finalStatus}`);
      logger.info(`Task ${taskId} completed`, { status: finalStatus });
    } catch (error: any) {
      logger.error(`Task ${taskId} failed`, { error: error.message });
      await this.handleTaskFailure(taskId, error.message);
    }
  }

  private async handleTaskFailure(taskId: string, errorMessage: string): Promise<void> {
    const task = await prisma.contentTask.findUnique({ where: { id: taskId } });
    if (!task) return;

    const newRetryCount = task.retryCount + 1;

    if (newRetryCount < task.maxRetries) {
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, task.retryCount);
      await this.logTask(
        taskId,
        'WARN',
        'orchestrator',
        `Scheduling retry ${newRetryCount}/${task.maxRetries} in ${delay}ms`
      );

      await prisma.contentTask.update({
        where: { id: taskId },
        data: {
          retryCount: newRetryCount,
          status: ContentTaskStatus.PENDING,
          errorMessage,
        },
      });

      setTimeout(() => {
        this.executeTask(taskId).catch((err) => {
          logger.error(`Retry failed for task ${taskId}`, { error: err.message });
        });
      }, delay);
    } else {
      await this.failTask(taskId, errorMessage);
    }
  }

  private async updateTaskStatus(taskId: string, status: ContentTaskStatus): Promise<void> {
    await prisma.contentTask.update({
      where: { id: taskId },
      data: { status },
    });
  }

  private async failTask(taskId: string, errorMessage: string): Promise<void> {
    await prisma.contentTask.update({
      where: { id: taskId },
      data: {
        status: ContentTaskStatus.FAILED,
        errorMessage,
      },
    });
    await this.logTask(taskId, 'ERROR', 'orchestrator', `Task permanently failed: ${errorMessage}`);
  }

  async logTask(
    taskId: string,
    level: string,
    stage: string,
    message: string,
    metadata: Prisma.InputJsonValue = {}
  ): Promise<void> {
    await prisma.taskLog.create({
      data: { taskId, level, stage, message, metadata },
    });
  }
}

export const orchestrator = new Orchestrator();
