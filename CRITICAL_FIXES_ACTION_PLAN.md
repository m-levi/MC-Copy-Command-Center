# 🚨 Critical Fixes - Action Plan

**Priority**: URGENT  
**Est. Time**: 4-6 hours  
**Risk Level**: Production-blocking

---

## 🎯 Fix Priority Matrix

```
┌─────────────────────────────────────────────────────────────┐
│                    IMPACT vs EFFORT                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  HIGH IMPACT, LOW EFFORT ⚡                                 │
│  ├─ Fix #3: Supabase placeholder validation (5 min)        │
│  ├─ Fix #4: Remove service role warnings (5 min)           │
│  ├─ Fix #8: Abort controller cleanup (15 min)              │
│  └─ Fix #11: Remove production console.logs (30 min)       │
│                                                              │
│  HIGH IMPACT, MEDIUM EFFORT 🔥                              │
│  ├─ Fix #1: Memory leak in cleanup (1 hour)                │
│  ├─ Fix #5: Content sanitization (1 hour)                  │
│  ├─ Fix #6: Memory instruction security (1.5 hours)        │
│  └─ Fix #7: Auto-delete race conditions (1.5 hours)        │
│                                                              │
│  MEDIUM IMPACT, LOW EFFORT ⚡                               │
│  ├─ Fix #12: Add error boundaries (30 min)                 │
│  ├─ Fix #14: Promise rejection handling (30 min)           │
│  └─ Fix #17: Thinking content sanitization (15 min)        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 STEP-BY-STEP FIXES

### ⚡ Quick Wins (Next 30 Minutes)

#### Fix #3: Validate Supabase Credentials
**File**: `lib/supabase/client.ts`, `lib/supabase/server.ts`  
**Time**: 5 minutes

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local'
    );
  }
  
  return createBrowserClient(url, key);
}
```

```typescript
// lib/supabase/server.ts
export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing Supabase environment variables on server. ' +
      'Check your .env.local file.'
    );
  }

  return createServerClient(url, key, {
    // ... rest stays same
  });
}
```

---

#### Fix #4: Remove Sensitive Console Warnings
**File**: `lib/supabase/edge.ts`  
**Time**: 5 minutes

```typescript
export function createEdgeClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }
  
  if (!serviceRoleKey) {
    // Remove console warnings - just fall back silently
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!anonKey) {
      throw new Error('Missing Supabase credentials for Edge runtime');
    }
    return createSupabaseClient(url, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
```

---

#### Fix #8: Abort Controller Cleanup
**File**: `app/brands/[brandId]/chat/page.tsx`  
**Time**: 15 minutes

Add this useEffect near the top of the component (after hook declarations):

```typescript
// Cleanup abort controller on unmount
useEffect(() => {
  return () => {
    if (abortControllerRef.current) {
      console.log('Cleaning up abort controller on unmount');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };
}, []);
```

And modify the abort handling in message sending:

```typescript
// In handleSendMessage, after creating abort controller (line ~1137)
abortControllerRef.current = new AbortController();
const currentController = abortControllerRef.current; // Capture reference

try {
  // ... existing code ...
} catch (error: any) {
  if (error.name === 'AbortError') {
    toast.error('Generation stopped');
  }
} finally {
  setSending(false);
  // Only clear if this is still the current controller
  if (abortControllerRef.current === currentController) {
    abortControllerRef.current = null;
  }
}
```

---

### 🔥 Critical Fixes (Next 2 Hours)

#### Fix #1: Memory Leak in Cleanup Effect
**File**: `app/brands/[brandId]/chat/page.tsx` (Lines 109-238)  
**Time**: 1 hour

Replace the entire cleanup section:

```typescript
useEffect(() => {
  initializePage();
  
  // Subscribe to real-time conversation updates
  const conversationChannel = supabase
    .channel(`conversations:${brandId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'conversations',
        filter: `brand_id=eq.${brandId}`,
      },
      (payload) => {
        console.log('New conversation created:', payload.new);
        const newConversation = payload.new as Conversation;
        
        setConversations((prev) => {
          const exists = prev.some(c => c.id === newConversation.id);
          if (!exists) {
            const updated = [newConversation, ...prev];
            cacheConversations(brandId, updated);
            trackEvent('conversation_created_realtime', { conversationId: newConversation.id });
            return updated;
          }
          return prev;
        });
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
        filter: `brand_id=eq.${brandId}`,
      },
      (payload) => {
        console.log('Conversation updated:', payload.new);
        const updatedConversation = payload.new as Conversation;
        
        setConversations((prev) => {
          const updated = prev.map((conv) =>
            conv.id === updatedConversation.id ? updatedConversation : conv
          ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
          
          cacheConversations(brandId, updated);
          
          if (currentConversation?.id === updatedConversation.id) {
            setCurrentConversation(updatedConversation);
          }
          
          return updated;
        });
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'conversations',
        filter: `brand_id=eq.${brandId}`,
      },
      (payload) => {
        console.log('Conversation deleted:', payload.old);
        const deletedId = (payload.old as any).id;
        
        setConversations((prev) => {
          const updated = prev.filter((conv) => conv.id !== deletedId);
          cacheConversations(brandId, updated);
          return updated;
        });
        
        if (currentConversation?.id === deletedId) {
          setCurrentConversation(null);
          setMessages([]);
        }
      }
    )
    .subscribe();
  
  // ESC key to go back to brands
  const handleEscKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      router.push('/');
    }
  };

  window.addEventListener('keydown', handleEscKey);
  
  // FIXED: Safe cleanup with refs
  const mountedRef = { current: true };
  const cleanupConversationId = currentConversation?.id;
  const cleanupMessageCount = messages.length;
  
  return () => {
    mountedRef.current = false;
    conversationChannel.unsubscribe();
    window.removeEventListener('keydown', handleEscKey);
    
    // SAFE: Auto-delete empty conversation on unmount
    // Use captured values, not state (which may be stale)
    if (cleanupConversationId && cleanupMessageCount === 0) {
      console.log('Auto-deleting empty conversation on unmount:', cleanupConversationId);
      
      // Don't await - fire and forget is OK for cleanup
      // Add timeout to ensure we don't block navigation
      const deleteTimeout = setTimeout(() => {
        supabase
          .from('conversations')
          .delete()
          .eq('id', cleanupConversationId)
          .then(({ error }) => {
            if (error && mountedRef.current) {
              console.error('Cleanup delete failed:', error);
            } else {
              trackEvent('conversation_auto_deleted', { 
                conversationId: cleanupConversationId,
                reason: 'empty_on_unmount' 
              });
            }
          })
          .catch((err) => {
            console.error('Cleanup exception:', err);
          });
      }, 100); // Small delay to avoid race with navigation
      
      // Don't wait for timeout
      return () => clearTimeout(deleteTimeout);
    }
  };
}, [brandId, router]); // Remove currentConversation and messages from dependencies
```

---

#### Fix #5: Content Sanitization
**File**: `app/brands/[brandId]/chat/page.tsx`  
**Time**: 1 hour

First, install DOMPurify:
```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

Then add sanitization utility:

```typescript
// Add at top of file
import DOMPurify from 'dompurify';

// Add helper function
const sanitizeContent = (content: string): string => {
  // Configure DOMPurify
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'title', 'target'],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
};

// Sanitize AI response before saving (around line 1319)
const sanitizedContent = sanitizeContent(fullContent);
const sanitizedThinking = thinkingContent ? sanitizeContent(thinkingContent) : null;

const { data: savedAiMessage, error: aiError } = await supabase
  .from('messages')
  .insert({
    conversation_id: currentConversation.id,
    role: 'assistant',
    content: sanitizedContent,  // SANITIZED
    thinking: sanitizedThinking, // SANITIZED
    metadata: productLinks.length > 0 ? { productLinks } : null,
  })
  .select()
  .single();
```

---

#### Fix #6: Memory Instruction Security
**File**: `lib/conversation-memory-store.ts`  
**Time**: 1.5 hours

Replace the parsing function:

```typescript
// Whitelist of allowed memory keys and categories
const ALLOWED_MEMORY_KEYS = [
  'tone_preference',
  'target_audience',
  'campaign_type',
  'product_focus',
  'urgency_level',
  'brand_voice',
  'promo_code',
  'special_offer',
];

const ALLOWED_CATEGORIES: MemoryEntry['category'][] = [
  'user_preference',
  'brand_context',
  'campaign_info',
  'product_details',
  'decision',
  'fact',
];

/**
 * Parse memory instructions from AI response
 * SECURITY: Only accepts whitelisted keys and validates format
 */
export function parseMemoryInstructions(content: string): Array<{
  key: string;
  value: string;
  category: MemoryEntry['category'];
}> {
  const pattern = /\[REMEMBER:([^=]+)=([^:]+):(\w+)\]/g;
  const instructions: Array<{ key: string; value: string; category: MemoryEntry['category'] }> = [];
  
  let match;
  let matchCount = 0;
  const MAX_MATCHES = 10; // Prevent DoS via massive memory instructions
  
  while ((match = pattern.exec(content)) !== null) {
    matchCount++;
    if (matchCount > MAX_MATCHES) {
      console.warn(`[Memory] Too many memory instructions (>${MAX_MATCHES}), stopping parse`);
      break;
    }
    
    const [, rawKey, rawValue, rawCategory] = match;
    const key = rawKey.trim();
    const value = rawValue.trim();
    const category = rawCategory.trim();
    
    // SECURITY: Validate key is whitelisted
    if (!ALLOWED_MEMORY_KEYS.includes(key)) {
      console.warn(`[Memory] Rejected non-whitelisted key: ${key}`);
      continue;
    }
    
    // SECURITY: Validate category
    if (!ALLOWED_CATEGORIES.includes(category as MemoryEntry['category'])) {
      console.warn(`[Memory] Rejected invalid category: ${category}`);
      continue;
    }
    
    // SECURITY: Validate value length (prevent storage abuse)
    if (value.length > 500) {
      console.warn(`[Memory] Rejected overly long value for key: ${key}`);
      continue;
    }
    
    // SECURITY: Sanitize value (no HTML/scripts)
    const sanitizedValue = value.replace(/<[^>]*>/g, '').trim();
    
    instructions.push({
      key,
      value: sanitizedValue,
      category: category as MemoryEntry['category'],
    });
  }

  return instructions;
}
```

---

#### Fix #7: Auto-Delete Race Conditions
**File**: `app/brands/[brandId]/chat/page.tsx`  
**Time**: 1.5 hours

Create a centralized delete handler with locking:

```typescript
// Add at top of component
const deletingConversationsRef = useRef<Set<string>>(new Set());

// Centralized safe delete function
const safeDeleteEmptyConversation = async (conversationId: string, messageCount: number) => {
  // Check if already being deleted
  if (deletingConversationsRef.current.has(conversationId)) {
    console.log('Conversation already being deleted, skipping:', conversationId);
    return { success: false, reason: 'already_deleting' };
  }
  
  // Only delete if empty
  if (messageCount !== 0) {
    console.log('Conversation has messages, not deleting:', conversationId);
    return { success: false, reason: 'has_messages' };
  }
  
  try {
    // Mark as being deleted
    deletingConversationsRef.current.add(conversationId);
    
    console.log('Auto-deleting empty conversation:', conversationId);
    
    // Double-check message count in database before deleting
    const { count, error: countError } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);
    
    if (countError) {
      console.error('Error checking message count:', countError);
      return { success: false, reason: 'count_error' };
    }
    
    if (count && count > 0) {
      console.log('Conversation has messages in DB, not deleting');
      return { success: false, reason: 'has_messages_in_db' };
    }
    
    // Safe to delete
    const { error: deleteError } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);
    
    if (deleteError) {
      console.error('Error deleting empty conversation:', deleteError);
      return { success: false, reason: 'delete_error' };
    }
    
    trackEvent('conversation_auto_deleted', { 
      conversationId,
      reason: 'empty_verified' 
    });
    
    return { success: true };
  } finally {
    // Always remove from deletion set
    deletingConversationsRef.current.delete(conversationId);
  }
};

// Replace all instances of manual deletion with:
// OLD CODE:
// if (currentConversation && messages.length === 0) {
//   await supabase.from('conversations').delete().eq('id', currentConversation.id);
// }

// NEW CODE:
if (currentConversation && messages.length === 0) {
  await safeDeleteEmptyConversation(currentConversation.id, messages.length);
}
```

Replace in:
1. Line ~564-581 (handleNewConversation)
2. Line ~626-643 (handleSelectConversation)  
3. Line ~211-236 (useEffect cleanup)

---

### 🛡️ Security Fixes (Next Hour)

#### Fix #11: Remove Production Console Logs
**File**: Multiple files  
**Time**: 30 minutes

Create a logger utility:

```typescript
// lib/logger.ts
const IS_DEV = process.env.NODE_ENV === 'development';
const IS_DEBUG = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

export const logger = {
  log: (...args: any[]) => {
    if (IS_DEV || IS_DEBUG) {
      console.log(...args);
    }
  },
  
  error: (...args: any[]) => {
    console.error(...args);
    // TODO: Send to error tracking service (Sentry, etc.)
  },
  
  warn: (...args: any[]) => {
    if (IS_DEV || IS_DEBUG) {
      console.warn(...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (IS_DEBUG) {
      console.debug(...args);
    }
  },
};
```

Then do a find-replace:
- `console.log` → `logger.log`
- `console.warn` → `logger.warn`
- Keep `console.error` as-is (always show errors)

---

#### Fix #12: Add Error Boundary
**File**: New file `components/ErrorBoundary.tsx`  
**Time**: 30 minutes

```typescript
'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
    // TODO: Send to error tracking service
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Something went wrong
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  We're sorry for the inconvenience
                </p>
              </div>
            </div>
            
            {this.state.error && (
              <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-300 font-mono overflow-auto max-h-32">
                {this.state.error.message}
              </div>
            )}
            
            <div className="flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Reload Page
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg font-medium transition-colors"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

Then wrap the chat page:

```typescript
// app/brands/[brandId]/chat/page.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function ChatPage({ params }: { params: Promise<{ brandId: string }> }) {
  // ... existing code ...
  
  return (
    <ErrorBoundary>
      <div className="relative h-screen bg-[#fcfcfc] dark:bg-gray-950 overflow-hidden">
        {/* ... existing JSX ... */}
      </div>
    </ErrorBoundary>
  );
}
```

---

## ✅ VERIFICATION CHECKLIST

After applying fixes, verify:

- [ ] App builds without errors: `npm run build`
- [ ] No TypeScript errors: `npm run type-check` (if available)
- [ ] Linter passes: `npm run lint`
- [ ] Can create conversation
- [ ] Can send message
- [ ] Can switch conversations without crashes
- [ ] Abort controller properly cleans up
- [ ] No console logs in production build
- [ ] Error boundary catches errors
- [ ] Auto-delete works correctly
- [ ] Memory instructions validated

---

## 🚀 DEPLOYMENT STEPS

1. **Create feature branch**:
   ```bash
   git checkout -b fix/critical-security-issues
   ```

2. **Apply fixes incrementally**:
   - Commit after each fix
   - Test after each commit
   - Document what was changed

3. **Run full test suite**:
   ```bash
   npm run test  # If tests exist
   npm run build
   ```

4. **Deploy to staging**:
   - Test all critical flows
   - Check error tracking
   - Verify logs

5. **Deploy to production**:
   - Off-peak hours
   - Monitor error rates
   - Have rollback plan ready

---

## 📞 SUPPORT

If you encounter issues:
1. Check the main bug report: `BUG_REPORT_COMPREHENSIVE.md`
2. Review error logs
3. Test in isolation
4. Reach out for help

**Remember**: Security fixes should not be rushed. Test thoroughly!

