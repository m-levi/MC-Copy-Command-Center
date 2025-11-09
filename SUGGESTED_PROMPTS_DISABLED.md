# Suggested Prompts Feature - Disabled

## Status: DISABLED ❌

The suggested prompts feature has been disabled per user request.

## Why Disabled?

- Too much complexity/headache
- Not essential for core functionality
- Can be re-enabled anytime if needed

## How It Was Disabled

Simple feature flag in `components/ChatInput.tsx`:

```typescript
// Line ~47
const ENABLE_SUGGESTED_PROMPTS = false; // Set to true to re-enable
```

And conditional rendering:

```typescript
// Line ~495
{ENABLE_SUGGESTED_PROMPTS && !hasMessages && suggestions.length > 0 && !message && (
  // ... suggestions UI
)}
```

## To Re-Enable (If Ever Needed)

1. Open `components/ChatInput.tsx`
2. Find line ~47: `const ENABLE_SUGGESTED_PROMPTS = false;`
3. Change to: `const ENABLE_SUGGESTED_PROMPTS = true;`
4. Suggestions will appear again

## What's Still There (Dormant)

- ✅ API endpoint: `/app/api/suggestions/route.ts`
- ✅ Claude Haiku integration
- ✅ Web search capability
- ✅ Animation CSS
- ✅ All the smart prompt engineering
- ✅ Complete documentation

Everything is intact, just hidden from the UI.

## Cost Impact

- **Before:** ~$0.02 per suggestion request
- **After:** $0 (no API calls made)

## Files You Can Ignore

These files are now just documentation/reference (not actively used):

- `AI_SUGGESTIONS_FINAL_SUMMARY.md`
- `SMART_AI_SUGGESTIONS_UPGRADE.md`
- `ANIMATION_DETAILS.md`
- `TROUBLESHOOTING_AI_SUGGESTIONS.md`
- `QUICK_SETUP_AI_SUGGESTIONS.md`
- `app/api/suggestions/route.ts`

## Clean Up (Optional)

If you want to completely remove the code later:

1. Delete `/app/api/suggestions/route.ts`
2. Remove suggestion-related state from `ChatInput.tsx`
3. Remove animation CSS from `globals.css`
4. Delete all `*SUGGESTIONS*.md` docs

But for now, it's just dormant and harmless.

---

**TL;DR:** Feature is off. Set `ENABLE_SUGGESTED_PROMPTS = true` in ChatInput.tsx to turn back on.

