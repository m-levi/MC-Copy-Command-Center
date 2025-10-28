# 🚨 Quick Fix: Invitation RLS Error

## The Error You're Seeing

```
new row violates row-level security policy for table "organization_members"
```

## ⚡ Quick Fix (2 minutes)

### 1. Get Your Service Role Key

Go here: https://supabase.com/dashboard/project/swmijewkwwsbbccfzexe/settings/api

Copy the **service_role** key (the long one at the bottom, NOT the anon key)

### 2. Add to `.env.local`

Open your `.env.local` file and add this line:

```env
SUPABASE_SERVICE_ROLE_KEY=paste_your_key_here
```

Your file should look like:

```env
NEXT_PUBLIC_SUPABASE_URL=https://swmijewkwwsbbccfzexe.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Restart Your Server

```bash
# Stop the server (Ctrl+C or Cmd+C)
# Then restart:
npm run dev
```

### 4. Test Again

Try accepting the invitation again - it should work now! ✅

---

## For Vercel Deployment

Add the same key in Vercel:
1. Go to your Vercel project
2. **Settings** → **Environment Variables**
3. Add: `SUPABASE_SERVICE_ROLE_KEY` = (your key)
4. **Redeploy**

---

## ⚠️ Security Warning

**NEVER** expose this key to the browser!
- ✅ DO: Keep in `.env.local` (server-only)
- ❌ DON'T: Prefix with `NEXT_PUBLIC_`
- ❌ DON'T: Commit to git

---

## What Was Fixed

I've updated your code to:
- ✅ Use service role client for invitation acceptance
- ✅ Auto-create profiles on signup
- ✅ Updated RLS policies
- ✅ Server-side API endpoint for secure operations

All you need to do is add the service role key!

---

**Need more details?** See `SERVICE_ROLE_KEY_SETUP.md`

