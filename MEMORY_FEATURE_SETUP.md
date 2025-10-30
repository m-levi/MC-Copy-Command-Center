# Memory Feature Setup Guide

## Issue Resolution

If you're seeing the error "Failed to generate response. Please try again.", this is likely because the **conversation memory feature** requires a database table that hasn't been created yet.

## What is the Memory Feature?

The Memory Feature allows the AI to remember important facts, preferences, and decisions across conversations. It's designed to work with both GPT and Claude models and provides persistent context.

## Quick Fix

The application will work WITHOUT the memory feature - it just won't remember context between messages. The error handling has been updated to gracefully degrade if the memory system isn't available.

## Setting Up Memory (Optional)

If you want to enable the memory feature, run the following SQL migration in your Supabase SQL Editor:

### Migration SQL

```sql
-- Unified Conversation Memory System
-- Persistent context storage that works with both Claude and OpenAI models

-- Create conversation_memories table
CREATE TABLE IF NOT EXISTS conversation_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('user_preference', 'brand_context', 'campaign_info', 'product_details', 'decision', 'fact')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  -- Ensure unique keys per conversation
  UNIQUE(conversation_id, key)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_memories_conversation 
ON conversation_memories(conversation_id);

CREATE INDEX IF NOT EXISTS idx_conversation_memories_category 
ON conversation_memories(conversation_id, category);

CREATE INDEX IF NOT EXISTS idx_conversation_memories_expires 
ON conversation_memories(expires_at) 
WHERE expires_at IS NOT NULL;

-- Enable RLS
ALTER TABLE conversation_memories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view memories for conversations they have access to
CREATE POLICY "Users can view conversation memories"
ON conversation_memories
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = conversation_memories.conversation_id
    AND (
      conversations.user_id = auth.uid()
      OR conversations.brand_id IN (
        SELECT brand_id FROM brands
        WHERE organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid()
        )
      )
    )
  )
);

-- Users can insert memories for conversations they have access to
CREATE POLICY "Users can insert conversation memories"
ON conversation_memories
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = conversation_memories.conversation_id
    AND (
      conversations.user_id = auth.uid()
      OR conversations.brand_id IN (
        SELECT brand_id FROM brands
        WHERE organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid()
        )
      )
    )
  )
);

-- Users can update memories for conversations they have access to
CREATE POLICY "Users can update conversation memories"
ON conversation_memories
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = conversation_memories.conversation_id
    AND (
      conversations.user_id = auth.uid()
      OR conversations.brand_id IN (
        SELECT brand_id FROM brands
        WHERE organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid()
        )
      )
    )
  )
);

-- Users can delete memories for conversations they have access to
CREATE POLICY "Users can delete conversation memories"
ON conversation_memories
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = conversation_memories.conversation_id
    AND (
      conversations.user_id = auth.uid()
      OR conversations.brand_id IN (
        SELECT brand_id FROM brands
        WHERE organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid()
        )
      )
    )
  )
);

-- Add comment
COMMENT ON TABLE conversation_memories IS 'Persistent memory storage for AI conversations - works with both Claude and OpenAI models';
```

## Steps to Enable Memory

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Create a new query
4. Copy and paste the migration SQL above
5. Run the query
6. Refresh your application

## How It Works

Once enabled, the AI can save memories using this format in its responses:

```
[REMEMBER:key_name=value:category]
```

Categories include:
- `user_preference` - User preferences and settings
- `brand_context` - Brand-specific information
- `campaign_info` - Campaign details and strategies
- `product_details` - Product information
- `decision` - Important decisions made
- `fact` - General facts to remember

These memories persist across conversations and help the AI provide more personalized and context-aware responses.

## Graceful Degradation

The application has been updated to handle the absence of the memory table gracefully:

✅ **Works without memory** - The chat will function normally, just without persistent memory
✅ **No crashes** - Memory errors won't break the chat functionality
✅ **Automatic recovery** - If memory fails to load or save, the chat continues
✅ **Detailed logging** - Console logs help debug memory-related issues

## Troubleshooting

If you're still seeing errors after running the migration:

1. **Check the browser console** for detailed error messages
2. **Check server logs** for memory loading/saving errors
3. **Verify the table exists** in Supabase Table Editor
4. **Check RLS policies** are enabled and correct
5. **Verify conversation_id** is being passed correctly

## Benefits of Memory

- 🧠 **Persistent Context** - AI remembers preferences across messages
- 🎯 **Personalization** - Responses adapt to learned preferences
- 📊 **Campaign Continuity** - Keep track of campaign decisions
- 🔄 **Cross-Model** - Works with both GPT and Claude models
- 🔒 **Secure** - Protected by Row Level Security policies

