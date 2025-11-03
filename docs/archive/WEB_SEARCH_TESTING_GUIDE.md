# 🔍 Web Search & Products Testing Guide

## ✅ What Was Fixed

### 1. Enhanced Logging
- Added detailed console logging to show when web search tools are configured
- Tools will log: domain filtering, tool type, and configuration status
- Tool usage will show in console: `[OPENAI] Tool use started: web_search`

### 2. Strengthened Prompts
- Added **explicit instructions** for AI to use web search when asked about products
- Prompts now emphasize:
  - "ALWAYS use web search to find real products"
  - "Search for 'products' or 'shop' on the website"
  - "Include product names in quotes for clickable links"
- Example usage included in prompts

### 3. Improved Product Extraction
- Enhanced regex patterns to detect product names
- Now captures:
  - Products in double quotes: "Product Name"
  - Products in single quotes: 'Product Name'  
  - Products after action words: "Shop our Premium Coffee"
  - Products with "our/the": "our Espresso Blend"
- Better filtering to remove false positives
- Added logging to debug extraction

## 🧪 How to Test

### Test 1: Verify Web Search Tool Configuration

**Open browser console (F12) and watch for:**

```
[OPENAI] Web search tool enabled: { type: 'web_search', websiteContext: 'Searching yourbrand.com' }
```
or
```
[ANTHROPIC] Web search tool enabled with allowed domains: ['yourbrand.com', 'shopify.com', ...]
```

✅ **Expected:** You should see this message when sending a message  
❌ **Problem:** If missing, web search isn't configured

### Test 2: Verify Web Search Actually Runs

**Prompt:** "Search the website and tell me about our products"

**Watch for in console:**
```
[OPENAI] Tool use started: web_search
```

**Watch for in UI:**
- Activity indicator shows "Searching the web..."
- Status changes from "thinking" → "searching web" → "analyzing brand"

✅ **Expected:** Tool usage appears in console AND activity indicator  
❌ **Problem:** If AI responds without searching, it's not using the tool

### Test 3: Products Mentioned Feature

**Prompt:** "Create an email about our "Premium Coffee" and "Espresso Blend""

**Watch for:**
- Console logs: `[ProductExtraction] Raw products found: [...]`
- Console logs: `[ProductExtraction] Filtered products: [...]`
- In the message: "Products Mentioned" section appears at bottom
- Product links are clickable

✅ **Expected:** Product links section appears with 2 products  
❌ **Problem:** Section missing = extraction failed (check console logs)

### Test 4: Combined Test (Web Search + Product Links)

**Setup:** Make sure brand has `website_url` set (e.g., https://yourbrand.com)

**Prompt:** "Create an email featuring 3 products from our website"

**Expected Flow:**
1. Console: `[ANTHROPIC] Web search tool enabled...`
2. AI uses thinking/reasoning: "I'll search the website for products..."
3. Console: `[ANTHROPIC] Tool use started: web_search`
4. UI: Activity shows "Searching the web..."
5. AI finds real products from website
6. AI writes email mentioning products in quotes: "Product Name"
7. Console: `[ProductExtraction] Raw products found...`
8. Message displays with "Products Mentioned" section
9. Product links use brand website URL

✅ **Success Criteria:**
- Web search was used (console + activity indicator)
- Real products from website (not made up)
- Products Mentioned section appears
- Links point to brand website

## 🐛 Troubleshooting

### Issue: Web Search Tool Not Configured

**Symptoms:** No console log showing tool configuration

**Check:**
1. Is `website_url` set for the brand in database?
2. Check `/api/chat` logs - is websiteUrl being passed?

**Fix:** Update brand with website URL in database

### Issue: AI Not Using Web Search

**Symptoms:** 
- No "[TOOL:web_search:START]" in console
- Activity never shows "searching web"
- AI makes up products

**Possible Causes:**
1. **API Keys Issue:** Anthropic console may not have web search enabled
   - Go to https://console.anthropic.com
   - Check if web search tool is enabled for your account
   
2. **Model Doesn't Support Tools:** Some models don't support tools
   - Use claude-sonnet-4 or claude-opus-4 (not older versions)
   - Use gpt-4 or newer for OpenAI

3. **Prompt Not Strong Enough:** AI decides it doesn't need to search
   - Try more explicit: "Search our website for coffee products and list them"

### Issue: Products Mentioned Not Appearing

**Symptoms:** 
- Web search works
- AI mentions products
- But "Products Mentioned" section doesn't appear

**Check Console Logs:**
```
[ProductExtraction] Raw products found: []
[ProductExtraction] Filtered products: []
```

**Common Causes:**
1. **Products not in quotes:** AI needs to write "Product Name" in quotes
2. **Pattern doesn't match:** Products written in unusual way
3. **False positive filtering:** Product name too generic

**Solution:**
- Ask AI explicitly: "Mention each product name in quotes"
- Check console to see what was extracted
- If needed, adjust regex in `lib/web-search.ts`

### Issue: Product Links Point to Wrong URLs

**Symptoms:** Links appear but URLs are wrong

**This is expected!** The current system:
- Uses pattern matching to construct URLs
- Guesses: `website.com/products/product-name-slug`
- Doesn't use actual product URLs from website

**To fix this properly:**
- Would need actual web scraping or product API
- Current system is best-effort URL construction

## 📊 Success Metrics

A fully working system should show:

1. ✅ Console logs confirm tools configured
2. ✅ Activity indicator shows "searching web" when appropriate  
3. ✅ Console shows tool usage: `[Tool use started: web_search]`
4. ✅ AI finds real products (not fictional ones)
5. ✅ Thinking section shows search reasoning
6. ✅ Products Mentioned section appears
7. ✅ Product links use brand domain

## 🎯 Next Steps If Still Not Working

1. **Check the console logs** - this is #1 diagnostic tool
2. **Try with OpenAI vs Claude** - see if one provider works better
3. **Test with explicit search prompts** - "Search the website for X"
4. **Check API console** - Anthropic/OpenAI dashboards for errors
5. **Share console output** - for debugging

## 📝 Example Test Conversation

```
User: "Create an email about our top 3 coffee products"

Expected Console:
[ANTHROPIC] Starting unified stream...
[ANTHROPIC] Web search tool enabled with allowed domains: ['coffee.com', ...]
[ANTHROPIC] Tool use started: web_search
[ANTHROPIC] Tool result received: web_search
[ProductExtraction] Raw products found: ["Dark Roast Blend", "Medium Roast", "Espresso Supreme"]
[ProductExtraction] Filtered products: ["Dark Roast Blend", "Medium Roast", "Espresso Supreme"]

Expected UI:
- Activity shows "Searching the web..."
- Thinking shows: "I'll search the website for coffee products..."
- Email mentions: "Dark Roast Blend", "Medium Roast", "Espresso Supreme"
- Products Mentioned section shows 3 products with links
```

---

## 🔑 Key Takeaways

1. **Two separate features:** Web search (AI tool) + Product links (pattern matching)
2. **Console is your friend:** Check logs to see what's happening
3. **Quotes are important:** AI needs to write "Product Name" in quotes
4. **Website URL required:** Brand must have website_url in database
5. **Model matters:** Use latest Claude/GPT models with tool support

Ready to test! 🚀

