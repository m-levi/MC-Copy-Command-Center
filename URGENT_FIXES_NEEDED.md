# Urgent Fixes Required

## Issues Detected

Based on the error logs, there are two critical issues preventing the chat functionality from working:

### 1. Missing Database Function: `match_documents`

**Error:**
```
Could not find the function public.match_documents(brand_id_filter, match_count, match_threshold, query_embedding) in the schema cache
```

**Cause:** The database migration for RAG (Retrieval Augmented Generation) support has not been run.

**Fix:** Run the `DATABASE_MIGRATION.sql` script in your Supabase SQL Editor.

### 2. Invalid Anthropic API Key

**Error:**
```
401 {"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}
```

**Cause:** The Anthropic API key is either missing, invalid, or expired.

**Fix:** Update your `.env.local` file with a valid Anthropic API key.

---

## Step-by-Step Fix Instructions

### Fix #1: Create Database Function

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: Command Center

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the Migration Script**
   - Copy the entire contents of `DATABASE_MIGRATION.sql`
   - Paste it into the SQL Editor
   - Click "Run" button

4. **Verify the Function Exists**
   - Run this query to verify:
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_name = 'match_documents' 
   AND routine_schema = 'public';
   ```
   - You should see `match_documents` in the results

### Fix #2: Set Up API Keys Properly

⚠️ **SECURITY WARNING**: Your `env.example` file contains an actual API key! This should NEVER happen.

1. **Create/Update `.env.local` file**
   ```bash
   cd /Users/mordechailevi/Desktop/Manual\ Library/MoonCommerce/Dev\ Projects/command_center
   touch .env.local
   ```

2. **Add your API keys to `.env.local`** (NOT `env.example`!)
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_actual_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_supabase_anon_key

   # AI API Keys (Server-side only)
   OPENAI_API_KEY=sk-your-actual-openai-key
   ANTHROPIC_API_KEY=sk-ant-your-actual-anthropic-key
   ```

3. **Get a New Anthropic API Key** (if you don't have one or the current one is invalid)
   - Go to: https://console.anthropic.com/
   - Sign in or create an account
   - Navigate to "API Keys"
   - Create a new API key
   - Copy and paste it into `.env.local`

4. **Verify `.env.local` is in `.gitignore`**
   ```bash
   # Check if .env.local is ignored
   grep -q "\.env\.local" .gitignore && echo "✓ Safe" || echo "⚠️ Add .env.local to .gitignore!"
   ```

5. **Clean up `env.example`**
   - Remove the exposed API key from `env.example`
   - Only keep placeholder text

6. **Restart your dev server**
   ```bash
   # Stop the current server (Ctrl+C)
   # Then restart:
   npm run dev
   ```

---

## Testing the Fixes

After implementing both fixes:

1. **Test RAG Functionality**
   - Go to a brand's chat page
   - Upload a brand document in the Brand Documents section
   - Send a message related to the document content
   - The system should find and use relevant documents

2. **Test Chat Functionality**
   - Send a message in the chat
   - Verify that responses are generated without errors
   - Check the browser console for any remaining errors

3. **Check Logs**
   - Monitor the terminal for any new errors
   - Verify that the `match_documents` error is gone
   - Verify that the 401 authentication error is gone

---

## Additional Security Recommendations

1. **Rotate the Exposed API Key IMMEDIATELY**
   - The Anthropic API key in `env.example` has been exposed
   - Go to Anthropic console and delete/revoke that key
   - Generate a new one

2. **Review Git History**
   - Check if `env.example` with the real key was committed to git
   - If yes, consider it compromised and rotate immediately

3. **Never Commit Real Credentials**
   - Always use `.env.local` for real credentials
   - Only commit `.env.example` with placeholder values
   - Double-check before committing

---

## Quick Verification Checklist

- [ ] Database migration ran successfully
- [ ] `match_documents` function exists in database
- [ ] `.env.local` file created with valid API keys
- [ ] Old Anthropic API key revoked (if it was exposed)
- [ ] New Anthropic API key added to `.env.local`
- [ ] Dev server restarted
- [ ] Chat functionality works without errors
- [ ] No 401 authentication errors
- [ ] No `match_documents` function errors
- [ ] `env.example` cleaned up (no real keys)

---

## Need Help?

If you encounter any issues:

1. Check the browser console for client-side errors
2. Check the terminal for server-side errors
3. Verify your Supabase credentials are correct
4. Verify your API keys are valid and have sufficient credits
5. Check that the database migration completed without errors

## File Locations

- Database Migration: `DATABASE_MIGRATION.sql`
- Environment Example: `env.example` (should only have placeholders)
- Your Environment: `.env.local` (should have real keys, NOT committed to git)
- Chat API Route: `app/api/chat/route.ts`
- RAG Service: `lib/rag-service.ts`

