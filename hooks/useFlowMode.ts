import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FlowType, FlowOutline, FlowConversation, Conversation } from '@/types';
import { logger } from '@/lib/logger';

export interface UseFlowModeOptions {
  brandId: string;
  conversationId: string | null;
}

export interface UseFlowModeReturn {
  // State
  isFlowMode: boolean;
  setIsFlowMode: (value: boolean) => void;
  currentFlowType: FlowType | null;
  setCurrentFlowType: (type: FlowType | null) => void;
  flowOutline: FlowOutline | null;
  setFlowOutline: (outline: FlowOutline | null) => void;
  outlineApproved: boolean;
  setOutlineApproved: (approved: boolean) => void;
  flowChildren: Conversation[];
  setFlowChildren: (children: Conversation[]) => void;
  isGeneratingFlow: boolean;
  setIsGeneratingFlow: (generating: boolean) => void;
  flowGenerationProgress: number;
  setFlowGenerationProgress: (progress: number) => void;
  currentFlowEmailIndex: number;
  setCurrentFlowEmailIndex: (index: number) => void;
  // Functions
  loadFlowOutline: (conversationId: string) => Promise<void>;
  loadFlowChildren: (conversationId: string) => Promise<void>;
  approveOutline: (outlineId: string) => Promise<boolean>;
  resetFlowState: () => void;
}

/**
 * Hook to manage flow mode state and operations
 */
export function useFlowMode({ brandId, conversationId }: UseFlowModeOptions): UseFlowModeReturn {
  const supabase = createClient();
  
  // Flow mode state
  const [isFlowMode, setIsFlowMode] = useState(false);
  const [currentFlowType, setCurrentFlowType] = useState<FlowType | null>(null);
  const [flowOutline, setFlowOutline] = useState<FlowOutline | null>(null);
  const [outlineApproved, setOutlineApproved] = useState(false);
  const [flowChildren, setFlowChildren] = useState<Conversation[]>([]);
  const [isGeneratingFlow, setIsGeneratingFlow] = useState(false);
  const [flowGenerationProgress, setFlowGenerationProgress] = useState(0);
  const [currentFlowEmailIndex, setCurrentFlowEmailIndex] = useState(0);

  // Reset flow state
  const resetFlowState = useCallback(() => {
    setIsFlowMode(false);
    setCurrentFlowType(null);
    setFlowOutline(null);
    setOutlineApproved(false);
    setFlowChildren([]);
    setIsGeneratingFlow(false);
    setFlowGenerationProgress(0);
    setCurrentFlowEmailIndex(0);
  }, []);

  // Load flow outline for a conversation
  const loadFlowOutline = useCallback(async (convId: string) => {
    if (!convId) return;
    
    try {
      const { data, error } = await supabase
        .from('flow_outlines')
        .select('id, conversation_id, flow_type, outline_data, mermaid_chart, approved, approved_at, email_count, created_at, updated_at')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        logger.error('Error loading flow outline:', error);
        return;
      }
      
      if (data) {
        setFlowOutline(data);
        setOutlineApproved(data.approved || false);
        logger.debug('[Flow] Loaded outline for conversation:', convId);
      } else {
        setFlowOutline(null);
        setOutlineApproved(false);
      }
    } catch (error) {
      logger.error('Error loading flow outline:', error);
    }
  }, [supabase]);

  // Load child conversations for a flow
  const loadFlowChildren = useCallback(async (convId: string) => {
    if (!convId) return;
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, brand_id, user_id, title, model, conversation_type, mode, created_at, updated_at, is_pinned, is_archived, last_message_preview, last_message_at, parent_conversation_id, is_flow, flow_type, flow_sequence_order, flow_email_title')
        .eq('parent_conversation_id', convId)
        .order('flow_sequence_order', { ascending: true });
      
      if (error) {
        logger.error('Error loading flow children:', error);
        return;
      }
      
      setFlowChildren(data || []);
      logger.debug('[Flow] Loaded', data?.length || 0, 'child conversations');
    } catch (error) {
      logger.error('Error loading flow children:', error);
    }
  }, [supabase]);

  // Approve an outline
  const approveOutline = useCallback(async (outlineId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('flow_outlines')
        .update({
          approved: true,
          approved_at: new Date().toISOString()
        })
        .eq('id', outlineId);
      
      if (error) {
        logger.error('Error approving outline:', error);
        return false;
      }
      
      setOutlineApproved(true);
      if (flowOutline) {
        setFlowOutline({ ...flowOutline, approved: true, approved_at: new Date().toISOString() });
      }
      
      logger.debug('[Flow] Outline approved:', outlineId);
      return true;
    } catch (error) {
      logger.error('Error approving outline:', error);
      return false;
    }
  }, [supabase, flowOutline]);

  return {
    // State
    isFlowMode,
    setIsFlowMode,
    currentFlowType,
    setCurrentFlowType,
    flowOutline,
    setFlowOutline,
    outlineApproved,
    setOutlineApproved,
    flowChildren,
    setFlowChildren,
    isGeneratingFlow,
    setIsGeneratingFlow,
    flowGenerationProgress,
    setFlowGenerationProgress,
    currentFlowEmailIndex,
    setCurrentFlowEmailIndex,
    // Functions
    loadFlowOutline,
    loadFlowChildren,
    approveOutline,
    resetFlowState
  };
}


