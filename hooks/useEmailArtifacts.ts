'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  EmailArtifactWithContent,
  ArtifactVariant,
  ArtifactVersion,
  EmailArtifactMetadata,
} from '@/types/artifacts';
import { parseEmailVersions } from '@/lib/email-version-parser';
import toast from 'react-hot-toast';

// =====================================================
// EMAIL ARTIFACTS HOOK
// Extends base artifact functionality with email-specific features
// =====================================================

interface UseEmailArtifactsOptions {
  conversationId: string;
}

interface CreateArtifactInput {
  title?: string;
  content?: string;
  message_id?: string;
  version_a_content?: string;
  version_a_approach?: string;
  version_b_content?: string;
  version_b_approach?: string;
  version_c_content?: string;
  version_c_approach?: string;
}

interface UseEmailArtifactsReturn {
  // State
  artifacts: EmailArtifactWithContent[];
  activeArtifact: EmailArtifactWithContent | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  createArtifact: (data: CreateArtifactInput) => Promise<EmailArtifactWithContent | null>;
  createArtifactFromMessage: (messageId: string, content: string, title?: string) => Promise<EmailArtifactWithContent | null>;
  addVersion: (artifactId: string, content: string, changeSummary?: string) => Promise<ArtifactVersion | null>;
  selectVariant: (artifactId: string, variant: ArtifactVariant) => Promise<void>;
  updateTitle: (artifactId: string, title: string) => Promise<void>;
  setActiveArtifact: (artifactId: string | null) => void;
  deleteArtifact: (artifactId: string) => Promise<void>;
  
  // Sharing
  shareArtifact: (artifactId: string) => Promise<string | null>;
  unshareArtifact: (artifactId: string) => Promise<void>;
  
  // Versioning
  getVersionHistory: (artifactId: string) => Promise<ArtifactVersion[]>;
  
  // Refetch
  refetch: () => Promise<void>;
}

/**
 * Transforms raw DB artifact into flattened EmailArtifactWithContent
 */
function transformToEmailArtifact(raw: any): EmailArtifactWithContent {
  const metadata = raw.metadata || {};
  return {
    id: raw.id,
    kind: 'email',
    type: 'email',
    conversation_id: raw.conversation_id,
    user_id: raw.user_id,
    title: raw.title || 'Email Copy',
    content: raw.content,
    version: raw.version,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    
    // Flatten metadata
    status: metadata.status || 'draft',
    is_shared: metadata.is_shared || false,
    share_token: metadata.share_token,
    shared_at: metadata.shared_at,
    email_type: metadata.email_type,
    selected_variant: metadata.selected_variant || 'a',
    source_message_id: metadata.source_message_id,
    
    // Variant content
    version_a_content: metadata.version_a_content,
    version_a_approach: metadata.version_a_approach,
    version_b_content: metadata.version_b_content,
    version_b_approach: metadata.version_b_approach,
    version_c_content: metadata.version_c_content,
    version_c_approach: metadata.version_c_approach,
    
    // Version info
    version_count: raw.version,
    current_version_number: raw.version,
  };
}

export function useEmailArtifacts({ conversationId }: UseEmailArtifactsOptions): UseEmailArtifactsReturn {
  const [artifacts, setArtifacts] = useState<EmailArtifactWithContent[]>([]);
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();

  // Active artifact computed from state
  const activeArtifact = useMemo(() => {
    if (!activeArtifactId) return artifacts[0] || null;
    return artifacts.find(a => a.id === activeArtifactId) || null;
  }, [artifacts, activeArtifactId]);

  // ===== FETCH =====
  const fetchArtifacts = useCallback(async () => {
    // Skip for temp conversation IDs
    if (!conversationId || conversationId.startsWith('temp-')) {
      setIsLoading(false);
      setArtifacts([]);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('artifacts')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('kind', 'email')
        .order('created_at', { ascending: false });

      // Check if we have data - if so, proceed even with error object
      // Supabase sometimes returns empty error objects
      if (!data && fetchError) {
        const msg = fetchError.message;
        if (typeof msg === 'string' && msg.trim().length > 0) {
          console.error('Error fetching artifacts:', fetchError);
          setError('Failed to load email artifacts');
        }
        setArtifacts([]);
        return;
      }

      const transformed = (data || []).map(transformToEmailArtifact);
      setArtifacts(transformed);
    } catch (err) {
      console.error('Error fetching artifacts:', err);
      setError('Failed to load email artifacts');
      setArtifacts([]);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, conversationId]);

  // Auto-fetch on mount and when conversationId changes
  useEffect(() => {
    fetchArtifacts();
  }, [fetchArtifacts]);

  // ===== CREATE ARTIFACT =====
  const createArtifact = useCallback(async (data: CreateArtifactInput): Promise<EmailArtifactWithContent | null> => {
    if (!conversationId || conversationId.startsWith('temp-')) {
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      const defaultTitle = data.title || `Email Draft (${timeStr})`;

      // Build metadata with variant content
      const metadata: EmailArtifactMetadata = {
        source_message_id: data.message_id,
        status: 'draft',
        selected_variant: 'a',
        version_a_content: data.version_a_content,
        version_a_approach: data.version_a_approach,
        version_b_content: data.version_b_content,
        version_b_approach: data.version_b_approach,
        version_c_content: data.version_c_content,
        version_c_approach: data.version_c_approach,
      };

      // Use version_a_content as the primary content, or fallback to content
      const primaryContent = data.version_a_content || data.content || '';

      const artifactData = {
        conversation_id: conversationId,
        user_id: user.id,
        kind: 'email',
        title: defaultTitle,
        content: primaryContent,
        version: 1,
        metadata,
      };

      const { data: newArtifact, error: createError } = await supabase
        .from('artifacts')
        .insert(artifactData)
        .select()
        .single();

      if (createError) throw createError;

      // Create initial version
      await supabase.from('artifact_versions').insert({
        artifact_id: newArtifact.id,
        version: 1,
        content: primaryContent,
        title: defaultTitle,
        change_type: 'created',
        triggered_by_message_id: data.message_id,
        metadata,
      });

      const transformed = transformToEmailArtifact(newArtifact);
      setArtifacts(prev => [transformed, ...prev]);
      setActiveArtifactId(transformed.id);
      
      return transformed;
    } catch (err) {
      console.error('Error creating artifact:', err);
      toast.error('Failed to create email artifact');
      return null;
    }
  }, [supabase, conversationId]);

  // ===== CREATE FROM MESSAGE (parse email versions) =====
  const createArtifactFromMessage = useCallback(async (
    messageId: string, 
    content: string, 
    title?: string
  ): Promise<EmailArtifactWithContent | null> => {
    // Parse A/B/C versions from content
    const parsed = parseEmailVersions(content);
    
    // Extract versions by ID
    const versionA = parsed.versions.find(v => v.id === 'a');
    const versionB = parsed.versions.find(v => v.id === 'b');
    const versionC = parsed.versions.find(v => v.id === 'c');
    
    return createArtifact({
      title,
      message_id: messageId,
      content,
      version_a_content: versionA?.content,
      version_a_approach: versionA?.note,
      version_b_content: versionB?.content,
      version_b_approach: versionB?.note,
      version_c_content: versionC?.content,
      version_c_approach: versionC?.note,
    });
  }, [createArtifact]);

  // ===== ADD VERSION =====
  const addVersion = useCallback(async (
    artifactId: string,
    content: string,
    changeSummary?: string
  ): Promise<ArtifactVersion | null> => {
    try {
      const artifact = artifacts.find(a => a.id === artifactId);
      if (!artifact) return null;

      const newVersionNumber = artifact.version + 1;

      // Parse new content for A/B/C versions
      const parsed = parseEmailVersions(content);
      const versionA = parsed.versions.find(v => v.id === 'a');
      const versionB = parsed.versions.find(v => v.id === 'b');
      const versionC = parsed.versions.find(v => v.id === 'c');
      
      const newMetadata: EmailArtifactMetadata = {
        source_message_id: artifact.source_message_id,
        status: artifact.status,
        selected_variant: artifact.selected_variant,
        version_a_content: versionA?.content || artifact.version_a_content,
        version_a_approach: versionA?.note || artifact.version_a_approach,
        version_b_content: versionB?.content || artifact.version_b_content,
        version_b_approach: versionB?.note || artifact.version_b_approach,
        version_c_content: versionC?.content || artifact.version_c_content,
        version_c_approach: versionC?.note || artifact.version_c_approach,
      };

      // Create version record
      const { data: version, error: versionError } = await supabase
        .from('artifact_versions')
        .insert({
          artifact_id: artifactId,
          version: newVersionNumber,
          content: versionA?.content || content,
          title: artifact.title,
          change_type: 'edited',
          change_summary: changeSummary,
          metadata: newMetadata,
        })
        .select()
        .single();

      // Check if we have valid data - if so, ignore any error object
      // Supabase sometimes returns empty error objects alongside valid data
      if (!version && versionError) {
        // Only log/fail on errors with actual meaningful content
        // The message must be a real string (not object, not undefined, not empty)
        const msg = versionError.message;
        const code = versionError.code;
        const hasRealMessage = typeof msg === 'string' && msg.trim().length > 0;
        const hasErrorCode = typeof code === 'string' && code.length > 0;

        if (hasRealMessage || hasErrorCode) {
          console.error('Error creating version:', versionError);
          toast.error('Failed to save changes');
          return null;
        }
        // Empty error object with no message or code - this often happens with RLS issues
        // Try to verify if the version was actually created
        const { data: verifyData } = await supabase
          .from('artifact_versions')
          .select('id')
          .eq('artifact_id', artifactId)
          .eq('version', newVersionNumber)
          .maybeSingle();

        if (!verifyData) {
          // Version wasn't created - likely RLS policy issue
          console.error('Error creating version: Insert failed silently (possible RLS issue)');
          toast.error('Failed to save changes - please check permissions');
          return null;
        }
      }

      // Update artifact
      const { error: updateError } = await supabase
        .from('artifacts')
        .update({ 
          version: newVersionNumber,
          content: versionA?.content || content,
          metadata: newMetadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', artifactId);

      // Only log real errors with actual message content
      if (updateError) {
        const msg = updateError.message;
        if (typeof msg === 'string' && msg.trim().length > 0) {
          console.error('Error updating artifact:', updateError);
        }
      }

      await fetchArtifacts();
      return version as ArtifactVersion;
    } catch (err: any) {
      // Only log/show error if it has actual content
      if (err?.message) {
        console.error('Error adding version:', err);
        toast.error('Failed to save changes');
      }
      return null;
    }
  }, [supabase, artifacts, fetchArtifacts]);

  // ===== SELECT VARIANT =====
  const selectVariant = useCallback(async (artifactId: string, variant: ArtifactVariant) => {
    try {
      const artifact = artifacts.find(a => a.id === artifactId);
      if (!artifact) return;

      const updatedMetadata = {
        ...artifact,
        selected_variant: variant,
      };

      await supabase
        .from('artifacts')
        .update({ 
          metadata: {
            source_message_id: artifact.source_message_id,
            status: artifact.status,
            selected_variant: variant,
            version_a_content: artifact.version_a_content,
            version_a_approach: artifact.version_a_approach,
            version_b_content: artifact.version_b_content,
            version_b_approach: artifact.version_b_approach,
            version_c_content: artifact.version_c_content,
            version_c_approach: artifact.version_c_approach,
          }
        })
        .eq('id', artifactId);

      setArtifacts(prev => prev.map(a => 
        a.id === artifactId ? { ...a, selected_variant: variant } : a
      ));
    } catch (err) {
      console.error('Error selecting variant:', err);
    }
  }, [supabase, artifacts]);

  // ===== UPDATE TITLE =====
  const updateTitle = useCallback(async (artifactId: string, title: string) => {
    try {
      const { error } = await supabase
        .from('artifacts')
        .update({ title })
        .eq('id', artifactId);

      if (error) throw error;

      setArtifacts(prev => prev.map(a => 
        a.id === artifactId ? { ...a, title } : a
      ));
    } catch (err) {
      console.error('Error updating title:', err);
      toast.error('Failed to update title');
    }
  }, [supabase]);

  // ===== SET ACTIVE ARTIFACT =====
  const setActiveArtifact = useCallback((artifactId: string | null) => {
    setActiveArtifactId(artifactId);
  }, []);

  // ===== DELETE ARTIFACT =====
  const deleteArtifact = useCallback(async (artifactId: string) => {
    try {
      const { error } = await supabase
        .from('artifacts')
        .delete()
        .eq('id', artifactId);

      if (error) throw error;

      setArtifacts(prev => prev.filter(a => a.id !== artifactId));
      
      if (activeArtifactId === artifactId) {
        setActiveArtifactId(null);
      }
      
      toast.success('Email deleted');
    } catch (err) {
      console.error('Error deleting artifact:', err);
      toast.error('Failed to delete email');
    }
  }, [supabase, activeArtifactId]);

  // ===== SHARE ARTIFACT =====
  const shareArtifact = useCallback(async (artifactId: string): Promise<string | null> => {
    try {
      const artifact = artifacts.find(a => a.id === artifactId);
      if (!artifact) return null;

      const shareToken = `share_${artifactId}_${Date.now().toString(36)}`;

      const { error: updateError } = await supabase
        .from('artifacts')
        .update({ 
          metadata: {
            source_message_id: artifact.source_message_id,
            status: artifact.status,
            selected_variant: artifact.selected_variant,
            version_a_content: artifact.version_a_content,
            version_a_approach: artifact.version_a_approach,
            version_b_content: artifact.version_b_content,
            version_b_approach: artifact.version_b_approach,
            version_c_content: artifact.version_c_content,
            version_c_approach: artifact.version_c_approach,
            share_token: shareToken,
            is_shared: true,
            shared_at: new Date().toISOString(),
          }
        })
        .eq('id', artifactId);

      if (updateError) throw updateError;

      await fetchArtifacts();

      const shareUrl = `${window.location.origin}/share/email/${shareToken}`;
      
      // Try to copy to clipboard, but don't fail if it doesn't work
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Share link copied to clipboard!');
      } catch (clipboardError) {
        // Clipboard API might fail in non-secure context or without user activation
        // Still show success but without "copied" message
        toast.success('Share link created!');
        console.debug('Clipboard not available:', clipboardError);
      }

      return shareUrl;
    } catch (err: any) {
      // Only log/show error if it has actual content
      if (err?.message) {
        console.error('Error sharing artifact:', err);
        toast.error('Failed to create share link');
      }
      return null;
    }
  }, [supabase, artifacts, fetchArtifacts]);

  // ===== UNSHARE ARTIFACT =====
  const unshareArtifact = useCallback(async (artifactId: string) => {
    try {
      const artifact = artifacts.find(a => a.id === artifactId);
      if (!artifact) return;

      await supabase
        .from('artifacts')
        .update({ 
          metadata: {
            source_message_id: artifact.source_message_id,
            status: artifact.status,
            selected_variant: artifact.selected_variant,
            version_a_content: artifact.version_a_content,
            version_a_approach: artifact.version_a_approach,
            version_b_content: artifact.version_b_content,
            version_b_approach: artifact.version_b_approach,
            version_c_content: artifact.version_c_content,
            version_c_approach: artifact.version_c_approach,
            is_shared: false,
          }
        })
        .eq('id', artifactId);

      await fetchArtifacts();
      toast.success('Share link removed');
    } catch (err) {
      console.error('Error unsharing artifact:', err);
      toast.error('Failed to remove share link');
    }
  }, [supabase, artifacts, fetchArtifacts]);

  // ===== GET VERSION HISTORY =====
  const getVersionHistory = useCallback(async (artifactId: string): Promise<ArtifactVersion[]> => {
    try {
      const { data, error } = await supabase
        .from('artifact_versions')
        .select('*')
        .eq('artifact_id', artifactId)
        .order('version', { ascending: false });

      if (error) throw error;
      return (data || []) as ArtifactVersion[];
    } catch (err) {
      console.error('Error fetching version history:', err);
      return [];
    }
  }, [supabase]);

  return {
    artifacts,
    activeArtifact,
    isLoading,
    error,
    createArtifact,
    createArtifactFromMessage,
    addVersion,
    selectVariant,
    updateTitle,
    setActiveArtifact,
    deleteArtifact,
    shareArtifact,
    unshareArtifact,
    getVersionHistory,
    refetch: fetchArtifacts,
  };
}

export default useEmailArtifacts;
