import { AgentContext, PipelineArtifacts } from '../common/types';
import { SkillRegistry } from './skill-registry';
import { logger } from '../config/logger';

export class Pipeline {
  constructor(private registry: SkillRegistry) {}

  async run(
    skillNames: string[],
    context: AgentContext,
    artifacts: PipelineArtifacts = {}
  ): Promise<PipelineArtifacts> {
    for (const name of skillNames) {
      const skill = this.registry.get(name);
      if (!skill) {
        throw new Error(`Skill "${name}" not found in registry`);
      }

      if (!skill.canExecute(context, artifacts)) {
        logger.warn(`Skill "${name}" cannot execute, skipping`, { taskId: context.taskId });
        continue;
      }

      logger.info(`Executing skill: ${name}`, { taskId: context.taskId });
      const result = await skill.execute(context, artifacts);

      if (!result.success) {
        throw new Error(`Skill "${name}" failed: ${result.error}`);
      }

      logger.info(`Skill "${name}" completed`, { taskId: context.taskId });
    }

    return artifacts;
  }
}
