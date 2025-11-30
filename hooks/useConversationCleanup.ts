import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { trackEvent } from '@/lib/analytics';
import { logger } from '@/lib/logger';

interface UseConversationCleanupOptions {
  conversationId: string | null;
  messageCount: number;
  isFlow?: boolean;
  isChild?: boolean;
  shouldAutoDelete?: boolean;
}

/**
 * Hook to handle automatic cleanup of empty conversations
 * Consolidates the repeated auto-delete logic from 3 different places
 */
export function useConversationCleanup({
  conversationId,
  messageCount,
  isFlow = false,
  isChild = false,
  shouldAutoDelete = true
}: UseConversationCleanupOptions) {
  const supabase = createClient();
  
  // Store values in refs to avoid stale closures
  const cleanupDataRef = useRef({ conversationId, messageCount, isFlow, isChild });
  
  // Update refs when values change
  useEffect(() => {
    cleanupDataRef.current = { conversationId, messageCount, isFlow, isChild };
  }, [conversationId, messageCount, isFlow, isChild]);

  /**
   * Check if a conversation is empty and delete it if appropriate
   */
  const checkAndDeleteIfEmpty = async (
    targetConversationId: string,
    reason: 'empty_on_unmount' | 'empty_on_new_click' | 'empty_on_switch'
  ): Promise<boolean> => {
    try {
      // Skip temporary conversations that haven't been saved to database yet
      if (targetConversationId.startsWith('temp-')) {
        logger.log('[Cleanup] Skipping temporary conversation:', targetConversationId);
        return false;
      }

      // NEVER auto-delete flow conversations or child conversations
      if (isFlow || isChild) {
        logger.log('[Cleanup] Skipping auto-delete for flow/child conversation:', targetConversationId);
        return false;
      }

      // Verify conversation is empty in database before deleting
      const { count, error: countError } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', targetConversationId);
      
      if (countError) {
        // Don't log errors for conversations that might not exist yet
        logger.log('[Cleanup] Could not check message count for conversation', targetConversationId, '- may not exist in database yet');
        return false;
      }
      
      if (count === 0) {
        logger.log('[Cleanup] Conversation is empty in database, auto-deleting:', targetConversationId);
        
        const { error: deleteError } = await supabase
          .from('conversations')
          .delete()
          .eq('id', targetConversationId);
        
        if (!deleteError) {
          trackEvent('conversation_auto_deleted', { 
            conversationId: targetConversationId,
            reason 
          });
          return true;
        } else {
          logger.error('[Cleanup] Error deleting conversation:', deleteError);
          return false;
        }
      } else {
        logger.log(`[Cleanup] Conversation has ${count} messages, NOT deleting`, targetConversationId);
        return false;
      }
    } catch (error) {
      logger.error('[Cleanup] Error during conversation cleanup:', error);
      return false;
    }
  };

  /**
   * Cleanup on unmount (with delay to avoid blocking navigation)
   */
  useEffect(() => {
    if (!shouldAutoDelete) return;

    return () => {
      const { conversationId: id, messageCount: count, isFlow: flow, isChild: child } = cleanupDataRef.current;
      
      // Only cleanup if conversation exists, is empty, and is not a flow/child
      if (id && count === 0 && !flow && !child) {
        // Small delay to avoid blocking navigation
        setTimeout(() => {
          (async () => {
            await checkAndDeleteIfEmpty(id, 'empty_on_unmount');
          })();
        }, 100);
      }
    };
  }, [shouldAutoDelete]);

  return {
    /**
     * Manually trigger cleanup check for a conversation
     * Useful when switching conversations or creating new ones
     */
    cleanupIfEmpty: checkAndDeleteIfEmpty
  };
}

/**
 * Helper to check if conversation should be auto-deleted
 * Used before switching or creating new conversations
 */
export async function shouldDeleteEmptyConversation(
  conversationId: string | null,
  messageCount: number,
  isFlow: boolean = false,
  isChild: boolean = false
): Promise<boolean> {
  // Don't delete if no conversation, has messages, or is a flow/child
  if (!conversationId || messageCount > 0 || isFlow || isChild) {
    return false;
  }

  // Skip temporary conversations that haven't been saved to database yet
  if (conversationId.startsWith('temp-')) {
    return false;
  }

  // Additional database check for safety
  const supabase = createClient();
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId);
  
  if (error) {
    // Don't log errors for conversations that might not exist yet
    logger.log('[Cleanup] Could not check message count for conversation', conversationId, '- may not exist in database yet');
    return false;
  }

  return count === 0;
}

/**
 * Bulk cleanup of all empty conversations for a brand
 * Runs on page load to clean up any accumulated empty conversations
 * ONLY deletes conversations with exactly 0 messages
 * @param brandId - The brand ID to cleanup conversations for
 * @param excludeConversationId - Optional conversation ID to exclude from cleanup (e.g., currently selected)
 */
export async function bulkCleanupEmptyConversations(brandId: string, excludeConversationId?: string | null): Promise<number> {
  try {
    const supabase = createClient();
    
    // Get all conversations for this brand
    const { data: conversations, error: fetchError } = await supabase
      .from('conversations')
      .select('id, is_flow, parent_conversation_id')
      .eq('brand_id', brandId);
    
    if (fetchError || !conversations) {
      logger.error('[BulkCleanup] Error fetching conversations:', 
        fetchError ? (fetchError.message || String(fetchError)) : 'No conversations returned',
        fetchError
      );
      return 0;
    }

    let deletedCount = 0;
    
    // Check each conversation for messages
    for (const conv of conversations) {
      try {
        // Skip if conversation is invalid
        if (!conv || !conv.id) {
          continue;
        }
        
        // NEVER delete the currently selected conversation (prevents race condition)
        if (excludeConversationId && conv.id === excludeConversationId) {
          logger.log('[BulkCleanup] Skipping excluded conversation:', conv.id);
          continue;
        }
        
        // NEVER delete flow conversations or child conversations
        if (conv.is_flow || conv.parent_conversation_id) {
          continue;
        }
        
        // Count messages for this conversation
        const { count, error: countError } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conv.id);
        
        if (countError) {
          // Only log non-abort errors
          if (!countError.message?.includes('aborted') && !countError.message?.includes('Failed to fetch')) {
            logger.error('[BulkCleanup] Error counting messages for conversation', conv.id, ':', countError);
          }
          continue;
        }
        
        // Only delete if EXACTLY 0 messages
        if (count === 0) {
          const { error: deleteError } = await supabase
            .from('conversations')
            .delete()
            .eq('id', conv.id);
          
          if (!deleteError) {
            deletedCount++;
            logger.log('[BulkCleanup] Deleted empty conversation:', conv.id);
          } else {
            // Only log non-abort errors
            if (!deleteError.message?.includes('aborted') && !deleteError.message?.includes('Failed to fetch')) {
              logger.error('[BulkCleanup] Error deleting conversation:', deleteError);
            }
          }
        }
      } catch (error) {
        // Silently continue on network errors to avoid polluting console
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes('aborted') && !errorMessage.includes('Failed to fetch')) {
          logger.error('[BulkCleanup] Unexpected error processing conversation', conv.id, ':', error);
        }
        continue;
      }
    }
    
    if (deletedCount > 0) {
      logger.log(`[BulkCleanup] Cleaned up ${deletedCount} empty conversations for brand ${brandId}`);
      trackEvent('bulk_cleanup_completed', { brandId, deletedCount });
    }
    
    return deletedCount;
  } catch (error) {
    // Only log non-network errors to avoid console pollution
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (!errorMessage.includes('aborted') && !errorMessage.includes('Failed to fetch')) {
      logger.error('[BulkCleanup] Error during bulk cleanup:', error);
    }
    return 0;
  }
}

