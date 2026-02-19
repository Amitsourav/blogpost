import { skillRegistry } from './skill-registry';
import { BlogGenerationSkill } from './skills/blog-generation.skill';
import { SEOMetadataSkill } from './skills/seo-metadata.skill';
import { CoverImageSkill } from './skills/cover-image.skill';
import { CMSPublishSkill } from './skills/cms-publish.skill';

export function registerSkills(): void {
  skillRegistry.register(new BlogGenerationSkill());
  skillRegistry.register(new SEOMetadataSkill());
  skillRegistry.register(new CoverImageSkill());
  skillRegistry.register(new CMSPublishSkill());
}
