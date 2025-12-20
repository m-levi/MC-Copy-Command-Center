'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  EmailArtifactWithContent,
  ArtifactVariant 
} from '@/types/artifacts';
import { parseEmailVersions } from '@/lib/email-version-parser';
import toast from 'react-hot-toast';

interface UseEmailArtifactsOptions {
  conversationId: string;
}

// Simplified artifact version type matching actual DB schema
interface ArtifactVersion {
  id: string;
  artifact_id: string;
  version: number;
  content: string;
  title: string;
  change_type: string;
  triggered_by_message_id?: string;
  created_at: string;
}

// Create artifact input
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

export function useEmailArtifacts({ conversationId }: UseEmailArtifactsOptions): UseEmailArtifactsReturn {
  const [artifacts, setArtifacts] = useState<EmailArtifactWithContent[]>([]);
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();

  // #region agent log
  console.log('[DEBUG-A] useEmailArtifacts called', { conversationId, isTempId: conversationId?.startsWith('temp-') });
  // #endregion

  // Active artifact computed from state
  const activeArtifact = useMemo(() => {
    if (!activeArtifactId) return artifacts[0] || null;
    return artifacts.find(a => a.id === activeArtifactId) || null;
  }, [artifacts, activeArtifactId]);

  // Fetch artifacts for conversation
  const fetchArtifacts = useCallback(async () => {
    // #region agent log
    console.log('[DEBUG-B] fetchArtifacts called', { conversationId, isTempId: conversationId?.startsWith('temp-') });
    // #endregion
    // Skip for temp conversation IDs - they haven't been saved to database yet
    if (!conversationId || conversationId.startsWith('temp-')) {
      setIsLoading(false);
      setArtifacts([]);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // #region agent log
      console.log('[DEBUG-C] About to query Supabase', { conversationId, isTempId: conversationId?.startsWith('temp-') });
      // #endregion
      // Query artifacts table directly
      const { data, error: fetchError } = await supabase
        .from('artifacts')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('kind', 'email')
        .order('created_at', { ascending: true });
      
      // Check for actual errors (not just empty error objects)
      if (fetchError && (fetchError.message || fetchError.code)) {
        // #region agent log
        console.log('[DEBUG-ERR] Supabase query error', { conversationId, isTempId: conversationId?.startsWith('temp-'), errorMessage: fetchError.message, errorCode: fetchError.code });
        // #endregion
        console.error('Supabase artifacts query failed:', fetchError.message || fetchError.code);
        setArtifacts([]);
        return;
      }
      
      if (!data) {
        setArtifacts([]);
        return;
      }
      
      // Map to expected type
      const mapped: EmailArtifactWithContent[] = data.map(row => {
        const metadata = row.metadata || {};
        return {
          id: row.id,
          kind: 'email' as const,
          type: 'email' as const,
          conversation_id: row.conversation_id,
          user_id: row.user_id,
          title: row.title || 'Untitled Email',
          content: metadata.version_a_content || row.content || '',
          version: row.version || 1,
          status: 'draft' as const,
          is_shared: metadata.is_shared === true,
          share_token: metadata.share_token,
          shared_at: metadata.shared_at,
          created_at: row.created_at,
          updated_at: row.updated_at,
          email_type: (metadata.email_type || 'design') as 'design' | 'letter' | 'flow',
          version_count: row.version || 1,
          selected_variant: (metadata.selected_variant || 'a') as ArtifactVariant,
          source_message_id: metadata.source_message_id,
          version_a_content: metadata.version_a_content || row.content,
          version_a_approach: metadata.version_a_approach,
          version_b_content: metadata.version_b_content,
          version_b_approach: metadata.version_b_approach,
          version_c_content: metadata.version_c_content,
          version_c_approach: metadata.version_c_approach,
        };
      });
      
      setArtifacts(mapped);
    } catch (err) {
      // Catch any unexpected errors
      console.error('Unexpected error in fetchArtifacts:', err);
      setArtifacts([]);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, supabase]);

  // Initial fetch
  useEffect(() => {
    fetchArtifacts();
  }, [fetchArtifacts]);

  // Create a new artifact
  const createArtifact = useCallback(async (data: CreateArtifactInput): Promise<EmailArtifactWithContent | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Build metadata with variant content
      const metadata: Record<string, unknown> = {
        email_type: 'design',
        selected_variant: 'a',
        is_shared: false,
      };

      if (data.version_a_content) metadata.version_a_content = data.version_a_content;
      if (data.version_a_approach) metadata.version_a_approach = data.version_a_approach;
      if (data.version_b_content) metadata.version_b_content = data.version_b_content;
      if (data.version_b_approach) metadata.version_b_approach = data.version_b_approach;
      if (data.version_c_content) metadata.version_c_content = data.version_c_content;
      if (data.version_c_approach) metadata.version_c_approach = data.version_c_approach;
      if (data.message_id) metadata.source_message_id = data.message_id;

      // Generate a unique title if not provided
      const timestamp = new Date().toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      const defaultTitle = `Email Draft (${timestamp})`;

      // Create the artifact in the artifacts table
      const { data: artifact, error: artifactError } = await supabase
        .from('artifacts')
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          kind: 'email',
          title: data.title || defaultTitle,
          content: data.content || data.version_a_content || '',
          version: 1,
          metadata,
        })
        .select()
        .single();

      if (artifactError) throw artifactError;

      // Also create initial version record
      await supabase
        .from('artifact_versions')
        .insert({
          artifact_id: artifact.id,
          version: 1,
          content: data.content || data.version_a_content || '',
          title: artifact.title,
          change_type: 'created',
          triggered_by_message_id: data.message_id,
        });

      await fetchArtifacts();
      setActiveArtifactId(artifact.id);
      
      // Return mapped artifact
      return {
        id: artifact.id,
        kind: 'email' as const,
        type: 'email' as const,
        conversation_id: artifact.conversation_id,
        user_id: artifact.user_id,
        title: artifact.title,
        content: data.version_a_content || data.content || '',
        version: 1,
        status: 'draft' as const,
        is_shared: false,
        created_at: artifact.created_at,
        updated_at: artifact.updated_at,
        email_type: 'design' as const,
        version_count: 1,
        selected_variant: 'a' as const,
        source_message_id: data.message_id,
        version_a_content: data.version_a_content,
        version_a_approach: data.version_a_approach,
        version_b_content: data.version_b_content,
        version_b_approach: data.version_b_approach,
        version_c_content: data.version_c_content,
        version_c_approach: data.version_c_approach,
      };
    } catch (err) {
      console.error('Error creating artifact:', err);
      toast.error('Failed to create email artifact');
      return null;
    }
  }, [supabase, conversationId, fetchArtifacts]);

  // Create artifact from AI message content
  const createArtifactFromMessage = useCallback(async (
    messageId: string,
    content: string,
    title?: string
  ): Promise<EmailArtifactWithContent | null> => {
    // Parse content for A/B/C versions
    const parsed = parseEmailVersions(content);
    
    const versionA = parsed.versions.find(v => v.id === 'a');
    const versionB = parsed.versions.find(v => v.id === 'b');
    const versionC = parsed.versions.find(v => v.id === 'c');

    return createArtifact({
      message_id: messageId,
      title: title || 'Email Draft',
      content: versionA?.content || content,
      version_a_content: versionA?.content,
      version_a_approach: versionA?.note,
      version_b_content: versionB?.content,
      version_b_approach: versionB?.note,
      version_c_content: versionC?.content,
      version_c_approach: versionC?.note,
    });
  }, [createArtifact]);

  // Add a new version to an artifact
  const addVersion = useCallback(async (
    artifactId: string,
    content: string,
    changeSummary?: string
  ): Promise<ArtifactVersion | null> => {
    try {
      const artifact = artifacts.find(a => a.id === artifactId);
      if (!artifact) throw new Error('Artifact not found');

      const newVersionNumber = (artifact.version_count ?? artifact.version ?? 1) + 1;

      // Parse the content for A/B/C variants
      const parsed = parseEmailVersions(content);
      const versionA = parsed.versions.find(v => v.id === 'a');
      const versionB = parsed.versions.find(v => v.id === 'b');
      const versionC = parsed.versions.find(v => v.id === 'c');

      // Use primary content
      const primaryContent = versionA?.content || content;

      // Create version record
      const { data: version, error: versionError } = await supabase
        .from('artifact_versions')
        .insert({
          artifact_id: artifactId,
          version: newVersionNumber,
          content: primaryContent,
          title: artifact.title,
          change_type: changeSummary || 'edited',
        })
        .select()
        .single();

      if (versionError) throw versionError;

      // Build updated metadata with variant content
      const currentMetadata = (artifact as any).metadata || {};
      const updatedMetadata = {
        ...currentMetadata,
        version_a_content: versionA?.content || primaryContent,
        version_a_approach: versionA?.note || currentMetadata.version_a_approach,
        version_b_content: versionB?.content || currentMetadata.version_b_content,
        version_b_approach: versionB?.note || currentMetadata.version_b_approach,
        version_c_content: versionC?.content || currentMetadata.version_c_content,
        version_c_approach: versionC?.note || currentMetadata.version_c_approach,
      };

      // Update main artifact with new content and metadata
      await supabase
        .from('artifacts')
        .update({ 
          version: newVersionNumber,
          content: primaryContent,
          metadata: updatedMetadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', artifactId);

      await fetchArtifacts();
      toast.success(`Version ${newVersionNumber} saved`);
      
      return version;
    } catch (err) {
      console.error('Error adding version:', err);
      toast.error('Failed to save new version');
      return null;
    }
  }, [supabase, artifacts, fetchArtifacts]);

  // Select a variant (A, B, or C)
  const selectVariant = useCallback(async (artifactId: string, variant: ArtifactVariant) => {
    try {
      const artifact = artifacts.find(a => a.id === artifactId);
      if (!artifact) return;

      // Update metadata with new selected variant
      const { error } = await supabase
        .from('artifacts')
        .update({ 
          metadata: {
            ...((artifact as any).metadata || {}),
            selected_variant: variant,
          }
        })
        .eq('id', artifactId);

      if (error) throw error;

      // Update local state immediately
      setArtifacts(prev => prev.map(a => 
        a.id === artifactId ? { ...a, selected_variant: variant } : a
      ));
    } catch (err) {
      console.error('Error selecting variant:', err);
      toast.error('Failed to select variant');
    }
  }, [supabase, artifacts]);

  // Update artifact title
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

  // Set active artifact
  const setActiveArtifact = useCallback((artifactId: string | null) => {
    setActiveArtifactId(artifactId);
  }, []);

  // Delete artifact
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

  // Share artifact
  const shareArtifact = useCallback(async (artifactId: string): Promise<string | null> => {
    try {
      const artifact = artifacts.find(a => a.id === artifactId);
      if (!artifact) return null;

      // Generate a simple share token
      const shareToken = `share_${artifactId}_${Date.now().toString(36)}`;

      const { error: updateError } = await supabase
        .from('artifacts')
        .update({ 
          metadata: {
            ...((artifact as any).metadata || {}),
            share_token: shareToken,
            is_shared: true,
            shared_at: new Date().toISOString(),
          }
        })
        .eq('id', artifactId);

      if (updateError) throw updateError;

      await fetchArtifacts();
      
      const shareUrl = `${window.location.origin}/share/email/${shareToken}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard!');
      
      return shareUrl;
    } catch (err) {
      console.error('Error sharing artifact:', err);
      toast.error('Failed to create share link');
      return null;
    }
  }, [supabase, artifacts, fetchArtifacts]);

  // Unshare artifact
  const unshareArtifact = useCallback(async (artifactId: string) => {
    try {
      const artifact = artifacts.find(a => a.id === artifactId);
      if (!artifact) return;

      const { error } = await supabase
        .from('artifacts')
        .update({ 
          metadata: {
            ...((artifact as any).metadata || {}),
            share_token: null,
            is_shared: false,
            shared_at: null,
          }
        })
        .eq('id', artifactId);

      if (error) throw error;

      await fetchArtifacts();
      toast.success('Share link removed');
    } catch (err) {
      console.error('Error unsharing artifact:', err);
      toast.error('Failed to remove share link');
    }
  }, [supabase, artifacts, fetchArtifacts]);

  // Get version history
  const getVersionHistory = useCallback(async (artifactId: string): Promise<ArtifactVersion[]> => {
    try {
      const { data, error } = await supabase
        .from('artifact_versions')
        .select('*')
        .eq('artifact_id', artifactId)
        .order('version', { ascending: false });

      if (error) throw error;
      
      return data || [];
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
