import type { Tool } from 'ai';
import { buildLoadSkillTool } from './load-skill';
import { buildReadSkillResourceTool } from './read-skill-resource';
import { buildBrandKnowledgeSearchTool } from './brand-knowledge-search';
import { buildMemoryRecallTool } from './memory-recall';
import { buildMemorySaveTool } from './memory-save';
import { buildWebSearchTool } from './web-search';
import { buildGenerateEmailVariantsTool } from './generate-email-variants';
import type { ToolContext, ToolName } from './types';

// Each tool has a different input/output shape, so the bundle is keyed by
// name with the SDK's generic `Tool<any, any>`. Callers don't need to
// narrow past the map key.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ToolBundle = Record<string, Tool<any, any>>;

/**
 * Build the baseline toolset visible in Auto mode before any skill is
 * loaded. Just `load_skill` — discovery-layer only. Once the model
 * activates a skill, `prepareStep` extends this with the skill's declared
 * tools (see `buildSkillTools`).
 */
export function buildAutoBaselineTools(ctx: ToolContext): ToolBundle {
  return {
    load_skill: buildLoadSkillTool(ctx) as ToolBundle[string],
  };
}

/**
 * Build the toolset for a specific skill — either pre-spliced in Locked
 * mode or injected by prepareStep after a load_skill tool call.
 */
export function buildSkillTools(ctx: ToolContext, names: readonly string[]): ToolBundle {
  const out: ToolBundle = {};
  for (const name of names) {
    switch (name as ToolName) {
      case 'read_skill_resource':
        out.read_skill_resource = buildReadSkillResourceTool(ctx) as ToolBundle[string];
        break;
      case 'brand_knowledge_search':
        out.brand_knowledge_search = buildBrandKnowledgeSearchTool(ctx) as ToolBundle[string];
        break;
      case 'memory_recall':
        out.memory_recall = buildMemoryRecallTool(ctx) as ToolBundle[string];
        break;
      case 'memory_save':
        out.memory_save = buildMemorySaveTool(ctx) as ToolBundle[string];
        break;
      case 'web_search':
        out.web_search = buildWebSearchTool(ctx) as ToolBundle[string];
        break;
      case 'generate_email_variants':
        out.generate_email_variants = buildGenerateEmailVariantsTool(ctx) as ToolBundle[string];
        break;
      default:
        // Unknown tool names are silently ignored so bad frontmatter
        // doesn't crash a chat. The skill loader warns at boot time.
        break;
    }
  }
  return out;
}

export * from './types';
