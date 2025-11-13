# 🔧 Troubleshooting AI Suggestions

## Quick Diagnosis

### Visual Indicators

When you load a chat page with an empty conversation, look at the suggestions area:

1. **No indicator** → AI suggestions working! ✅
2. **"⚠️ Basic"** → Using fallback (AI not enabled) ⚠️
3. **"⚠️ Error"** → API call failed ❌
4. **Spinner "Researching..."** → AI is working 🔄

---

## Problem 1: Seeing "⚠️ Basic" Warning

**What it means:** The API is returning fallback suggestions instead of AI-generated ones.

### Root Causes & Solutions

#### Cause A: Missing API Key

**Check:**
```bash
# Open your .env.local file
cat .env.local | grep ANTHROPIC_API_KEY
```

**Should see:**
```bash
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx...
```

**If missing or empty:**
1. Get your Anthropic API key from: https://console.anthropic.com/
2. Add to `.env.local`:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
   ```
3. Restart dev server:
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

#### Cause B: Wrong API Key

**Symptoms:** Key exists but suggestions still fallback

**Solution:**
1. Test your API key:
   ```bash
   npm run test-api-keys
   ```
2. Or manually test:
   ```bash
   curl https://api.anthropic.com/v1/messages \
     -H "Content-Type: application/json" \
     -H "x-api-key: $ANTHROPIC_API_KEY" \
     -H "anthropic-version: 2023-06-01" \
     -d '{
       "model": "claude-haiku-4.5-20250305",
       "max_tokens": 10,
       "messages": [{"role": "user", "content": "Hi"}]
     }'
   ```
3. If error, regenerate key at https://console.anthropic.com/

#### Cause C: Insufficient API Credits

**Check usage:** https://console.anthropic.com/settings/billing

**Solution:** Add credits to your Anthropic account

#### Cause D: Rate Limiting

**Check logs in browser console:**
```
[Suggestions] Claude API error: {status: 429}
```

**Solution:** Wait a few minutes or upgrade your Anthropic tier

---

## Problem 2: Seeing "⚠️ Error" Message

**What it means:** The API call failed completely

### Debugging Steps

#### Step 1: Open Browser Console
1. Press F12 (or Cmd+Option+I on Mac)
2. Go to Console tab
3. Look for red errors with `[Suggestions]` prefix

#### Step 2: Common Errors & Solutions

**Error: "Network error"**
- Check internet connection
- Check if dev server is running
- Try refreshing the page

**Error: "Brand not found"**
- Brand might be deleted
- Database connection issue
- Check Supabase status

**Error: "API error"**
- Check API key is valid
- Check Anthropic service status
- Look at detailed error in console

#### Step 3: Check API Endpoint

**Test directly:**
```bash
curl -X POST http://localhost:3000/api/suggestions \
  -H "Content-Type: application/json" \
  -d '{
    "brandId": "YOUR_BRAND_ID",
    "mode": "planning",
    "emailType": "design"
  }'
```

**Expected response:**
```json
{
  "suggestions": [
    { "text": "...", "icon": "💡" },
    { "text": "...", "icon": "🎯" },
    { "text": "...", "icon": "✨" }
  ],
  "fallback": false
}
```

**Fallback response:**
```json
{
  "suggestions": [...],
  "fallback": true,
  "error": "Reason here"
}
```

---

## Problem 3: Suggestions Load Forever

**Symptoms:** Spinner never stops, "Researching..." message stays

### Solutions

#### Check 1: API Timeout
- Normal AI generation: 2-5 seconds
- With web search: 5-10 seconds
- If >15 seconds, something is wrong

**Fix:**
1. Refresh the page
2. Check browser console for errors
3. Check network tab for failed requests

#### Check 2: Infinite Loop
**Rare but possible**

**Fix:**
1. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
2. Clear browser cache
3. Restart dev server

---

## Problem 4: Generic Suggestions (Not Brand-Specific)

**Symptoms:** Suggestions work but are too generic, don't mention products/services

### Root Causes

#### Cause A: No Website URL
**Check:** Does your brand have a `website_url` set?

**Solution:**
1. Go to brand settings
2. Add website URL (e.g., `https://yourbrand.com`)
3. Refresh suggestions (click tiny refresh icon)

#### Cause B: Website Not Accessible
**Check:** Is your website public and accessible?

**Solution:**
- Claude needs to be able to fetch your website
- If behind auth, Claude can't see it
- If localhost, Claude can't reach it
- Use production URL, not staging/dev

#### Cause C: Minimal Brand Data
**Check:** Brand details and guidelines

**Solution:**
1. Fill in "Brand Details" with products, audience, etc.
2. Add "Brand Guidelines" for voice/tone
3. Upload brand documents (style guides, product catalogs)

---

## Using the Refresh Button

### What It Does
- Forces a fresh AI suggestion generation
- Bypasses any caching
- Useful after updating brand info

### When to Use It
- ✅ After adding/updating brand website
- ✅ After uploading new brand documents
- ✅ After updating brand details
- ✅ To get different suggestions (AI varies output)
- ❌ Don't spam it (costs money per request)

### How to Use
1. Look for tiny refresh icon (🔄) next to "Suggested Prompts"
2. Click it once
3. Wait for "Researching..." to finish (5-10 sec)
4. See new suggestions with fall-in animation

---

## Console Debugging

### What to Look For

**Successful AI generation:**
```
[Suggestions] Fetching AI suggestions... {brandId: "...", mode: "planning", ...}
[Suggestions] Received: {suggestions: Array(3), fallback: false}
[Suggestions] Successfully generated AI suggestions
```

**Fallback to static:**
```
[Suggestions] Fetching AI suggestions...
[Suggestions] Claude API error: Error: ...
[Suggestions] Falling back to static suggestions
[Suggestions] Received: {suggestions: Array(3), fallback: true, error: "..."}
```

**Complete failure:**
```
[Suggestions] Fetch error: TypeError: Failed to fetch
```

---

## Cost Monitoring

### If You Have API Access

**Check costs:** https://console.anthropic.com/settings/usage

**Typical costs:**
- Per suggestion: ~$0.02 (2 cents)
- With web search: 1-3 searches per request
- Heavy usage (100 requests): ~$2

### If Costs Are Too High

**Solutions:**
1. **Reduce search limit** in `/app/api/suggestions/route.ts`:
   ```typescript
   max_uses: 1, // Change from 3 to 1
   ```

2. **Implement caching** (24-hour cache):
   ```typescript
   // Cache key: brand+mode+emailType
   // Serve cached for 24 hours
   // Only generate fresh if cache miss
   ```

3. **Fallback to GPT-4o Mini** (cheaper):
   - Keep Claude for premium users
   - Use GPT-4o Mini for free tier
   - 20x cheaper, still smart

---

## Environment Checklist

### Required Environment Variables

```bash
# .env.local

# ✅ Required for AI suggestions
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# ✅ Required for database
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ❌ NOT required for suggestions (used elsewhere)
OPENAI_API_KEY=sk-proj-xxxxx
```

### Verify Setup

```bash
# Check all required vars are set
npm run setup-check

# Or manually:
env | grep ANTHROPIC
env | grep SUPABASE
```

---

## Production Deployment

### Vercel

1. Go to: https://vercel.com/your-project/settings/environment-variables
2. Add `ANTHROPIC_API_KEY` to all environments
3. Redeploy

### Other Platforms

Set environment variable according to platform docs:
- Netlify: Site settings → Environment variables
- Railway: Project → Variables
- AWS/GCP: See platform documentation

---

## Testing the Feature

### Manual Test

1. **Go to brand chat page**
2. **Create new conversation**
3. **Observe suggestions area**
4. **Expected behavior:**
   - Shows 3 suggestions
   - No "Basic" or "Error" warning
   - Suggestions are specific to your brand
   - Mentions products/services when possible

### Test Different Modes

1. **Planning mode:**
   - Should show strategic questions
   - Questions about audience, positioning, strategy

2. **Write mode (Design):**
   - Should show campaign ideas
   - Mentions specific products
   - Actionable deliverables

3. **Write mode (Flow):**
   - Should show automation sequences
   - Multi-email journey concepts
   - Clear triggers and goals

### Test Refresh Button

1. Click refresh icon
2. Watch fall-away animation (300ms)
3. See "Researching..." for 5-10 seconds
4. Watch fall-in animation with new suggestions
5. New suggestions should be different

---

## Still Not Working?

### Contact Support

Provide this info:
1. Browser console logs (copy all `[Suggestions]` lines)
2. Network tab screenshot showing `/api/suggestions` call
3. Your brand ID
4. Mode and email type you're testing
5. Whether `ANTHROPIC_API_KEY` is set (yes/no - don't share the actual key!)

### Temporary Workaround

If AI suggestions don't work, the system falls back to static suggestions automatically. They're less smart but still functional:
- Generic but relevant to mode
- No research or brand specificity
- Still better than no suggestions

---

## Summary Checklist

✅ **ANTHROPIC_API_KEY** is set in `.env.local`  
✅ **Dev server restarted** after adding key  
✅ **API key is valid** (not expired/revoked)  
✅ **Anthropic account has credits**  
✅ **Brand has website URL** (for web search)  
✅ **Brand has details/guidelines** (for context)  
✅ **Internet connection** is working  
✅ **No console errors** (check F12)  
✅ **No "⚠️ Basic" or "⚠️ Error"** indicators  

If all checked and still not working, see "Still Not Working?" section above.
