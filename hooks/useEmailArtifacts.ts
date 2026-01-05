'use client';

/**
 * useEmailArtifacts Hook
 * ======================
 * 
 * Manages email artifacts with two types of versioning:
 * 
 * 1. A/B/C VARIANTS (Horizontal)
 *    - AI generates multiple versions in one response using <version_a>, <version_b>, <version_c> tags
 *    - Each variant has content and an "approach" note explaining the strategy
 *    - User can switch between A, B, C using variant selector buttons
 *    - Stored in artifact metadata (version_a_content, version_b_content, etc.)
 * 
 * 2. VERSION HISTORY (Vertical)
 *    - Each edit creates a new numbered version (v1, v2, v3...)
 *    - History stored in artifact_versions table
 *    - User can view history and restore previous versions
 *    - Restoring creates a new version with the old content
 * 
 * Key functions:
 *    - createArtifactFromMessage(): Creates artifact from AI message, parses A/B/C variants
 *    - addVersion(): Saves a new version when content is edited
 *    - getVersionHistory(): Fetches version history for timeline display
 *    - selectVariant(): Switches between A/B/C variants
 */

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
  duplicateArtifact: (artifactId: string) => Promise<EmailArtifactWithContent | null>;

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

  // Reset active artifact when conversation changes to prevent showing artifacts from wrong conversation
  useEffect(() => {
    setActiveArtifactId(null);
    setArtifacts([]); // Clear artifacts immediately to prevent flash of old content
  }, [conversationId]);

  // Active artifact computed from state
  const activeArtifact = useMemo(() => {
    if (!activeArtifactId) return artifacts[0] || null;
    return artifacts.find(a => a.id === activeArtifactId) || null;
  }, [artifacts, activeArtifactId]);

  // Fetch artifacts for conversation
  const fetchArtifacts = useCallback(async () => {
    // Skip for temp conversation IDs - they haven't been saved to database yet
    if (!conversationId || conversationId.startsWith('temp-')) {
      setIsLoading(false);
      setArtifacts([]);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Query artifacts table directly - fetch ALL kinds (email, calendar, etc.)
      const { data, error: fetchError } = await supabase
        .from('artifacts')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      // Check for actual errors (not just empty error objects)
      if (fetchError && (fetchError.message || fetchError.code)) {
        console.error('Supabase artifacts query failed:', fetchError.message || fetchError.code);
        setArtifacts([]);
        return;
      }
      
      if (!data) {
        setArtifacts([]);
        return;
      }
      
      // Map to expected type - preserve actual artifact kind
      const mapped: EmailArtifactWithContent[] = data.map(row => {
        const metadata = row.metadata || {};
        const kind = row.kind || 'email';
        const defaultTitle = kind === 'calendar' ? 'Untitled Calendar' : 'Untitled Email';

        return {
          id: row.id,
          kind: kind,
          type: kind,
          conversation_id: row.conversation_id,
          user_id: row.user_id,
          title: row.title || defaultTitle,
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
          // Calendar-specific fields from metadata
          metadata: metadata,
        };
      });
      
      setArtifacts(mapped);
    } catch (err) {
      // Catch any unexpected errors
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const errorDetails = typeof err === 'object' && err !== null ? {
        message: (err as any).message,
        code: (err as any).code,
        details: (err as any).details,
        hint: (err as any).hint,
      } : err;
      
      console.error('Unexpected error in fetchArtifacts:', {
        error: errorDetails,
        conversationId,
        isTempId: conversationId?.startsWith('temp-'),
      });
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
      // Basic validation
      if (!conversationId) {
        console.warn('Cannot create artifact: no conversation ID provided');
        return null; // Fail silently - will retry when conversation is set
      }

      // Check for temp ID and log warning but don't block
      if (conversationId.startsWith('temp-')) {
        console.warn('Attempting to create artifact with temp conversation ID - this may fail', { conversationId });
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('Cannot create artifact: user not authenticated');
        return null; // Fail silently - not a critical error
      }

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

      if (artifactError) {
        // Handle foreign key constraint error (temp conversation ID or deleted conversation)
        if (artifactError.code === '23503' || artifactError.message?.includes('foreign key')) {
          console.warn('Artifact creation failed: conversation not found in database', {
            conversationId,
            isTempId: conversationId?.startsWith('temp-'),
          });
          return null; // Fail silently - conversation may not be saved yet
        }
        
        // Log other errors with full details
        console.error('Artifact creation error:', {
          message: artifactError.message,
          code: artifactError.code,
          details: artifactError.details,
          hint: artifactError.hint,
          conversationId,
        });
        throw artifactError;
      }

      // Also create initial version record
      // Note: triggered_by_message_id is optional - only include if the message exists in DB
      // This handles cases where artifacts are created from streamed content before message is saved
      const baseVersionData = {
        artifact_id: artifact.id,
        version: 1,
        content: data.content || data.version_a_content || '',
        title: artifact.title,
        change_type: 'created',
      };

      // Try with message_id first if it looks valid
      const messageIdToUse = data.message_id && !data.message_id.startsWith('temp-')
        ? data.message_id
        : null;

      let versionError = null;

      if (messageIdToUse) {
        // First attempt: try with message_id
        const { error } = await supabase
          .from('artifact_versions')
          .insert({ ...baseVersionData, triggered_by_message_id: messageIdToUse });

        // If foreign key constraint error, retry without message_id
        if (error?.code === '23503') {
          console.log('[useEmailArtifacts] Message not in DB yet, creating version without message reference');
          const { error: retryError } = await supabase
            .from('artifact_versions')
            .insert(baseVersionData);
          versionError = retryError;
        } else {
          versionError = error;
        }
      } else {
        // No valid message_id, insert without it
        const { error } = await supabase
          .from('artifact_versions')
          .insert(baseVersionData);
        versionError = error;
      }

      if (versionError) {
        // Log full error object since some errors may not have standard properties
        console.error('Version creation error:', versionError);
        console.error('Version creation error details:', JSON.stringify(versionError, null, 2));
        // Continue even if version creation fails - the artifact was created
        // This is non-fatal since the main artifact record was created
      }

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
      // Extract meaningful error information
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const errorDetails = typeof err === 'object' && err !== null ? {
        message: (err as any).message,
        code: (err as any).code,
        details: (err as any).details,
        hint: (err as any).hint,
      } : err;
      
      console.error('Error creating artifact:', errorDetails);
      toast.error(`Failed to create email artifact: ${errorMessage}`);
      return null;
    }
  }, [supabase, conversationId, fetchArtifacts]);

  // Create artifact from AI message content
  const createArtifactFromMessage = useCallback(async (
    messageId: string,
    content: string,
    title?: string
  ): Promise<EmailArtifactWithContent | null> => {
    console.log('[useEmailArtifacts] Creating artifact from message', {
      messageId,
      conversationId,
      isTempId: conversationId?.startsWith('temp-'),
      contentLength: content.length,
    });
    
    // Step 1: Extract content from various wrapper formats
    let emailContent = content;
    
    // Try <email_copy> tags first (explicit email wrapper)
    const emailCopyMatch = content.match(/<email_copy>([\s\S]*?)<\/email_copy>/i);
    if (emailCopyMatch) {
      emailContent = emailCopyMatch[1].trim();
      console.log('[useEmailArtifacts] Extracted from <email_copy> tags');
    } else {
      // Try to extract content from code blocks (AI often wraps email in ```)
      // Look for code blocks that contain email structure markers
      const codeBlockMatches = content.match(/```(?:markdown|text|)?\n?([\s\S]*?)```/g);
      if (codeBlockMatches) {
        for (const block of codeBlockMatches) {
          const innerContent = block
            .replace(/^```(?:markdown|text|)?\n?/, '')
            .replace(/\n?```$/, '')
            .trim();
          // Check if this code block contains email content
          if (/\*\*[A-Z][A-Z0-9 _-]*\*\*/.test(innerContent) || 
              /\*\*Headline:\*\*/i.test(innerContent)) {
            emailContent = innerContent;
            console.log('[useEmailArtifacts] Extracted from code block');
            break;
          }
        }
      }
    }
    
    // Step 2: Clean the content - remove any remaining code block markers
    emailContent = emailContent
      .replace(/^```[\w]*\n?/gm, '')
      .replace(/\n?```$/gm, '')
      .trim();
    
    // Step 3: Try to find the start of actual email content
    // (skip preamble text like "Here's your email:")
    
    // Check for Design/Standard email format: **HERO**, **HERO SECTION:**
    let emailStartMatch = emailContent.match(/(\*\*[A-Z][A-Z0-9 _-]*(?:\s+SECTION)?:?\*\*)/);
    
    // If not found, check for Letter email format: SUBJECT LINE:
    if (!emailStartMatch) {
      emailStartMatch = emailContent.match(/(^SUBJECT LINE:)/im);
    }
    
    if (emailStartMatch && emailStartMatch.index !== undefined && emailStartMatch.index > 0) {
      // Check if there's significant preamble we should skip
      const preamble = emailContent.slice(0, emailStartMatch.index).trim();
      if (preamble.length < 200) { // Only skip short preambles
        emailContent = emailContent.slice(emailStartMatch.index);
        console.log('[useEmailArtifacts] Skipped preamble, content starts at:', emailStartMatch[1]);
      }
    }
    
    // Step 4: Parse content for A/B/C versions
    const parsed = parseEmailVersions(emailContent);
    
    const versionA = parsed.versions.find(v => v.id === 'a');
    const versionB = parsed.versions.find(v => v.id === 'b');
    const versionC = parsed.versions.find(v => v.id === 'c');

    console.log('[useEmailArtifacts] Parsed versions:', {
      hasVersionA: !!versionA,
      hasVersionB: !!versionB,
      hasVersionC: !!versionC,
      contentPreview: emailContent.slice(0, 100) + '...',
    });

    // Step 5: Create the artifact
    const result = await createArtifact({
      message_id: messageId,
      title: title || 'Email Draft',
      content: versionA?.content || emailContent,
      version_a_content: versionA?.content || emailContent, // Use emailContent as version A if no versions
      version_a_approach: versionA?.note,
      version_b_content: versionB?.content,
      version_b_approach: versionB?.note,
      version_c_content: versionC?.content,
      version_c_approach: versionC?.note,
    });

    console.log('[useEmailArtifacts] Artifact creation result:', {
      success: !!result,
      artifactId: result?.id,
    });

    return result;
  }, [createArtifact, conversationId]);

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

      // Extract content from <email_copy> tags if present
      const emailCopyMatch = content.match(/<email_copy>([\s\S]*?)<\/email_copy>/i);
      const emailContent = emailCopyMatch ? emailCopyMatch[1].trim() : content;

      // Parse the content for A/B/C variants
      const parsed = parseEmailVersions(emailContent);
      const versionA = parsed.versions.find(v => v.id === 'a');
      const versionB = parsed.versions.find(v => v.id === 'b');
      const versionC = parsed.versions.find(v => v.id === 'c');

      // Use primary content
      const primaryContent = versionA?.content || emailContent;

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
      // Extract meaningful error information
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const errorDetails = typeof err === 'object' && err !== null ? {
        message: (err as any).message,
        code: (err as any).code,
        details: (err as any).details,
        hint: (err as any).hint,
      } : err;
      
      console.error('Error adding version:', errorDetails);
      toast.error(`Failed to save new version: ${errorMessage}`);
      return null;
    }
  }, [supabase, artifacts, fetchArtifacts]);

  // Select a variant (A, B, or C) - with optimistic update
  const selectVariant = useCallback(async (artifactId: string, variant: ArtifactVariant) => {
    const artifact = artifacts.find(a => a.id === artifactId);
    if (!artifact) return;

    // Save previous state for rollback
    const previousVariant = artifact.selected_variant;

    // Optimistic update - update UI immediately
    setArtifacts(prev => prev.map(a =>
      a.id === artifactId ? { ...a, selected_variant: variant } : a
    ));

    try {
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
    } catch (err) {
      // Rollback on error
      setArtifacts(prev => prev.map(a =>
        a.id === artifactId ? { ...a, selected_variant: previousVariant } : a
      ));

      // Extract meaningful error information
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error selecting variant:', {
        error: err,
        message: errorMessage,
        artifactId,
        variant,
      });
      toast.error(`Failed to select variant: ${errorMessage}`);
    }
  }, [supabase, artifacts]);

  // Update artifact title - with optimistic update
  const updateTitle = useCallback(async (artifactId: string, title: string) => {
    const artifact = artifacts.find(a => a.id === artifactId);
    if (!artifact) return;

    // Save previous state for rollback
    const previousTitle = artifact.title;

    // Optimistic update - update UI immediately
    setArtifacts(prev => prev.map(a =>
      a.id === artifactId ? { ...a, title } : a
    ));

    try {
      const { error } = await supabase
        .from('artifacts')
        .update({ title })
        .eq('id', artifactId);

      if (error) throw error;
    } catch (err) {
      // Rollback on error
      setArtifacts(prev => prev.map(a =>
        a.id === artifactId ? { ...a, title: previousTitle } : a
      ));

      // Extract meaningful error information
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error updating title:', {
        error: err,
        message: errorMessage,
        artifactId,
        title,
      });
      toast.error(`Failed to update title: ${errorMessage}`);
    }
  }, [supabase, artifacts]);

  // Set active artifact
  const setActiveArtifact = useCallback((artifactId: string | null) => {
    setActiveArtifactId(artifactId);
  }, []);

  // Delete artifact - with optimistic update
  const deleteArtifact = useCallback(async (artifactId: string) => {
    // Save current state for potential rollback
    const artifactToDelete = artifacts.find(a => a.id === artifactId);
    if (!artifactToDelete) return;

    const previousArtifacts = [...artifacts];
    const wasActive = activeArtifactId === artifactId;

    // Optimistic update - remove from UI immediately
    setArtifacts(prev => prev.filter(a => a.id !== artifactId));
    if (wasActive) {
      setActiveArtifactId(null);
    }

    try {
      const { error } = await supabase
        .from('artifacts')
        .delete()
        .eq('id', artifactId);

      if (error) throw error;

      toast.success('Artifact deleted');
    } catch (err) {
      // Rollback on error - restore the artifact
      setArtifacts(previousArtifacts);
      if (wasActive) {
        setActiveArtifactId(artifactId);
      }

      // Extract meaningful error information
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error deleting artifact:', {
        error: err,
        message: errorMessage,
        artifactId,
      });
      toast.error(`Failed to delete: ${errorMessage}`);
    }
  }, [supabase, activeArtifactId, artifacts]);

  // Duplicate artifact - creates a copy with "(Copy)" suffix
  const duplicateArtifact = useCallback(async (artifactId: string): Promise<EmailArtifactWithContent | null> => {
    const artifactToDuplicate = artifacts.find(a => a.id === artifactId);
    if (!artifactToDuplicate) {
      toast.error('Artifact not found');
      return null;
    }

    try {
      // Create a new artifact with the same content
      const { data: newArtifact, error } = await supabase
        .from('artifacts')
        .insert({
          conversation_id: conversationId,
          kind: artifactToDuplicate.kind,
          title: `${artifactToDuplicate.title} (Copy)`,
          content: artifactToDuplicate.content,
          version: 1,
          metadata: {
            status: 'draft',
            version_a_content: artifactToDuplicate.version_a_content,
            version_a_approach: artifactToDuplicate.version_a_approach,
            version_b_content: artifactToDuplicate.version_b_content,
            version_b_approach: artifactToDuplicate.version_b_approach,
            version_c_content: artifactToDuplicate.version_c_content,
            version_c_approach: artifactToDuplicate.version_c_approach,
            selected_variant: 'a',
          },
        })
        .select()
        .single();

      if (error) throw error;

      // Transform to flat structure
      const duplicatedArtifact: EmailArtifactWithContent = {
        ...newArtifact,
        type: 'email',
        status: 'draft',
        is_shared: false,
        version_a_content: artifactToDuplicate.version_a_content,
        version_a_approach: artifactToDuplicate.version_a_approach,
        version_b_content: artifactToDuplicate.version_b_content,
        version_b_approach: artifactToDuplicate.version_b_approach,
        version_c_content: artifactToDuplicate.version_c_content,
        version_c_approach: artifactToDuplicate.version_c_approach,
        selected_variant: 'a',
        version_count: 1,
      };

      // Add to local state
      setArtifacts(prev => [duplicatedArtifact, ...prev]);
      setActiveArtifactId(duplicatedArtifact.id);

      toast.success('Artifact duplicated');
      return duplicatedArtifact;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error duplicating artifact:', err);
      toast.error(`Failed to duplicate: ${errorMessage}`);
      return null;
    }
  }, [supabase, artifacts, conversationId]);

  // Share artifact - with optimistic update
  const shareArtifact = useCallback(async (artifactId: string): Promise<string | null> => {
    const artifact = artifacts.find(a => a.id === artifactId);
    if (!artifact) return null;

    // Generate a cryptographically secure share token
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    const randomPart = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const shareToken = `share_${artifactId.slice(0, 8)}_${randomPart}`;
    const sharedAt = new Date().toISOString();

    // Save previous state for rollback
    const previousState = {
      is_shared: artifact.is_shared,
      share_token: artifact.share_token,
      shared_at: artifact.shared_at,
    };

    // Optimistic update - show as shared immediately
    setArtifacts(prev => prev.map(a =>
      a.id === artifactId ? { ...a, is_shared: true, share_token: shareToken, shared_at: sharedAt } : a
    ));

    const shareUrl = `${window.location.origin}/share/email/${shareToken}`;

    try {
      const { error: updateError } = await supabase
        .from('artifacts')
        .update({
          metadata: {
            ...((artifact as any).metadata || {}),
            share_token: shareToken,
            is_shared: true,
            shared_at: sharedAt,
          }
        })
        .eq('id', artifactId);

      if (updateError) throw updateError;

      // Try to copy to clipboard, but don't fail if it doesn't work
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Share link copied to clipboard!');
      } catch (clipboardErr) {
        console.warn('Clipboard write failed:', clipboardErr);
        toast.success('Share link created!');
      }

      return shareUrl;
    } catch (err) {
      // Rollback on error
      setArtifacts(prev => prev.map(a =>
        a.id === artifactId ? { ...a, ...previousState } : a
      ));

      // Extract meaningful error information
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error sharing artifact:', {
        error: err,
        message: errorMessage,
        artifactId,
      });
      toast.error(`Failed to create share link: ${errorMessage}`);
      return null;
    }
  }, [supabase, artifacts]);

  // Unshare artifact - with optimistic update
  const unshareArtifact = useCallback(async (artifactId: string) => {
    const artifact = artifacts.find(a => a.id === artifactId);
    if (!artifact) return;

    // Save previous state for rollback
    const previousState = {
      is_shared: artifact.is_shared,
      share_token: artifact.share_token,
      shared_at: artifact.shared_at,
    };

    // Optimistic update - show as unshared immediately
    setArtifacts(prev => prev.map(a =>
      a.id === artifactId ? { ...a, is_shared: false, share_token: undefined, shared_at: undefined } : a
    ));

    try {
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

      toast.success('Share link removed');
    } catch (err) {
      // Rollback on error
      setArtifacts(prev => prev.map(a =>
        a.id === artifactId ? { ...a, ...previousState } : a
      ));

      // Extract meaningful error information
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error unsharing artifact:', {
        error: err,
        message: errorMessage,
        artifactId,
      });
      toast.error(`Failed to remove share link: ${errorMessage}`);
    }
  }, [supabase, artifacts]);

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
      // Extract meaningful error information
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error fetching version history:', {
        error: err,
        message: errorMessage,
        artifactId,
      });
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
    duplicateArtifact,
    shareArtifact,
    unshareArtifact,
    getVersionHistory,
    refetch: fetchArtifacts,
  };
}

export default useEmailArtifacts;
