# Web Search & Products Mentioned - Diagnostic & Fix

## Current Issues

### Issue 1: Web Search Tools May Not Be Working
**Symptoms:** AI is not searching for products when asked

**Root Causes to Check:**
1. Tools enabled but API may have restrictions
2. AI may need stronger prompting to use tools
3. Console logs not showing tool usage

### Issue 2: Products Mentioned Feature Not Displaying
**Symptoms:** Product links section not appearing even when products are mentioned

**Root Causes:**
1. Product extraction logic only triggers AFTER stream completes
2. AI native web search doesn't automatically trigger product link extraction
3. The `[PRODUCTS:...]` marker is only sent if `extractProductLinks()` is called in backend

## The Problem

Looking at the code flow:

```typescript
// lib/unified-stream-handler.ts (lines 332-338)
// Extract and send product links
if (websiteUrl && fullResponse) {
  const productLinks = await extractProductLinks(websiteUrl, fullResponse);
  if (productLinks.length > 0) {
    controller.enqueue(encoder.encode(`\n\n[PRODUCTS:${JSON.stringify(productLinks)}]`));
  }
}
```

This code:
1. ✅ Is enabled and will run
2. ❌ Uses `extractProductMentions()` which looks for products in quotes
3. ❌ Then uses `constructProductUrl()` to build URLs (not actual search)
4. ❌ Does NOT use AI web search to find real products

The AI web search tools are enabled, but:
- They search for product INFO (descriptions, details)
- They DON'T automatically trigger the "Products Mentioned" feature
- The "Products Mentioned" feature uses regex pattern matching (not AI search)

## Solutions

We have **2 separate features** that need to work together:

### Feature 1: AI Web Search (for finding product info)
**Purpose:** Let AI search brand website for accurate product details  
**Status:** ✅ Enabled but needs verification  
**How it works:** AI uses web_search tool when it needs information

### Feature 2: Products Mentioned Display
**Purpose:** Show clickable product links at bottom of messages  
**Status:** ⚠️ Works but relies on pattern matching, not AI search  
**How it works:** Regex extracts product names → constructs URLs → displays links

## Fixes Needed

### Fix 1: Verify Web Search is Actually Working

Add better logging and diagnostics:

```typescript
// In lib/unified-stream-handler.ts createStream()
console.log(`[${provider.toUpperCase()}] Tools configured:`, 
  provider === 'openai' ? 
    [{ type: 'web_search' }] : 
    tools
);
```

### Fix 2: Improve Product Detection Prompt

The AI needs explicit instruction to:
1. Search for products when asked
2. Mention products in a way that triggers extraction

Update system prompts to say:
```
When asked about products:
1. Use web search to find real products from ${websiteUrl}
2. Mention products by wrapping names in quotes: "Product Name"
3. This will create clickable product links for the user
```

### Fix 3: Test Both Features Separately

**Test AI Web Search:**
```
Prompt: "Search the website for our bestselling coffee products and tell me about them"
Expected: AI should use web_search tool, activity shows "searching web"
```

**Test Product Links:**
```
Prompt: "Create an email about our "Premium Roast Coffee" and "Espresso Blend""
Expected: Product links section should appear with those 2 products
```

## Quick Fixes to Implement

1. **Add diagnostic logging**
2. **Strengthen prompts about using web search**
3. **Test with explicit product names in quotes**

Would you like me to:
- A) Add more aggressive prompting to force web search usage?
- B) Add better diagnostic logging to see what's happening?
- C) Create a hybrid approach where product extraction also uses web search?
- D) All of the above?

