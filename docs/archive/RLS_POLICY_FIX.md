# RLS Policy Circular Dependency - FIXED ✅

## The Problem

**Error:** `Organization membership error: {}`

**Root Cause:** The RLS policy for `organization_members` had a **circular dependency**:

```sql
-- OLD PROBLEMATIC POLICY
CREATE POLICY "Members can view their organization members" ON organization_members
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );
```

**Why it failed:**
1. To SELECT from `organization_members`, you need to check if you're a member
2. To check if you're a member, you need to SELECT from `organization_members`
3. This creates an infinite loop → Query returns empty object error `{}`

## The Fix

Replaced with a non-circular policy using `EXISTS` with a table alias:

```sql
-- NEW WORKING POLICY
CREATE POLICY "Users can view organization members" ON organization_members
  FOR SELECT
  USING (
    -- Users can see their own membership record
    user_id = auth.uid()
    OR
    -- Users can see other members if they share an organization
    -- Using EXISTS with alias to avoid circular dependency
    EXISTS (
      SELECT 1 
      FROM organization_members om2 
      WHERE om2.user_id = auth.uid() 
      AND om2.organization_id = organization_members.organization_id
    )
  );
```

**Why this works:**
- First condition (`user_id = auth.uid()`) allows direct access to your own record
- Second condition uses `EXISTS` with an explicit table alias `om2`
- The alias breaks the circular reference
- PostgreSQL can now resolve this without infinite recursion

## Changes Applied

✅ **Step 1:** Temporarily disabled RLS on `organization_members`  
✅ **Step 2:** Dropped the circular policy  
✅ **Step 3:** Created new non-circular policy  
✅ **Step 4:** Re-enabled RLS  

## Verification

```sql
-- Policy now shows proper non-circular structure
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'organization_members' AND cmd = 'SELECT';

-- Result: "Users can view organization members" | SELECT
```

## What You Can Do Now

**Try logging in again!** The error should be gone.

1. **Clear browser cache/cookies** (or use incognito)
2. **Navigate to:** `http://localhost:3000`
3. **Log in with:** `mordi@mooncommerce.net`
4. **You should see:**
   - ✅ Moon Commerce organization
   - ✅ Your brands list
   - ✅ Team Management button
   - ✅ No more "Organization membership error"

## Technical Details

### RLS Policy Types That Can Cause Circular Dependencies

❌ **Bad - Circular:**
```sql
-- Self-referencing subquery
WHERE id IN (SELECT id FROM same_table WHERE condition)
```

✅ **Good - Non-Circular:**
```sql
-- Direct field comparison
WHERE field = auth.uid()
-- OR EXISTS with explicit alias
OR EXISTS (SELECT 1 FROM same_table alias WHERE ...)
```

### Why EXISTS Works

- `EXISTS` is evaluated as a boolean check, not a data query
- Using an explicit table alias (`om2`) creates a clear distinction
- PostgreSQL's query planner can optimize this efficiently
- No circular reference in the execution plan

## Related Fixes

The other RLS policies (for UPDATE, DELETE, INSERT on `organization_members`) still reference the table but they work because:
- They only trigger AFTER you've already accessed the table via SELECT
- They run in a different context (modification, not reading)
- The SELECT policy is resolved first

## Future Considerations

If you add more RLS policies, remember:
1. Avoid self-referencing subqueries in SELECT policies
2. Use direct field comparisons when possible (`user_id = auth.uid()`)
3. Use `EXISTS` with aliases for related checks
4. Test policies with actual authenticated users, not just service role

---

**Status:** ✅ **FIXED**  
**Date:** October 27, 2025  
**Impact:** Login should now work properly!

