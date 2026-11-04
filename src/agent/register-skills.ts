import { skillRegistry } from './skill-registry';
import { BlogGenerationSkill } from './skills/blog-generation.skill';
import { SEOMetadataSkill } from './skills/seo-metadata.skill';
import { CoverImageSkill } from './skills/cover-image.skill';
import { CMSPublishSkill } from './skills/cms-publish.skill';
import { DuplicateCheckSkill } from './skills/duplicate-check.skill';
import { FactCheckSkill } from './skills/fact-check.skill';

export function registerSkills(): void {
  skillRegistry.register(new BlogGenerationSkill());
  skillRegistry.register(new DuplicateCheckSkill());
  skillRegistry.register(new FactCheckSkill());
  skillRegistry.register(new SEOMetadataSkill());
  skillRegistry.register(new CoverImageSkill());
  skillRegistry.register(new CMSPublishSkill());
}
