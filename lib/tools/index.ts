/**
 * AI Tools Index
 * 
 * Central export for all AI tools used in the chat API.
 */

// Import tools for use in this file
import {
  createArtifactTool as _createArtifactTool,
  ArtifactToolSchema,
  detectArtifactContent,
} from './artifact-tool';
import type { ArtifactToolInput } from './artifact-tool';

// Import parsing utilities from canonical source
import { parseEmailVersions } from '@/lib/email-version-parser';
import type { EmailVersion, ParsedEmailVersions } from '@/lib/email-version-parser';

import {
  createConversationTool as _createConversationTool,
  createBulkConversationsTool as _createBulkConversationsTool,
  suggestConversationPlanTool as _suggestConversationPlanTool,
  ConversationToolSchema,
  BulkConversationSchema,
  ConversationPlanSchema,
} from './conversation-tool';
import type { ConversationToolInput, BulkConversationInput, ConversationPlanInput } from './conversation-tool';

import {
  suggestActionTool as _suggestActionTool,
  suggestMultipleActionsTool as _suggestMultipleActionsTool,
  ActionToolSchema,
  MultipleActionsSchema,
  ActionType,
} from './action-tool';
import type { ActionToolInput, ActionTypeValue, MultipleActionsInput } from './action-tool';

import {
  invokeAgentTool as _invokeAgentTool,
  InvokeAgentSchema,
  canAgentInvoke,
  getAgentDisplayInfo,
  buildAvailableAgentsSummary,
} from './invoke-agent-tool';
import type { InvokeAgentInput } from './invoke-agent-tool';

import {
  createImageGenerationTool as _createImageGenerationTool,
  ImageGenerationSchema,
} from './image-tool';
import type { ImageGenerationInput } from './image-tool';

// Shopify MCP integration
import {
  getShopifyToolsForBrand,
  filterShopifyToolsByConfig,
  normalizeShopifyDomain,
  isLikelyShopifyStore,
  DEFAULT_SHOPIFY_TOOL_CONFIG,
} from './shopify-mcp-tool';
import type { ShopifyMCPTools, ShopifyMCPConfig, ShopifyToolConfig } from './shopify-mcp-tool';

// Re-export all tools and types
export {
  _createArtifactTool as createArtifactTool,
  ArtifactToolSchema,
  parseEmailVersions,
  detectArtifactContent,
};
export type { ArtifactToolInput, EmailVersion, ParsedEmailVersions };

export {
  _createConversationTool as createConversationTool,
  _createBulkConversationsTool as createBulkConversationsTool,
  _suggestConversationPlanTool as suggestConversationPlanTool,
  ConversationToolSchema,
  BulkConversationSchema,
  ConversationPlanSchema,
};
export type { ConversationToolInput, BulkConversationInput, ConversationPlanInput };

export {
  _suggestActionTool as suggestActionTool,
  _suggestMultipleActionsTool as suggestMultipleActionsTool,
  ActionToolSchema,
  MultipleActionsSchema,
  ActionType,
};
export type { ActionToolInput, ActionTypeValue, MultipleActionsInput };

export {
  _invokeAgentTool as invokeAgentTool,
  InvokeAgentSchema,
  canAgentInvoke,
  getAgentDisplayInfo,
  buildAvailableAgentsSummary,
};
export type { InvokeAgentInput };

export {
  _createImageGenerationTool as createImageGenerationTool,
  ImageGenerationSchema,
};
export type { ImageGenerationInput };

// Shopify MCP exports
export {
  getShopifyToolsForBrand,
  filterShopifyToolsByConfig,
  normalizeShopifyDomain,
  isLikelyShopifyStore,
  DEFAULT_SHOPIFY_TOOL_CONFIG,
};
export type { ShopifyMCPTools, ShopifyMCPConfig, ShopifyToolConfig };

/**
 * Get all universal tools (available in all modes)
 * These tools enable AI to create artifacts, conversations, suggest plans, and invoke agents
 */
export function getUniversalTools() {
  return {
    create_artifact: _createArtifactTool,
    create_conversation: _createConversationTool,
    create_bulk_conversations: _createBulkConversationsTool, // Now universal - enables flow/sequence creation everywhere
    suggest_action: _suggestActionTool,
    suggest_conversation_plan: _suggestConversationPlanTool, // Universal - enables AI to propose conversation structures
    invoke_agent: _invokeAgentTool, // Universal - enables agent chaining
  };
}

/**
 * Tool configuration for a single tool
 */
export interface ToolEnabledConfig {
  enabled: boolean;
  allowed_kinds?: string[];
  max_uses?: number;
}

/**
 * Tool configuration passed to getToolsForMode
 * Each tool can be enabled/disabled via its config
 */
export interface ModeToolOptions {
  // Core tools
  create_artifact?: ToolEnabledConfig & { allowed_kinds?: string[] };
  create_conversation?: ToolEnabledConfig;
  create_bulk_conversations?: ToolEnabledConfig;
  suggest_conversation_plan?: ToolEnabledConfig;
  suggest_action?: ToolEnabledConfig;
  invoke_agent?: ToolEnabledConfig;
  
  // Optional tools
  generate_image?: { 
    enabled: boolean; 
    default_model?: string; 
    default_size?: string; 
    default_style?: 'natural' | 'vivid'; 
    max_images?: number; 
    allowed_models?: string[]; 
  };
  shopify_product_search?: {
    enabled: boolean;
    allowed_tools?: string[];
    max_searches?: number;
  };
  web_search?: ToolEnabledConfig & { max_uses?: number };
}

/**
 * Check if a tool is enabled in the config
 * Default is enabled if not specified
 */
function isToolEnabled(config: ModeToolOptions | undefined, toolName: string): boolean {
  if (!config) return true; // No config = all tools enabled
  const toolConfig = config[toolName as keyof ModeToolOptions] as ToolEnabledConfig | undefined;
  if (!toolConfig) return true; // No tool-specific config = enabled
  return toolConfig.enabled !== false; // Explicitly check for false
}

/**
 * Get tools for a specific mode
 * Combines universal tools with mode-specific tools
 * Respects enabled/disabled settings from toolConfig
 */
export function getToolsForMode(mode: string, toolConfig?: ModeToolOptions) {
  const universalTools = getUniversalTools();
  
  // Build tools based on configuration, filtering out disabled tools
  const tools: Record<string, unknown> = {};
  
  // Add universal tools only if enabled
  if (isToolEnabled(toolConfig, 'create_artifact')) {
    tools.create_artifact = universalTools.create_artifact;
  }
  if (isToolEnabled(toolConfig, 'create_conversation')) {
    tools.create_conversation = universalTools.create_conversation;
  }
  if (isToolEnabled(toolConfig, 'create_bulk_conversations')) {
    tools.create_bulk_conversations = universalTools.create_bulk_conversations;
  }
  if (isToolEnabled(toolConfig, 'suggest_action')) {
    tools.suggest_action = universalTools.suggest_action;
  }
  if (isToolEnabled(toolConfig, 'suggest_conversation_plan')) {
    tools.suggest_conversation_plan = universalTools.suggest_conversation_plan;
  }
  if (isToolEnabled(toolConfig, 'invoke_agent')) {
    tools.invoke_agent = universalTools.invoke_agent;
  }
  
  // Add image generation if enabled
  if (toolConfig?.generate_image?.enabled) {
    tools.generate_image = _createImageGenerationTool({
      defaultModel: toolConfig.generate_image.default_model,
      defaultSize: toolConfig.generate_image.default_size as '1024x1024' | '1024x1792' | '1792x1024' | undefined,
      defaultStyle: toolConfig.generate_image.default_style,
      maxImages: toolConfig.generate_image.max_images,
      allowedModels: toolConfig.generate_image.allowed_models,
    });
  }
  
  // Mode-specific tools
  switch (mode) {
    case 'planning':
    case 'calendar':
      return {
        ...tools,
        suggest_multiple_actions: _suggestMultipleActionsTool,
      };
    
    // Flow and email_copy modes use universal tools - no additional tools needed
    case 'flow':
    case 'email_copy':
    default:
      return tools;
  }
}

/**
 * Extended tools configuration including Shopify MCP
 * modeTools contains the full enabled_tools config from the custom mode
 */
export interface ExtendedToolsConfig {
  modeTools: ModeToolOptions;
  shopifyDomain?: string | null;
  shopifyConfig?: ShopifyToolConfig;
}

// Re-export ModeToolOptions for use in chat route
export type { ToolEnabledConfig };

/**
 * Get all tools for a mode including Shopify MCP tools
 * This is the main function to use in the chat API for comprehensive tool loading
 */
export async function getToolsForModeWithShopify(
  mode: string,
  config: ExtendedToolsConfig
): Promise<Record<string, unknown>> {
  // Get base mode tools
  const modeTools = getToolsForMode(mode, config.modeTools);
  
  // If no Shopify domain or Shopify is disabled, return just mode tools
  if (!config.shopifyDomain) {
    return modeTools;
  }

  // Check if Shopify tools are enabled in the mode config
  const shopifyConfig = config.shopifyConfig || DEFAULT_SHOPIFY_TOOL_CONFIG;
  if (!shopifyConfig.enabled) {
    return modeTools;
  }

  // Try to load Shopify MCP tools
  const shopifyTools = await getShopifyToolsForBrand(config.shopifyDomain, {
    timeout: 8000, // Slightly lower timeout for responsiveness
    enableCaching: true,
  });

  if (!shopifyTools) {
    // Shopify MCP connection failed - continue without Shopify tools
    return modeTools;
  }

  // Filter Shopify tools based on mode configuration
  const filteredShopifyTools = filterShopifyToolsByConfig(shopifyTools, shopifyConfig);

  // Combine all tools
  return {
    ...modeTools,
    ...filteredShopifyTools,
  };
}

