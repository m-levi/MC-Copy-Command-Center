# Multi-User Collaboration Features

## Overview
This document describes the multi-user collaboration features implemented in the chat application, including real-time presence tracking and message attribution.

## Features Implemented

### 1. Real-Time Presence Tracking
Shows who is currently viewing the same conversation in real-time.

**Components:**
- `hooks/usePresence.ts` - Manages Supabase Realtime presence subscriptions
- `components/PresenceIndicator.tsx` - Displays active users with avatars

**How it works:**
1. When a user opens a conversation, they join a Realtime channel: `presence:{conversationId}`
2. The presence state is tracked with user details (email, full_name, avatar_url)
3. All connected users see each other's avatars in the chat header
4. Green pulse indicator shows live status

**Testing:**
- Open the same conversation in two different browsers/accounts
- You should see "2 online" with both user avatars
- Opening in the same account in multiple tabs shows "1 online" (correctly deduplicated)

### 2. Message Attribution (Who Said What)
Displays which team member sent each message in the chat.

**Components:**
- `types/index.ts` - Extended `Message` type with `user_id` and `user` fields
- `hooks/useChatMessages.ts` - Fetches user profiles for messages
- `components/ChatMessage.tsx` - Displays user avatar and name above messages

**How it works:**
1. When messages are loaded, user profiles are fetched for all `user_id` values
2. Each user message displays the sender's name and avatar
3. AI messages don't show attribution (they're from the assistant)

### 3. Enhanced Comments System
Real-time comment updates across all connected users.

**Components:**
- `components/CommentsSidebar.tsx` - Now includes Realtime subscription
- "Send to Chat" buttons for reusing comment content

**How it works:**
1. Subscribes to `conversation_comments` table changes
2. When any user adds/edits/resolves a comment, all viewers see it instantly
3. No page refresh needed

## Supabase Realtime Setup

### Quick Test
First, verify that Realtime is working:

```bash
# Test the Realtime connection
curl http://localhost:3000/api/test-realtime
```

Expected response:
```json
{
  "success": true,
  "status": "SUBSCRIBED",
  "message": "Realtime is working! ✅"
}
```

If you see `"success": false`, follow these steps:

### Step 1: Run the Database Migration

**Option A: Using Supabase SQL Editor (Recommended)**
1. Go to **SQL Editor** in your Supabase Dashboard
2. Copy the contents of `docs/database-migrations/025_realtime_setup.sql`
3. Paste and click **Run**
4. Verify you see "Success" messages

**Option B: Using psql**
```bash
psql -h your-db-host -U postgres -d postgres -f docs/database-migrations/025_realtime_setup.sql
```

**Option C: Using Supabase MCP**
If you have Supabase MCP enabled, you can run:
```bash
# The migration creates:
# - RLS policies on realtime.messages
# - Broadcast trigger for conversation_comments
# - user_id column on messages (if not exists)
```

### Step 2: Verify the Setup

Run these queries in the SQL Editor to confirm:

```sql
-- Check RLS policies (should return 2 rows)
SELECT policyname FROM pg_policies 
WHERE tablename = 'messages' AND schemaname = 'realtime';

-- Check trigger (should return 1 row)
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_name = 'comments_broadcast_trigger';

-- Check user_id column (should return 1 row)
SELECT column_name FROM information_schema.columns
WHERE table_name = 'messages' AND column_name = 'user_id';
```

### Step 3: Test in Your App

1. Refresh your browser
2. Look for the green status indicator in the bottom-right
3. Check console for `[Presence] Subscription status: SUBSCRIBED`
4. Open the same conversation in two different browsers/accounts
5. You should see "2 online" with both user avatars

### What This Migration Does

According to the [Supabase Realtime Getting Started guide](https://supabase.com/docs/guides/realtime/getting_started), the recommended approach is **Broadcast + Triggers** (not the old postgres_changes pattern).

This migration:
1. ✅ Creates RLS policies on `realtime.messages` for private channels
2. ✅ Sets up broadcast trigger on `conversation_comments` for real-time updates
3. ✅ Adds `user_id` to messages table for attribution
4. ✅ Creates necessary indexes for performance

### Prerequisites
Ensure Realtime is enabled in your Supabase project:

1. Go to **Supabase Dashboard** → **Project Settings** → **API**
2. Scroll down to find **Realtime** settings
3. Ensure Realtime is enabled (it usually is by default)

**Note:** You do NOT need to run `CREATE PUBLICATION supabase_realtime` - that's the old approach. The migration uses the modern broadcast pattern instead.

### Configuration
The Supabase client automatically connects to Realtime when using:
```typescript
supabase.channel('channel-name')
```

**Note:** We're currently using **public channels** (no authentication required) for simplicity. According to the [Supabase Realtime Getting Started guide](https://supabase.com/docs/guides/realtime/getting_started), for production, you should:

1. Switch to private channels:
   ```typescript
   const channel = supabase.channel('presence:conversation-id', {
     config: { private: true }
   });
   ```

2. Set up RLS policies on `realtime.messages` table:
   ```sql
   -- Allow authenticated users to receive broadcasts
   CREATE POLICY "authenticated_users_can_receive" ON realtime.messages
     FOR SELECT TO authenticated USING (true);

   -- Allow authenticated users to send broadcasts
   CREATE POLICY "authenticated_users_can_send" ON realtime.messages
     FOR INSERT TO authenticated WITH CHECK (true);
   ```

You can run these policies using the Supabase SQL Editor or via MCP tools.

### Troubleshooting

**Presence not showing:**
1. Check browser console for `[Presence]` logs
2. Verify Realtime is enabled in Supabase Dashboard
3. Check if `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
4. Ensure you're testing with different user accounts (not same user in multiple tabs)

**Common errors:**
- `CHANNEL_ERROR`: Realtime not enabled or network issue
- `TIMED_OUT`: Connection timeout, check network/firewall
- No logs at all: Component not rendering (check `hidden sm:block` class)

**Debug mode:**
All presence and comment features include extensive console logging:
- `[Presence]` - Presence tracking events
- `[PresenceIndicator]` - Component rendering
- `[Comment Counts]` - Comment loading and updates

## Database Schema

### Messages Table
```sql
-- Add user_id to messages (if not exists)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
```

### Profiles Table
Should already exist with:
- `user_id` (UUID, primary key)
- `email` (text)
- `full_name` (text, nullable)
- `avatar_url` (text, nullable)

## API Reference

### usePresence Hook
```typescript
const activeUsers = usePresence(conversationId);
// Returns: PresenceState[]
```

### PresenceState Type
```typescript
interface PresenceState {
  user_id: string;
  online_at: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
}
```

## Performance Considerations

1. **Presence channels** are lightweight and don't use database queries
2. **User profile fetching** is batched (one query for all users)
3. **Deduplication** prevents showing same user multiple times
4. **Automatic cleanup** when users leave or close the tab

## Future Enhancements

- [ ] Typing indicators (show when someone is typing)
- [ ] "User is viewing" indicator on specific messages
- [ ] Cursor tracking for collaborative editing
- [ ] Voice/video call integration
- [ ] Screen sharing capabilities
- [ ] Activity feed (who did what, when)

## Resources

- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [Supabase Presence Guide](https://supabase.com/docs/guides/realtime/presence)
- [Next.js with Realtime](https://supabase.com/docs/guides/realtime/using-realtime-with-nextjs)

