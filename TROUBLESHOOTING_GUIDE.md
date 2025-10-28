# Command Center Troubleshooting Guide

## Current Issues Detected

Based on your error logs, here are the issues and their solutions:

---

## Issue #1: Missing `match_documents` Function

### Error Message
```
Error searching documents: {
  code: 'PGRST202',
  details: 'Searched for the function public.match_documents...',
  message: 'Could not find the function public.match_documents(...) in the schema cache'
}
```

### Root Cause
The database migration for RAG (Retrieval Augmented Generation) support has not been run in your Supabase database.

### Solution Steps

#### Option A: Using Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the Migration**
   - Open the file `DATABASE_MIGRATION.sql` in your project
   - Copy ALL contents (Ctrl+A, Ctrl+C)
   - Paste into the Supabase SQL Editor
   - Click the "Run" button (or press Ctrl+Enter)

4. **Verify Success**
   - You should see success messages for each statement
   - Run the verification script (see below)

#### Option B: Using Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push

# Or run the migration directly
supabase db execute -f DATABASE_MIGRATION.sql
```

#### Verify the Fix

After running the migration, verify it worked:

1. **In Supabase SQL Editor, run:**
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_name = 'match_documents' 
   AND routine_schema = 'public';
   ```

2. **Or run the full verification script:**
   - Open `verify-database-setup.sql` in Supabase SQL Editor
   - Run it to check all database components

3. **Expected Result:**
   - You should see `match_documents` in the results
   - All verification checks should show ✓

---

## Issue #2: Invalid Anthropic API Key

### Error Message
```
401 {"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}
```

### Root Cause
Your Anthropic API key is either:
- Invalid or malformed
- Expired or revoked
- Missing required permissions
- Has insufficient credits

### Solution Steps

#### Step 1: Verify Your Current API Key

```bash
# Check if the key exists (without showing it)
cd /Users/mordechailevi/Desktop/Manual\ Library/MoonCommerce/Dev\ Projects/command_center
grep "ANTHROPIC_API_KEY" .env.local | grep -q "sk-ant-" && echo "✓ Key present" || echo "✗ Key missing"
```

#### Step 2: Test Your API Key

Create a test script to verify your Anthropic key works:

```bash
# Test the Anthropic API key
curl https://api.anthropic.com/v1/messages \
  --header "x-api-key: $ANTHROPIC_API_KEY" \
  --header "anthropic-version: 2023-06-01" \
  --header "content-type: application/json" \
  --data '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 10,
    "messages": [{"role": "user", "content": "Hi"}]
  }'
```

#### Step 3: Get a New API Key (if needed)

1. **Go to Anthropic Console**
   - Visit: https://console.anthropic.com/
   - Sign in with your account

2. **Navigate to API Keys**
   - Click on your profile/settings
   - Go to "API Keys" section

3. **Create a New Key**
   - Click "Create Key" or "New API Key"
   - Give it a descriptive name (e.g., "Command Center Dev")
   - Copy the key immediately (you won't see it again!)

4. **Add to .env.local**
   ```bash
   # Open .env.local in your editor
   code .env.local  # or vim, nano, etc.
   
   # Update the line:
   ANTHROPIC_API_KEY=sk-ant-your-new-key-here
   ```

5. **Revoke the Old Key** (Important!)
   - In Anthropic Console, find the old/exposed key
   - Click "Revoke" or "Delete"
   - This prevents unauthorized use

#### Step 4: Check Your Anthropic Account

1. **Verify you have credits**
   - Go to: https://console.anthropic.com/settings/billing
   - Check your credit balance
   - Add credits if needed

2. **Check rate limits**
   - Ensure you haven't hit your rate limits
   - Upgrade your tier if necessary

#### Step 5: Restart Your Application

```bash
# Stop the dev server (Ctrl+C in the terminal running it)
# Then restart:
npm run dev
```

---

## Issue #3: Security - Exposed API Key

### Problem
Your `env.example` file contained a real Anthropic API key. This file is typically committed to git, which means the key may be publicly exposed.

### Immediate Actions Required

#### 1. Revoke the Exposed Key IMMEDIATELY

The key that was in `env.example`:
```
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
```

**This key MUST be revoked:**
1. Go to https://console.anthropic.com/
2. Find this key in your API Keys list
3. Click "Revoke" or "Delete"
4. Confirm the revocation

#### 2. Check Git History

```bash
# Check if the key was committed to git
cd /Users/mordechailevi/Desktop/Manual\ Library/MoonCommerce/Dev\ Projects/command_center
git log --all --full-history --source -- env.example | head -20

# If the key was committed, consider it compromised
```

#### 3. Clean Up env.example

✓ **Already fixed!** The `env.example` file has been updated to only contain placeholders.

#### 4. Verify .env.local is Protected

```bash
# Check .gitignore
grep -q "\.env\.local" .gitignore && echo "✓ Protected" || echo "✗ NOT protected - add to .gitignore!"

# Verify .env.local is not tracked by git
git ls-files | grep -q "\.env\.local" && echo "⚠️ WARNING: .env.local is tracked!" || echo "✓ Safe"
```

---

## Testing After Fixes

### 1. Test Database Connection

```bash
# From your project directory, test the database
npm run dev

# In another terminal, check the logs
# You should NOT see "match_documents" errors
```

### 2. Test Chat Functionality

1. Open your browser to `http://localhost:3000`
2. Navigate to a brand's chat page
3. Send a test message
4. Check for:
   - ✓ Response is generated
   - ✓ No console errors
   - ✓ No terminal errors
   - ✓ Status indicators work

### 3. Test RAG Functionality

1. Go to a brand page
2. Upload a test document:
   - Title: "Test Product Info"
   - Content: "Our flagship product is called SuperWidget and costs $99"
3. In chat, ask: "What products do you have?"
4. The AI should reference the uploaded document

### 4. Monitor Logs

```bash
# Watch for errors in real-time
npm run dev | grep -E "Error|error|401|404|500"

# If clean output → everything works!
```

---

## Common Issues and Solutions

### "Cannot find module" Errors

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Port Already in Use

```bash
# Find and kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

### Database Connection Errors

```bash
# Verify your Supabase credentials
grep "NEXT_PUBLIC_SUPABASE_URL" .env.local
grep "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local

# Test connection
curl -I $(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d '=' -f2)
```

### TypeScript Errors

```bash
# Rebuild TypeScript
npm run build

# Or check types without building
npx tsc --noEmit
```

---

## Verification Checklist

Use this checklist to ensure everything is working:

### Database Setup
- [ ] `match_documents` function exists
- [ ] `brand_documents` table exists
- [ ] `conversation_summaries` table exists
- [ ] pgvector extension is enabled
- [ ] RLS policies are in place
- [ ] Vector indexes are created

### Environment Configuration
- [ ] `.env.local` file exists
- [ ] `.env.local` is in `.gitignore`
- [ ] `ANTHROPIC_API_KEY` is valid
- [ ] `OPENAI_API_KEY` is set (optional but recommended)
- [ ] Supabase credentials are correct
- [ ] No real keys in `env.example`

### Security
- [ ] Old/exposed API keys are revoked
- [ ] New API keys are secured in `.env.local`
- [ ] `.env.local` is NOT committed to git
- [ ] `env.example` only has placeholders

### Functionality
- [ ] Dev server starts without errors
- [ ] Chat page loads successfully
- [ ] Can send messages and receive responses
- [ ] No 401 authentication errors
- [ ] No database function errors
- [ ] RAG document upload works
- [ ] RAG search finds relevant documents

---

## Getting Help

If you're still experiencing issues:

1. **Check the logs carefully**
   - Browser console (F12 → Console)
   - Terminal where `npm run dev` is running
   - Supabase logs (Dashboard → Logs)

2. **Verify all fixes were applied**
   - Run `./setup-check.sh`
   - Run `verify-database-setup.sql` in Supabase

3. **Common overlooked steps**
   - Did you restart the dev server after changing `.env.local`?
   - Did you run the ENTIRE `DATABASE_MIGRATION.sql` file?
   - Did you revoke the old API key?
   - Are you using the correct Supabase project?

4. **Test incrementally**
   - Test database connection first
   - Test API keys separately
   - Test chat without RAG first
   - Add complexity gradually

---

## Quick Reference Commands

```bash
# Navigate to project
cd /Users/mordechailevi/Desktop/Manual\ Library/MoonCommerce/Dev\ Projects/command_center

# Check setup status
./setup-check.sh

# Start dev server
npm run dev

# Rebuild everything
rm -rf .next node_modules
npm install
npm run dev

# Check for errors
npm run dev 2>&1 | grep -i error

# View environment (safely)
grep -E "^[A-Z_]+=" .env.local | sed 's/=.*/=<REDACTED>/'
```

---

## Files Reference

- `DATABASE_MIGRATION.sql` - Run this in Supabase SQL Editor
- `verify-database-setup.sql` - Check database configuration
- `setup-check.sh` - Verify local environment setup
- `URGENT_FIXES_NEEDED.md` - Quick fix instructions
- `TROUBLESHOOTING_GUIDE.md` - This file
- `.env.local` - Your actual credentials (NEVER commit!)
- `env.example` - Template with placeholders (safe to commit)

---

## Success Indicators

You'll know everything is working when:

1. ✓ `npm run dev` starts with no errors
2. ✓ Chat page loads without console errors
3. ✓ You can send messages and get responses
4. ✓ Terminal shows no "401" or "match_documents" errors
5. ✓ RAG documents can be uploaded and searched
6. ✓ Status indicators update during chat
7. ✓ No authentication errors in logs

---

**Last Updated:** Based on error logs from terminal output
**Status:** Two critical issues identified and solutions provided

