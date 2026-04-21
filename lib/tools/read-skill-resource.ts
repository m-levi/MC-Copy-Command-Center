import { tool } from 'ai';
import { z } from 'zod';
import { readSkillResource } from '@/lib/skills/resources';
import type { ToolContext } from './types';

/**
 * Execution-layer reader. A skill's SKILL.md can reference sibling files
 * (listed in `resources` frontmatter) — this tool loads them on demand so
 * the bulk content stays out of context until the model asks for it.
 */
export function buildReadSkillResourceTool(ctx: ToolContext) {
  return tool({
    description:
      'Read a sibling resource file for the currently activated skill (e.g. `references/examples.md`). Only use if the active skill referenced the file.',
    inputSchema: z.object({
      path: z.string().describe('Relative path inside the skill directory.'),
    }),
    execute: async ({ path }) => {
      const slug = ctx.dynamic.activatedSkillSlug;
      if (!slug) {
        return { ok: false as const, message: 'No skill is currently active; load_skill first.' };
      }
      const skill = ctx.skills.find((s) => s.slug === slug);
      if (!skill) {
        return { ok: false as const, message: `Active skill "${slug}" not found.` };
      }
      try {
        const res = readSkillResource(skill, path);
        return { ok: true as const, path: res.path, content: res.content };
      } catch (err) {
        return { ok: false as const, message: (err as Error).message };
      }
    },
  });
}
