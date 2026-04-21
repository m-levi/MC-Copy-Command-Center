import type { Skill } from '@/lib/skills/types';

export interface ToolContext {
  userId: string;
  brandId: string | null;
  orgId: string | null;
  brandName?: string;
  brandWebsiteUrl?: string;
  /**
   * All skills visible to this request (builtins + scope-merged DB rows).
   * Used by load_skill + read_skill_resource tools.
   */
  skills: Skill[];
  /**
   * Mutable set of tools the model may call on the next step. load_skill
   * adds entries here so prepareStep can enable them.
   */
  dynamic: {
    enabledSkillTools: Set<string>;
    activatedSkillSlug: string | null;
  };
}

export type ToolName =
  | 'load_skill'
  | 'read_skill_resource'
  | 'web_search'
  | 'brand_knowledge_search'
  | 'memory_recall'
  | 'memory_save'
  | 'generate_email_variants';

export const ALL_TOOL_NAMES: readonly ToolName[] = [
  'load_skill',
  'read_skill_resource',
  'web_search',
  'brand_knowledge_search',
  'memory_recall',
  'memory_save',
  'generate_email_variants',
] as const;
