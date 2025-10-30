# Chat Page Integration Example

This document shows the exact changes needed to integrate the enhanced sidebar into your chat page.

## 1. Add Imports

```typescript
// Add these new imports at the top of app/brands/[brandId]/chat/page.tsx

import ChatSidebarEnhanced from '@/components/ChatSidebarEnhanced';
import { useSidebarState } from '@/hooks/useSidebarState';
import { ConversationWithStatus } from '@/types';
```

## 2. Add Sidebar State Hook

Add this right after your existing state declarations (around line 70):

```typescript
// Enhanced sidebar state management
const sidebarState = useSidebarState({
  userId: currentUserId,
  userName: currentUserName,
  conversations,
  onConversationUpdate: loadConversations
});
```

## 3. Update AI Status Tracking

### In handleSendMessage function

Find where you start the AI stream and add:

```typescript
// Before starting the stream (around line 700-800):
sidebarState.updateConversationStatus(currentConversation.id, 'ai_responding', 0);

// During the stream processing, update progress:
// You can calculate progress based on chunk count or estimated completion
const estimatedProgress = Math.min((chunkCount / estimatedTotalChunks) * 100, 95);
sidebarState.updateConversationStatus(currentConversation.id, 'ai_responding', estimatedProgress);

// When stream completes successfully:
sidebarState.updateConversationStatus(currentConversation.id, 'idle');

// In error handler:
sidebarState.updateConversationStatus(currentConversation.id, 'error');
```

### In handleNewConversation

```typescript
const handleNewConversation = async () => {
  try {
    // ... existing code ...

    // Add this line to mark as loading:
    sidebarState.updateConversationStatus(data.id, 'loading');
    
    // ... rest of existing code ...
    
    // When done:
    sidebarState.updateConversationStatus(data.id, 'idle');
  } catch (error) {
    // ... existing error handling ...
  }
};
```

## 4. Replace ChatSidebar Component

Find the ChatSidebar component in the JSX (around line 1180-1195) and replace it:

```typescript
// OLD:
<ChatSidebar
  brandName={brand.name}
  brandId={brandId}
  conversations={filteredConversations}
  currentConversationId={currentConversation?.id || null}
  teamMembers={teamMembers}
  currentFilter={currentFilter}
  selectedPersonId={selectedPersonId}
  onFilterChange={handleFilterChange}
  onNewConversation={handleNewConversation}
  onSelectConversation={handleSelectConversation}
  onDeleteConversation={handleDeleteConversation}
  onRenameConversation={handleRenameConversation}
  onPrefetchConversation={handlePrefetchConversation}
/>

// NEW:
<ChatSidebarEnhanced
  brandName={brand.name}
  brandId={brandId}
  conversations={sidebarState.conversationsWithStatus}
  currentConversationId={currentConversation?.id || null}
  teamMembers={teamMembers}
  currentFilter={currentFilter}
  selectedPersonId={selectedPersonId}
  pinnedConversationIds={sidebarState.pinnedConversationIds}
  viewMode={sidebarState.viewMode}
  onFilterChange={handleFilterChange}
  onNewConversation={handleNewConversation}
  onSelectConversation={handleSelectConversation}
  onDeleteConversation={handleDeleteConversation}
  onRenameConversation={handleRenameConversation}
  onPrefetchConversation={handlePrefetchConversation}
  onQuickAction={sidebarState.handleQuickAction}
  onViewModeChange={sidebarState.setViewMode}
  onSidebarWidthChange={sidebarState.setSidebarWidth}
  initialWidth={sidebarState.sidebarWidth}
/>
```

## 5. Update handleSelectConversation (Optional Enhancement)

To provide better feedback when switching conversations:

```typescript
const handleSelectConversation = (conversationId: string) => {
  // Abort any ongoing AI generation before switching
  if (abortControllerRef.current && sending) {
    abortControllerRef.current.abort();
    setSending(false);
    setAiStatus('idle');
    
    // Update status for the conversation we're leaving
    if (currentConversation?.id) {
      sidebarState.updateConversationStatus(currentConversation.id, 'idle');
    }
    
    toast('Generation stopped - switching conversations', { icon: '⏹️' });
  }

  const conversation = conversations.find((c) => c.id === conversationId);
  if (conversation) {
    setCurrentConversation(conversation);
    setSelectedModel(conversation.model as AIModel);
    setConversationMode(conversation.mode || 'planning');
    setDraftContent('');
    trackEvent('conversation_selected', { conversationId });
  }
};
```

## 6. Enhanced handleStopGeneration

Update the stop generation handler to update status:

```typescript
const handleStopGeneration = () => {
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
    abortControllerRef.current = null;
    setSending(false);
    setAiStatus('idle');
    
    // Update conversation status
    if (currentConversation?.id) {
      sidebarState.updateConversationStatus(currentConversation.id, 'idle');
    }
    
    toast.success('Generation stopped');
  }
};
```

## 7. Enhanced handleRegenerateMessage

```typescript
const handleRegenerateMessage = async (messageId: string) => {
  if (!currentConversation?.id) return;
  
  try {
    setRegeneratingMessageId(messageId);
    
    // Mark conversation as active
    sidebarState.updateConversationStatus(currentConversation.id, 'ai_responding', 0);
    
    // ... existing regeneration logic ...
    
  } catch (error) {
    console.error('Error regenerating message:', error);
    sidebarState.updateConversationStatus(currentConversation.id, 'error');
    toast.error('Failed to regenerate message');
  } finally {
    setRegeneratingMessageId(null);
    sidebarState.updateConversationStatus(currentConversation.id, 'idle');
  }
};
```

## Complete Example Integration

Here's a minimal complete example showing all the pieces together:

```typescript
'use client';

import { useEffect, useState, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import ChatSidebarEnhanced from '@/components/ChatSidebarEnhanced';
import { useSidebarState } from '@/hooks/useSidebarState';
import { ConversationWithStatus } from '@/types';
// ... other imports ...

export default function ChatPage({ params }: { params: Promise<{ brandId: string }> }) {
  const resolvedParams = use(params);
  const brandId = resolvedParams.brandId;
  
  // ... existing state declarations ...
  
  // NEW: Sidebar state
  const sidebarState = useSidebarState({
    userId: currentUserId,
    userName: currentUserName,
    conversations,
    onConversationUpdate: loadConversations
  });
  
  // ... existing code ...
  
  const handleSendMessage = async (content: string) => {
    if (!currentConversation?.id) return;
    
    try {
      setSending(true);
      
      // NEW: Update status
      sidebarState.updateConversationStatus(currentConversation.id, 'ai_responding', 0);
      
      // ... existing message sending logic ...
      
      // During streaming, update progress
      sidebarState.updateConversationStatus(currentConversation.id, 'ai_responding', 50);
      
      // On completion
      sidebarState.updateConversationStatus(currentConversation.id, 'idle');
      
    } catch (error) {
      sidebarState.updateConversationStatus(currentConversation.id, 'error');
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };
  
  // ... other handlers ...
  
  return (
    <div className="flex h-screen bg-[#fcfcfc] dark:bg-gray-950">
      <Toaster position="top-right" />

      {/* NEW Enhanced Sidebar */}
      <ChatSidebarEnhanced
        brandName={brand.name}
        brandId={brandId}
        conversations={sidebarState.conversationsWithStatus}
        currentConversationId={currentConversation?.id || null}
        teamMembers={teamMembers}
        currentFilter={currentFilter}
        selectedPersonId={selectedPersonId}
        pinnedConversationIds={sidebarState.pinnedConversationIds}
        viewMode={sidebarState.viewMode}
        onFilterChange={handleFilterChange}
        onNewConversation={handleNewConversation}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onPrefetchConversation={handlePrefetchConversation}
        onQuickAction={sidebarState.handleQuickAction}
        onViewModeChange={sidebarState.setViewMode}
        onSidebarWidthChange={sidebarState.setSidebarWidth}
        initialWidth={sidebarState.sidebarWidth}
      />

      {/* Rest of your chat interface */}
      <div className="flex-1 flex flex-col">
        {/* ... existing chat content ... */}
      </div>
    </div>
  );
}
```

## Testing After Integration

1. **Start the app**: `npm run dev`
2. **Check console**: No errors on load
3. **Test view toggle**: Click list/grid buttons
4. **Test search**: Press ⌘K, type, see filtering
5. **Pin a conversation**: Hover over card, click pin
6. **Start AI chat**: Watch status indicator appear
7. **Start second chat**: Should work simultaneously
8. **Export conversation**: Test both JSON and MD formats
9. **Resize sidebar**: Drag the edge, refresh page (should persist)
10. **Open explorer**: Click expand button

## Common Issues & Fixes

### Issue: "Cannot find module ChatSidebarEnhanced"
**Fix**: Make sure you created the file in the correct location: `components/ChatSidebarEnhanced.tsx`

### Issue: "useSidebarState is not a function"
**Fix**: Check the import path and ensure the hook file exists at `hooks/useSidebarState.ts`

### Issue: Status indicators not showing
**Fix**: Ensure you're calling `updateConversationStatus` at the right points in your AI stream handling

### Issue: Preferences not persisting
**Fix**: 
1. Run the database migration
2. Check Supabase RLS policies
3. Verify user is authenticated

### Issue: Type errors with ConversationWithStatus
**Fix**: Make sure you've updated `types/index.ts` with the new types

---

**Need Help?** Check `AWESOME_CHAT_SIDEBAR_IMPLEMENTATION.md` for full documentation.



