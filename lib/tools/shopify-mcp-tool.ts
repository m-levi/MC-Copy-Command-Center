/**
 * Shopify MCP Tool Integration
 *
 * Connects to Shopify stores via Model Context Protocol (MCP) for direct
 * access to product catalogs, store policies, and cart operations.
 *
 * Each Shopify store exposes an MCP endpoint at: https://{store-domain}/api/mcp
 * This allows the AI to search products, get pricing, and understand store context
 * without relying on generic web search.
 *
 * @see https://shopify.dev/apps/build/storefront-mcp/servers/storefront
 * @see https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools
 */

import { createMCPClient } from '@ai-sdk/mcp';
import { logger } from '@/lib/logger';

// Type for MCP client
type MCPClient = Awaited<ReturnType<typeof createMCPClient>>;

// =============================================================================
// TYPES
// =============================================================================

export interface ShopifyMCPConfig {
  /** The Shopify store domain (e.g., 'my-store.myshopify.com' or 'mystore.com') */
  storeDomain: string;
  /** Optional timeout in milliseconds (default: 10000) */
  timeout?: number;
  /** Whether to cache the MCP client (default: true) */
  enableCaching?: boolean;
}

export interface ShopifyMCPTools {
  /** Search products in the store catalog */
  shopify_search_products?: unknown;
  /** Get product details by handle or ID */
  shopify_get_product?: unknown;
  /** Get store policies (shipping, returns, etc.) */
  shopify_get_policies?: unknown;
  /** Get collection/category information */
  shopify_get_collections?: unknown;
  /** All tools from the MCP server (dynamic) */
  [key: string]: unknown;
}

export interface ShopifyMCPResult {
  tools: ShopifyMCPTools;
  isConnected: boolean;
  storeDomain: string;
  error?: string;
}

// =============================================================================
// MCP CLIENT CACHE
// =============================================================================

// Cache MCP clients by store domain to avoid reconnecting on every request
const mcpClientCache = new Map<string, {
  client: MCPClient;
  createdAt: number;
  tools: Record<string, unknown>;
}>();

// Cache TTL: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Clear expired entries from the cache
 */
function cleanupCache() {
  const now = Date.now();
  for (const [domain, entry] of mcpClientCache.entries()) {
    if (now - entry.createdAt > CACHE_TTL) {
      try {
        entry.client.close?.();
      } catch {
        // Ignore close errors
      }
      mcpClientCache.delete(domain);
    }
  }
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Extract Shopify domain from various URL formats
 * Supports:
 * - mystore.myshopify.com
 * - www.mystore.com
 * - https://mystore.com
 */
export function normalizeShopifyDomain(input: string): string | null {
  if (!input) return null;

  try {
    // If it's a full URL, extract hostname
    let domain = input;
    if (input.includes('://')) {
      const url = new URL(input);
      domain = url.hostname;
    }

    // Remove www. prefix
    domain = domain.replace(/^www\./, '');

    // Remove trailing slashes
    domain = domain.replace(/\/+$/, '');

    // Validate it looks like a domain
    if (!domain.includes('.')) {
      return null;
    }

    return domain;
  } catch {
    return null;
  }
}

/**
 * Check if a domain is likely a Shopify store
 * This is a heuristic - the actual MCP connection will confirm
 */
export function isLikelyShopifyStore(domain: string): boolean {
  if (!domain) return false;

  // Definite Shopify domains
  if (domain.endsWith('.myshopify.com')) {
    return true;
  }

  // Could be a custom domain on Shopify - we'll try to connect
  return true;
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Create an MCP client connection to a Shopify store
 * Returns the tools available from that store's MCP server
 */
export async function createShopifyMCPClient(
  config: ShopifyMCPConfig
): Promise<ShopifyMCPResult> {
  const { storeDomain, timeout = 10000, enableCaching = true } = config;

  // Normalize the domain
  const normalizedDomain = normalizeShopifyDomain(storeDomain);
  if (!normalizedDomain) {
    return {
      tools: {},
      isConnected: false,
      storeDomain: storeDomain,
      error: 'Invalid store domain',
    };
  }

  // Check cache first
  if (enableCaching) {
    cleanupCache();
    const cached = mcpClientCache.get(normalizedDomain);
    if (cached && Date.now() - cached.createdAt < CACHE_TTL) {
      logger.info('[Shopify MCP] Using cached client for:', normalizedDomain);
      return {
        tools: cached.tools,
        isConnected: true,
        storeDomain: normalizedDomain,
      };
    }
  }

  logger.info('[Shopify MCP] Connecting to store:', normalizedDomain);

  try {
    // Create MCP client with SSE transport
    const mcpUrl = `https://${normalizedDomain}/api/mcp`;
    
    const client = await createMCPClient({
      transport: {
        type: 'sse',
        url: mcpUrl,
      },
    });

    // Get available tools from the MCP server
    const tools = await Promise.race([
      client.tools(),
      new Promise<Record<string, unknown>>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout)
      ),
    ]) as Record<string, unknown>;

    logger.info('[Shopify MCP] Connected successfully. Available tools:', Object.keys(tools));

    // Cache the client and tools
    if (enableCaching) {
      mcpClientCache.set(normalizedDomain, {
        client,
        createdAt: Date.now(),
        tools,
      });
    }

    // Prefix tool names with 'shopify_' for clarity in tool calls
    const prefixedTools: ShopifyMCPTools = {};
    for (const [name, tool] of Object.entries(tools)) {
      prefixedTools[`shopify_${name}`] = tool;
    }

    return {
      tools: prefixedTools,
      isConnected: true,
      storeDomain: normalizedDomain,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Shopify MCP] Failed to connect:', errorMessage);

    return {
      tools: {},
      isConnected: false,
      storeDomain: normalizedDomain,
      error: errorMessage,
    };
  }
}

/**
 * Get Shopify MCP tools for a brand
 * This is the main function to use in the chat API
 */
export async function getShopifyToolsForBrand(
  shopifyDomain: string | null | undefined,
  options?: {
    timeout?: number;
    enableCaching?: boolean;
  }
): Promise<ShopifyMCPTools | null> {
  if (!shopifyDomain) {
    return null;
  }

  const result = await createShopifyMCPClient({
    storeDomain: shopifyDomain,
    timeout: options?.timeout,
    enableCaching: options?.enableCaching,
  });

  if (!result.isConnected) {
    logger.warn('[Shopify MCP] Could not connect to store:', result.storeDomain, result.error);
    return null;
  }

  return result.tools;
}

/**
 * Disconnect and cleanup an MCP client
 */
export async function disconnectShopifyMCP(storeDomain: string): Promise<void> {
  const normalizedDomain = normalizeShopifyDomain(storeDomain);
  if (!normalizedDomain) return;

  const cached = mcpClientCache.get(normalizedDomain);
  if (cached) {
    try {
      await cached.client.close?.();
    } catch {
      // Ignore close errors
    }
    mcpClientCache.delete(normalizedDomain);
    logger.info('[Shopify MCP] Disconnected from:', normalizedDomain);
  }
}

/**
 * Cleanup all MCP clients (call on app shutdown)
 */
export async function cleanupAllShopifyMCP(): Promise<void> {
  for (const [domain, entry] of mcpClientCache.entries()) {
    try {
      await entry.client.close?.();
    } catch {
      // Ignore close errors
    }
  }
  mcpClientCache.clear();
  logger.info('[Shopify MCP] All clients disconnected');
}

// =============================================================================
// TOOL CONFIGURATION FOR MODES
// =============================================================================

/**
 * Shopify tool configuration for custom modes
 */
export interface ShopifyToolConfig {
  /** Whether Shopify tools are enabled for this mode */
  enabled: boolean;
  /** Specific tools to enable (empty = all available) */
  allowed_tools?: string[];
  /** Maximum number of product searches per conversation */
  max_searches?: number;
}

/**
 * Default Shopify tool configuration
 */
export const DEFAULT_SHOPIFY_TOOL_CONFIG: ShopifyToolConfig = {
  enabled: false,
  allowed_tools: [],
  max_searches: 10,
};

/**
 * Filter Shopify tools based on mode configuration
 */
export function filterShopifyToolsByConfig(
  tools: ShopifyMCPTools,
  config: ShopifyToolConfig
): ShopifyMCPTools {
  if (!config.enabled) {
    return {};
  }

  // If no specific tools are allowed, return all
  if (!config.allowed_tools || config.allowed_tools.length === 0) {
    return tools;
  }

  // Filter to only allowed tools
  const filtered: ShopifyMCPTools = {};
  for (const toolName of config.allowed_tools) {
    const prefixedName = toolName.startsWith('shopify_') ? toolName : `shopify_${toolName}`;
    if (tools[prefixedName]) {
      filtered[prefixedName] = tools[prefixedName];
    }
  }

  return filtered;
}

