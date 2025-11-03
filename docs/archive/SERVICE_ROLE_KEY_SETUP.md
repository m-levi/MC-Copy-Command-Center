# Service Role Key Setup Required

## ⚠️ Action Required

To complete the invitation fix, you need to add the **Supabase Service Role Key** to your environment variables.

## Why This Is Needed

The service role key allows server-side operations to bypass Row Level Security (RLS) policies. This is necessary for the invitation acceptance flow because:

1. New users need to be added to `organization_members`
2. RLS policies prevent non-members from inserting themselves
3. The service role bypasses RLS to allow the insertion
4. This only works server-side (secure)

## How to Get Your Service Role Key

### Step 1: Go to Supabase Dashboard

Visit: https://supabase.com/dashboard/project/swmijewkwwsbbccfzexe/settings/api

### Step 2: Find the Service Role Key

On the API Settings page, you'll see several keys:
- ✅ **anon public** - Already using this (safe to expose)
- ❌ **service_role** - **This is what you need** (NEVER expose to browser)

The service role key starts with: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Step 3: Copy the Key

Click the "Copy" button next to the **service_role** key (NOT the anon key).

### Step 4: Add to Environment Variables

#### For Local Development:

Add to your `.env.local` file:

```env
# Existing keys
NEXT_PUBLIC_SUPABASE_URL=https://swmijewkwwsbbccfzexe.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_existing_anon_key

# NEW - Add this service role key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your_service_role_key

# AI keys
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

#### For Vercel Deployment:

1. Go to your Vercel project settings
2. Navigate to: **Settings** → **Environment Variables**
3. Add a new variable:
   - **Name:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** (paste your service role key)
   - **Environments:** Check all (Production, Preview, Development)
4. Click **Save**
5. **Redeploy** your application for changes to take effect

## Security Notes

### ✅ DO:
- Keep service role key in server-side environment variables only
- Use it only in API routes (never in client components)
- Add it to `.gitignore` (already done via `.env.local`)
- Rotate the key if it's ever exposed

### ❌ DON'T:
- Never prefix with `NEXT_PUBLIC_` (that exposes it to the browser)
- Never commit it to git
- Never use it in client-side code
- Never log it or display it

## Verification

After adding the key, restart your development server:

```bash
# Stop the server (Ctrl+C)
npm run dev
```

Then test the invitation flow again. The error should be gone!

## Files Changed

These files now use the service role key:

1. **`lib/supabase/service.ts`** - New service client creator
2. **`app/api/organizations/invites/accept/route.ts`** - Updated to use service client
3. **`env.example`** - Documentation updated

## What This Fixes

✅ Allows new users to accept invitations  
✅ Bypasses RLS for member insertion  
✅ Secure server-side only operation  
✅ Marks invitations as used properly

---

## Need Help?

If you can't find the service role key or have issues:

1. Make sure you're logged into the correct Supabase project
2. Check you have admin access to the project
3. The key is very long (several hundred characters)
4. Make sure there are no line breaks when copying

**Dashboard Link:** https://supabase.com/dashboard/project/swmijewkwwsbbccfzexe/settings/api

---

**Date:** October 28, 2025  
**Status:** ⏳ Awaiting service role key configuration

