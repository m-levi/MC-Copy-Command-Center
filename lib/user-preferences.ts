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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}



















