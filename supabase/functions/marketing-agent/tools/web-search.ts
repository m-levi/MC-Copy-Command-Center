/**
 * Web search tool - Searches for market trends and competitive intelligence
 */

import { tool } from 'npm:ai@4'
import { z } from 'npm:zod@3'

const SEARCH_API_KEY = Deno.env.get('TAVILY_API_KEY') || Deno.env.get('SEARCH_API_KEY')

export function createWebSearchTool() {
  return tool({
    description: 'Search the web for market trends, competitor activity, and industry insights relevant to the brand',
    parameters: z.object({
      query: z.string().describe('Search query for market trends or competitor intelligence'),
      maxResults: z.number().default(5).describe('Maximum number of results to return'),
    }),
    execute: async ({ query, maxResults }) => {
      // Check if search is configured
      if (!SEARCH_API_KEY) {
        console.warn('[Web Search Tool] Search API not configured, skipping')
        return {
          success: true,
          results: [],
          count: 0,
          message: 'Web search not configured',
        }
      }

      try {
        // Using Tavily API (or fallback to another search API)
        const response = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            api_key: SEARCH_API_KEY,
            query,
            max_results: maxResults,
            search_depth: 'basic',
            include_answer: true,
            include_raw_content: false,
          }),
        })

        if (!response.ok) {
          console.error('[Web Search Tool] Search API error:', response.statusText)
          return {
            success: false,
            error: `Search API error: ${response.statusText}`,
            results: [],
            count: 0,
          }
        }

        const data = await response.json()
        const results = data.results || []

        // Format search results
        const formattedResults = results.map((result: any) => ({
          title: result.title,
          url: result.url,
          content: result.content || result.snippet,
          score: result.score,
        }))

        console.log(`[Web Search Tool] Found ${formattedResults.length} results for query: ${query}`)

        return {
          success: true,
          results: formattedResults,
          count: formattedResults.length,
          query,
          answer: data.answer, // Direct answer if available
        }
      } catch (error) {
        console.error('[Web Search Tool] Error searching web:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          results: [],
          count: 0,
        }
      }
    },
  })
}

