# RLS Policy Fixes - November 2025

## Problem Summary

After implementing the sharing feature, the database RLS policies had multiple issues that needed resolution.

## Issues Fixed

### Issue 1: Infinite Recursion in Conversations

**Error**: `"infinite recursion detected in policy for relation \"conversations\""`

**Cause**: The "Organization members can view shared conversations" policy was querying the conversations table from within its own policy check, creating a circular dependency.

**Solution**: Removed the problematic policy. Organization members already have access through the existing "Members can view organization conversations" policy.

### Issue 2: Messages RLS Violation

**Error**: `"new row violates row-level security policy for table \"messages\""`

**Cause**: The messages INSERT/UPDATE/DELETE policies were querying the conversations table (which has RLS enabled), creating a complex permission chain that could fail or recurse.

**Solution**: Created a SECURITY DEFINER function that bypasses RLS for permission checks:

```sql
CREATE OR REPLACE FUNCTION can_user_insert_message(conversation_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM conversations c
    INNER JOIN brands b ON c.brand_id = b.id
    INNER JOIN organization_members om ON b.organization_id = om.organization_id
    WHERE c.id = conversation_id_param
    AND om.user_id = auth.uid()
  );
END;
$$;
```

All messages policies now use this function instead of complex subqueries.

### Issue 4: Shares RLS Violation

**Error**: `"new row violates row-level security policy for table \"conversation_shares\""`

**Cause**: The conversation_shares INSERT policy only allowed conversation owners to create shares, but organization members should be able to share any conversation in their org.

**Solution**: Created SECURITY DEFINER function for share permission checking:

```sql
CREATE OR REPLACE FUNCTION can_user_share_conversation(conversation_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- User owns the conversation
  IF EXISTS (
    SELECT 1 FROM conversations
    WHERE id = conversation_id_param
    AND user_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- User is in same organization
  IF EXISTS (
    SELECT 1
    FROM conversations c
    INNER JOIN brands b ON c.brand_id = b.id
    INNER JOIN organization_members om ON b.organization_id = om.organization_id
    WHERE c.id = conversation_id_param
    AND om.user_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;
```

Updated INSERT policy to use this function.

## Final Working Policies

### Conversations Table

1. ✅ "Anyone can view shared conversations" - Public link sharing
2. ✅ "Members can insert conversations" - Create new conversations
3. ✅ "Members can view organization conversations" - Team access
4. ✅ "Users can delete own conversations or admins can delete any"
5. ✅ "Users can update own conversations or admins can update any"

### Messages Table

1. ✅ "Users can insert messages in their org conversations" - Uses `can_user_insert_message()` function
2. ✅ "Users can update messages in their org conversations" - Uses `can_user_insert_message()` function
3. ✅ "Users can delete messages in their org conversations" - Uses `can_user_insert_message()` function
4. ✅ "Users can view messages in their org conversations" - Uses `can_user_insert_message()` function
5. ✅ "Anyone can view messages in shared conversations" - Public links

### Comments Table

1. ✅ "Users can view comments in accessible conversations" - Uses `can_user_access_comments()` function
2. ✅ "Users can insert comments in accessible conversations" - Uses `can_user_comment()` function
3. ✅ "Users can update their own comments" - Simple ownership check
4. ✅ "Users can delete own comments or conversation owner can" - Uses `can_user_delete_comment()` function

### Shares Table

1. ✅ "Users can view shares for conversations they own or are shared" - View shares
2. ✅ "Users can create shares for accessible conversations" - Uses `can_user_share_conversation()` function
3. ✅ "Users can update shares they created" - Update shares
4. ✅ "Users can delete shares they created" - Delete shares

### Profiles Table

1. ✅ "Users can view own profile" - View own profile
2. ✅ "Organization members can view each other profiles" - View teammates (needed for comments)
3. ✅ "Users can insert own profile" - Create profile
4. ✅ "Users can update own profile" - Update profile

## Key Learnings

1. **Avoid querying the same table from its own RLS policy** - This causes infinite recursion
2. **Use SECURITY DEFINER functions for complex permission checks** - Bypasses RLS in subqueries
3. **Keep policies simple** - Complex JOINs through multiple RLS-protected tables can fail
4. **Test with actual user context** - SQL Editor doesn't have auth.uid(), so policies appear to fail there

### Issue 3: Comments RLS Violation

**Error**: `"Failed to load comments"`

**Cause**: The conversation_comments SELECT policy was extremely complex, querying conversations table multiple times with nested subqueries, causing recursion and permission failures.

**Solution**: Created two SECURITY DEFINER functions:
- `can_user_access_comments()` - Checks if user can view comments (owner, org member, or has share)
- `can_user_comment()` - Checks if user can add comments (owner, org member, or has comment/edit share)
- `can_user_delete_comment()` - Checks if user can delete (own comment or conversation owner)

All comments policies now use these functions.

**Additional Fix**: The comments API query joins with profiles to fetch comment author emails. Added a policy allowing organization members to view each other's profiles:

```sql
CREATE POLICY "Organization members can view each other profiles"
ON profiles FOR SELECT
USING (
  user_id IN (
    SELECT om2.user_id
    FROM organization_members om1
    INNER JOIN organization_members om2 ON om1.organization_id = om2.organization_id
    WHERE om1.user_id = auth.uid()
  )
);
```

## Testing

All operations now work correctly:
- ✅ Creating conversations
- ✅ Loading conversations
- ✅ Inserting messages
- ✅ Updating messages
- ✅ Deleting messages
- ✅ Sharing conversations (team + public links)
- ✅ Loading comments
- ✅ Adding comments
- ✅ Deleting comments

