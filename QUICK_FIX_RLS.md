# Quick Fix: RLS Policy Error

## Problem
Messages aren't being saved due to RLS (Row Level Security) policy blocking inserts.

## Solution

Run this SQL in your Supabase SQL Editor:

```sql
-- ============================================================================
-- QUICK FIX: Temporarily make insert policy more permissive for debugging
-- ============================================================================

BEGIN;

-- Drop the current insert policy
DROP POLICY IF EXISTS "Members can insert organization messages" ON messages;

-- Create a more permissive temporary policy
CREATE POLICY "Members can insert organization messages"
  ON messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM conversations c
      WHERE c.id = conversation_id
        AND EXISTS (
          SELECT 1 
          FROM brands b
          INNER JOIN organization_members om ON om.organization_id = b.organization_id
          WHERE b.id = c.brand_id
            AND om.user_id = auth.uid()
        )
    )
  );

-- Verify metadata column exists
ALTER TABLE messages 
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_messages_metadata 
  ON messages USING gin(metadata);

COMMIT;

-- Test the policy with this query (should return true if policy will work):
SELECT 
  c.id,
  EXISTS (
    SELECT 1 
    FROM brands b
    INNER JOIN organization_members om ON om.organization_id = b.organization_id
    WHERE b.id = c.brand_id
      AND om.user_id = auth.uid()
  ) as can_insert
FROM conversations c
LIMIT 5;
```

## Alternative: Disable RLS Temporarily (NOT RECOMMENDED for production)

If you need to test immediately, you can temporarily disable RLS:

```sql
-- TEMPORARY: Disable RLS on messages (only for testing!)
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- Remember to re-enable it later:
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
```

## After Running the Fix

1. Refresh your browser
2. Try sending a message with web search
3. Check the console for logs showing product links being extracted

## Verify Your Setup

Run this to check if you're properly linked to an organization:

```sql
SELECT 
  u.id as user_id,
  u.email,
  o.id as org_id,
  o.name as org_name,
  om.status,
  om.role
FROM auth.users u
LEFT JOIN organization_members om ON om.user_id = u.id
LEFT JOIN organizations o ON o.id = om.organization_id
WHERE u.id = auth.uid();
```

If this returns no rows, you need to be added to an organization first.


