import { readFileSync } from 'node:fs';
import { join, normalize, relative, sep } from 'node:path';
import type { Skill, SkillResource } from './types';

/**
 * Execution-layer resource reader. The SKILL.md can reference sibling files
 * like `references/examples.md`. We load them on demand — never eagerly —
 * and enforce that the resolved path stays inside the skill's own directory
 * to prevent `../` traversal from a malicious user-authored skill.
 */
export function readSkillResource(skill: Skill, relPath: string): SkillResource {
  if (!skill.sourcePath) {
    throw new Error(`Skill "${skill.slug}" is not filesystem-backed; cannot read resources`);
  }
  if (skill.frontmatter.resources && skill.frontmatter.resources.length > 0) {
    if (!skill.frontmatter.resources.includes(relPath)) {
      throw new Error(
        `Resource "${relPath}" is not declared in SKILL.md frontmatter for "${skill.slug}"`,
      );
    }
  }
  const absolute = normalize(join(skill.sourcePath, relPath));
  const inside = relative(skill.sourcePath, absolute);
  if (inside.startsWith('..') || inside.startsWith(sep) || inside.includes(`..${sep}`)) {
    throw new Error(`Resource path escapes skill directory: ${relPath}`);
  }
  const content = readFileSync(absolute, 'utf8');
  return { path: relPath, content };
}
