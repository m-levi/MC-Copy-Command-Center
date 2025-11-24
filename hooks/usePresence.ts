import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

export interface PresenceState {
  user_id: string;
  online_at: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
}

export function usePresence(conversationId: string) {
  const [activeUsers, setActiveUsers] = useState<PresenceState[]>([]);
  const [currentUser, setCurrentUser] = useState<PresenceState | null>(null);
  const supabaseRef = useRef(createClient());

  // Fetch current user details once
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabaseRef.current.auth.getUser();
      if (user) {
        // Get profile for better display name
        const { data: profile } = await supabaseRef.current
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('user_id', user.id)
          .single();

        setCurrentUser({
          user_id: user.id,
          email: user.email,
          online_at: new Date().toISOString(),
          full_name: profile?.full_name,
          avatar_url: profile?.avatar_url,
        });
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!conversationId || !currentUser) {
      return;
    }

    // Use public channel for now (no RLS setup needed)
    // For production, switch to private: true and set up RLS policies
    const channel = supabaseRef.current.channel(`presence:${conversationId}`, {
      config: {
        presence: {
          key: currentUser.user_id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState<PresenceState>();
        const users = Object.values(newState).flat();
        
        // For testing: If we want to see multiple tabs of same user, we shouldn't dedupe by ID strictly.
        // But for production "Who is online", deduping is correct.
        // I'll leave deduplication for now, but the UI will show "1 online" if it's just me in 2 tabs.
        const uniqueUsers = Array.from(new Map(users.map(u => [u.user_id, u])).values());
        
        setActiveUsers(uniqueUsers);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        logger.debug('[Presence] User joined:', key);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        logger.debug('[Presence] User left:', key);
      })
      .subscribe(async (status, err) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(currentUser);
        }
        // These are often transient errors that resolve on their own
        // Downgrade to warn to avoid alarming users
        if (status === 'CHANNEL_ERROR') {
          logger.warn('[Presence] Channel error (will retry):', err?.message || 'Connection issue');
        }
        if (status === 'TIMED_OUT') {
          logger.warn('[Presence] Connection timed out (will retry)');
        }
      });

    return () => {
      // Untrack before removing channel
      channel.untrack();
      supabaseRef.current.removeChannel(channel);
      // Clear active users when leaving
      setActiveUsers([]);
    };
  }, [conversationId, currentUser?.user_id]); // Only depend on user_id, not the whole object

  return activeUsers;
}
