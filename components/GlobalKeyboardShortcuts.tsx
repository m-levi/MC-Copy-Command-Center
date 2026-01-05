'use client';

import { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { createClient } from '@/lib/supabase/client';
import { Brand, ConversationWithStatus } from '@/types';
import { logger } from '@/lib/logger';

const CommandPalette = lazy(() => import('./CommandPalette'));
const KeyboardShortcutsHelp = lazy(() => import('./KeyboardShortcutsHelp'));

/**
 * Global keyboard shortcuts provider
 * Provides app-wide shortcuts like Command+K
 */
export default function GlobalKeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [conversations, setConversations] = useState<ConversationWithStatus[]>([]);
  const [currentBrandId, setCurrentBrandId] = useState<string>('');
  const [dataLoaded, setDataLoaded] = useState(false);

  // Extract brand ID from pathname and reset data loaded flag on brand change
  useEffect(() => {
    const match = pathname.match(/\/brands\/([^/]+)/);
    const newBrandId = match ? match[1] : '';
    
    if (newBrandId !== currentBrandId) {
      setCurrentBrandId(newBrandId);
      // Reset data loaded flag when brand changes so conversations reload
      if (currentBrandId !== '') {
        setDataLoaded(false);
      }
    }
  }, [pathname, currentBrandId]);

  // Load data only when command palette is opened
  const loadData = useCallback(async () => {
    if (dataLoaded) return; // Already loaded
    
    try {
      const supabase = createClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      // If not authenticated, skip loading
      if (userError || !userData.user) {
        logger.debug('User not authenticated, skipping data load');
        return;
      }

      // Load brands
      const { data: brandsData, error: brandsError } = await supabase
        .from('brands')
        .select('*')
        .order('name');

      if (brandsError) {
        logger.error('Error loading brands:', brandsError);
      } else {
        setBrands(brandsData || []);
      }

      // Load conversations from ALL brands (not just current one)
      // This makes Command K truly global!
      const { data: convsData, error: convsError } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(100); // Load more for global search

      if (convsError) {
        // Only log in development to avoid console noise
        logger.debug('Could not load conversations for command palette:', convsError);
        // Set empty array so the command palette still works
        setConversations([]);
      } else {
        const conversationsWithStatus: ConversationWithStatus[] = (convsData || []).map(conv => ({
          ...conv,
          status: 'idle' as const,
        }));
        
        setConversations(conversationsWithStatus);
      }
      
      setDataLoaded(true);
    } catch (error) {
      logger.error('Error loading data for command palette:', error);
    }
  }, [dataLoaded]);

  // Load data when command palette opens
  useEffect(() => {
    if (showCommandPalette) {
      loadData();
    }
  }, [showCommandPalette, loadData]);

  // Listen for keyboard shortcuts help request
  useEffect(() => {
    const handleShowHelp = () => {
      setShowKeyboardShortcuts(true);
    };

    window.addEventListener('showKeyboardShortcuts', handleShowHelp);
    return () => window.removeEventListener('showKeyboardShortcuts', handleShowHelp);
  }, []);

  // Global Escape key handler - prevent browser back navigation
  useEffect(() => {
    const handleGlobalEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Always prevent default to stop browser navigation
        e.preventDefault();
        e.stopPropagation();
        
        // Close modals in order of priority
        if (showCommandPalette) {
          setShowCommandPalette(false);
        } else if (showKeyboardShortcuts) {
          setShowKeyboardShortcuts(false);
        }
        // If no global modals are open, do nothing (just prevent navigation)
      }
    };
    
    // Use capture phase to catch before other handlers
    window.addEventListener('keydown', handleGlobalEscape, { capture: true });
    return () => window.removeEventListener('keydown', handleGlobalEscape, { capture: true });
  }, [showCommandPalette, showKeyboardShortcuts]);

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'k',
        meta: true,
        ctrl: true,
        description: 'Open command palette',
        action: () => setShowCommandPalette(true),
      },
      {
        key: '/',
        meta: true,
        ctrl: true,
        description: 'Show keyboard shortcuts',
        action: () => setShowKeyboardShortcuts(true),
      },
      {
        key: 'n',
        meta: true,
        ctrl: true,
        description: 'New conversation',
        action: () => handleNewConversation(),
      },
      {
        key: 'N',
        meta: true,
        ctrl: true,
        shift: true,
        description: 'New email flow',
        action: () => handleNewFlow(),
      },
      {
        key: 'b',
        meta: true,
        ctrl: true,
        description: 'Toggle sidebar',
        action: () => {
          // Dispatch event for sidebar toggle
          window.dispatchEvent(new CustomEvent('toggleSidebar'));
        },
      },
    ],
    enabled: true,
  });

  const handleSelectConversation = (conversationId: string, brandId?: string) => {
    setShowCommandPalette(false);
    
    // Use the conversation's brand ID if provided, otherwise use current
    const targetBrandId = brandId || currentBrandId;
    
    if (targetBrandId) {
      // Check if we're already on the chat page for this brand
      const isOnChatPage = pathname.includes(`/brands/${targetBrandId}/chat`);
      
      if (isOnChatPage && targetBrandId === currentBrandId) {
        // Same brand, same page - trigger event for instant selection
        window.dispatchEvent(new CustomEvent('selectConversation', { 
          detail: { conversationId } 
        }));
      } else {
        // Different brand or different page - navigate
        localStorage.setItem(`command-palette-target-conversation`, conversationId);
        router.push(`/brands/${targetBrandId}/chat`);
      }
    }
  };

  const handleSelectBrand = (brandId: string) => {
    setShowCommandPalette(false);
    router.push(`/brands/${brandId}/chat`);
  };

  const handleNewConversation = () => {
    if (currentBrandId) {
      // Navigate to brand chat page (will create new conversation on the page)
      router.push(`/brands/${currentBrandId}/chat`);
      // Close command palette
      setShowCommandPalette(false);
    } else {
      // If not on a brand page, go to home
      router.push('/');
    }
  };

  const handleNewFlow = () => {
    if (currentBrandId) {
      // Navigate with flow param
      router.push(`/brands/${currentBrandId}/chat?flow=new`);
      // Close command palette
      setShowCommandPalette(false);
    } else {
      router.push('/');
    }
  };

  return (
    <>
      {/* Command Palette */}
      {showCommandPalette && (
        <Suspense fallback={null}>
          <CommandPalette
            isOpen={showCommandPalette}
            onClose={() => setShowCommandPalette(false)}
            conversations={conversations}
            brands={brands}
            currentBrandId={currentBrandId}
            onSelectConversation={handleSelectConversation}
            onSelectBrand={handleSelectBrand}
            onNewConversation={handleNewConversation}
            onNewFlow={handleNewFlow}
          />
        </Suspense>
      )}

      {/* Keyboard Shortcuts Help */}
      {showKeyboardShortcuts && (
        <Suspense fallback={null}>
          <KeyboardShortcutsHelp
            isOpen={showKeyboardShortcuts}
            onClose={() => setShowKeyboardShortcuts(false)}
          />
        </Suspense>
      )}
    </>
  );
}

