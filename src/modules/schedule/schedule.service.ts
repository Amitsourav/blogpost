import { ScheduledPostStatus } from '@prisma/client';
import { ScheduleRepository, UpsertConfigInput, AddPostInput } from './schedule.repository';
import { ContentRepository } from '../content/content.repository';
import { orchestrator } from '../../agent/orchestrator';
import { AppError, NotFoundError } from '../../common/errors';
import { logger } from '../../config/logger';

export class ScheduleService {
  constructor(
    private repo: ScheduleRepository,
    private contentRepo: ContentRepository,
  ) {}

  async getConfig(tenantId: string) {
    return this.repo.getConfig(tenantId);
  }

  async upsertConfig(tenantId: string, input: UpsertConfigInput) {
    return this.repo.upsertConfig(tenantId, input);
  }

  async addPosts(tenantId: string, posts: AddPostInput[]) {
    return this.repo.addPosts(tenantId, posts);
  }

  async listPosts(tenantId: string, page = 1, limit = 20, status?: ScheduledPostStatus) {
    return this.repo.listPosts(tenantId, { page, limit, status });
  }

  async reorderPost(postId: string) {
    const post = await this.repo.findPostById(postId);
    if (!post) throw new NotFoundError('Scheduled post');
    if (post.status !== ScheduledPostStatus.QUEUED) {
      throw new AppError('Only queued posts can be reordered', 400);
    }
    return post;
  }

  async reorderPostTo(postId: string, newPosition: number) {
    const post = await this.repo.findPostById(postId);
    if (!post) throw new NotFoundError('Scheduled post');
    if (post.status !== ScheduledPostStatus.QUEUED) {
      throw new AppError('Only queued posts can be reordered', 400);
    }
    return this.repo.reorderPost(postId, newPosition);
  }

  async cancelPost(postId: string) {
    const post = await this.repo.findPostById(postId);
    if (!post) throw new NotFoundError('Scheduled post');
    if (post.status !== ScheduledPostStatus.QUEUED) {
      throw new AppError('Only queued posts can be cancelled', 400);
    }
    return this.repo.cancelPost(postId);
  }

  async deletePost(postId: string) {
    const post = await this.repo.findPostById(postId);
    if (!post) throw new NotFoundError('Scheduled post');
    if (!['QUEUED', 'CANCELLED'].includes(post.status)) {
      throw new AppError('Only queued or cancelled posts can be deleted', 400);
    }
    return this.repo.deletePost(postId);
  }

  async executeNextPost(tenantId: string): Promise<boolean> {
    const post = await this.repo.getNextQueuedPost(tenantId);
    if (!post) return false;

    const task = await this.contentRepo.createTask({
      tenantId,
      topic: post.topic,
      keywords: post.keywords,
      triggerSource: 'schedule',
    });

    await this.repo.updatePostStatus(post.id, ScheduledPostStatus.PROCESSING, {
      taskId: task.id,
    });

    logger.info('Scheduled post triggered', {
      postId: post.id,
      taskId: task.id,
      topic: post.topic,
    });

    orchestrator
      .executeTask(task.id)
      .then(async () => {
        const updatedTask = await this.contentRepo.findTaskById(task.id);
        if (updatedTask?.status === 'PUBLISHED') {
          await this.repo.updatePostStatus(post.id, ScheduledPostStatus.COMPLETED);
        } else if (updatedTask?.status === 'FAILED') {
          await this.repo.updatePostStatus(post.id, ScheduledPostStatus.FAILED, {
            errorMessage: updatedTask.errorMessage || 'Task failed',
          });
        }
      })
      .catch(async (err) => {
        await this.repo.updatePostStatus(post.id, ScheduledPostStatus.FAILED, {
          errorMessage: err.message,
        });
      });

    return true;
  }
}
