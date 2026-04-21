import { tool } from 'ai';
import { z } from 'zod';
import type { ToolContext } from './types';

/**
 * Web search. Uses Anthropic's native web_search tool when the provider is
 * Anthropic; for other providers the AI Gateway routes to its own search.
 * Because Anthropic's tool is declared through the provider object (not the
 * SDK's tool() helper) we build a thin wrapper that just calls fetch
 * against the gateway's `/web_search` endpoint when needed — model-native
 * path is taken care of by ai-providers.ts createWebSearchTool().
 */
export function buildWebSearchTool(_ctx: ToolContext) {
  return tool({
    description:
      'Search the public web for current information (news, products, competitor prices, recent events). Prefer brand_knowledge_search for anything about the brand itself.',
    inputSchema: z.object({
      query: z.string().describe('The web query.'),
      max_results: z.number().int().min(1).max(10).optional().default(5),
    }),
    execute: async ({ query, max_results }) => {
      const apiKey = process.env.AI_GATEWAY_API_KEY ?? process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return { ok: false as const, message: 'Web search is not configured.' };
      }
      const endpoint = process.env.AI_GATEWAY_WEB_SEARCH_URL;
      if (!endpoint) {
        return {
          ok: false as const,
          message:
            'Web search endpoint is not configured. Set AI_GATEWAY_WEB_SEARCH_URL or rely on the model-native tool.',
        };
      }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ query, max_results }),
      });
      if (!res.ok) {
        return { ok: false as const, message: `Search failed: ${res.status}` };
      }
      const data = (await res.json()) as { results?: Array<{ title: string; url: string; snippet: string }> };
      return { ok: true as const, results: data.results ?? [] };
    },
  });
}
