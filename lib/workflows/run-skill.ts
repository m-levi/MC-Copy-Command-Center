import { streamText, stepCountIs, type LanguageModel, type ModelMessage } from 'ai';
import { buildDiscoveryBlock } from '@/lib/skills/discovery';
import type { Skill } from '@/lib/skills/types';
import { activateSkill, SkillActivationError } from '@/lib/skills/activation';
import { buildAutoBaselineTools, buildSkillTools, type ToolBundle } from '@/lib/tools';
import type { ToolContext } from '@/lib/tools/types';
import { interpolate, type StandardScope } from './template-engine';
import { getProviderOptions } from '@/lib/ai-providers';

export interface RunSkillArgs {
  model: LanguageModel;
  /**
   * Gateway-format model id, e.g. "anthropic/claude-opus-4.6". Used to
   * resolve provider-specific options (extended thinking) and native
   * tools (Anthropic web_search) without leaking them into the tool
   * context.
   */
  modelId: string;
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
 * Ambient instructions that explain what the baseline tools are. Appended
 * to systemBase so the model knows — in every mode — that it can search
 * the web, pull brand docs, and recall/save memory. Skills can declare
 * the same names in their `tools:` frontmatter to take stronger control.
 *
 * NOTE: Anthropic's native `webSearch_20250305` provider-defined tool is
 * NOT routable through the AI Gateway today (AI SDK v6 raises
 * "Unsupported tool type: provider-defined" for provider tools coming
 * back through the gateway). We use the cross-provider `web_search`
 * tool (see /lib/tools/web-search.ts) instead; when a search backend
 * isn't configured it returns a structured error and the model falls
 * back to reasoning from context.
 */
const BASELINE_TOOL_INSTRUCTIONS = `## Tools always available

You have these tools on every turn. Prefer them over making up facts.

- **web_search** — search the public web. Use for current info: news, competitor products, prices, trends, seasonal moments. Always search when the user names a specific product/brand/event you don't already know cold.
- **brand_knowledge_search** — search the brand's uploaded documents (past emails, research, testimonials). Use whenever the user references past work or wants specifics from their knowledge base.
- **memory_recall** / **memory_save** — durable facts across conversations. Recall when the user references something you should "remember". Save sparingly, only for facts that will matter later (brand preferences, product details, past decisions).

If you need current information you don't already know, CALL web_search. Do not guess.`;

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
  const {
    model,
    modelId,
    systemBase,
    messages,
    skills,
    lockedSkillSlug,
    lockedSkillVariables,
    ctx,
    standardScope,
  } = args;
  const maxSteps = args.maxSteps ?? 10;
  const providerOptions = getProviderOptions(modelId, 10_000);

  // Baseline tools are available in every mode so the model knows it can
  // research before writing. We use the generic `web_search` tool rather
  // than Anthropic's provider-defined `webSearch_20250305` because the
  // Vercel AI Gateway does not forward provider-defined tool shapes and
  // AI SDK v6 raises "Unsupported tool type: provider-defined".
  const baseline: ToolBundle = {
    ...buildAutoBaselineTools(ctx),
    ...buildSkillTools(ctx, [
      'web_search',
      'brand_knowledge_search',
      'memory_recall',
      'memory_save',
    ]),
  };

  const systemWithTools = `${systemBase}\n\n${BASELINE_TOOL_INSTRUCTIONS}`;

  if (lockedSkillSlug) {
    const { skill, variables } = activateSkill({
      skills,
      slug: lockedSkillSlug,
      variables: lockedSkillVariables,
    });
    const body = interpolate(skill.body, { ...standardScope, ...variables });
    const system = `${systemWithTools}\n\n${body}`;
    ctx.dynamic.activatedSkillSlug = skill.slug;
    const toolNames = skill.frontmatter.tools ?? [];
    const tools: ToolBundle = {
      ...baseline,
      ...buildSkillTools(ctx, toolNames),
    };
    return streamText({
      model,
      system,
      messages,
      tools,
      stopWhen: stepCountIs(maxSteps),
      providerOptions,
    });
  }

  const discoveryBlock = buildDiscoveryBlock(skills);
  const system = discoveryBlock
    ? `${systemWithTools}\n\n${discoveryBlock}`
    : systemWithTools;

  return streamText({
    model,
    system,
    messages,
    tools: baseline,
    stopWhen: stepCountIs(maxSteps),
    providerOptions,
    prepareStep: () => {
      if (ctx.dynamic.enabledSkillTools.size === 0) {
        return {};
      }
      const extended: ToolBundle = {
        ...baseline,
        ...buildSkillTools(ctx, Array.from(ctx.dynamic.enabledSkillTools)),
      };
      return { tools: extended, activeTools: Object.keys(extended) };
    },
  });
}

export { SkillActivationError };
