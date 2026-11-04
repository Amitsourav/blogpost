import { ContentTaskStatus } from '@prisma/client';
import { ISkill } from '../skill.interface';
import { AgentContext, PipelineArtifacts, SkillResult, ContentOutput } from '../../common/types';
import { titleSimilarity, contentSimilarity } from '../../common/utils/similarity';
import { logger } from '../../config/logger';
import { prisma } from '../../config/database';

// Above these, the draft is treated as a duplicate and not published
const TITLE_THRESHOLD = 0.9;
const CONTENT_THRESHOLD = 0.35;
// Above this, the draft is published but flagged for review
const CONTENT_WARN_THRESHOLD = 0.2;
const MAX_POSTS_COMPARED = 500;

export class DuplicateCheckSkill implements ISkill {
  name = 'duplicate-check';
  description = "Compares the draft with the tenant's earlier posts and stops near-copies";

  canExecute(_context: AgentContext, artifacts: PipelineArtifacts): boolean {
    return !!artifacts.blogDraft;
  }

  async execute(context: AgentContext, artifacts: PipelineArtifacts): Promise<SkillResult> {
    const draft = artifacts.blogDraft!;

    const pastTasks = await prisma.contentTask.findMany({
      where: {
        tenantId: context.tenantId,
        id: { not: context.taskId },
        status: { in: [ContentTaskStatus.PUBLISHED, ContentTaskStatus.GENERATING] },
      },
      select: { id: true, output: true },
      orderBy: { createdAt: 'desc' },
      take: MAX_POSTS_COMPARED,
    });

    let closest = { taskId: '', title: '', titleScore: 0, contentScore: 0 };
    for (const past of pastTasks) {
      const blog = (past.output as unknown as ContentOutput | null)?.blog;
      if (!blog?.content) continue;

      const titleScore = titleSimilarity(draft.title, blog.title);
      const contentScore = contentSimilarity(draft.content, blog.content);
      if (Math.max(titleScore, contentScore) > Math.max(closest.titleScore, closest.contentScore)) {
        closest = { taskId: past.id, title: blog.title, titleScore, contentScore };
      }
    }

    const scores = {
      closestTaskId: closest.taskId,
      closestTitle: closest.title,
      titleScore: Number(closest.titleScore.toFixed(2)),
      contentScore: Number(closest.contentScore.toFixed(2)),
    };

    if (closest.titleScore >= TITLE_THRESHOLD || closest.contentScore >= CONTENT_THRESHOLD) {
      await this.log(context.taskId, 'ERROR', 'Draft duplicates an earlier post', scores);
      return {
        success: false,
        error: `Duplicate of earlier post "${closest.title}" (task ${closest.taskId})`,
      };
    }

    if (closest.contentScore >= CONTENT_WARN_THRESHOLD) {
      await this.log(context.taskId, 'WARN', 'Draft overlaps with an earlier post', scores);
      artifacts.reviewIssues = [
        ...(artifacts.reviewIssues ?? []),
        {
          type: 'duplicate',
          excerpt: closest.title,
          note: `Shares ${Math.round(closest.contentScore * 100)}% of phrasing with an earlier post`,
        },
      ];
    }

    logger.info('Duplicate check passed', { taskId: context.taskId, ...scores });
    return { success: true };
  }

  private async log(taskId: string, level: string, message: string, metadata: Record<string, unknown>) {
    logger.warn(message, { taskId, ...metadata });
    await prisma.taskLog.create({
      data: { taskId, level, stage: 'duplicate-check', message, metadata: metadata as any },
    });
  }
}
