'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Conversation } from '@/types';
import { logger } from '@/lib/logger';

interface UseFlowChildrenOptions {
  conversationId: string;
  isFlow: boolean;
  isActive: boolean;
  currentConversationId?: string | null;
}

interface UseFlowChildrenReturn {
  flowChildren: Conversation[];
  flowChildrenCount: number;
  isExpanded: boolean;
  loadingChildren: boolean;
  setIsExpanded: (expanded: boolean) => void;
  toggleExpand: (e: React.MouseEvent) => void;
}

/**
 * Shared hook for managing flow conversation children.
 * Used by both ConversationCard and ConversationListItem to reduce duplication.
 */
export function useFlowChildren({
  conversationId,
  isFlow,
  isActive,
  currentConversationId = null,
}: UseFlowChildrenOptions): UseFlowChildrenReturn {
  const [isExpanded, setIsExpanded] = useState(false);
  const [flowChildren, setFlowChildren] = useState<Conversation[]>([]);
  const [flowChildrenCount, setFlowChildrenCount] = useState<number>(0);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const supabase = createClient();

  // Load flow children count on mount for flows
  useEffect(() => {
    if (isFlow && flowChildrenCount === 0) {
      loadFlowChildrenCount();
    }
  }, [isFlow]);

  const loadFlowChildrenCount = async () => {
    if (!isFlow) return;

    try {
      const { count } = await supabase
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('parent_conversation_id', conversationId);

      if (count !== null) {
        setFlowChildrenCount(count);
      }
    } catch (error) {
      logger.error('Error loading flow children count:', error);
    }
  };

  // Auto-expand if active flow or if a child is active
  useEffect(() => {
    const isChildActive = flowChildren.some(c => c.id === currentConversationId);
    if ((isActive || isChildActive) && isFlow) {
      setIsExpanded(true);
    }
  }, [isActive, isFlow, currentConversationId, flowChildren]);

  // Load children when expanded
  useEffect(() => {
    if (isExpanded && isFlow && flowChildren.length === 0 && !loadingChildren) {
      loadFlowChildren();
    }
  }, [isExpanded, isFlow]);

  const loadFlowChildren = async () => {
    if (!isFlow) return;

    setLoadingChildren(true);
    try {
      const { data } = await supabase
        .from('conversations')
        .select('id, brand_id, user_id, title, model, conversation_type, mode, created_at, updated_at, is_pinned, is_archived, last_message_preview, last_message_at, parent_conversation_id, is_flow, flow_type, flow_sequence_order, flow_email_title')
        .eq('parent_conversation_id', conversationId)
        .order('flow_sequence_order', { ascending: true });

      if (data) {
        setFlowChildren(data);
      }
    } catch (error) {
      logger.error('Error loading flow children:', error);
    } finally {
      setLoadingChildren(false);
    }
  };

  const toggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFlow) {
      setIsExpanded(prev => !prev);
    }
  }, [isFlow]);

  return {
    flowChildren,
    flowChildrenCount,
    isExpanded,
    loadingChildren,
    setIsExpanded,
    toggleExpand,
  };
}
