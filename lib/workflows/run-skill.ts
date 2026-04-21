import { streamText, stepCountIs, type LanguageModel, type ModelMessage } from 'ai';
import { buildDiscoveryBlock } from '@/lib/skills/discovery';
import type { Skill } from '@/lib/skills/types';
import { activateSkill, SkillActivationError } from '@/lib/skills/activation';
import { buildAutoBaselineTools, buildSkillTools } from '@/lib/tools';
import type { ToolContext } from '@/lib/tools/types';
import { interpolate, type StandardScope } from './template-engine';

export interface RunSkillArgs {
  model: LanguageModel;
  /** Base system prompt (brand context, RAG, memory) prepended in every mode. */
  systemBase: string;
  messages: ModelMessage[];
  skills: Skill[];
  /** When set, skip Auto and run the locked skill directly. */
  lockedSkillSlug: string | null;
  /** Variables provided by the UI when locking a skill. */
  lockedSkillVariables: Record<string, unknown>;
  ctx: ToolContext;
  standardScope: StandardScope;
  maxSteps?: number;
}

/**
 * Routes a chat request through the right skill lifecycle.
 *
 * **Locked mode** (`lockedSkillSlug` set): we activate the skill ourselves,
 * splice its interpolated body into the system prompt, enable its declared
 * tools from step 1. Single-path, no discovery layer.
 *
 * **Auto mode** (`lockedSkillSlug` null): we inject the discovery block and
 * only the `load_skill` tool. When the model calls it, `prepareStep`
 * detects the activation, adds the skill's tools to the next step, and
 * lets the model keep going in the same stream. This is the pattern
 * Anthropic calls progressive disclosure and what the AI SDK multi-step
 * tool loop is built for.
 */
export function runSkill(args: RunSkillArgs) {
  const { model, systemBase, messages, skills, lockedSkillSlug, lockedSkillVariables, ctx, standardScope } = args;
  const maxSteps = args.maxSteps ?? 10;

  if (lockedSkillSlug) {
    const { skill, variables } = activateSkill({
      skills,
      slug: lockedSkillSlug,
      variables: lockedSkillVariables,
    });
    const body = interpolate(skill.body, { ...standardScope, ...variables });
    const system = `${systemBase}\n\n${body}`;
    ctx.dynamic.activatedSkillSlug = skill.slug;
    const toolNames = skill.frontmatter.tools ?? [];
    const tools = buildSkillTools(ctx, toolNames);
    return streamText({
      model,
      system,
      messages,
      tools,
      stopWhen: stepCountIs(maxSteps),
    });
  }

  const discoveryBlock = buildDiscoveryBlock(skills);
  const system = discoveryBlock ? `${systemBase}\n\n${discoveryBlock}` : systemBase;
  const baseline = buildAutoBaselineTools(ctx);

  return streamText({
    model,
    system,
    messages,
    tools: baseline,
    stopWhen: stepCountIs(maxSteps),
    prepareStep: ({ steps }) => {
      if (ctx.dynamic.enabledSkillTools.size === 0) {
        return {};
      }
      const extended = {
        ...baseline,
        ...buildSkillTools(ctx, Array.from(ctx.dynamic.enabledSkillTools)),
      };
      return { tools: extended, activeTools: Object.keys(extended) };
    },
  });
}

export { SkillActivationError };
