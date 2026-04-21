import { tool, generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import type { ToolContext } from './types';

/**
 * Web search. Runs Anthropic's native `webSearch_20250305` tool through a
 * one-shot Haiku call against the Anthropic API directly (not the AI
 * Gateway — AI SDK v6 rejects provider-defined tool shapes coming back
 * through the gateway with "Unsupported tool type: provider-defined").
 *
 * Returns a compact list of hits as plain text so the caller can fold it
 * into its own reasoning without another tool round-trip.
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
      if (!process.env.ANTHROPIC_API_KEY) {
        return {
          ok: false as const,
          message:
            'Web search is not configured. Set ANTHROPIC_API_KEY so the tool can call Anthropic directly for the native web_search.',
        };
      }

      try {
        const { text } = await generateText({
          model: anthropic('claude-haiku-4-5-20251001'),
          system:
            'You are a web search assistant. Call web_search once for the user\'s query, ' +
            'then return the findings as a concise numbered list. Each entry: title on the ' +
            'first line, URL on the second line, a one-sentence summary on the third. ' +
            'No preamble, no closing remarks — just the list.',
          prompt: `Search the web for: ${query}\nReturn at most ${max_results} results.`,
          tools: {
            web_search: anthropic.tools.webSearch_20250305({
              maxUses: 1,
            }),
          },
        });
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
