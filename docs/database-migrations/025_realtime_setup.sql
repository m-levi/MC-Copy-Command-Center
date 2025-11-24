-- =====================================================
-- Realtime Setup for Multi-User Collaboration
-- =====================================================
-- This migration sets up Realtime using the recommended
-- broadcast + triggers approach (not postgres_changes)
-- =====================================================

-- 1. Enable RLS on realtime.messages (required for private channels)
-- =====================================================

-- Allow authenticated users to receive broadcasts
CREATE POLICY IF NOT EXISTS "authenticated_users_can_receive" 
ON realtime.messages
FOR SELECT 
TO authenticated 
USING (true);

-- Allow authenticated users to send broadcasts
CREATE POLICY IF NOT EXISTS "authenticated_users_can_send" 
ON realtime.messages
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 2. Set up broadcast trigger for conversation_comments
-- =====================================================
-- This enables real-time comment updates across all users

CREATE OR REPLACE FUNCTION public.broadcast_comment_changes()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Broadcast to conversation-specific channel
  PERFORM realtime.broadcast_changes(
    'conversation:' || COALESCE(NEW.conversation_id, OLD.conversation_id)::text || ':comments',
    TG_OP,
    TG_OP,
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    NEW,
    OLD
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS comments_broadcast_trigger ON public.conversation_comments;

-- Create trigger on conversation_comments
CREATE TRIGGER comments_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.conversation_comments
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_comment_changes();

-- 3. Optional: Add user_id to messages table for attribution
-- =====================================================
-- This allows tracking which user sent each message

DO $$ 
BEGIN
  -- Add user_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.messages 
    ADD COLUMN user_id UUID REFERENCES auth.users(id);
    
    -- Create index for performance
    CREATE INDEX idx_messages_user_id ON public.messages(user_id);
    
    -- Backfill existing messages with the conversation owner
    UPDATE public.messages m
    SET user_id = c.user_id
    FROM public.conversations c
    WHERE m.conversation_id = c.id
    AND m.user_id IS NULL
    AND m.role = 'user';
  END IF;
END $$;

-- 4. Verification queries
-- =====================================================

-- Check if RLS policies exist on realtime.messages
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'messages' 
AND schemaname = 'realtime';

-- Should return 2 policies:
-- - authenticated_users_can_receive
-- - authenticated_users_can_send

-- Check if trigger exists on conversation_comments
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'comments_broadcast_trigger';

-- Check if user_id column exists on messages
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'messages'
AND column_name = 'user_id';

-- =====================================================
-- IMPORTANT NOTES:
-- =====================================================
-- 
-- 1. This uses the BROADCAST pattern (recommended by Supabase)
--    NOT the old postgres_changes/publication pattern
--
-- 2. Presence channels don't need database tables - they work
--    entirely through Realtime channels
--
-- 3. Private channels are secured via RLS on realtime.messages
--
-- 4. For production, ensure your Supabase project has:
--    - Realtime enabled in Dashboard
--    - Private channels only mode enabled
--
-- 5. Client usage:
--    const channel = supabase.channel('conversation:123:comments', {
--      config: { private: true }
--    });
--
-- =====================================================

