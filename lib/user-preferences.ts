import { createClient } from '@/lib/supabase/client';
import { UserPreferences, SidebarViewMode, FilterType } from '@/types';

const PREFERENCES_CACHE_KEY = 'user_preferences_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedPreferences {
  data: UserPreferences;
  timestamp: number;
}

/**
 * Get user preferences with caching
 */
export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  try {
    // Check localStorage cache first
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(`${PREFERENCES_CACHE_KEY}_${userId}`);
      if (cached) {
        const { data, timestamp }: CachedPreferences = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          return data;
        }
      }
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No preferences found, return null
        return null;
      }
      throw error;
    }

    // Cache the result
    if (typeof window !== 'undefined' && data) {
      const cached: CachedPreferences = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(`${PREFERENCES_CACHE_KEY}_${userId}`, JSON.stringify(cached));
    }

    return data;
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return null;
  }
}

/**
 * Create or update user preferences
 */
export async function upsertUserPreferences(
  userId: string,
  preferences: Partial<Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<UserPreferences | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        ...preferences
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) throw error;

    // Update cache
    if (typeof window !== 'undefined' && data) {
      const cached: CachedPreferences = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(`${PREFERENCES_CACHE_KEY}_${userId}`, JSON.stringify(cached));
    }

    return data;
  } catch (error) {
    console.error('Error upserting user preferences:', error);
    return null;
  }
}

/**
 * Update sidebar view mode
 */
export async function updateViewMode(userId: string, viewMode: SidebarViewMode): Promise<boolean> {
  const result = await upsertUserPreferences(userId, { sidebar_view_mode: viewMode });
  return result !== null;
}

/**
 * Update sidebar width
 */
export async function updateSidebarWidth(userId: string, width: number): Promise<boolean> {
  const result = await upsertUserPreferences(userId, { sidebar_width: width });
  return result !== null;
}

/**
 * Update default filter
 */
export async function updateDefaultFilter(
  userId: string,
  filter: FilterType,
  personId?: string
): Promise<boolean> {
  const result = await upsertUserPreferences(userId, {
    default_filter: filter,
    default_filter_person_id: personId
  });
  return result !== null;
}

/**
 * Pin/unpin a conversation
 */
export async function togglePinConversation(
  userId: string,
  conversationId: string,
  isPinned: boolean
): Promise<boolean> {
  try {
    const prefs = await getUserPreferences(userId);
    const pinnedConversations = prefs?.pinned_conversations || [];

    let newPinned: string[];
    if (isPinned) {
      newPinned = [...pinnedConversations, conversationId];
    } else {
      newPinned = pinnedConversations.filter(id => id !== conversationId);
    }

    const result = await upsertUserPreferences(userId, { pinned_conversations: newPinned });
    return result !== null;
  } catch (error) {
    console.error('Error toggling pin:', error);
    return false;
  }
}

/**
 * Archive/unarchive a conversation
 */
export async function toggleArchiveConversation(
  userId: string,
  conversationId: string,
  isArchived: boolean
): Promise<boolean> {
  try {
    const prefs = await getUserPreferences(userId);
    const archivedConversations = prefs?.archived_conversations || [];

    let newArchived: string[];
    if (isArchived) {
      newArchived = [...archivedConversations, conversationId];
    } else {
      newArchived = archivedConversations.filter(id => id !== conversationId);
    }

    const result = await upsertUserPreferences(userId, { archived_conversations: newArchived });
    return result !== null;
  } catch (error) {
    console.error('Error toggling archive:', error);
    return false;
  }
}

/**
 * Clear preferences cache
 */
export function clearPreferencesCache(userId?: string) {
  if (typeof window !== 'undefined') {
    if (userId) {
      localStorage.removeItem(`${PREFERENCES_CACHE_KEY}_${userId}`);
    } else {
      // Clear all preferences caches
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(PREFERENCES_CACHE_KEY)) {
          localStorage.removeItem(key);
        }
      });
    }
  }
}

/**
 * Get default preferences
 */
export function getDefaultPreferences(userId: string): UserPreferences {
  return {
    id: '',
    user_id: userId,
    sidebar_view_mode: 'list',
    sidebar_width: 398,
    default_filter: 'all',
    pinned_conversations: [],
    archived_conversations: [],
    enabled_models: null, // null means all models enabled
    default_model: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * Update enabled AI models
 */
export async function updateEnabledModels(
  userId: string,
  enabledModels: string[]
): Promise<boolean> {
  const result = await upsertUserPreferences(userId, { enabled_models: enabledModels });
  return result !== null;
}

/**
 * Update default AI model
 */
export async function updateDefaultModel(
  userId: string,
  modelId: string | null
): Promise<boolean> {
  const result = await upsertUserPreferences(userId, { default_model: modelId });
  return result !== null;
}

// ============================================================================
// ARTIFACT PREFERENCES
// ============================================================================

/**
 * Artifact preferences structure
 */
export interface ArtifactPreferences {
  /** List of artifact types the user has disabled */
  disabledArtifactTypes: string[];
  /** Whether AI should auto-create artifacts */
  artifactAutoCreate: boolean;
  /** Whether to show artifact suggestions */
  artifactSuggestionsEnabled: boolean;
}

/**
 * Get artifact-specific preferences for a user
 */
export async function getArtifactPreferences(userId: string): Promise<ArtifactPreferences> {
  const prefs = await getUserPreferences(userId);

  return {
    disabledArtifactTypes: (prefs as unknown as Record<string, unknown>)?.disabled_artifact_types as string[] || [],
    artifactAutoCreate: (prefs as unknown as Record<string, unknown>)?.artifact_auto_create !== false,
    artifactSuggestionsEnabled: (prefs as unknown as Record<string, unknown>)?.artifact_suggestions_enabled !== false,
  };
}

/**
 * Update artifact preferences
 */
export async function updateArtifactPreferences(
  userId: string,
  preferences: Partial<ArtifactPreferences>
): Promise<boolean> {
  const updates: Record<string, unknown> = {};

  if (preferences.disabledArtifactTypes !== undefined) {
    updates.disabled_artifact_types = preferences.disabledArtifactTypes;
  }
  if (preferences.artifactAutoCreate !== undefined) {
    updates.artifact_auto_create = preferences.artifactAutoCreate;
  }
  if (preferences.artifactSuggestionsEnabled !== undefined) {
    updates.artifact_suggestions_enabled = preferences.artifactSuggestionsEnabled;
  }

  const result = await upsertUserPreferences(userId, updates);
  return result !== null;
}

/**
 * Check if a specific artifact type is enabled for a user
 */
export function isArtifactTypeEnabled(
  kind: string,
  preferences: ArtifactPreferences
): boolean {
  return !preferences.disabledArtifactTypes.includes(kind);
}

/**
 * Toggle an artifact type (enable/disable)
 */
export async function toggleArtifactType(
  userId: string,
  kind: string,
  enabled: boolean
): Promise<boolean> {
  const prefs = await getArtifactPreferences(userId);
  let disabledTypes = [...prefs.disabledArtifactTypes];

  if (enabled) {
    // Remove from disabled list
    disabledTypes = disabledTypes.filter(t => t !== kind);
  } else {
    // Add to disabled list
    if (!disabledTypes.includes(kind)) {
      disabledTypes.push(kind);
    }
  }

  return updateArtifactPreferences(userId, { disabledArtifactTypes: disabledTypes });
}

/**
 * Set artifact auto-create preference
 */
export async function setArtifactAutoCreate(
  userId: string,
  autoCreate: boolean
): Promise<boolean> {
  return updateArtifactPreferences(userId, { artifactAutoCreate: autoCreate });
}

/**
 * Set artifact suggestions preference
 */
export async function setArtifactSuggestionsEnabled(
  userId: string,
  enabled: boolean
): Promise<boolean> {
  return updateArtifactPreferences(userId, { artifactSuggestionsEnabled: enabled });
}





























