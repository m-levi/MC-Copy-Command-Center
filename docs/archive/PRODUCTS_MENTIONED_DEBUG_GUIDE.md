# Products Mentioned - Debug & Testing Guide

## Why You're Not Seeing It

The feature only appears when **real URLs are found**. Here's how to test and debug:

---

## Quick Test (Should Work Immediately)

### Test 1: Paste a Real URL
```
Type this in chat:
"Write an email about this product: https://www.example.com/products/winter-jacket"
```

**What to look for:**
1. Open browser DevTools console (F12)
2. Send the message
3. Watch for these logs:

```
[SmartExtract] Starting extraction...
[SmartExtract] User message URLs: 1
[SmartExtract] Final count: 1 unique product links
[ProductLinks] Smart extraction found 1 real product links
[Stream] Sending 1 product links to client
[ProductExtract] PRODUCTS marker found! [{"name":"Winter Jacket"...
[ProductExtract] Parsed product links: [{...}]
[Database] Saving message with product links: 1 links
```

4. **Products Mentioned box should appear** at bottom of AI message

---

## Test Scenarios

### ✅ Test 2: Multiple URLs
```
"Feature these products:
https://www.amazon.com/product/123
https://www.shopify.com/product/456"
```

**Expected:** Box with 2 products

### ✅ Test 3: Markdown Link (if AI uses it)
```
"Write an email and include this link as [Winter Coat](https://store.com/products/coat)"
```

**Expected:** Box with 1 product "Winter Coat"

### ❌ Test 4: No URLs (Box Should Hide)
```
"Write a welcome email about our brand values"
```

**Expected:** 
- Console shows: `[SmartExtract] No real URLs found`
- Console shows: `[Stream] No product links found - box will be hidden`
- **NO Products Mentioned box**

---

## Debugging Steps

### Step 1: Check Console Logs

Open DevTools Console and look for:

**GOOD Signs (URLs Found):**
```
[SmartExtract] Final count: X unique product links (where X > 0)
[Stream] Sending X product links to client
[ProductExtract] PRODUCTS marker found!
[ProductExtract] Parsed product links: [...]
[Database] Saving message with product links: X links
```

**EXPECTED Signs (No URLs):**
```
[SmartExtract] No real URLs found - Products Mentioned will be hidden
[Stream] No product links found - box will be hidden
[ProductExtract] No PRODUCTS marker found in stream
```

### Step 2: Check Network Tab

1. Open DevTools → Network tab
2. Filter for "chat" requests
3. Send a message with a URL
4. Click the chat request
5. Go to "Response" tab
6. Look for `[PRODUCTS:[...]]` in the streaming response

**If you see it:** Feature is working! Check UI rendering
**If you don't see it:** Backend isn't detecting URLs

### Step 3: Check Message Metadata

After AI responds:
1. Open DevTools Console
2. Type: `document.querySelectorAll('[data-message-id]')`
3. Find the last AI message
4. Check if it has `message.metadata.productLinks`

---

## Common Issues & Solutions

### Issue 1: "I don't see the box"

**Check:**
- Did you include a real URL (http:// or https://)?
- Is the URL in your message or AI's response?
- Check console for `[SmartExtract] Final count: X` - is X > 0?

**Solution:**
Try the simplest test:
```
User: "https://www.google.com"
AI: (any response)
→ Should show Products Mentioned with "Google" link
```

### Issue 2: "Console says no URLs found"

**Check:**
- URLs must start with `http://` or `https://`
- URLs must be valid (parseable by `new URL()`)

**Examples that WON'T work:**
- `www.example.com` (missing http://)
- `example.com/product` (missing http://)
- `just text without urls`

**Examples that WILL work:**
- `https://www.example.com/products/item`
- `http://store.com/shop/jacket`

### Issue 3: "Console shows URLs but no box"

**Check:**
1. Look for `[ProductExtract] Parsed product links:` in console
2. Verify the format is correct:
   ```json
   [{"name": "Product", "url": "https://...", "description": "..."}]
   ```
3. Check if ChatMessage component received the metadata

**Debug in Console:**
```javascript
// Find the AI message element
const aiMessage = document.querySelector('[data-message-id]');
// Check if it has product links
console.log(aiMessage?.textContent);
```

### Issue 4: "Old messages have fake URLs"

**Expected!** Old messages created before this fix still have the old fake URLs.

**Solution:**
- Generate a NEW message with a real URL
- Old messages won't be fixed retroactively
- Only new messages use the smart extraction

---

## What URLs Are Detected?

### ✅ Always Detected
- Any `https://` or `http://` URL in user messages
- Any `https://` or `http://` URL in AI responses

### ✅ Prioritized (if brand website URL is set)
- URLs from the brand's domain
- URLs with product-like paths:
  - `/product/`, `/products/`
  - `/shop/`, `/store/`
  - `/collection/`, `/collections/`
  - `/item/`, `/items/`

### ❌ NOT Detected (intentionally)
- Product names without URLs: `"Winter Jacket"`
- Partial URLs without protocol: `www.example.com`
- Fake constructed URLs (this is the fix!)

---

## Testing Checklist

- [ ] Test 1: Paste a single URL → Box appears
- [ ] Test 2: Paste multiple URLs → Box shows all
- [ ] Test 3: No URLs → Box hidden
- [ ] Test 4: Check console logs → See extraction details
- [ ] Test 5: Verify links are clickable → Open in new tab
- [ ] Test 6: Check Network response → See [PRODUCTS:...] marker

---

## Still Not Working?

### Enable Full Debug Logging

The system already has extensive logging. Just open DevTools Console and you'll see:

1. **Backend (Server) Logs:** (in terminal where `npm run dev` is running)
   ```
   [SmartExtract] Starting extraction...
   [ProductLinks] Smart extraction found X real product links
   [Stream] Sending X product links to client
   ```

2. **Frontend (Browser) Logs:** (in DevTools Console)
   ```
   [ProductExtract] Checking for PRODUCTS marker...
   [ProductExtract] Parsed product links: [...]
   [Database] Saving message with product links...
   ```

### Manual Test

1. Start dev server: `npm run dev`
2. Open chat page
3. Open DevTools Console (F12)
4. Type: `"https://www.amazon.com"`
5. Send message
6. Wait for AI response
7. Check console for logs
8. Look for Products Mentioned box

---

## Expected Behavior Summary

| Input | Expected Output |
|-------|----------------|
| Message with `https://...` URL | ✅ Products box appears |
| Message with multiple URLs | ✅ Products box with all links |
| Message with NO URLs | ❌ No box (hidden) |
| Old message (before fix) | ℹ️ May have old fake URLs |
| New message without URLs | ❌ No box (working as intended) |

---

## Success Criteria

✅ **Working correctly if:**
- URLs in messages → Box appears
- No URLs → Box hidden
- All links are clickable
- No 404 errors
- Console shows extraction details

❌ **Need to investigate if:**
- URLs in messages → No box appears
- Console shows errors
- Links lead to 404s
- Box appears when it shouldn't

---

## Next Steps

1. **Try the Quick Test above** (paste a URL)
2. **Check the console logs**
3. **Verify the box appears**
4. **If not working:** Share the console logs
5. **If working:** Feature is ready to use!

The feature is designed to be **honest** - it only shows what actually exists. If you don't see it, it means no real URLs were found (which is correct behavior). Test with a real URL to verify it works!

