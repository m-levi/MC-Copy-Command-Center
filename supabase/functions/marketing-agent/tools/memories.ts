/**
 * Memories search tool - Searches brand memories via Supermemory
 */

import { tool } from 'npm:ai@4'
import { z } from 'npm:zod@3'

const SUPERMEMORY_API_URL = Deno.env.get('SUPERMEMORY_API_URL') || 'https://api.supermemory.ai'
const SUPERMEMORY_API_KEY = Deno.env.get('SUPERMEMORY_API_KEY')

export function createMemoriesTool() {
  return tool({
    description: 'Search brand memories for relevant context, preferences, and historical insights stored via Supermemory',
    parameters: z.object({
      brandId: z.string().describe('The brand ID to search memories for'),
      userId: z.string().describe('The user ID associated with the brand'),
      query: z.string().describe('Search query to find relevant memories'),
      limit: z.number().default(10).describe('Maximum number of memories to return'),
    }),
    execute: async ({ brandId, userId, query, limit }) => {
      // Check if Supermemory is configured
      if (!SUPERMEMORY_API_KEY) {
        console.warn('[Memories Tool] Supermemory not configured, skipping')
        return {
          success: true,
          memories: [],
          count: 0,
          message: 'Supermemory not configured',
        }
      }

      try {
        // Composite user ID for brand-specific memories
        const compositeUserId = `${brandId}_${userId}`

        const response = await fetch(`${SUPERMEMORY_API_URL}/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPERMEMORY_API_KEY}`,
          },
          body: JSON.stringify({
            userId: compositeUserId,
            query,
            limit,
          }),
        })

        if (!response.ok) {
          console.error('[Memories Tool] Supermemory API error:', response.statusText)
          return {
            success: false,
            error: `Supermemory API error: ${response.statusText}`,
            memories: [],
            count: 0,
          }
        }

        const data = await response.json()
        const memories = data.results || []

        // Format memories for LLM
        const formattedMemories = memories.map((mem: any) => ({
          content: mem.content || mem.text,
          metadata: mem.metadata,
          relevance: mem.score,
          timestamp: mem.timestamp || mem.created_at,
        }))

        console.log(`[Memories Tool] Found ${formattedMemories.length} memories for brand ${brandId}`)

        return {
          success: true,
          memories: formattedMemories,
          count: formattedMemories.length,
          query,
        }
      } catch (error) {
        console.error('[Memories Tool] Error searching memories:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          memories: [],
          count: 0,
        }
      }
    },
  })
}

