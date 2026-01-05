/**
 * Document fetching tool - Retrieves brand documents for analysis
 */

import { tool } from 'npm:ai@4'
import { z } from 'npm:zod@3'
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export function createDocumentsTool(supabase: SupabaseClient) {
  return tool({
    description: 'Fetch recent brand documents including call notes, research, PDFs, and uploaded files for analysis',
    parameters: z.object({
      brandId: z.string().describe('The brand ID to fetch documents for'),
      limit: z.number().default(20).describe('Maximum number of documents to fetch'),
      hoursBack: z.number().default(24).describe('How many hours back to fetch documents (24 for daily, 168 for weekly)'),
      categories: z.array(z.string()).optional().describe('Specific document categories to filter by'),
    }),
    execute: async ({ brandId, limit, hoursBack, categories }) => {
      try {
        const cutoffDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString()

        let query = supabase
          .from('brand_documents_v2')
          .select('id, title, doc_type, category, description, content, extracted_text, tags, created_at')
          .eq('brand_id', brandId)
          .gte('created_at', cutoffDate)
          .eq('is_indexed', true)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (categories && categories.length > 0) {
          query = query.in('category', categories)
        }

        const { data: documents, error } = await query

        if (error) {
          console.error('[Documents Tool] Error fetching documents:', error)
          return {
            success: false,
            error: error.message,
            documents: [],
            count: 0,
          }
        }

        // Format documents for LLM consumption
        const formattedDocs = documents?.map(doc => {
          const content = doc.content || doc.extracted_text || ''
          return {
            title: doc.title,
            type: doc.doc_type,
            category: doc.category,
            description: doc.description,
            // Truncate long content
            content: content.length > 2000 ? content.substring(0, 2000) + '...' : content,
            tags: doc.tags,
            date: doc.created_at,
          }
        }) || []

        console.log(`[Documents Tool] Fetched ${formattedDocs.length} documents for brand ${brandId}`)

        return {
          success: true,
          documents: formattedDocs,
          count: formattedDocs.length,
          timeRange: `${hoursBack} hours`,
        }
      } catch (error) {
        console.error('[Documents Tool] Unexpected error:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          documents: [],
          count: 0,
        }
      }
    },
  })
}

