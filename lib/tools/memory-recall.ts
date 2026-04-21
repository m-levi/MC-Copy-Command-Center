import { tool } from 'ai';
import { z } from 'zod';
import { searchMemories, isSupermemoryConfigured } from '@/lib/supermemory';
import type { ToolContext } from './types';

/**
 * Pulls relevant memories for this brand + user from Supermemory. Memories
 * persist across sessions and are scoped with the composite key
 * `brand_{brandId}_user_{userId}`.
 */
export function buildMemoryRecallTool(ctx: ToolContext) {
  return tool({
    description:
      'Recall facts previously saved about this brand or user (preferences, decisions, product details, campaign history). Call when the user references something from a past conversation.',
    inputSchema: z.object({
      query: z.string().describe('Natural-language description of what you want to remember.'),
      limit: z.number().int().min(1).max(20).optional().default(5),
    }),
    execute: async ({ query, limit }) => {
      if (!ctx.brandId) {
        return { ok: false as const, message: 'No brand is scoped to this request.' };
      }
      if (!isSupermemoryConfigured()) {
        return { ok: false as const, message: 'Memory is not configured.' };
      }
      const results = await searchMemories(ctx.brandId, ctx.userId, query, limit ?? 5);
      return {
        ok: true as const,
        matches: results.length,
        memories: results.map((m) => ({ id: m.id, content: m.content, score: m.score })),
      };
    },
  });
}
