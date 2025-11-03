# ⚡ Quick Test - Web Search & Products

## 🎯 30-Second Test

### 1. Open Browser Console (F12)

### 2. Send this message:
```
Create an email about our "Premium Coffee" and "Dark Roast Blend"
```

### 3. Check Console:
```
✅ [ANTHROPIC] Web search tool enabled...
✅ [ProductExtraction] Raw products found: ["Premium Coffee", "Dark Roast Blend"]
✅ [ProductExtraction] Filtered products: ["Premium Coffee", "Dark Roast Blend"]
```

### 4. Check UI:
```
✅ "Products Mentioned" section appears
✅ Shows 2 products with links
```

---

## 🔍 Full Web Search Test

### Send this:
```
Search our website for our bestselling products and create an email featuring 3 of them
```

### Watch for:
```
✅ Console: [ANTHROPIC] Tool use started: web_search
✅ UI: Activity shows "Searching the web..."
✅ AI mentions real products from website (not made up)
✅ Products Mentioned section appears
```

---

## 🐛 If It's Not Working

### Check #1: Tool Configuration
**Look for in console:**
```
[ANTHROPIC] Web search tool enabled with allowed domains: [...]
```
**Missing?** → Brand missing `website_url` in database

### Check #2: Tool Usage
**Look for in console:**
```
[ANTHROPIC] Tool use started: web_search
```
**Missing?** → AI not using tool (check API console for tool availability)

### Check #3: Product Extraction  
**Look for in console:**
```
[ProductExtraction] Raw products found: [...]
```
**Empty array?** → Products not in quotes or pattern not matching

---

## 📊 Full Diagnostics

See: `WEB_SEARCH_TESTING_GUIDE.md`

