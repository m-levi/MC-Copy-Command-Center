# Private Conversations Feature

## Overview

Conversations within a brand are now **private by default**. Only the creator can see their conversations. Users can quickly share conversations with their entire organization with one click.

## How It Works

### Default Behavior
- **New conversations**: Created as `private` (only visible to creator)
- **Existing conversations**: After migration, default to `team` (preserving current behavior)

### Visibility Options
- **Private** 🔒: Only the creator can see and access the conversation
- **Team** 👥: All organization members can see and participate in the conversation

### User Experience

1. **🎯 One-Click Toggle in Chat Header** (NEW!)
   - When viewing your own conversation, you'll see a **badge next to the title**:
     - 🔒 **"Private"** (gray) - Click to share with team
     - 👥 **"Team"** (blue) - Click to make private
   - Non-owners see a green **"Shared"** badge

2. **Visual Indicators** in the sidebar:
   - 👥 Blue team icon: Conversation is shared with team
   - 📤 Green share icon: Conversation was shared with you by someone else

3. **Quick Toggle** via right-click menu:
   - "Share with Team" - Makes a private conversation visible to all team members
   - "Make Private" - Hides a shared conversation from team members

4. **Filter Options**:
   - "All Team" - Shows your conversations + conversations shared with you
   - "Just Mine" - Shows only conversations you created
   - "Shared with Me" - Shows only conversations others shared with you

## Database Changes

### New Column
```sql
ALTER TABLE conversations 
ADD COLUMN visibility TEXT DEFAULT 'private' 
CHECK (visibility IN ('private', 'team'));
```

### Updated RLS Policies
The Row Level Security policies have been updated to:
- Always allow users to see their own conversations
- Only show team conversations to org members if `visibility = 'team'`
- Messages follow the same visibility rules as their parent conversation

## API Endpoints

### Toggle Visibility
```
POST /api/conversations/[id]/visibility
```
Toggles between private and team visibility.

### Set Specific Visibility
```
PATCH /api/conversations/[id]/visibility
Body: { "visibility": "private" | "team" }
```

### Get Current Visibility
```
GET /api/conversations/[id]/visibility
Response: { "visibility": "private" | "team", "isOwner": boolean }
```

## Migration

Run the migration file:
```
docs/database-migrations/060_conversation_visibility.sql
```

### Migration Options

**Option A (Default - Backward Compatible):**
Existing conversations are set to `team` visibility, preserving current behavior where team members can see all conversations.

**Option B (Privacy First):**
To make all existing conversations private, uncomment Option B in the migration:
```sql
UPDATE conversations 
SET visibility = 'private' 
WHERE visibility IS NULL;
```

## Files Changed

### New Files
- `app/api/conversations/[id]/visibility/route.ts` - API endpoint
- `docs/database-migrations/060_conversation_visibility.sql` - Database migration

### Modified Files
- `types/index.ts` - Added `ConversationVisibility` type and quick actions
- `lib/conversation-actions.ts` - Added `toggleConversationVisibility` function
- `hooks/useSidebarState.ts` - Handle visibility toggle actions
- `components/ConversationListItem.tsx` - Show visibility indicators
- `components/ConversationContextMenu.tsx` - Add visibility toggle option
- `components/ConversationFilterDropdown.tsx` - Add "Shared with Me" filter
- `components/VirtualizedConversationList.tsx` - Pass currentUserId
- `components/ChatSidebarEnhanced.tsx` - Pass currentUserId prop
- `app/brands/[brandId]/chat/page.tsx` - Filter by visibility, pass currentUserId

## Security Considerations

- Only the conversation **owner** can change visibility
- RLS policies enforce visibility at the database level
- Team members can participate in shared conversations but cannot make them private

