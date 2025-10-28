# Auto-Naming & Easy Renaming Feature

## Overview

The conversation auto-naming feature automatically generates descriptive titles for chat conversations using low-cost AI models. Users can also easily rename conversations manually with a simple double-click or button click.

## Features

### 1. **Automatic Title Generation**
When a user sends their first message in a conversation, the system automatically generates a concise, descriptive title in the background.

**Cost-Efficient Models Used:**
- **Primary**: OpenAI's `gpt-4o-mini` (very low cost, ~$0.15 per 1M input tokens)
- **Fallback**: Anthropic's `claude-3-5-haiku-20241022` (very low cost, ~$0.25 per 1M input tokens)
- **Ultimate Fallback**: Simple word extraction if no API keys available

**How It Works:**
1. User sends first message in conversation
2. System calls `/api/conversations/[id]/name` endpoint with POST method
3. AI generates a 3-6 word descriptive title
4. Title is automatically updated in the database
5. UI refreshes to show the new title

### 2. **Easy Manual Renaming**

Users can rename conversations in three ways:

#### Option 1: Double-Click (Quick)
- Double-click on the conversation title in the sidebar
- Input field appears
- Type new name and press Enter or click away to save
- Press Escape to cancel

#### Option 2: Rename Button (Hover)
- Hover over a conversation in the sidebar
- Click the pencil/edit icon that appears
- Input field appears for editing
- Same save/cancel behavior as double-click

#### Option 3: Direct Edit
- When editing mode is active, the conversation title becomes an input field
- Auto-focuses for immediate typing
- Supports keyboard shortcuts (Enter to save, Escape to cancel)

## Technical Implementation

### API Endpoints

#### `POST /api/conversations/[id]/name`
Auto-generate a conversation title using AI.

**Request Body:**
```json
{
  "userMessage": "string (first message content)"
}
```

**Response:**
```json
{
  "title": "string (generated title)"
}
```

**Models Used (in order of preference):**
1. `gpt-4o-mini` (OpenAI) - $0.15 per 1M tokens
2. `claude-3-5-haiku-20241022` (Anthropic) - $0.25 per 1M tokens
3. Fallback: First 5-6 words extraction

#### `PATCH /api/conversations/[id]/name`
Manually update a conversation title.

**Request Body:**
```json
{
  "title": "string (new title, max 100 chars)"
}
```

**Response:**
```json
{
  "title": "string (updated title)"
}
```

### Components Modified

#### `ChatSidebar.tsx`
- Added `editingId` and `editingTitle` state for inline editing
- Added rename button with pencil icon
- Double-click handler on conversation titles
- Inline input field that appears during editing
- Keyboard shortcuts (Enter, Escape)

#### `app/brands/[brandId]/chat/page.tsx`
- Added `handleRenameConversation` function
- Modified `generateTitle` to call AI API instead of simple extraction
- Passes `onRenameConversation` prop to `ChatSidebar`
- Optimistic UI updates for better UX

### Database Schema

No changes required - uses existing `conversations.title` column.

## Cost Analysis

### Auto-Naming Cost per Conversation:
- Average first message: ~100 tokens
- GPT-4o-mini cost: ~$0.000015 per title
- Claude Haiku cost: ~$0.000025 per title

**Cost for 10,000 conversations:** ~$0.15 - $0.25

This is extremely affordable and provides significant UX improvement.

## User Experience

### Before First Message:
```
Conversation Title: "New Conversation"
```

### After First Message:
```
User: "I need help creating a promotional email for our summer sale"
AI Auto-Names: "Summer Sale Promotional Email"
```

### Manual Rename:
```
User hovers → Clicks pencil icon
User types: "Q3 Summer Campaign"
Presses Enter
Title updates immediately
```

## Configuration

### Environment Variables Required:

```env
# At least ONE of these is required for auto-naming:
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...

# Without API keys, fallback extraction will be used
```

## Benefits

1. **Better Organization**: Descriptive titles make it easy to find past conversations
2. **Time Saving**: No need to manually name every conversation
3. **Cost-Effective**: Uses the cheapest AI models available
4. **Flexible**: Easy manual renaming when needed
5. **User-Friendly**: Double-click or button click to rename
6. **Responsive**: Background generation doesn't block UI

## Future Enhancements

Potential improvements:
- Batch re-naming of old conversations
- Custom naming templates by organization
- Smart naming based on conversation context (not just first message)
- Naming suggestions with multiple options
- Automatic renaming when conversation topic shifts significantly

## Testing

To test the feature:

1. **Auto-Naming:**
   - Create a new conversation
   - Send your first message
   - Watch the title automatically update within 1-2 seconds

2. **Manual Rename:**
   - Hover over any conversation
   - Click the pencil icon
   - Type new name and press Enter
   - Verify title updates in sidebar and header

3. **Double-Click Rename:**
   - Double-click any conversation title
   - Type new name
   - Press Enter or click away
   - Verify update

4. **Keyboard Shortcuts:**
   - Start editing a title
   - Press Escape to cancel
   - Start editing again
   - Press Enter to save

## Troubleshooting

### Auto-naming not working?
1. Check if OPENAI_API_KEY or ANTHROPIC_API_KEY is set
2. Check API key validity
3. Look at server logs for API errors
4. Fallback should still extract first words if APIs fail

### Manual rename not working?
1. Check browser console for errors
2. Verify user has permissions to update conversations
3. Check network tab for API response

### Title not updating in UI?
1. The conversation list should refresh after rename
2. Check if `loadConversations()` is being called
3. Verify Supabase RLS policies allow updates

## Performance

- **Auto-naming**: ~500ms - 2s (background, doesn't block UI)
- **Manual rename**: ~100-300ms (nearly instant)
- **Token usage**: 10-30 tokens per title generation
- **API calls**: 1 per conversation creation (auto-name) + 1 per manual rename

## Security

- API keys are server-side only (never exposed to client)
- RLS policies ensure users can only rename their own conversations
- Input sanitization prevents XSS attacks
- Title length limited to 100 characters
- User message content truncated to 500 chars for API calls (reduces cost and token usage)

