/**
 * Mode Configuration Helper
 *
 * Handles loading and processing mode configuration including
 * tool settings and artifact types.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CustomMode, ModeToolConfig } from '@/types';
import type { ArtifactTypeInfo, ToolConfig } from '@/lib/prompts/root-system-prompt';
import { getArtifactTypeInfoForPrompt } from '@/lib/services/artifact-type.service';
import { DEFAULT_MODE_TOOL_CONFIG } from '@/types';
import type { ArtifactKind } from '@/types/artifacts';

// ============================================================================
// TYPES
// ============================================================================

export interface ModeConfiguration {
  customMode: CustomMode | null;
  toolConfig: ToolConfig;
  artifactTypes: ArtifactTypeInfo[];
  primaryArtifactKinds: string[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert ModeToolConfig to ToolConfig for prompt builder
 */
function convertToolConfig(modeToolConfig: ModeToolConfig): ToolConfig {
  return {
    create_artifact: modeToolConfig.create_artifact ? {
      enabled: modeToolConfig.create_artifact.enabled,
      allowed_kinds: (modeToolConfig.create_artifact.allowed_kinds as ArtifactKind[] | null) || undefined,
    } : undefined,
    create_conversation: modeToolConfig.create_conversation ? {
      enabled: modeToolConfig.create_conversation.enabled,
    } : undefined,
    create_bulk_conversations: modeToolConfig.create_bulk_conversations ? {
      enabled: modeToolConfig.create_bulk_conversations.enabled,
    } : undefined,
    suggest_conversation_plan: modeToolConfig.suggest_conversation_plan ? {
      enabled: modeToolConfig.suggest_conversation_plan.enabled,
    } : undefined,
    suggest_action: modeToolConfig.suggest_action ? {
      enabled: modeToolConfig.suggest_action.enabled,
    } : undefined,
    web_search: modeToolConfig.web_search ? {
      enabled: modeToolConfig.web_search.enabled,
      allowed_domains: modeToolConfig.web_search.allowed_domains,
      max_uses: modeToolConfig.web_search.max_uses,
    } : undefined,
    save_memory: modeToolConfig.save_memory ? {
      enabled: modeToolConfig.save_memory.enabled,
    } : undefined,
    shopify_product_search: modeToolConfig.shopify_product_search ? {
      enabled: modeToolConfig.shopify_product_search.enabled,
      allowed_tools: modeToolConfig.shopify_product_search.allowed_tools,
      max_searches: modeToolConfig.shopify_product_search.max_searches,
    } : undefined,
  };
}

/**
 * Get default tool config based on conversation mode
 */
function getDefaultToolConfig(conversationMode?: string): ToolConfig {
  // Flow mode gets all conversation tools enabled
  if (conversationMode === 'flow') {
    return convertToolConfig({
      ...DEFAULT_MODE_TOOL_CONFIG,
      create_bulk_conversations: { enabled: true },
      suggest_conversation_plan: { enabled: true },
    });
  }
  
  // Planning mode gets bulk conversations enabled
  if (conversationMode === 'planning') {
    return convertToolConfig({
      ...DEFAULT_MODE_TOOL_CONFIG,
      create_bulk_conversations: { enabled: true },
      suggest_conversation_plan: { enabled: true },
    });
  }

  // Email copy mode - also enable conversation planning for sequences
  if (conversationMode === 'email_copy') {
    return convertToolConfig({
      ...DEFAULT_MODE_TOOL_CONFIG,
      create_bulk_conversations: { enabled: true },
      suggest_conversation_plan: { enabled: true },
    });
  }

  // Default config for other modes (now includes these tools by default)
  return convertToolConfig(DEFAULT_MODE_TOOL_CONFIG);
}

/**
 * Get default artifact types based on conversation mode
 */
function getDefaultArtifactKinds(conversationMode?: string): string[] {
  if (conversationMode === 'email_copy') {
    return ['email', 'subject_lines'];
  }

  if (conversationMode === 'flow') {
    return ['flow', 'email'];
  }

  if (conversationMode === 'planning') {
    return ['campaign', 'content_brief'];
  }

  // Default: all artifact types available
  return ['email', 'subject_lines', 'flow', 'campaign', 'template', 'content_brief'];
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Load mode configuration including tools and artifact types
 */
export async function loadModeConfiguration(
  supabase: SupabaseClient,
  options: {
    customModeId?: string | null;
    conversationMode?: string;
  }
): Promise<ModeConfiguration> {
  const { customModeId, conversationMode } = options;

  // If custom mode is specified, load it
  if (customModeId) {
    try {
      const { data: customMode, error } = await supabase
        .from('custom_modes')
        .select('*')
        .eq('id', customModeId)
        .single();

      if (error) {
        console.error('Error fetching custom mode:', error);
        // Fall through to defaults
      } else if (customMode) {
        // Custom mode found - use its configuration
        const modeToolConfig = customMode.enabled_tools || DEFAULT_MODE_TOOL_CONFIG;
        const primaryArtifactKinds = customMode.primary_artifact_types || ['email'];

        const toolConfig = convertToolConfig(modeToolConfig);

        // Load artifact types
        const artifactTypes = await getArtifactTypeInfoForPrompt(
          supabase,
          primaryArtifactKinds
        );

        return {
          customMode,
          toolConfig,
          artifactTypes,
          primaryArtifactKinds,
        };
      }
    } catch (error) {
      console.error('Error loading custom mode configuration:', error);
      // Fall through to defaults
    }
  }

  // No custom mode or error loading - use defaults based on conversation mode
  const toolConfig = getDefaultToolConfig(conversationMode);
  const primaryArtifactKinds = getDefaultArtifactKinds(conversationMode);

  // Load default artifact types
  const artifactTypes = await getArtifactTypeInfoForPrompt(
    supabase,
    primaryArtifactKinds
  );

  return {
    customMode: null,
    toolConfig,
    artifactTypes,
    primaryArtifactKinds,
  };
}
