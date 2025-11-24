-- =====================================================
-- Add user_id to messages table for message attribution
-- =====================================================
-- This is a simplified version that can be run directly
-- in the Supabase SQL Editor
-- =====================================================

-- Add user_id column to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);

-- Backfill existing messages with the conversation owner
-- This sets user_id for all existing messages
UPDATE public.messages m
SET user_id = c.user_id
FROM public.conversations c
WHERE m.conversation_id = c.id
AND m.user_id IS NULL
AND m.role = 'user';

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'messages'
AND column_name = 'user_id';

