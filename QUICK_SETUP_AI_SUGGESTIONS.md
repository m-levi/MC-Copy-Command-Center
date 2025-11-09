# ⚡ Quick Setup: AI Suggested Prompts

## One-Minute Setup

### 1. Add OpenAI API Key

Add to `.env.local`:
```bash
OPENAI_API_KEY=sk-proj-...
```

Get your key from: https://platform.openai.com/api-keys

### 2. Restart Dev Server

```bash
# Stop the current server (Ctrl+C)
# Start fresh
npm run dev
```

### 3. Test It

1. Go to any brand's chat page
2. Create a new conversation
3. See 3 AI-generated suggestions appear
4. Switch modes and see them update

**That's it! ✅**

---

## Verify It's Working

### Check 1: Suggestions Appear
- Open brand chat page
- See "✨ Suggested Prompts" section
- Should show 3 relevant prompts

### Check 2: Suggestions Are Brand-Specific
- Compare two different brands
- Suggestions should be different
- Should reflect brand's industry/products

### Check 3: Suggestions Update
- Switch from Planning to Write mode
- Suggestions should change
- Each mode has different focus

### Check 4: No Errors
- Open browser console (F12)
- Check for any red errors
- Should see clean output

---

## Troubleshooting

### Problem: Suggestions Don't Appear

**Solution 1:** Check API key
```bash
# Verify .env.local has:
OPENAI_API_KEY=sk-proj-...
```

**Solution 2:** Check browser console
- F12 → Console tab
- Look for error messages
- Common issue: API key not loaded

**Solution 3:** Hard refresh
- Cmd/Ctrl + Shift + R
- Clear cache and reload

### Problem: Suggestions Are Generic (Not Brand-Specific)

**Solution:** Add brand data
1. Go to brand settings
2. Fill in "Brand Details"
3. Fill in "Brand Guidelines"
4. Upload brand documents
5. Refresh chat page

### Problem: API Error in Console

```
Error: OpenAI API request failed
```

**Check:**
1. API key is valid (not revoked)
2. OpenAI account has credits
3. Network connection working
4. No CORS issues

**Note:** Even with errors, static suggestions will appear as fallback.

---

## Cost Tracking

### View Usage

1. Visit: https://platform.openai.com/usage
2. Filter by: "gpt-4o-mini"
3. See daily/monthly costs

### Expected Costs

- Per suggestion: ~$0.00009 (0.009 cents)
- Per 100 suggestions: ~$0.009 (0.9 cents)
- Per 1,000 suggestions: ~$0.09 (9 cents)

**Even heavy usage costs under $5/month**

---

## Customization

### Change Suggestion Prompts

Edit `/app/api/suggestions/route.ts`:

```typescript
function buildSystemPrompt(mode: string, emailType?: string): string {
  // Modify the instructions here
  const modeSpecificInstructions = {
    planning: `Your custom planning instructions...`,
    email_copy_design: `Your custom design instructions...`,
    email_copy_flow: `Your custom flow instructions...`,
  };
  // ...
}
```

### Change Model

Replace `gpt-4o-mini` with another model:

```typescript
const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini', // Change this
  // ...
});
```

**Options:**
- `gpt-4o-mini` - Cheapest, good quality ⭐
- `gpt-4o` - Higher quality, more expensive
- `gpt-3.5-turbo` - Mid-range

### Adjust Temperature

More creative vs. more consistent:

```typescript
const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  temperature: 0.8, // Change this (0.0 - 2.0)
  // Lower = more consistent
  // Higher = more creative
});
```

---

## Feature Toggle (Optional)

### Disable AI Suggestions

In `components/ChatInput.tsx`, comment out the fetch:

```typescript
// Fetch AI-generated suggestions when brand, mode, or emailType changes
useEffect(() => {
  return; // <-- Add this to disable
  
  // ... rest of the code
}, [brandId, mode, emailType, hasMessages]);
```

Suggestions will use static fallbacks only.

### Enable Only for Specific Brands

In `components/ChatInput.tsx`:

```typescript
useEffect(() => {
  // Only fetch for specific brands
  const enabledBrands = ['brand-id-1', 'brand-id-2'];
  if (!enabledBrands.includes(brandId)) {
    return;
  }
  
  // ... rest of the code
}, [brandId, mode, emailType, hasMessages]);
```

---

## Production Deployment

### Vercel Environment Variables

1. Go to Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add:
   ```
   Name: OPENAI_API_KEY
   Value: sk-proj-...
   Environment: Production, Preview, Development
   ```
5. Redeploy

### Other Platforms

Set `OPENAI_API_KEY` environment variable according to your platform's documentation.

---

## Support & Documentation

### Full Documentation
- **`AI_SUGGESTED_PROMPTS_FEATURE.md`** - Complete technical docs
- **`TEST_AI_SUGGESTIONS.md`** - Testing guide
- **`SUGGESTED_PROMPTS_UPGRADE_SUMMARY.md`** - Executive summary

### Need Help?

Check these files for detailed information on:
- How the system works
- Prompt engineering details
- Cost optimization strategies
- Error handling
- Performance tuning
- Future enhancements

---

## What's Next?

### Monitor
- Check OpenAI usage dashboard
- Track which suggestions users click
- Monitor costs

### Optimize
- If costs rise, implement caching
- Refine prompts based on user behavior
- A/B test different suggestion styles

### Expand
- Add product-specific suggestions
- Implement seasonal awareness
- Multi-language support
- Learning from user clicks

---

**Ready to Go! 🚀**

The feature is production-ready and will automatically work for all brands once `OPENAI_API_KEY` is set.

