import Anthropic from '@anthropic-ai/sdk';
import { tool } from 'ai';
import { z } from 'zod';
import type { ToolContext } from './types';

/**
 * Web search. Runs Anthropic's native `web_search_20250305` tool through
 * a one-shot Haiku call using the raw @anthropic-ai/sdk, pointed at the
 * Vercel AI Gateway's Anthropic Messages API passthrough
 * (https://ai-gateway.vercel.sh) so billing stays in the gateway account.
 *
 * Why not the AI SDK? @ai-sdk/anthropic@2 emits v2-shaped provider
 * tools while ai@6 expects v3, so threading webSearch_20250305 through
 * generateText fails at build time. The raw SDK bypasses that mismatch.
 *
 * Why not direct Anthropic? Keeps a single billing relationship
 * (AI Gateway), avoids a second API key the user has to manage.
 *
 * Returns a compact list of hits as plain text so the caller can fold
 * it into its own reasoning without another tool round-trip.
 *
 * Requires AI_GATEWAY_API_KEY (or falls back to ANTHROPIC_API_KEY +
 * direct Anthropic if the gateway key isn't set).
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
      const gatewayKey = process.env.AI_GATEWAY_API_KEY;
      const directKey = process.env.ANTHROPIC_API_KEY;
      const apiKey = gatewayKey ?? directKey;
      if (!apiKey) {
        return {
          ok: false as const,
          message:
            'Web search is not configured. Set AI_GATEWAY_API_KEY (preferred) or ANTHROPIC_API_KEY.',
        };
      }

      // Route through AI Gateway when possible so billing stays unified;
      // fall back to api.anthropic.com when only the direct key is set.
      const usingGateway = Boolean(gatewayKey);
      const client = new Anthropic({
        apiKey,
        ...(usingGateway && { baseURL: 'https://ai-gateway.vercel.sh' }),
      });

      // Gateway expects provider-prefixed model ids; direct expects raw.
      const model = usingGateway
        ? 'anthropic/claude-haiku-4.5'
        : 'claude-haiku-4-5-20251001';

      try {
        const response = await client.messages.create({
          model,
          max_tokens: 2048,
          system:
            'You are a web search assistant. Call web_search once for the user\'s query, ' +
            'then return the findings as a concise numbered list. Each entry: title on the ' +
            'first line, URL on the second line, a one-sentence summary on the third. ' +
            'No preamble, no closing remarks — just the list.',
          // Cast: provider-defined tool typings drift across SDK minor
          // versions. The wire shape is stable, so we hand the SDK the
          // documented payload and bypass the type checker here.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 1 }] as any,
          messages: [
            {
              role: 'user',
              content: `Search the web for: ${query}\nReturn at most ${max_results} results.`,
            },
          ],
        });

        const text = response.content
          .map((block) => (block.type === 'text' ? (block as { text: string }).text : ''))
          .filter((s) => s.length > 0)
          .join('\n');

        if (!text) {
          return {
            ok: false as const,
            message: 'Search returned no text output.',
          };
        }
        return { ok: true as const, text };
      } catch (err) {
        return {
          ok: false as const,
          message: `Search failed: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  });
}
