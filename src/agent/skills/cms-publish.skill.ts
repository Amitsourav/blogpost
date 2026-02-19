import { ISkill } from '../skill.interface';
import { AgentContext, PipelineArtifacts, SkillResult } from '../../common/types';
import { getCMSAdapter } from '../../providers/cms';
import { logger } from '../../config/logger';

export class CMSPublishSkill implements ISkill {
  name = 'cms-publish';
  description = 'Publishes content to the configured CMS';

  canExecute(context: AgentContext, artifacts: PipelineArtifacts): boolean {
    return !!context.cmsConnection && !!artifacts.blogDraft && !!artifacts.seoMetadata;
  }

  async execute(context: AgentContext, artifacts: PipelineArtifacts): Promise<SkillResult> {
    try {
      if (!context.cmsConnection) {
        return { success: false, error: 'No CMS connection configured' };
      }

      const adapter = getCMSAdapter(context.cmsConnection);
      const result = await adapter.publishContent(artifacts.blogDraft!, artifacts.seoMetadata!, artifacts.coverImageUrl);

      artifacts.publishedCmsId = result.cmsId;
      artifacts.publishedUrl = result.url;

      logger.info('Content published to CMS', {
        taskId: context.taskId,
        cmsId: result.cmsId,
        url: result.url,
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
