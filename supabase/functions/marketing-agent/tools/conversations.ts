/**
 * Conversations fetching tool - Retrieves recent chat conversations for analysis
 */

import { tool } from 'npm:ai@4'
import { z } from 'npm:zod@3'
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export function createConversationsTool(supabase: SupabaseClient) {
  return tool({
    description: 'Fetch recent chat conversations to understand campaign patterns, topics, and email strategies being used',
    parameters: z.object({
      brandId: z.string().describe('The brand ID to fetch conversations for'),
      limit: z.number().default(10).describe('Maximum number of conversations to fetch'),
      hoursBack: z.number().default(24).describe('How many hours back to fetch conversations'),
      includeMessages: z.boolean().default(true).describe('Include message content from conversations'),
    }),
    execute: async ({ brandId, limit, hoursBack, includeMessages }) => {
      try {
        const cutoffDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString()

        // Fetch conversations
        const { data: conversations, error: convError } = await supabase
          .from('conversations')
          .select('id, title, mode, conversation_type, created_at, last_message_preview, updated_at')
          .eq('brand_id', brandId)
          .gte('created_at', cutoffDate)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (convError) {
          console.error('[Conversations Tool] Error fetching conversations:', convError)
          return {
            success: false,
            error: convError.message,
            conversations: [],
            count: 0,
          }
        }

        if (!conversations || conversations.length === 0) {
          return {
            success: true,
            conversations: [],
            count: 0,
            message: 'No recent conversations found',
          }
        }

        // If includeMessages, fetch messages for each conversation
        const formattedConvs = await Promise.all(
          conversations.map(async (conv) => {
            let messages: any[] = []

            if (includeMessages) {
              const { data: msgs } = await supabase
                .from('messages')
                .select('role, content, created_at')
                .eq('conversation_id', conv.id)
                .order('created_at', { ascending: true })
                .limit(10) // Limit messages per conversation

              if (msgs) {
                messages = msgs.map(msg => ({
                  role: msg.role,
                  // Truncate long messages
                  content: msg.content.length > 500 ? msg.content.substring(0, 500) + '...' : msg.content,
                  timestamp: msg.created_at,
                }))
              }
            }

            return {
              title: conv.title,
              mode: conv.mode,
              type: conv.conversation_type,
              preview: conv.last_message_preview,
              createdAt: conv.created_at,
              updatedAt: conv.updated_at,
              messages: includeMessages ? messages : undefined,
              messageCount: messages.length,
            }
          })
        )

        console.log(`[Conversations Tool] Fetched ${formattedConvs.length} conversations for brand ${brandId}`)

        return {
          success: true,
          conversations: formattedConvs,
          count: formattedConvs.length,
          timeRange: `${hoursBack} hours`,
        }
      } catch (error) {
        console.error('[Conversations Tool] Unexpected error:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          conversations: [],
          count: 0,
        }
      }
    },
  })
}

