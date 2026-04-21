import { tool } from 'ai';
import { z } from 'zod';
import { searchMemories, isSupermemoryConfigured } from '@/lib/supermemory';
import { localMemorySearch } from '@/lib/memory-local';
import { logger } from '@/lib/logger';
import type { ToolContext } from './types';

/**
 * Pulls relevant memories for this brand + user. Prefers Supermemory when
 * configured; falls back to the DB-backed `memory_notes` table otherwise
 * so memory still works even without an external provider.
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
      if (!ctx.brandId && !ctx.userId) {
        return { ok: false as const, message: 'No user scope available.' };
      }
      const n = limit ?? 5;
      if (isSupermemoryConfigured() && ctx.brandId) {
        try {
          const results = await searchMemories(ctx.brandId, ctx.userId, query, n);
          return {
            ok: true as const,
            source: 'supermemory' as const,
            matches: results.length,
            memories: results.map((m) => ({ id: m.id, content: m.content, score: m.score })),
          };
        } catch (err) {
          logger.warn('[memory_recall] supermemory failed, falling back to local:', err);
        }
      }
      const rows = await localMemorySearch(ctx.userId, ctx.brandId ?? null, query, n);
      return {
        ok: true as const,
        source: 'local' as const,
        matches: rows.length,
        memories: rows.map((r) => ({
          id: r.id,
          content: r.content,
          score: r.score ?? 1,
          category: r.category,
          title: r.title,
        })),
      };
    },
  });
}
