import { useEffect } from 'react';
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

      // IMPORTANT: Check the TARGET conversation's is_flow status and created_at from database
      // Don't use the hook's isFlow/isChild as those track the CURRENT conversation
      const { data: targetConv, error: convError } = await supabase
        .from('conversations')
        .select('is_flow, parent_conversation_id, created_at')
        .eq('id', targetConversationId)
        .single();
      
      if (convError) {
        // Conversation doesn't exist or error - don't try to delete
        logger.log('[Cleanup] Could not fetch conversation:', targetConversationId, convError.message);
        return false;
      }
      
      // NEVER auto-delete flow conversations or child conversations
      if (targetConv?.is_flow || targetConv?.parent_conversation_id) {
        logger.log('[Cleanup] Skipping auto-delete for flow/child conversation:', targetConversationId);
        return false;
      }
      
      // SAFETY CHECK: Don't delete conversations created within the last 5 seconds
      // This prevents race conditions where user is actively typing their first message
      if (targetConv?.created_at) {
        const createdAt = new Date(targetConv.created_at).getTime();
        const now = Date.now();
        const ageInSeconds = (now - createdAt) / 1000;
        
        if (ageInSeconds < 5) {
          logger.log('[Cleanup] Skipping recently created conversation (age:', ageInSeconds.toFixed(1), 's):', targetConversationId);
          return false;
        }
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
   * Cleanup on unmount or when conversation changes (with delay to avoid blocking navigation)
   * CRITICAL: We intentionally do NOT include messageCount in dependencies.
   * 
   * The issue: When a user sends their first message, messageCount changes from 0 to 1.
   * If messageCount is in dependencies, the effect re-runs, triggering cleanup of the
   * PREVIOUS state (which had messageCount=0). This races with the message insert,
   * potentially deleting the conversation before the message is saved.
   * 
   * The fix: Only trigger cleanup when conversationId changes (switching conversations)
   * or on unmount. Always check the DB for the actual message count - the DB is authoritative.
   */
  useEffect(() => {
    if (!shouldAutoDelete || !conversationId) return;

    // Capture conversation ID at effect setup time
    const capturedConversationId = conversationId;

    return () => {
      // Cleanup when switching away from this conversation or on unmount
      // The DB check in checkAndDeleteIfEmpty will verify it's actually empty
      if (capturedConversationId) {
        // Longer delay (500ms) to ensure any in-flight message inserts complete
        // This prevents race conditions where cleanup runs before message is saved
        setTimeout(() => {
          (async () => {
            await checkAndDeleteIfEmpty(capturedConversationId, 'empty_on_unmount');
          })();
        }, 500);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAutoDelete, conversationId]); // Intentionally exclude messageCount - see comment above

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
    
    // Get all conversations for this brand (include created_at for age check)
    const { data: conversations, error: fetchError } = await supabase
      .from('conversations')
      .select('id, is_flow, parent_conversation_id, created_at')
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
        
        // SAFETY CHECK: Don't delete conversations created within the last 5 seconds
        // This prevents race conditions where user is actively typing their first message
        if (conv.created_at) {
          const createdAt = new Date(conv.created_at).getTime();
          const now = Date.now();
          const ageInSeconds = (now - createdAt) / 1000;
          
          if (ageInSeconds < 5) {
            logger.log('[BulkCleanup] Skipping recently created conversation (age:', ageInSeconds.toFixed(1), 's):', conv.id);
            continue;
          }
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

