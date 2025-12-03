import { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FlowType, FlowOutline, Conversation, FlowOutlineData } from '@/types';
import { logger } from '@/lib/logger';

/**
 * Flow status state machine:
 * - idle: No flow active
 * - selecting_type: Flow conversation created, waiting for user to select flow type
 * - chatting: User selected type, AI is generating/refining outline
 * - outline_ready: AI has generated an outline, waiting for approval
 * - generating_emails: User approved, emails being generated
 * - complete: All emails generated successfully
 */
export type FlowStatus = 
  | 'idle' 
  | 'selecting_type' 
  | 'chatting' 
  | 'outline_ready' 
  | 'generating_emails' 
  | 'complete';

/**
 * Pending actions that need to be executed after state transitions
 */
export type FlowPendingAction = 
  | 'send_type_selection_message'  // Send the flow type cards message
  | 'send_outline_request'         // Send request to generate outline
  | 'start_email_generation'       // Start generating emails
  | null;

export interface UseFlowModeOptions {
  brandId: string;
  conversationId: string | null;
  currentConversation: Conversation | null;
}

export interface FlowGenerationProgress {
  current: number;
  total: number;
  currentEmailTitle: string | null;
  completedEmails: string[]; // IDs of completed child conversations
}

export interface UseFlowModeReturn {
  // Core state
  status: FlowStatus;
  flowType: FlowType | null;
  outline: FlowOutline | null;
  outlineData: FlowOutlineData | null;
  children: Conversation[];
  generationProgress: FlowGenerationProgress;
  pendingAction: FlowPendingAction;
  
  // Computed/derived state
  isFlowConversation: boolean;
  isOutlineApproved: boolean;
  canApproveOutline: boolean;
  
  // State setters (for external control when needed)
  setStatus: (status: FlowStatus) => void;
  setFlowType: (type: FlowType | null) => void;
  setOutlineData: (data: FlowOutlineData | null) => void;
  setPendingAction: (action: FlowPendingAction) => void;
  clearPendingAction: () => void;
  
  // Actions
  initializeFlowConversation: () => Promise<string | null>;
  selectFlowType: (type: FlowType) => Promise<boolean>;
  loadFlowData: (conversationId: string) => Promise<void>;
  saveOutline: (outlineData: FlowOutlineData) => Promise<FlowOutline | null>;
  approveAndGenerateEmails: () => Promise<boolean>;
  resetFlowState: () => void;
  
  // Legacy compatibility (will be removed after migration)
  flowOutline: FlowOutline | null;
  setFlowOutline: (outline: FlowOutline | null) => void;
  flowChildren: Conversation[];
  setFlowChildren: (children: Conversation[]) => void;
  isGeneratingFlow: boolean;
  setIsGeneratingFlow: (generating: boolean) => void;
  flowGenerationProgress: number;
  setFlowGenerationProgress: (progress: number) => void;
  loadFlowOutline: (conversationId: string) => Promise<void>;
  loadFlowChildren: (conversationId: string) => Promise<void>;
  approveOutline: (outlineId: string) => Promise<boolean>;
}

/**
 * Central hook for managing all flow-related state and operations.
 * Uses a state machine approach to ensure consistent state transitions.
 */
export function useFlowMode({ 
  brandId, 
  conversationId, 
  currentConversation 
}: UseFlowModeOptions): UseFlowModeReturn {
  const supabase = createClient();
  
  // Core state
  const [status, setStatus] = useState<FlowStatus>('idle');
  const [flowType, setFlowType] = useState<FlowType | null>(null);
  const [outline, setOutline] = useState<FlowOutline | null>(null);
  const [outlineData, setOutlineData] = useState<FlowOutlineData | null>(null);
  const [children, setChildren] = useState<Conversation[]>([]);
  const [generationProgress, setGenerationProgress] = useState<FlowGenerationProgress>({
    current: 0,
    total: 0,
    currentEmailTitle: null,
    completedEmails: []
  });
  const [pendingAction, setPendingAction] = useState<FlowPendingAction>(null);
  
  // Track if we've synced with DB for this conversation
  const syncedConversationRef = useRef<string | null>(null);
  
  // Computed state
  const isFlowConversation = currentConversation?.is_flow === true;
  const isOutlineApproved = outline?.approved === true;
  const canApproveOutline = status === 'outline_ready' && outlineData !== null && !isOutlineApproved;
  
  /**
   * Sync flow state with database when conversation changes
   */
  useEffect(() => {
    const syncWithDatabase = async () => {
      if (!conversationId || !currentConversation) {
        // No conversation - reset to idle
        if (status !== 'idle') {
          resetFlowState();
        }
        return;
      }
      
      // Skip if already synced for this conversation
      if (syncedConversationRef.current === conversationId) {
        return;
      }
      
      // Not a flow conversation - ensure we're idle
      if (!currentConversation.is_flow) {
        if (status !== 'idle') {
          resetFlowState();
        }
        syncedConversationRef.current = conversationId;
        return;
      }
      
      // This is a flow conversation - sync state from DB
      logger.log('[FlowMode] Syncing state for flow conversation:', conversationId);
      
      try {
        // Load outline
        const { data: outlineRecord } = await supabase
          .from('flow_outlines')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        // Load children
        const { data: childrenRecords } = await supabase
          .from('conversations')
          .select('*')
          .eq('parent_conversation_id', conversationId)
          .order('flow_sequence_order', { ascending: true });
        
        // Determine status based on DB state
        const hasOutline = !!outlineRecord;
        const isApproved = outlineRecord?.approved === true;
        const hasChildren = (childrenRecords?.length || 0) > 0;
        const expectedEmailCount = outlineRecord?.email_count || 0;
        const allEmailsGenerated = hasChildren && childrenRecords!.length >= expectedEmailCount;
        
        // Set flow type from conversation or outline
        const dbFlowType = currentConversation.flow_type || outlineRecord?.flow_type || null;
        setFlowType(dbFlowType);
        
        // Set outline data
        if (outlineRecord) {
          setOutline(outlineRecord);
          setOutlineData(outlineRecord.outline_data);
        } else {
          setOutline(null);
          setOutlineData(null);
        }
        
        // Set children
        setChildren(childrenRecords || []);
        
        // Determine and set status
        let newStatus: FlowStatus;
        if (allEmailsGenerated && isApproved) {
          newStatus = 'complete';
        } else if (isApproved && hasChildren) {
          // Partially generated or generation in progress
          newStatus = 'generating_emails';
          setGenerationProgress({
            current: childrenRecords?.length || 0,
            total: expectedEmailCount,
            currentEmailTitle: null,
            completedEmails: childrenRecords?.map(c => c.id) || []
          });
        } else if (hasOutline && !isApproved) {
          newStatus = 'outline_ready';
        } else if (dbFlowType) {
          newStatus = 'chatting';
        } else {
          newStatus = 'selecting_type';
          // Set pending action to show flow type cards
          setPendingAction('send_type_selection_message');
        }
        
        setStatus(newStatus);
        syncedConversationRef.current = conversationId;
        
        logger.log('[FlowMode] Synced state:', {
          status: newStatus,
          flowType: dbFlowType,
          hasOutline,
          isApproved,
          childCount: childrenRecords?.length || 0
        });
        
      } catch (error) {
        logger.error('[FlowMode] Error syncing with database:', error);
      }
    };
    
    syncWithDatabase();
  }, [conversationId, currentConversation?.is_flow, currentConversation?.flow_type]);
  
  /**
   * Reset all flow state to initial values
   */
  const resetFlowState = useCallback(() => {
    setStatus('idle');
    setFlowType(null);
    setOutline(null);
    setOutlineData(null);
    setChildren([]);
    setGenerationProgress({
      current: 0,
      total: 0,
      currentEmailTitle: null,
      completedEmails: []
    });
    setPendingAction(null);
    syncedConversationRef.current = null;
  }, []);
  
  /**
   * Clear the pending action (call after handling it)
   */
  const clearPendingAction = useCallback(() => {
    setPendingAction(null);
  }, []);
  
  /**
   * Initialize a new flow conversation in the database
   * Returns the new conversation ID or null on failure
   */
  const initializeFlowConversation = useCallback(async (): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        logger.error('[FlowMode] No user found');
        return null;
      }
      
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          brand_id: brandId,
          user_id: user.id,
          title: 'New Flow',
          model: 'anthropic/claude-sonnet-4.5',
          conversation_type: 'email',
          mode: 'email_copy',
          is_flow: true,
          flow_type: null // Will be set when user selects type
        })
        .select()
        .single();
      
      if (error) {
        logger.error('[FlowMode] Error creating flow conversation:', error);
        return null;
      }
      
      logger.log('[FlowMode] Created flow conversation:', data.id);
      setStatus('selecting_type');
      setPendingAction('send_type_selection_message');
      
      return data.id;
    } catch (error) {
      logger.error('[FlowMode] Error initializing flow:', error);
      return null;
    }
  }, [supabase, brandId]);
  
  /**
   * Update the flow type for the current conversation
   */
  const selectFlowType = useCallback(async (type: FlowType): Promise<boolean> => {
    if (!conversationId) {
      logger.error('[FlowMode] No conversation ID for selectFlowType');
      return false;
    }
    
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ flow_type: type })
        .eq('id', conversationId);
      
      if (error) {
        logger.error('[FlowMode] Error updating flow type:', error);
        return false;
      }
      
      setFlowType(type);
      setStatus('chatting');
      setPendingAction('send_outline_request');
      
      logger.log('[FlowMode] Flow type selected:', type);
      return true;
    } catch (error) {
      logger.error('[FlowMode] Error selecting flow type:', error);
      return false;
    }
  }, [supabase, conversationId]);
  
  /**
   * Load flow data (outline + children) for a conversation
   */
  const loadFlowData = useCallback(async (convId: string) => {
    if (!convId) return;
    
    try {
      // Load outline
      const { data: outlineRecord, error: outlineError } = await supabase
        .from('flow_outlines')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (outlineError) {
        logger.error('[FlowMode] Error loading outline:', outlineError);
      } else if (outlineRecord) {
        setOutline(outlineRecord);
        setOutlineData(outlineRecord.outline_data);
      }
      
      // Load children
      const { data: childrenRecords, error: childrenError } = await supabase
        .from('conversations')
        .select('*')
        .eq('parent_conversation_id', convId)
        .order('flow_sequence_order', { ascending: true });
      
      if (childrenError) {
        logger.error('[FlowMode] Error loading children:', childrenError);
      } else {
        setChildren(childrenRecords || []);
      }
      
    } catch (error) {
      logger.error('[FlowMode] Error loading flow data:', error);
    }
  }, [supabase]);
  
  /**
   * Save a flow outline to the database
   */
  const saveOutline = useCallback(async (data: FlowOutlineData): Promise<FlowOutline | null> => {
    if (!conversationId) {
      logger.error('[FlowMode] No conversation ID for saveOutline');
      return null;
    }
    
    try {
      // Generate mermaid chart
      const { generateMermaidChart } = await import('@/lib/mermaid-generator');
      const mermaidChart = generateMermaidChart(data);
      
      const { data: savedOutline, error } = await supabase
        .from('flow_outlines')
        .upsert({
          conversation_id: conversationId,
          flow_type: data.flowType,
          outline_data: data,
          mermaid_chart: mermaidChart,
          approved: false,
          email_count: data.emails.length
        }, {
          onConflict: 'conversation_id'
        })
        .select()
        .single();
      
      if (error) {
        logger.error('[FlowMode] Error saving outline:', error);
        return null;
      }
      
      setOutline(savedOutline);
      setOutlineData(data);
      setStatus('outline_ready');
      
      logger.log('[FlowMode] Outline saved:', savedOutline.id);
      return savedOutline;
    } catch (error) {
      logger.error('[FlowMode] Error saving outline:', error);
      return null;
    }
  }, [supabase, conversationId]);
  
  /**
   * Approve the outline and start generating emails
   */
  const approveAndGenerateEmails = useCallback(async (): Promise<boolean> => {
    if (!outline || !outlineData || !conversationId) {
      logger.error('[FlowMode] Missing data for approveAndGenerateEmails');
      return false;
    }
    
    try {
      // First, approve the outline
      const { error: approveError } = await supabase
        .from('flow_outlines')
        .update({
          approved: true,
          approved_at: new Date().toISOString()
        })
        .eq('id', outline.id);
      
      if (approveError) {
        logger.error('[FlowMode] Error approving outline:', approveError);
        return false;
      }
      
      // Update local state
      setOutline({ ...outline, approved: true, approved_at: new Date().toISOString() });
      setStatus('generating_emails');
      setGenerationProgress({
        current: 0,
        total: outlineData.emails.length,
        currentEmailTitle: outlineData.emails[0]?.title || null,
        completedEmails: []
      });
      
      // Call the generate-emails API
      const response = await fetch('/api/flows/generate-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          flowType: outlineData.flowType,
          outline: outlineData,
          model: 'anthropic/claude-sonnet-4.5'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        logger.error('[FlowMode] Error generating emails:', errorData);
        return false;
      }
      
      const result = await response.json();
      
      // Reload children to get the generated emails
      await loadFlowData(conversationId);
      
      setStatus('complete');
      setGenerationProgress(prev => ({
        ...prev,
        current: result.generated,
        completedEmails: result.children || []
      }));
      
      logger.log('[FlowMode] Emails generated:', result);
      return true;
    } catch (error) {
      logger.error('[FlowMode] Error in approveAndGenerateEmails:', error);
      return false;
    }
  }, [supabase, outline, outlineData, conversationId, loadFlowData]);
  
  // ============================================
  // Legacy compatibility methods (for migration)
  // ============================================
  
  const loadFlowOutline = useCallback(async (convId: string) => {
    await loadFlowData(convId);
  }, [loadFlowData]);
  
  const loadFlowChildren = useCallback(async (convId: string) => {
    if (!convId) return;
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('parent_conversation_id', convId)
        .order('flow_sequence_order', { ascending: true });
      
      if (error) {
        logger.error('[FlowMode] Error loading children:', error);
        return;
      }
      
      setChildren(data || []);
    } catch (error) {
      logger.error('[FlowMode] Error loading children:', error);
    }
  }, [supabase]);
  
  const approveOutlineLegacy = useCallback(async (outlineId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('flow_outlines')
        .update({
          approved: true,
          approved_at: new Date().toISOString()
        })
        .eq('id', outlineId);
      
      if (error) {
        logger.error('[FlowMode] Error approving outline:', error);
        return false;
      }
      
      if (outline) {
        setOutline({ ...outline, approved: true, approved_at: new Date().toISOString() });
      }
      
      return true;
    } catch (error) {
      logger.error('[FlowMode] Error approving outline:', error);
      return false;
    }
  }, [supabase, outline]);
  
  // Legacy state compatibility
  const legacyFlowGenerationProgress = generationProgress.total > 0 
    ? Math.round((generationProgress.current / generationProgress.total) * 100)
    : 0;
  
  return {
    // Core state
    status,
    flowType,
    outline,
    outlineData,
    children,
    generationProgress,
    pendingAction,
    
    // Computed state
    isFlowConversation,
    isOutlineApproved,
    canApproveOutline,
    
    // State setters
    setStatus,
    setFlowType,
    setOutlineData,
    setPendingAction,
    clearPendingAction,
    
    // Actions
    initializeFlowConversation,
    selectFlowType,
    loadFlowData,
    saveOutline,
    approveAndGenerateEmails,
    resetFlowState,
    
    // Legacy compatibility
    flowOutline: outline,
    setFlowOutline: setOutline,
    flowChildren: children,
    setFlowChildren: setChildren,
    isGeneratingFlow: status === 'generating_emails',
    setIsGeneratingFlow: (generating: boolean) => {
      if (generating) setStatus('generating_emails');
      else if (status === 'generating_emails') setStatus('complete');
    },
    flowGenerationProgress: legacyFlowGenerationProgress,
    setFlowGenerationProgress: (progress: number) => {
      if (generationProgress.total > 0) {
        setGenerationProgress(prev => ({
          ...prev,
          current: Math.round((progress / 100) * prev.total)
        }));
      }
    },
    loadFlowOutline,
    loadFlowChildren,
    approveOutline: approveOutlineLegacy
  };
}
