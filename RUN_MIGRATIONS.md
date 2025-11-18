# 🔧 FIX: Run Database Migrations

The share feature isn't working because **the database tables don't exist yet**.

---

## ⚡ FASTEST FIX - Copy/Paste SQL

### Step 1: Open Supabase
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in left sidebar
4. Click **New Query**

### Step 2: Run This SQL

Copy ALL of this file and paste it into the SQL Editor, then click Run:

**File**: `docs/database-migrations/019_conversation_sharing.sql`

### Step 3: Test Again

After running the SQL, try sharing again - it should work!

---

## 🎯 What This Creates

The migration creates:
- ✅ `conversation_shares` table - stores who you shared with
- ✅ `notifications` table - stores notifications  
- ✅ `conversation_comments` table - stores comments
- ✅ All indexes for performance
- ✅ All security policies

---

## 🔍 Verify It Worked

After running the migration, test it with this SQL:

```sql
-- Should return 0 (no shares yet)
SELECT COUNT(*) FROM conversation_shares;

-- Should return 0 (no notifications yet)
SELECT COUNT(*) FROM notifications;

-- Should return 0 (no comments yet)
SELECT COUNT(*) FROM conversation_comments;
```

If all three return a count (even if 0), the tables exist! ✅

---

## 🚨 If You Get Errors

### Error: "relation already exists"
**This is GOOD!** It means the tables already exist. The share feature should work now.

### Error: "permission denied"
You need to be logged in as the database owner. Use the service role key.

### Error: "function uuid_generate_v4() does not exist"
Run this first:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

---

## Still Not Working?

Check your Next.js terminal (where you ran `npm run dev`) for the REAL error message. It will say something like:

```
[Share API] Database error: {
  code: "42P01",
  message: "relation \"conversation_shares\" does not exist"
}
```

Copy that error message and I'll help you fix it!

---

**ACTION REQUIRED**: Go to Supabase SQL Editor NOW and run `019_conversation_sharing.sql`

