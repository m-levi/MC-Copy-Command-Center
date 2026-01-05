# 🚨 QUICK FIX: Messages RLS Error

## The Error
```
new row violates row-level security policy for table "messages"
```

## The Fix (2 minutes)

### Step 1: Open Supabase SQL Editor
Go to: **Supabase Dashboard → SQL Editor**

### Step 2: Run This SQL
Copy and run the entire file:
```
docs/database-migrations/FIX_MESSAGES_RLS_FINAL.sql
```

### Step 3: Refresh Your App
The error should be gone! ✅

---

## What Happened?

Your messages table has Row-Level Security (RLS) policies that check if users belong to the right organization. But these policies were trying to query the `conversations` table (which also has RLS), causing a recursive permission check that fails.

## The Solution

We created **SECURITY DEFINER functions** that bypass RLS when checking permissions:

- `can_user_insert_message(conversation_id)` - Checks org membership
- `is_conversation_shared(conversation_id)` - Checks public sharing

These functions are then used in all messages policies, eliminating the RLS recursion problem.

---

## Still Having Issues?

See the full instructions: `MESSAGES_RLS_FIX_INSTRUCTIONS.md`

Or check if you're logged in:
```sql
SELECT auth.uid(); -- Should return your user ID, not NULL
```




















