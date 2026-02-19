import { AgentContext } from '../common/types';
import { ContentTask, BrandProfile, CMSConnection } from '@prisma/client';

interface BuildContextInput {
  task: ContentTask;
  brandProfile: BrandProfile;
  cmsConnection: CMSConnection | null;
}

export function buildAgentContext(input: BuildContextInput): AgentContext {
  return {
    taskId: input.task.id,
    tenantId: input.task.tenantId,
    brandProfile: input.brandProfile,
    cmsConnection: input.cmsConnection,
    topic: input.task.inputTopic,
    keywords: input.task.inputKeywords,
  };
}
