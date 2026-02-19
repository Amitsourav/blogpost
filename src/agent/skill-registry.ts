import { ISkill } from './skill.interface';

export class SkillRegistry {
  private skills = new Map<string, ISkill>();

  register(skill: ISkill): void {
    this.skills.set(skill.name, skill);
  }

  get(name: string): ISkill | undefined {
    return this.skills.get(name);
  }

  getAll(): ISkill[] {
    return Array.from(this.skills.values());
  }

  has(name: string): boolean {
    return this.skills.has(name);
  }
}

export const skillRegistry = new SkillRegistry();
