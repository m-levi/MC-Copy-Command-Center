# Product Search Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Run Database Migration (Required)

In your Supabase SQL Editor, run:

```sql
ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS website_url TEXT;
```

### Step 2: Add Website URL to Your Brands (Required)

1. Go to your Command Center homepage
2. Edit an existing brand or create a new one
3. Fill in the **Website URL** field (e.g., `https://www.yourbrand.com`)
4. Save

### Step 3: Test It! (Required)

1. Start a chat with your brand
2. Ask the AI to write an email mentioning specific products
3. Look for the "Products Mentioned" section at the bottom of the AI's response
4. Product links will automatically appear!

---

## 🎯 Example Prompts

Try these prompts to see product links in action:

- "Write a promotional email for our Winter Collection and Premium Moisturizer"
- "Create an email campaign featuring the new Eco-Friendly Water Bottle"
- "Draft an email about our Summer Sale with links to bestselling products"

---

## 📦 What You'll See

When the AI mentions products, you'll see this at the end:

```
╔════════════════════════════════╗
║  📦 Products Mentioned         ║
╠════════════════════════════════╣
║  🔗 Winter Collection          ║
║     Browse our new...          ║
║     https://site.com/...       ║
╠════════════════════════════════╣
║  🔗 Premium Moisturizer        ║
║     Daily hydrating...         ║
║     https://site.com/...       ║
╚════════════════════════════════╝
```

---

## 🎨 Basic vs Enhanced Setup

### Basic Setup (Works Immediately) ✅

**What you have now:**
- Automatic product URL construction
- Uses common patterns: `/products/product-name`
- No additional API keys needed
- Free forever

**Best for:**
- Standard e-commerce sites (Shopify, WooCommerce)
- Quick setup without API configuration
- Testing the feature

### Enhanced Setup (Optional) ⭐

**Add Google Custom Search API for:**
- More accurate product URLs
- Actual product page detection
- Search descriptions from your site
- Better results for non-standard URLs

**Cost:** Free for 100 searches/day, $5/1000 after

#### Quick API Setup (5 minutes)

1. **Get API Key:**
   - Visit: https://console.cloud.google.com/
   - Enable "Custom Search API"
   - Create API Key

2. **Create Search Engine:**
   - Visit: https://programmablesearchengine.google.com/
   - Click "Add" → Enter your website
   - Copy the Search Engine ID

3. **Add to `.env.local`:**
   ```env
   GOOGLE_SEARCH_API_KEY=your-api-key
   GOOGLE_SEARCH_CX=your-search-engine-id
   ```

4. **Restart:** `npm run dev`

---

## 🔧 How Product Detection Works

The AI detects products when they:

1. **Appear in quotes:** `"Premium Moisturizer"`
2. **Follow action words:** `Shop our Winter Collection`
3. **Are in collections:** `Explore our Skincare Line`

**Auto-filters:**
- ✅ Removes duplicates
- ✅ Ignores short words (< 3 chars)
- ✅ Capitalizes properly

---

## 💡 Pro Tips

### Tip 1: Be Specific in Prompts
❌ "Write an email about products"  
✅ "Write an email featuring the 'Organic Cotton T-Shirt' and 'Eco Sneakers'"

### Tip 2: Match Your Product Names
Use the exact product names from your website for best results.

### Tip 3: Custom URL Patterns
If your site uses custom URLs, edit `lib/web-search.ts`:

```typescript
// Change patterns to match your site:
const possibleUrls = [
  `${baseUrl}/shop/${slug}`,        // Your pattern
  `${baseUrl}/catalog/${slug}`,     // Alternative
];
```

---

## ✅ Testing Checklist

- [ ] Database migration completed
- [ ] Website URL added to at least one brand
- [ ] Created a test conversation
- [ ] AI mentioned a product name
- [ ] Product links appeared at bottom
- [ ] Links open in new tab
- [ ] Links point to correct pages (or close enough)

---

## 🐛 Quick Troubleshooting

### No product links appearing?

1. **Check brand has website URL set**
   - Edit brand → Website URL field should be filled

2. **Try mentioning products in quotes**
   - Example: Write an email about "Product Name"

3. **Verify product names are clear**
   - Be specific, use actual product names

### Links going to wrong pages?

**Without Google API:**
- Normal! URLs are constructed automatically
- They'll follow pattern: `/products/product-name`
- Set up Google Custom Search API for accurate URLs

**With Google API:**
- Verify Search Engine is configured for your domain
- Check API key is correct in `.env.local`

---

## 📚 Full Documentation

For advanced customization, troubleshooting, and technical details:
- See `PRODUCT_SEARCH_FEATURE.md`

---

## 🎉 You're All Set!

The product search feature is now active. When the AI writes email copy mentioning products, links will automatically appear at the end of the message.

**Next Steps:**
1. ✅ Try it with a real email campaign
2. ✅ Set up Google Custom Search API (optional)
3. ✅ Customize URL patterns for your site (if needed)

Happy marketing! 🚀

