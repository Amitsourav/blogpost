import { describe, it, expect } from 'vitest';
import { SkillRegistry } from './skill-registry';
import { ISkill } from './skill.interface';
import { AgentContext, PipelineArtifacts, SkillResult } from '../common/types';

const mockSkill: ISkill = {
  name: 'test-skill',
  description: 'A test skill',
  canExecute: () => true,
  execute: async () => ({ success: true }),
};

describe('SkillRegistry', () => {
  it('registers and retrieves a skill', () => {
    const registry = new SkillRegistry();
    registry.register(mockSkill);
    expect(registry.get('test-skill')).toBe(mockSkill);
  });

  it('returns undefined for unknown skill', () => {
    const registry = new SkillRegistry();
    expect(registry.get('unknown')).toBeUndefined();
  });

  it('checks if a skill exists', () => {
    const registry = new SkillRegistry();
    registry.register(mockSkill);
    expect(registry.has('test-skill')).toBe(true);
    expect(registry.has('unknown')).toBe(false);
  });

  it('returns all registered skills', () => {
    const registry = new SkillRegistry();
    registry.register(mockSkill);
    const all = registry.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('test-skill');
  });
});
