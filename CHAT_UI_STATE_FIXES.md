# Chat UI State Management Fixes

## Issues Fixed

The chat UI had several state management problems when switching between conversations:

1. **Wrong conversation displayed**: When switching from conversation A to B, conversation A's messages would remain visible while conversation B's title was shown
2. **Wrong text in chat box**: Draft content from previous conversation would persist when switching
3. **Race conditions**: Fast conversation switching could cause messages/drafts to load for the wrong conversation
4. **Stale closures**: Real-time subscriptions could update the wrong conversation's messages

## Root Causes

1. **Messages not cleared immediately**: `handleSelectConversation` updated the current conversation but didn't clear messages, so old messages stayed visible until new ones loaded
2. **Draft loading scattered**: Draft content was loaded in multiple places without proper cleanup
3. **No race condition protection**: No checks to verify the conversation hadn't changed during async operations
4. **Dependency issues**: useEffect dependencies weren't specific enough (using `currentConversation` instead of `currentConversation?.id`)

## Fixes Applied

### 1. handleSelectConversation (lines 1124-1208)

**Changes:**
- Added check to prevent selecting same conversation twice
- **CRITICAL**: Clear messages immediately with `setMessages([])` before loading new ones
- Clear draft content immediately (loaded later by useEffect)
- Clear all conversation-specific state (campaigns, outlines, comments, etc.)
- Reordered operations: abort generation → cleanup → clear state → update conversation
- Added comprehensive logging for debugging

**Why it works:**
- Messages state is cleared synchronously, so user never sees wrong conversation's messages
- Draft is cleared immediately, preventing wrong text from showing
- All state is reset before new conversation is set

### 2. loadMessages (lines 937-1048)

**Changes:**
- Capture `conversationId` at function start to detect race conditions
- Add 3 race condition checks:
  1. Before loading from cache
  2. Before loading from database
  3. After database load, before setting state
- Remove draft loading (moved to useEffect)
- Add comprehensive logging with [LoadMessages] prefix
- Only set loading state to false after data is loaded

**Why it works:**
- By capturing conversationId at start and comparing with `currentConversation?.id` at each step, we abort if conversation changed
- This prevents old data from being displayed after user switched conversations
- Logging helps debug any remaining issues

### 3. Messages useEffect (lines 580-678)

**Changes:**
- Changed dependency from `currentConversation` to `currentConversation?.id`
- Added guard clause to clear state when no conversation selected
- Moved draft loading here (instead of in loadMessages)
- Capture conversationId early to prevent stale closures in realtime subscriptions
- Added logging in all callbacks with [Realtime] and [MessagesEffect] prefixes
- Added cleanup logging

**Why it works:**
- Using `currentConversation?.id` as dependency is more precise - only triggers when ID actually changes
- Guard clause ensures state is cleared when conversation is deselected
- Draft loading in useEffect ensures it happens at the right time
- Captured conversationId prevents stale closures in realtime subscriptions

## How the Flow Works Now

### When switching from Conversation A to Conversation B:

1. **User clicks conversation B in sidebar**
2. **handleSelectConversation(B) called**
   - Check if already on B → skip if yes
   - Abort any ongoing AI generation
   - Cleanup conversation A if empty
   - **Clear messages immediately** → User sees empty state
   - **Clear draft immediately**
   - Clear all conversation-specific state
   - Set currentConversation to B
   - Update URL
3. **useEffect triggered (dependency: currentConversation?.id changed)**
   - Cleanup: Unsubscribe from conversation A's realtime updates
   - Call loadMessages() for conversation B
   - Load draft for conversation B
   - Subscribe to conversation B's realtime updates
4. **loadMessages() executes**
   - Capture conversation ID = B
   - Check cache for B's messages
   - If cached: verify still on B → set messages → done
   - If not cached: load from DB
   - Before DB call: verify still on B
   - After DB load: verify still on B → set messages
5. **ChatInput updates**
   - Sees draftContent prop changed (cleared then loaded)
   - Updates its local message state via useEffect

### Result:
- User immediately sees empty state (no wrong messages)
- Empty input box (no wrong draft)
- Correct conversation title
- Correct messages load (or empty if new conversation)
- Correct draft loads if it exists
- No race conditions even with fast switching

## Technical Improvements

1. **Immediate state clearing**: All state cleared synchronously before async operations
2. **Race condition protection**: Every async operation checks if conversation changed
3. **Better logging**: Prefixed logs ([SelectConversation], [LoadMessages], etc.) for debugging
4. **Stale closure prevention**: Captured conversationId used in callbacks
5. **Proper cleanup**: useEffect cleanup unsubscribes from old conversation
6. **Correct dependencies**: `currentConversation?.id` instead of `currentConversation`

## Testing Recommendations

Test these scenarios:
1. Switch between two conversations rapidly
2. Switch while AI is generating
3. Create new conversation, then switch back to old one
4. Switch to conversation with cached messages
5. Switch to conversation without cached messages
6. Type in input, then switch conversations (draft should not persist)
7. Have draft in conversation A, switch to B (should clear), switch back to A (should restore)

## Files Modified

- `app/brands/[brandId]/chat/page.tsx`:
  - handleSelectConversation: Lines 1124-1208
  - loadMessages: Lines 937-1048
  - Messages useEffect: Lines 580-678

## Related Files (No Changes Needed)

- `components/ChatInput.tsx`: Already had proper useEffect to sync draftContent prop
- `hooks/useChatMessages.ts`: Not used in main chat page (could be used for flows)
- `hooks/useConversationCleanup.ts`: Already working correctly

## Notes

- The fixes maintain backward compatibility
- Performance is improved due to better caching and race condition prevention
- The code is now more maintainable with better logging
- No breaking changes to component APIs

