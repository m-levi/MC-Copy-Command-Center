import type { Skill } from './types';

export interface ActivationRequest {
  skills: Skill[];
  slug: string;
  variables?: Record<string, unknown>;
}

export interface ActivatedSkill {
  skill: Skill;
  variables: Record<string, unknown>;
}

export class SkillActivationError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'SkillActivationError';
  }
}

/**
 * Resolve a `use_skill` request (from the model or a locked chat) into the
 * full skill + validated variables. Throws `SkillActivationError` on unknown
 * slug or missing required variables so the API can respond with a clear
 * error instead of silently dropping the activation.
 */
export function activateSkill({ skills, slug, variables = {} }: ActivationRequest): ActivatedSkill {
  const skill = skills.find((s) => s.slug === slug);
  if (!skill) {
    throw new SkillActivationError(`Unknown skill: ${slug}`, 'UNKNOWN_SKILL');
  }
  const resolved: Record<string, unknown> = {};
  for (const def of skill.frontmatter.variables ?? []) {
    const provided = variables[def.name];
    if (provided === undefined || provided === null || provided === '') {
      if (def.required && def.default === undefined) {
        throw new SkillActivationError(
          `Skill "${slug}" requires variable "${def.name}"`,
          'MISSING_VARIABLE',
        );
      }
      if (def.default !== undefined) resolved[def.name] = def.default;
    } else {
      resolved[def.name] = provided;
    }
  }
  return { skill, variables: resolved };
}
