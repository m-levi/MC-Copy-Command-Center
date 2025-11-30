/**
 * AI Providers Configuration using Vercel AI Gateway
 * 
 * Uses the Vercel AI Gateway which provides:
 * - Single API key for all providers
 * - Automatic failovers
 * - Usage analytics & billing
 * - No need for individual provider API keys
 */

import 'server-only';
import { gateway, createGateway } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { MODELS } from './ai-constants';

/**
 * Default gateway instance
 * Uses AI_GATEWAY_API_KEY from environment
 */
export { gateway };

/**
 * Re-export models for server-side usage
 */
export { MODELS };

/**
 * Create a custom gateway instance if needed
 */
export const createCustomGateway = (options?: {
  apiKey?: string;
  baseURL?: string;
}) => {
  return createGateway({
    apiKey: options?.apiKey,
    baseURL: options?.baseURL,
  });
};

/**
 * Anthropic provider for provider-specific tools
 * (web search, memory tool, etc.)
 * Uses AI_GATEWAY_API_KEY through the gateway
 */
const anthropicForTools = createAnthropic({
  // When using AI Gateway, the gateway handles auth
  // This is for accessing tool definitions only
});

/**
 * Creates web search tool for Anthropic models
 * Works through AI Gateway
 */
export const createWebSearchTool = (websiteUrl?: string) => {
  const allowedDomains: string[] = [];
  
  if (websiteUrl) {
    try {
      const hostname = new URL(websiteUrl).hostname;
      allowedDomains.push(
        hostname,
        'shopify.com',
        'amazon.com',
        'yelp.com',
        'trustpilot.com',
      );
    } catch {
      // Invalid URL, proceed without domain filtering
    }
  }

  return anthropicForTools.tools.webSearch_20250305({
    maxUses: 5,
    ...(allowedDomains.length > 0 && { allowedDomains }),
  });
};

/**
 * Get tools configuration based on model provider
 * 
 * - Anthropic: Uses native webSearch_20250305 tool
 * - OpenAI: Web search via Responses API (configured in providerOptions)
 * - Google: Web search via grounding (configured in providerOptions)
 */
export const getToolsForModel = (modelId: string, websiteUrl?: string) => {
  // Only Anthropic models use explicit web search tools
  // OpenAI and Google handle web search through provider-specific configurations
  if (modelId.startsWith('anthropic/')) {
    try {
      return {
        web_search: createWebSearchTool(websiteUrl),
      };
    } catch (error) {
      console.error('[AI Providers] Error creating web search tool:', error);
      // Return undefined if web search tool creation fails
      return undefined;
    }
  }
  
  // For OpenAI and Google, web search is handled through provider options
  // Return undefined to let the SDK handle it natively
  return undefined;
};

/**
 * Get provider options with web search enabled where supported
 */
export const getProviderOptionsWithWebSearch = (
  modelId: string, 
  budgetTokens = 10000,
  websiteUrl?: string
) => {
  const baseOptions = getProviderOptions(modelId, budgetTokens);
  
  // Add OpenAI web search configuration
  if (modelId.startsWith('openai/')) {
    return {
      ...baseOptions,
      openai: {
        ...baseOptions.openai,
        // Enable web search for OpenAI models that support it
        // Note: This uses OpenAI's built-in web browsing capabilities
        webSearch: true,
        // Add context about the website if available
        ...(websiteUrl && {
          webSearchContext: `Focus on searching ${new URL(websiteUrl).hostname} and related e-commerce sites like shopify.com, amazon.com`,
        }),
      },
    };
  }
  
  // Add Google grounding/search configuration
  if (modelId.startsWith('google/')) {
    return {
      ...baseOptions,
      google: {
        ...baseOptions.google,
        // Enable grounding with Google Search
        groundingMetadata: {
          groundingSource: 'GOOGLE_SEARCH',
          ...(websiteUrl && {
            dynamicRetrievalConfig: {
              mode: 'MODE_DYNAMIC',
              threshold: 0.3,
            },
          }),
        },
      },
    };
  }
  
  return baseOptions;
};

/**
 * Creates memory tool for Anthropic models
 */
export const createMemoryTool = (config: { conversationId: string }) => {
  return anthropicForTools.tools.memory_20250818({
    // Memory tool configuration
  });
};

/**
 * Extended thinking options for Claude models
 */
export const getThinkingOptions = (budgetTokens = 10000) => ({
  anthropic: {
    thinking: {
      type: 'enabled' as const,
      budgetTokens,
    },
  },
});

/**
 * Extended thinking options for OpenAI reasoning models (o1, GPT-5.1, etc.)
 */
export const getOpenAIThinkingOptions = (effort: 'low' | 'medium' | 'high' = 'medium') => ({
  openai: {
    reasoningEffort: effort,
  },
});

/**
 * Extended thinking options for Google Gemini models
 */
export const getGoogleThinkingOptions = (budgetTokens = 10000) => ({
  google: {
    thinkingConfig: {
      thinkingBudget: budgetTokens,
    },
  },
});

/**
 * Get provider options based on model ID
 */
export const getProviderOptions = (modelId: string, budgetTokens = 10000) => {
  if (modelId.startsWith('anthropic/')) {
    return getThinkingOptions(budgetTokens);
  }
  if (modelId.startsWith('openai/')) {
    return getOpenAIThinkingOptions('medium');
  }
  if (modelId.startsWith('google/')) {
    return getGoogleThinkingOptions(budgetTokens);
  }
  return {};
};

/**
 * Default chat options with thinking enabled
 */
export const DEFAULT_CHAT_OPTIONS = {
  providerOptions: getThinkingOptions(10000),
};

/**
 * Flow email options with lower thinking budget
 */
export const FLOW_EMAIL_OPTIONS = {
  providerOptions: getThinkingOptions(2000),
};

/**
 * Get a language model from the gateway
 * Uses the AI Gateway model format: provider/model-name
 */
export function getModel(modelId: string = MODELS.CLAUDE_SONNET) {
  return gateway.languageModel(modelId);
}

/**
 * Get the primary chat model (Claude Sonnet 4.5)
 */
export function getPrimaryModel() {
  return gateway.languageModel(MODELS.CLAUDE_SONNET);
}

/**
 * Get a lightweight model for simple tasks
 */
export function getLightweightModel(provider: 'anthropic' | 'openai' = 'openai') {
  if (provider === 'anthropic') {
    return gateway.languageModel(MODELS.CLAUDE_HAIKU);
  }
  return gateway.languageModel(MODELS.GPT_5_1_MINI);
}
