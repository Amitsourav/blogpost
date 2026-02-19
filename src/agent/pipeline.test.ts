import { describe, it, expect, vi } from 'vitest';
import { Pipeline } from './pipeline';
import { SkillRegistry } from './skill-registry';
import { ISkill } from './skill.interface';
import { AgentContext, PipelineArtifacts } from '../common/types';
import { BrandProfile } from '@prisma/client';

const mockContext: AgentContext = {
  taskId: 'task-1',
  tenantId: 'tenant-1',
  brandProfile: {
    id: 'bp-1',
    tenantId: 'tenant-1',
    companyName: 'Test Co',
    industry: 'Tech',
    brandTone: 'Professional',
    targetAudience: 'Developers',
    writingGuidelines: '',
    seoPreferences: {},
    defaultAuthor: 'Test Author',
    contentRules: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as BrandProfile,
  cmsConnection: null,
  topic: 'Test topic',
  keywords: ['test'],
};

function createMockSkill(name: string, succeeds = true): ISkill {
  return {
    name,
    description: `Mock ${name}`,
    canExecute: () => true,
    execute: vi.fn().mockResolvedValue({ success: succeeds, error: succeeds ? undefined : 'fail' }),
  };
}

describe('Pipeline', () => {
  it('runs skills in sequence', async () => {
    const registry = new SkillRegistry();
    const skill1 = createMockSkill('skill-1');
    const skill2 = createMockSkill('skill-2');
    registry.register(skill1);
    registry.register(skill2);

    const pipeline = new Pipeline(registry);
    await pipeline.run(['skill-1', 'skill-2'], mockContext);

    expect(skill1.execute).toHaveBeenCalledTimes(1);
    expect(skill2.execute).toHaveBeenCalledTimes(1);
  });

  it('aborts on skill failure', async () => {
    const registry = new SkillRegistry();
    const skill1 = createMockSkill('skill-1', false);
    const skill2 = createMockSkill('skill-2');
    registry.register(skill1);
    registry.register(skill2);

    const pipeline = new Pipeline(registry);
    await expect(pipeline.run(['skill-1', 'skill-2'], mockContext)).rejects.toThrow(
      'Skill "skill-1" failed'
    );

    expect(skill2.execute).not.toHaveBeenCalled();
  });

  it('throws for unknown skill', async () => {
    const registry = new SkillRegistry();
    const pipeline = new Pipeline(registry);

    await expect(pipeline.run(['unknown'], mockContext)).rejects.toThrow(
      'Skill "unknown" not found'
    );
  });

  it('skips skills that cannot execute', async () => {
    const registry = new SkillRegistry();
    const skill: ISkill = {
      name: 'skip-me',
      description: 'Skippable',
      canExecute: () => false,
      execute: vi.fn(),
    };
    registry.register(skill);

    const pipeline = new Pipeline(registry);
    await pipeline.run(['skip-me'], mockContext);

    expect(skill.execute).not.toHaveBeenCalled();
  });
});
