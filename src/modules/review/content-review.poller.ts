import { ContentTaskStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { reviewContent } from '../../agent/content-review';
import { ContentOutput } from '../../common/types';

const POLL_INTERVAL_MS = 60 * 60_000;
const REVIEW_EVERY_DAYS = 30;
const POSTS_PER_RUN = 5;
const STAGE = 'content-review';

/**
 * Periodically re-reviews published posts for stale or unverified claims,
 * years and student stories. It only flags posts (as task logs) for an
 * editor; it never edits or unpublishes anything.
 */
export class ContentReviewPoller {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private running = false;

  start(): void {
    logger.info(`Content review poller started (interval: ${POLL_INTERVAL_MS}ms)`);
    this.poll();
    this.intervalId = setInterval(() => this.poll(), POLL_INTERVAL_MS);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Content review poller stopped');
    }
  }

  private async poll(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const cutoff = new Date(Date.now() - REVIEW_EVERY_DAYS * 24 * 60 * 60_000);
      const due = await prisma.contentTask.findMany({
        where: {
          status: ContentTaskStatus.PUBLISHED,
          updatedAt: { lt: cutoff },
          logs: { none: { stage: STAGE, createdAt: { gte: cutoff } } },
        },
        select: { id: true, output: true },
        orderBy: { updatedAt: 'asc' },
        take: POSTS_PER_RUN,
      });

      for (const task of due) {
        await this.reviewTask(task.id, task.output as unknown as ContentOutput | null);
      }
    } catch (error: any) {
      logger.error('Content review poll failed', { error: error.message });
    } finally {
      this.running = false;
    }
  }

  private async reviewTask(taskId: string, output: ContentOutput | null): Promise<void> {
    const content = output?.blog?.content;
    if (!content) return;

    try {
      const issues = await reviewContent(content);
      await prisma.taskLog.create({
        data: {
          taskId,
          level: issues.length > 0 ? 'WARN' : 'INFO',
          stage: STAGE,
          message: issues.length > 0
            ? `Scheduled review: ${issues.length} issue(s) for an editor to check`
            : 'Scheduled review: no issues found',
          metadata: { issues } as any,
        },
      });
      logger.info('Published post reviewed', { taskId, issues: issues.length });
    } catch (error: any) {
      logger.error('Published post review failed', { taskId, error: error.message });
    }
  }
}

export const contentReviewPoller = new ContentReviewPoller();
