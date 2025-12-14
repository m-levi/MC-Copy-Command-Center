'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  BaseArtifact, 
  ArtifactKind,
  ArtifactVersion,
  ArtifactVariant,
  SharedMetadata,
} from '@/types/artifacts';
import toast from 'react-hot-toast';

// =====================================================
// BASE ARTIFACTS HOOK
// Generic hook for managing any artifact type
// =====================================================

interface UseArtifactsOptions<K extends ArtifactKind> {
  conversationId: string;
  kind: K;
  autoFetch?: boolean;
}

interface UseArtifactsReturn<T extends BaseArtifact> {
  // State
  artifacts: T[];
  activeArtifact: T | null;
  isLoading: boolean;
  error: string | null;
  
  // CRUD Operations
  createArtifact: (data: CreateArtifactData) => Promise<T | null>;
  updateArtifact: (id: string, data: Partial<T>) => Promise<T | null>;
  deleteArtifact: (id: string) => Promise<boolean>;
  
  // Selection
  setActiveArtifact: (id: string | null) => void;
  
  // Sharing
  shareArtifact: (id: string) => Promise<string | null>;
  unshareArtifact: (id: string) => Promise<boolean>;
  
  // Versioning
  addVersion: (id: string, content: string, changeSummary?: string) => Promise<ArtifactVersion | null>;
  getVersionHistory: (id: string) => Promise<ArtifactVersion[]>;
  restoreVersion: (id: string, versionId: string) => Promise<boolean>;
  
  // Refresh
  refetch: () => Promise<void>;
}

interface CreateArtifactData {
  title?: string;
  content: string;
  metadata?: Record<string, unknown>;
  message_id?: string;
}

/**
 * Base hook for managing artifacts of a specific kind
 * Can be extended for type-specific behavior
 */
export function useArtifacts<K extends ArtifactKind, T extends BaseArtifact<K>>({
  conversationId,
  kind,
  autoFetch = true,
}: UseArtifactsOptions<K>): UseArtifactsReturn<T> {
  const [artifacts, setArtifacts] = useState<T[]>([]);
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
        .eq('kind', kind)
        .order('created_at', { ascending: false });

      if (fetchError) {
        if (fetchError.message || fetchError.code) {
          console.error('Error fetching artifacts:', fetchError);
          setError('Failed to load artifacts');
        }
        setArtifacts([]);
        return;
      }

      setArtifacts((data || []) as T[]);
    } catch (err) {
      console.error('Error fetching artifacts:', err);
      setError('Failed to load artifacts');
      setArtifacts([]);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, conversationId, kind]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchArtifacts();
    }
  }, [fetchArtifacts, autoFetch]);

  // ===== CREATE =====
  const createArtifact = useCallback(async (data: CreateArtifactData): Promise<T | null> => {
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
      const defaultTitle = `${kind.charAt(0).toUpperCase() + kind.slice(1)} (${timeStr})`;

      const artifactData = {
        conversation_id: conversationId,
        user_id: user.id,
        kind,
        title: data.title || defaultTitle,
        content: data.content,
        version: 1,
        metadata: {
          source_message_id: data.message_id,
          status: 'draft',
          ...data.metadata,
        },
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
        content: data.content,
        title: data.title || defaultTitle,
        change_type: 'created',
        triggered_by_message_id: data.message_id,
        metadata: data.metadata,
      });

      const artifact = newArtifact as T;
      setArtifacts(prev => [artifact, ...prev]);
      setActiveArtifactId(artifact.id);
      
      return artifact;
    } catch (err) {
      console.error('Error creating artifact:', err);
      toast.error('Failed to create artifact');
      return null;
    }
  }, [supabase, conversationId, kind]);

  // ===== UPDATE =====
  const updateArtifact = useCallback(async (id: string, data: Partial<T>): Promise<T | null> => {
    try {
      const { data: updated, error: updateError } = await supabase
        .from('artifacts')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      const artifact = updated as T;
      setArtifacts(prev => prev.map(a => a.id === id ? artifact : a));
      
      return artifact;
    } catch (err) {
      console.error('Error updating artifact:', err);
      toast.error('Failed to update artifact');
      return null;
    }
  }, [supabase]);

  // ===== DELETE =====
  const deleteArtifact = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('artifacts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setArtifacts(prev => prev.filter(a => a.id !== id));
      
      if (activeArtifactId === id) {
        setActiveArtifactId(null);
      }
      
      toast.success('Artifact deleted');
      return true;
    } catch (err) {
      console.error('Error deleting artifact:', err);
      toast.error('Failed to delete artifact');
      return false;
    }
  }, [supabase, activeArtifactId]);

  // ===== SHARE =====
  const shareArtifact = useCallback(async (id: string): Promise<string | null> => {
    try {
      const artifact = artifacts.find(a => a.id === id);
      if (!artifact) return null;

      const shareToken = `share_${id}_${Date.now().toString(36)}`;

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
        .eq('id', id);

      if (updateError) throw updateError;

      await fetchArtifacts();
      
      const shareUrl = `${window.location.origin}/share/${kind}/${shareToken}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard!');
      
      return shareUrl;
    } catch (err) {
      console.error('Error sharing artifact:', err);
      toast.error('Failed to create share link');
      return null;
    }
  }, [supabase, artifacts, kind, fetchArtifacts]);

  // ===== UNSHARE =====
  const unshareArtifact = useCallback(async (id: string): Promise<boolean> => {
    try {
      const artifact = artifacts.find(a => a.id === id);
      if (!artifact) return false;

      const metadata = { ...((artifact as any).metadata || {}) };
      delete metadata.share_token;
      metadata.is_shared = false;
      delete metadata.shared_at;

      const { error: updateError } = await supabase
        .from('artifacts')
        .update({ metadata })
        .eq('id', id);

      if (updateError) throw updateError;

      await fetchArtifacts();
      toast.success('Share link removed');
      return true;
    } catch (err) {
      console.error('Error unsharing artifact:', err);
      toast.error('Failed to remove share link');
      return false;
    }
  }, [supabase, artifacts, fetchArtifacts]);

  // ===== ADD VERSION =====
  const addVersion = useCallback(async (
    id: string, 
    content: string, 
    changeSummary?: string
  ): Promise<ArtifactVersion | null> => {
    try {
      const artifact = artifacts.find(a => a.id === id);
      if (!artifact) return null;

      const newVersionNumber = artifact.version + 1;

      // Create new version record
      const { data: version, error: versionError } = await supabase
        .from('artifact_versions')
        .insert({
          artifact_id: id,
          version: newVersionNumber,
          content,
          title: artifact.title,
          change_type: 'edited',
          change_summary: changeSummary,
        })
        .select()
        .single();

      if (versionError) throw versionError;

      // Update artifact's version number
      await supabase
        .from('artifacts')
        .update({ 
          version: newVersionNumber,
          content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      await fetchArtifacts();
      return version as ArtifactVersion;
    } catch (err) {
      console.error('Error adding version:', err);
      toast.error('Failed to save changes');
      return null;
    }
  }, [supabase, artifacts, fetchArtifacts]);

  // ===== GET VERSION HISTORY =====
  const getVersionHistory = useCallback(async (id: string): Promise<ArtifactVersion[]> => {
    try {
      const { data, error } = await supabase
        .from('artifact_versions')
        .select('*')
        .eq('artifact_id', id)
        .order('version', { ascending: false });

      if (error) throw error;
      return (data || []) as ArtifactVersion[];
    } catch (err) {
      console.error('Error fetching version history:', err);
      return [];
    }
  }, [supabase]);

  // ===== RESTORE VERSION =====
  const restoreVersion = useCallback(async (id: string, versionId: string): Promise<boolean> => {
    try {
      const history = await getVersionHistory(id);
      const versionToRestore = history.find(v => v.id === versionId);
      
      if (!versionToRestore) return false;

      await addVersion(id, versionToRestore.content, `Restored from version ${versionToRestore.version}`);
      toast.success('Version restored');
      return true;
    } catch (err) {
      console.error('Error restoring version:', err);
      toast.error('Failed to restore version');
      return false;
    }
  }, [getVersionHistory, addVersion]);

  // ===== SET ACTIVE =====
  const setActiveArtifact = useCallback((id: string | null) => {
    setActiveArtifactId(id);
  }, []);

  return {
    artifacts,
    activeArtifact,
    isLoading,
    error,
    createArtifact,
    updateArtifact,
    deleteArtifact,
    setActiveArtifact,
    shareArtifact,
    unshareArtifact,
    addVersion,
    getVersionHistory,
    restoreVersion,
    refetch: fetchArtifacts,
  };
}

export default useArtifacts;
