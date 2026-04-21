import Anthropic from '@anthropic-ai/sdk';
import { tool } from 'ai';
import { z } from 'zod';
import type { ToolContext } from './types';

/**
 * Web search. Runs Anthropic's native `web_search_20250305` tool through
 * a one-shot Haiku call using the raw @anthropic-ai/sdk (NOT the AI SDK
 * layer — @ai-sdk/anthropic@2 emits v2-shaped provider tools which are
 * incompatible with ai@6's v3 tool shape, and the gateway doesn't
 * forward provider-defined tools either). We bypass both and call
 * api.anthropic.com directly.
 *
 * Returns a compact list of hits as plain text so the caller can fold
 * it into its own reasoning without another tool round-trip.
 *
 * Requires ANTHROPIC_API_KEY.
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
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return {
          ok: false as const,
          message:
            'Web search is not configured. Set ANTHROPIC_API_KEY so the tool can call Anthropic directly for the native web_search.',
        };
      }

      try {
        const client = new Anthropic({ apiKey });
        const response = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2048,
          system:
            'You are a web search assistant. Call web_search once for the user\'s query, ' +
            'then return the findings as a concise numbered list. Each entry: title on the ' +
            'first line, URL on the second line, a one-sentence summary on the third. ' +
            'No preamble, no closing remarks — just the list.',
          // Cast: @anthropic-ai/sdk typings for the web_search tool vary
          // across minor versions; the wire-format payload is stable, so
          // we hand the SDK the documented shape and bypass the type
          // checker for this one call.
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
