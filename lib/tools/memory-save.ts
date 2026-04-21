import { tool } from 'ai';
import { z } from 'zod';
import { addMemory, isSupermemoryConfigured } from '@/lib/supermemory';
import { localMemoryAdd } from '@/lib/memory-local';
import { logger } from '@/lib/logger';
import type { ToolContext } from './types';

const MEMORY_CATEGORIES = [
  'user_preference',
  'brand_context',
  'campaign_info',
  'product_details',
  'decision',
  'fact',
] as const;

/**
 * Persists a memory for this brand + user. Writes to Supermemory when
 * configured, then mirrors to the local `memory_notes` table so the
 * brand-scoped memory list in the UI always reflects everything saved
 * in this app. When Supermemory isn't available, local is the only
 * store.
 */
export function buildMemorySaveTool(ctx: ToolContext) {
  return tool({
    description:
      "Save an important fact so you can recall it in future conversations. Use sparingly — only for durable facts about the brand, user, or campaign (preferences, past decisions, product specifics). Don't save transient chat details.",
    inputSchema: z.object({
      content: z.string().min(1).describe('The fact or detail to remember.'),
      category: z.enum(MEMORY_CATEGORIES).describe('Which bucket this memory belongs to.'),
      title: z.string().optional().describe('Short label for the memory.'),
    }),
    execute: async ({ content, category, title }) => {
      if (!ctx.userId) {
        return { ok: false as const, message: 'No user scope available.' };
      }
      let supermemoryId: string | null = null;
      if (isSupermemoryConfigured() && ctx.brandId) {
        try {
          const result = await addMemory(ctx.brandId, ctx.userId, content, { title, category });
          supermemoryId = result.id;
        } catch (err) {
          logger.warn('[memory_save] supermemory failed, falling back to local:', err);
        }
      }
      try {
        const { id } = await localMemoryAdd({
          userId: ctx.userId,
          brandId: ctx.brandId ?? null,
          content,
          category,
          title,
        });
        return {
          ok: true as const,
          id,
          supermemory_id: supermemoryId,
          source: supermemoryId ? ('both' as const) : ('local' as const),
        };
      } catch (err) {
        return { ok: false as const, message: (err as Error).message };
      }
    },
  });
}
