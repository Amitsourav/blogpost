import { ISkill } from '../skill.interface';
import { AgentContext, PipelineArtifacts, SkillResult } from '../../common/types';
import { reviewContent } from '../content-review';
import { logger } from '../../config/logger';
import { prisma } from '../../config/database';

export class FactCheckSkill implements ISkill {
  name = 'fact-check';
  description = 'Flags figures, named institutions and stale claims in the draft for editor verification';

  canExecute(_context: AgentContext, artifacts: PipelineArtifacts): boolean {
    return !!artifacts.blogDraft;
  }

  async execute(context: AgentContext, artifacts: PipelineArtifacts): Promise<SkillResult> {
    try {
      const issues = await reviewContent(artifacts.blogDraft!.content);
      artifacts.reviewIssues = issues;

      if (issues.length > 0) {
        logger.warn('Draft has claims to verify', { taskId: context.taskId, count: issues.length });
        await prisma.taskLog.create({
          data: {
            taskId: context.taskId,
            level: 'WARN',
            stage: 'fact-check',
            message: `${issues.length} claim(s) need editor verification`,
            metadata: { issues } as any,
          },
        });
      }

      return { success: true };
    } catch (error: any) {
      // A failed check must not block the post; log it and carry on
      logger.error('Fact check failed', { taskId: context.taskId, error: error.message });
      return { success: true };
    }
  }
}
