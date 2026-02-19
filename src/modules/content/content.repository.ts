import { prisma } from '../../config/database';
import { ContentTaskStatus } from '@prisma/client';
import { v4 as uuid } from 'uuid';

export interface CreateTaskInput {
  tenantId: string;
  topic: string;
  keywords?: string[];
  contentType?: string;
  triggerSource?: string;
}

export class ContentRepository {
  async createTask(input: CreateTaskInput) {
    return prisma.contentTask.create({
      data: {
        id: uuid(),
        tenantId: input.tenantId,
        contentType: input.contentType ?? 'blog',
        inputTopic: input.topic,
        inputKeywords: input.keywords ?? [],
        triggerSource: input.triggerSource ?? 'api',
        status: ContentTaskStatus.PENDING,
      },
    });
  }

  async findTaskById(taskId: string) {
    return prisma.contentTask.findUnique({
      where: { id: taskId },
      include: { logs: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async findTasksByTenant(tenantId: string, opts: { page: number; limit: number; status?: ContentTaskStatus }) {
    const where: any = { tenantId };
    if (opts.status) where.status = opts.status;

    const [tasks, total] = await Promise.all([
      prisma.contentTask.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
      }),
      prisma.contentTask.count({ where }),
    ]);

    return { tasks, total, page: opts.page, limit: opts.limit };
  }

  async updateTaskForRetry(taskId: string) {
    return prisma.contentTask.update({
      where: { id: taskId },
      data: {
        status: ContentTaskStatus.PENDING,
        errorMessage: null,
        retryCount: { increment: 1 },
      },
    });
  }
}
