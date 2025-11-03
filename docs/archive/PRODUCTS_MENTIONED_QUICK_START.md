# Products Mentioned - Quick Start ⚡

## What It Does Now ✨

Shows **ONLY real URLs** that appear in your conversations.  
No fake links. No 404s. Auto-hides when nothing to show.

---

## Quick Examples

### ✅ Will Show Products

**User pastes a link:**
```
"Write about https://mystore.com/products/jacket"
```

**AI mentions a URL:**
```
"Check out our collection at https://mystore.com/collections/winter"
```

**Markdown links:**
```
"Shop the [Premium Coffee](https://mystore.com/products/coffee)"
```

### ❌ Will Hide Box

**No URLs mentioned:**
```
"Write a welcome email about our brand values"
→ No products mentioned = box hidden ✓
```

---

## What Gets Extracted

| Source | Example | Result |
|--------|---------|--------|
| User message | `https://store.com/products/item` | ✅ Extracted |
| AI response | `at https://store.com/shop/item` | ✅ Extracted |
| Markdown | `[Name](https://store.com/item)` | ✅ Extracted |
| Quoted text | `"Winter Jacket"` (no URL) | ❌ Not extracted |
| Product name | `our premium coffee` (no URL) | ❌ Not extracted |

---

## URL Patterns Detected

Automatically finds URLs with these patterns:
- `/product/` or `/products/`
- `/shop/` or `/store/`
- `/collection/` or `/collections/`
- `/item/` or `/items/`
- `/article/` or `/blog/`

---

## Testing

### Test 1: Paste a real URL
```
User: "https://example.com/products/test"
```
**Expected:** Products Mentioned box appears with the link

### Test 2: No URLs
```
User: "Write a generic welcome email"
```
**Expected:** No Products Mentioned box (hidden)

---

## Key Changes from Old System

| Old System ❌ | New System ✅ |
|--------------|--------------|
| Constructs fake URLs | Only uses real URLs |
| Creates 404 links | All links work |
| Shows even when empty | Hides when no URLs |
| Guesses product pages | Extracts actual mentions |

---

## Files Changed

- ✅ `lib/url-extractor.ts` - New smart extraction
- ✅ `lib/unified-stream-handler.ts` - Uses new extraction
- 📄 `lib/web-search.ts` - Old code (not used anymore)

---

## Debug Logs

Check browser console for:

```
✅ URLs found:
[SmartExtract] Final count: 3 unique product links
[Stream] Sending 3 product links to client

❌ No URLs:
[SmartExtract] No real URLs found - Products Mentioned will be hidden
```

---

## That's It!

The feature now works exactly as you'd expect:
- Shows real links when they exist
- Hides when they don't
- No more garbage URLs 🎉

**Read more:** `PRODUCTS_MENTIONED_V2.md`  
**Testing guide:** `PRODUCTS_MENTIONED_TESTING.md`  
**Full summary:** `PRODUCTS_MENTIONED_FIX_SUMMARY.md`

