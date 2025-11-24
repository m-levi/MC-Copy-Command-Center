import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

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
    console.log('[Presence] usePresence hook initialized');
    const fetchUser = async () => {
      console.log('[Presence] Fetching current user...');
      const { data: { user } } = await supabaseRef.current.auth.getUser();
      console.log('[Presence] Got user:', user?.email);
      if (user) {
        // Get profile for better display name
        const { data: profile } = await supabaseRef.current
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('user_id', user.id)
          .single();

        console.log('[Presence] Got profile:', profile);

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
      console.log('[Presence] Skipping setup - missing conversationId or currentUser');
      return;
    }

    console.log('[Presence] Setting up presence for conversation:', conversationId);
    console.log('[Presence] Current user:', currentUser.email);

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
        
        console.log('[Presence] Sync:', { 
          conversationId,
          raw: users.length, 
          unique: uniqueUsers.length, 
          users: uniqueUsers.map(u => ({ email: u.email, id: u.user_id }))
        });
        
        setActiveUsers(uniqueUsers);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('[Presence] User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('[Presence] User left:', key, leftPresences);
      })
      .subscribe(async (status, err) => {
        console.log('[Presence] Subscription status:', status, err);
        if (status === 'SUBSCRIBED') {
          console.log('[Presence] Connected as', currentUser.email);
          const trackStatus = await channel.track(currentUser);
          console.log('[Presence] Track status:', trackStatus);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('[Presence] Channel error:', err || 'Unknown channel error');
        }
        if (status === 'TIMED_OUT') {
          console.error('[Presence] Connection timed out', err || '');
        }
        if (status === 'CLOSED') {
          console.log('[Presence] Channel closed');
        }
      });

    return () => {
      console.log('[Presence] Cleaning up channel for conversation:', conversationId);
      // Untrack before removing channel
      channel.untrack();
      supabaseRef.current.removeChannel(channel);
      // Clear active users when leaving
      setActiveUsers([]);
    };
  }, [conversationId, currentUser?.user_id]); // Only depend on user_id, not the whole object

  return activeUsers;
}

