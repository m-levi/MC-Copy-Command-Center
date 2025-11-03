# 🎯 START HERE: Fix Invitation Error

## What Happened

You're seeing this error when new users try to accept invitations:
```
new row violates row-level security policy for table "organization_members"
```

## What I Fixed

I've made comprehensive changes to fix this issue:

### ✅ Code Changes (Already Done)
1. Created service role client (`lib/supabase/service.ts`)
2. Updated invitation API to use service role
3. Added auto-profile creation trigger
4. Updated RLS policies
5. Improved signup flow

### ⏳ What YOU Need to Do (2 minutes)

**Add the Supabase Service Role Key to your environment:**

1. **Get the key:**  
   https://supabase.com/dashboard/project/swmijewkwwsbbccfzexe/settings/api
   
2. **Add to `.env.local`:**
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

3. **Restart dev server:**
   ```bash
   npm run dev
   ```

4. **Test invitation flow** - Should work now! ✅

## Quick Links

- 🚨 **Quick Fix Guide:** `QUICK_FIX_INVITATION_ERROR.md`
- 📖 **Detailed Setup:** `SERVICE_ROLE_KEY_SETUP.md`  
- 🔧 **Technical Details:** `INVITATION_RLS_FIX.md`

## For Production (Vercel)

Don't forget to add the same key to Vercel:
- Settings → Environment Variables
- Add `SUPABASE_SERVICE_ROLE_KEY`
- Redeploy

---

**That's it!** Once you add the service role key, your invitation system will work perfectly.

