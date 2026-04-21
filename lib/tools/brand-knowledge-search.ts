import { tool } from 'ai';
import { z } from 'zod';
import { searchRelevantDocuments, buildRAGContext } from '@/lib/rag-service';
import type { ToolContext } from './types';

/**
 * Searches the brand's uploaded knowledge base (example emails, competitor
 * decks, research, testimonials). Uses the existing RAG pipeline.
 */
export function buildBrandKnowledgeSearchTool(ctx: ToolContext) {
  return tool({
    description:
      "Search the brand's uploaded documents (example emails, research, testimonials, competitor analyses). Call this when you need specifics about the brand's past work or positioning.",
    inputSchema: z.object({
      query: z.string().describe('What to look for in the brand knowledge base.'),
      limit: z.number().int().min(1).max(10).optional().default(3),
    }),
    execute: async ({ query, limit }) => {
      if (!ctx.brandId) {
        return { ok: false as const, message: 'No brand is scoped to this request.' };
      }
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return { ok: false as const, message: 'Embeddings are not configured on this deployment.' };
      }
      const docs = await searchRelevantDocuments(ctx.brandId, query, apiKey, limit ?? 3);
      if (docs.length === 0) {
        return { ok: true as const, matches: 0, context: '' };
      }
      return {
        ok: true as const,
        matches: docs.length,
        context: buildRAGContext(docs),
      };
    },
  });
}
