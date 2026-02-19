import { AgentContext, PipelineArtifacts, SkillResult } from '../common/types';

export interface ISkill {
  name: string;
  description: string;
  canExecute(context: AgentContext, artifacts: PipelineArtifacts): boolean;
  execute(context: AgentContext, artifacts: PipelineArtifacts): Promise<SkillResult>;
}
