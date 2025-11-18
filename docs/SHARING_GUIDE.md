# Conversation Sharing Guide

## Overview

The sharing feature allows you to share conversations with team members or generate public links for external sharing. You can also add comments to messages for collaboration.

## User Guide

### Sharing with Your Team

1. Open any conversation
2. Click the **Share** button (share icon in the header)
3. Click **"Copy Team Link"**
4. The link is automatically copied to your clipboard
5. Share the link with anyone in your organization
6. When they open the link, they'll see the conversation

**How it works**: Team members can access conversations because they're in the same organization. The conversation URL includes the conversation ID (`?conversation=xyz`), so anyone in your org can view it when they open the link.

**Note**: You can also just copy your browser URL - it works the same way!

### Generating Public Links

1. Click the **Share** button
2. Click **"Generate Public Link"**
3. A public link is created and copied to your clipboard
4. Share this link with anyone (no login required)
5. They can view the conversation at `/shared/[token]`

### Adding Comments

1. Click the **"Add comment"** button below any message
2. Or click the **Comments** icon in the header to see all comments
3. Type your comment and press **Ctrl/Cmd + Enter** or click **Post**
4. Comments are threaded - you can reply to existing comments
5. Comments show which message they're attached to

### Viewing Comments

- **Inline**: Click "Add comment" or "View comments" below any message
- **Panel**: Click the Comments icon in the header to see all conversation comments
- Comments are grouped by message and show message previews

## Database Setup

### Required Tables

The following tables must exist in your Supabase database:

- `conversation_shares` - Stores share links and permissions
- `conversation_comments` - Stores comments on conversations and messages
- `notifications` - Stores notifications for shares and comments

### Running Migrations

If these tables don't exist, run the following migrations via Supabase MCP or SQL Editor:

1. `docs/database-migrations/019_conversation_sharing.sql` - Creates all three tables
2. `docs/database-migrations/019b_fix_shared_conversation_access.sql` - Adds RLS policies for public access

### Verifying Setup

Use Supabase MCP to verify tables exist:

```typescript
// List tables
mcp_supabase_list_tables({ project_id: 'your-project-id', schemas: ['public'] })
```

Or run this SQL:

```sql
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_name IN ('conversation_shares', 'notifications', 'conversation_comments');
-- Should return 3
```

## Troubleshooting

### "Failed to load shared conversation"

**Possible causes:**
1. Database tables don't exist - Run migrations above
2. RLS policies missing - Run migration `019b_fix_shared_conversation_access.sql`
3. Share token expired - Generate a new public link
4. Invalid token - Check the URL is correct

**Solution:**
- Verify tables exist using Supabase MCP
- Check RLS policies are active
- Try generating a new public link

### Comments Not Showing

**Possible causes:**
1. Comments API endpoint not accessible
2. User doesn't have permission to view comments
3. Comments table doesn't exist

**Solution:**
- Verify `conversation_comments` table exists
- Check user has access to the conversation
- Verify API endpoint `/api/conversations/[id]/comments` is working

### Team Link Not Working

**Possible causes:**
1. User not in same organization
2. Conversation not accessible
3. URL parameter missing

**Solution:**
- Ensure both users are in the same organization
- Verify the conversation ID in the URL is correct
- Check the URL format: `/brands/[brandId]/chat?conversation=[conversationId]`

## Technical Details

### URL Structure

- **Team Link**: `/brands/[brandId]/chat?conversation=[conversationId]`
- **Public Link**: `/shared/[shareToken]`

### Permission Levels

- `view` - Can view conversation only
- `comment` - Can view and add comments
- `edit` - Can view, comment, and edit

### Share Types

- `organization` - Metadata indicating conversation was explicitly shared with organization (access is granted through organization membership)
- `link` - Public shareable link for external access
- `user` - Shared with specific user (legacy, still supported)

## API Endpoints

- `POST /api/conversations/[id]/share` - Create a share
- `GET /api/conversations/[id]/share` - List shares for conversation
- `GET /api/shared/[token]` - Access shared conversation via token
- `GET /api/conversations/[id]/comments` - Get comments
- `POST /api/conversations/[id]/comments` - Add comment

## Best Practices

1. **Use team links** for internal sharing - simpler and faster
2. **Use public links** only when external sharing is needed
3. **Add comments** to specific messages for context
4. **Resolve comments** when feedback is addressed
5. **Keep conversations organized** - archive old shared conversations

