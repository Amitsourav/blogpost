import { prisma } from '../../config/database';
import { ScheduledPostStatus } from '@prisma/client';
import { v4 as uuid } from 'uuid';

export interface UpsertConfigInput {
  postsPerDay: number;
  timeOfDay: string;
  timezone: string;
  isActive: boolean;
}

export interface AddPostInput {
  topic: string;
  keywords?: string[];
}

export class ScheduleRepository {
  async getConfig(tenantId: string) {
    return prisma.scheduleConfig.findUnique({ where: { tenantId } });
  }

  async upsertConfig(tenantId: string, input: UpsertConfigInput) {
    return prisma.scheduleConfig.upsert({
      where: { tenantId },
      create: {
        id: uuid(),
        tenantId,
        ...input,
      },
      update: input,
    });
  }

  async addPosts(tenantId: string, posts: AddPostInput[]) {
    const maxPos = await prisma.scheduledPost.aggregate({
      where: { tenantId },
      _max: { position: true },
    });

    let nextPosition = (maxPos._max.position ?? -1) + 1;

    const data = posts.map((p) => ({
      id: uuid(),
      tenantId,
      topic: p.topic,
      keywords: p.keywords ?? [],
      position: nextPosition++,
      status: ScheduledPostStatus.QUEUED,
    }));

    await prisma.scheduledPost.createMany({ data });

    return prisma.scheduledPost.findMany({
      where: { tenantId, id: { in: data.map((d) => d.id) } },
      orderBy: { position: 'asc' },
    });
  }

  async listPosts(tenantId: string, opts: { page: number; limit: number; status?: ScheduledPostStatus }) {
    const where: any = { tenantId };
    if (opts.status) where.status = opts.status;

    const [posts, total] = await Promise.all([
      prisma.scheduledPost.findMany({
        where,
        orderBy: { position: 'asc' },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
      }),
      prisma.scheduledPost.count({ where }),
    ]);

    return { posts, total, page: opts.page, limit: opts.limit };
  }

  async findPostById(postId: string) {
    return prisma.scheduledPost.findUnique({ where: { id: postId } });
  }

  async getNextQueuedPost(tenantId: string) {
    return prisma.scheduledPost.findFirst({
      where: { tenantId, status: ScheduledPostStatus.QUEUED },
      orderBy: { position: 'asc' },
    });
  }

  async updatePostStatus(
    postId: string,
    status: ScheduledPostStatus,
    extra: { taskId?: string; errorMessage?: string } = {},
  ) {
    return prisma.scheduledPost.update({
      where: { id: postId },
      data: {
        status,
        taskId: extra.taskId,
        errorMessage: extra.errorMessage,
        processedAt: ['COMPLETED', 'FAILED'].includes(status) ? new Date() : undefined,
      },
    });
  }

  async cancelPost(postId: string) {
    return prisma.scheduledPost.update({
      where: { id: postId },
      data: { status: ScheduledPostStatus.CANCELLED },
    });
  }

  async deletePost(postId: string) {
    return prisma.scheduledPost.delete({ where: { id: postId } });
  }

  async reorderPost(postId: string, newPosition: number) {
    const post = await prisma.scheduledPost.findUnique({ where: { id: postId } });
    if (!post) return null;

    const oldPosition = post.position;
    if (oldPosition === newPosition) return post;

    await prisma.$transaction(async (tx) => {
      if (newPosition < oldPosition) {
        // Moving up: shift items in [newPosition, oldPosition) down by 1
        await tx.scheduledPost.updateMany({
          where: {
            tenantId: post.tenantId,
            position: { gte: newPosition, lt: oldPosition },
            status: ScheduledPostStatus.QUEUED,
          },
          data: { position: { increment: 1 } },
        });
      } else {
        // Moving down: shift items in (oldPosition, newPosition] up by 1
        await tx.scheduledPost.updateMany({
          where: {
            tenantId: post.tenantId,
            position: { gt: oldPosition, lte: newPosition },
            status: ScheduledPostStatus.QUEUED,
          },
          data: { position: { decrement: 1 } },
        });
      }

      await tx.scheduledPost.update({
        where: { id: postId },
        data: { position: newPosition },
      });
    });

    return prisma.scheduledPost.findUnique({ where: { id: postId } });
  }

  async getActiveSchedules() {
    return prisma.scheduleConfig.findMany({
      where: { isActive: true },
      include: { tenant: true },
    });
  }

  async countProcessedToday(tenantId: string, todayStart: Date) {
    return prisma.scheduledPost.count({
      where: {
        tenantId,
        status: { in: [ScheduledPostStatus.PROCESSING, ScheduledPostStatus.COMPLETED] },
        processedAt: { gte: todayStart },
      },
    });
  }
}
