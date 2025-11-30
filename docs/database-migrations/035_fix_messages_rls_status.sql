-- ============================================================================
-- FIX MESSAGES RLS POLICY - REMOVE STATUS CHECK
-- ============================================================================
-- ISSUE: RLS policy checks for om.status = 'active' but the organization_members
--        table doesn't have a status column, causing all message inserts to fail.
-- SOLUTION: Update the policy to not require the status check
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Add status column if it doesn't exist (with default 'active')
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'organization_members' 
      AND column_name = 'status'
  ) THEN
    -- Add status column with default 'active'
    ALTER TABLE organization_members ADD COLUMN status TEXT DEFAULT 'active';
    COMMENT ON COLUMN organization_members.status IS 'Member status: active, inactive, suspended';
    
    -- Update all existing members to be active
    UPDATE organization_members SET status = 'active' WHERE status IS NULL;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Ensure all existing members have active status
-- ============================================================================

UPDATE organization_members 
SET status = 'active' 
WHERE status IS NULL OR status = '';

-- ============================================================================
-- STEP 3: Recreate the messages INSERT policy
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Members can insert organization messages" ON messages;

-- Create new policy that properly checks status (now that column exists)
CREATE POLICY "Members can insert organization messages"
  ON messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM conversations c
      INNER JOIN brands b ON b.id = c.brand_id
      INNER JOIN organization_members om ON om.organization_id = b.organization_id
      WHERE c.id = conversation_id
        AND om.user_id = auth.uid()
        AND (om.status IS NULL OR om.status = 'active')
    )
  );

-- ============================================================================
-- STEP 4: Also update the SELECT policy to match
-- ============================================================================

DROP POLICY IF EXISTS "Members can view organization messages" ON messages;

CREATE POLICY "Members can view organization messages"
  ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM conversations c
      INNER JOIN brands b ON b.id = c.brand_id
      INNER JOIN organization_members om ON om.organization_id = b.organization_id
      WHERE c.id = messages.conversation_id
        AND om.user_id = auth.uid()
        AND (om.status IS NULL OR om.status = 'active')
    )
  );

-- ============================================================================
-- STEP 5: Update the UPDATE and DELETE policies too
-- ============================================================================

DROP POLICY IF EXISTS "Members can update organization messages" ON messages;

CREATE POLICY "Members can update organization messages"
  ON messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 
      FROM conversations c
      INNER JOIN brands b ON b.id = c.brand_id
      INNER JOIN organization_members om ON om.organization_id = b.organization_id
      WHERE c.id = messages.conversation_id
        AND om.user_id = auth.uid()
        AND (om.status IS NULL OR om.status = 'active')
    )
  );

DROP POLICY IF EXISTS "Members can delete organization messages" ON messages;

CREATE POLICY "Members can delete organization messages"
  ON messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 
      FROM conversations c
      INNER JOIN brands b ON b.id = c.brand_id
      INNER JOIN organization_members om ON om.organization_id = b.organization_id
      WHERE c.id = messages.conversation_id
        AND om.user_id = auth.uid()
        AND (om.status IS NULL OR om.status = 'active')
    )
  );

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this to verify the fix:

-- Check status column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'organization_members'
  AND column_name = 'status';

-- Check all members have active status
SELECT status, COUNT(*) 
FROM organization_members 
GROUP BY status;

-- Check the new policy
SELECT policyname, cmd, with_check
FROM pg_policies 
WHERE tablename = 'messages' 
  AND policyname = 'Members can insert organization messages';

-- ============================================================================

