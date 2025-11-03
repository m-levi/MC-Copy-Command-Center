# Testing the New Products Mentioned Feature

## Test Scenarios

### ✅ Test 1: User Pastes Product Link
**Input:**
```
User: "Write an email about this product: https://yourstore.com/products/winter-jacket"
```

**Expected:**
- Products Mentioned box appears
- Shows "Winter Jacket" with the real URL
- Link is clickable and works

---

### ✅ Test 2: AI Mentions URL in Response
**Input:**
```
User: "Write about our winter collection"
AI: "Shop our Winter Collection at https://yourstore.com/collections/winter..."
```

**Expected:**
- Products Mentioned box appears  
- Shows "Winter Collection" with the real URL

---

### ✅ Test 3: Multiple URLs
**Input:**
```
User: "Feature these products:
       https://store.com/products/jacket
       https://store.com/products/scarf
       https://store.com/products/gloves"
```

**Expected:**
- Products Mentioned box appears
- Shows all 3 products with correct URLs
- No duplicates

---

### ✅ Test 4: No URLs (Box Should Hide)
**Input:**
```
User: "Write a welcome email for new customers"
AI: "Welcome to our store! We're so excited to have you join our community..."
```

**Expected:**
- ❌ NO Products Mentioned box (should be hidden)
- No fake URLs created
- No 404 links

---

### ✅ Test 5: Markdown Links
**Input:**
```
User: "Write an email"
AI: "Check out our [Premium Coffee](https://store.com/products/coffee) and 
     [Tea Collection](https://store.com/collections/tea)..."
```

**Expected:**
- Products Mentioned box appears
- Shows "Premium Coffee" and "Tea Collection"
- Both links work

---

### ✅ Test 6: Mixed Sources
**Input:**
```
User: "Write about https://store.com/products/jacket and our winter scarf"
AI: "Stay warm with our jacket at https://store.com/products/jacket and 
     cozy scarf from https://store.com/products/scarf"
```

**Expected:**
- Shows both products
- Deduplicates the jacket URL (only shown once)

---

### ✅ Test 7: AI Web Search (If Available)
**Input:**
```
User: "Search my website for our best-selling products and write an email"
AI: *uses web search tool*
    "Our bestsellers include: https://store.com/products/item1..."
```

**Expected:**
- Products Mentioned shows real URLs from search results
- Links are from the actual website

---

## How to Test

### 1. Start the App
```bash
npm run dev
```

### 2. Create/Edit a Brand
- Make sure brand has a `website_url` set (e.g., `https://yourstore.com`)

### 3. Open Chat
Navigate to a brand's chat page

### 4. Try Each Scenario
- Paste the test inputs above
- Observe the Products Mentioned box behavior
- Click links to verify they work

### 5. Check Console Logs
Open browser DevTools console and look for:
```
[SmartExtract] Starting extraction...
[SmartExtract] Final count: X unique product links
[ProductLinks] Smart extraction found X real product links
[Stream] Sending X product links to client
```

Or when no URLs found:
```
[SmartExtract] No real URLs found - Products Mentioned will be hidden
[Stream] No product links found - box will be hidden
```

---

## What to Look For

### ✅ Good Signs
- Products Mentioned only appears when real URLs exist
- All links are clickable and valid
- No 404 errors
- Product names are readable (not ugly slugs)
- Box is hidden when no URLs found

### ❌ Bad Signs  
- Box appears but has no links
- Links lead to 404 pages
- Fake constructed URLs like `/products/undefined`
- Box shows when AI just mentions products without URLs

---

## Common Test URLs

Use these for quick testing:

### Real Product URLs (Examples)
```
https://www.example.com/products/t-shirt
https://www.example.com/collections/winter
https://www.example.com/shop/coffee
https://www.example.com/product/jacket
```

### Should Extract:
- Any https:// or http:// URL
- URLs with `/products/`, `/product/`, `/shop/`, `/collection/`, etc.
- Markdown formatted links
- URLs mentioned after product names

### Should NOT Create:
- Fake URLs when only product name is mentioned
- 404 links
- Guessed URL patterns

---

## Success Criteria

✅ **Feature is working correctly if:**
1. Only real, valid URLs are shown
2. Box is hidden when no URLs exist
3. No 404 errors
4. URLs are captured from user messages
5. URLs are captured from AI responses
6. Duplicate URLs are removed
7. Product names are human-readable

❌ **Feature needs fixing if:**
1. Fake URLs are constructed
2. Box shows with empty content
3. Links lead to 404s
4. Real URLs in messages are missed
5. Box appears when it shouldn't

---

## Debug Mode

To see detailed extraction logs, check the browser console for:

```
[SmartExtract] Starting extraction...
[SmartExtract] AI response length: 1234
[SmartExtract] User messages: 3
[SmartExtract] Markdown links: 1
[SmartExtract] Named products with URLs: 2
[SmartExtract] AI response URLs: 3
[SmartExtract] User message URLs: 2
[SmartExtract] Final count: 5 unique product links
```

This shows exactly what was found and from where.

