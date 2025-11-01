import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { trackEvent } from '@/lib/analytics';

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
      // NEVER auto-delete flow conversations or child conversations
      if (isFlow || isChild) {
        console.log('[Cleanup] Skipping auto-delete for flow/child conversation:', targetConversationId);
        return false;
      }

      // Verify conversation is empty in database before deleting
      const { count, error: countError } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', targetConversationId);
      
      if (countError) {
        console.error('[Cleanup] Error checking message count:', countError);
        return false;
      }
      
      if (count === 0) {
        console.log('[Cleanup] Conversation is empty in database, auto-deleting:', targetConversationId);
        
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
          console.error('[Cleanup] Error deleting conversation:', deleteError);
          return false;
        }
      } else {
        console.log(`[Cleanup] Conversation has ${count} messages, NOT deleting`, targetConversationId);
        return false;
      }
    } catch (error) {
      console.error('[Cleanup] Error during conversation cleanup:', error);
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

  // Additional database check for safety
  const supabase = createClient();
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId);
  
  if (error) {
    console.error('[Cleanup] Error checking message count:', error);
    return false;
  }

  return count === 0;
}

