import { tool } from 'ai';
import { z } from 'zod';
import { activateSkill, SkillActivationError } from '@/lib/skills/activation';
import type { ToolContext } from './types';

/**
 * The activation-layer tool. In Auto mode this is the only skill-aware tool
 * the model sees. When it calls `load_skill(slug)` we:
 *   1. Validate the slug + required variables against the skill registry.
 *   2. Interpolate the skill body with the current context.
 *   3. Return the full body as the tool result so the model has the
 *      activation-layer content in its next step.
 *   4. Record which tools the skill wants enabled so `prepareStep` can
 *      broaden the tool set on the next step.
 */
export function buildLoadSkillTool(ctx: ToolContext) {
  return tool({
    description:
      'Load the full instructions for a skill by its slug. Call this when the user\'s request clearly matches a skill listed in <available_skills>. The result contains the skill\'s detailed instructions — follow them precisely. Only call this once per user turn unless the user changes direction.',
    inputSchema: z.object({
      slug: z
        .string()
        .describe('The skill slug exactly as it appears in <available_skills>.'),
      variables: z
        .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
        .optional()
        .describe(
          "Variables declared in the skill frontmatter (e.g., { copyBrief: '...' }).",
        ),
    }),
    execute: async ({ slug, variables }) => {
      try {
        const { skill, variables: resolved } = activateSkill({
          skills: ctx.skills,
          slug,
          variables: variables as Record<string, unknown>,
        });
        const { interpolate } = await import('@/lib/workflows/template-engine');
        const body = interpolate(skill.body, {
          ...ctx.standardScope,
          ...resolved,
        });
        ctx.dynamic.activatedSkillSlug = skill.slug;
        for (const t of skill.frontmatter.tools ?? []) {
          ctx.dynamic.enabledSkillTools.add(t);
        }
        return {
          ok: true as const,
          slug: skill.slug,
          display_name: skill.frontmatter.display_name ?? skill.slug,
          workflow_type: skill.frontmatter.workflow_type,
          tools_enabled: skill.frontmatter.tools ?? [],
          instructions: body,
          resources: skill.frontmatter.resources ?? [],
        };
      } catch (err) {
        if (err instanceof SkillActivationError) {
          return { ok: false as const, code: err.code, message: err.message };
        }
        throw err;
      }
    },
  });
}
