import { tool } from 'ai';
import { z } from 'zod';
import { addMemory, isSupermemoryConfigured } from '@/lib/supermemory';
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
 * Persists a memory for this brand + user. Replaces the old inline
 * `[REMEMBER:key=value:category]` string protocol with a proper tool call,
 * which means the model only writes memory when it actually decides to —
 * not accidentally as part of formatted output.
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
      if (!ctx.brandId) {
        return { ok: false as const, message: 'No brand is scoped to this request.' };
      }
      if (!isSupermemoryConfigured()) {
        return { ok: false as const, message: 'Memory is not configured.' };
      }
      const result = await addMemory(ctx.brandId, ctx.userId, content, { title, category });
      return { ok: true as const, id: result.id, status: result.status };
    },
  });
}
