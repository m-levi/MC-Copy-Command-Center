# 🔍 Product Search & Linking Feature

## Overview

Your AI email copywriter now automatically finds and includes product links when mentioning products in email campaigns!

## 🎯 What It Does

When the AI writes email copy that mentions specific products:
1. **Detects** product names in the generated content
2. **Searches** your brand's website for those products
3. **Displays** clickable product links at the end of the message

## ✨ Quick Example

**You ask:** "Write a promotional email for our Winter Collection"

**AI generates:** Email copy mentioning "Cozy Wool Sweater" and "Thermal Leggings"

**You get:** 
- Complete email copy
- ➕ Product links section with:
  - 🔗 Cozy Wool Sweater → https://yoursite.com/products/cozy-wool-sweater
  - 🔗 Thermal Leggings → https://yoursite.com/products/thermal-leggings

## 🚀 Quick Setup (3 Steps)

### Step 1: Database Migration (1 minute)
Run in Supabase SQL Editor:
```sql
ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS website_url TEXT;
```

### Step 2: Add Website URL (30 seconds)
1. Edit your brand
2. Fill in "Website URL" field
3. Save

### Step 3: Test It! (2 minutes)
1. Start a chat
2. Ask: "Write an email about [Your Product Name]"
3. See product links appear! ✅

## 📚 Documentation

- **Quick Start**: [`PRODUCT_SEARCH_QUICK_START.md`](./PRODUCT_SEARCH_QUICK_START.md) - Get started in 3 steps
- **Full Guide**: [`PRODUCT_SEARCH_FEATURE.md`](./PRODUCT_SEARCH_FEATURE.md) - Complete documentation
- **Examples**: [`PRODUCT_SEARCH_EXAMPLES.md`](./PRODUCT_SEARCH_EXAMPLES.md) - Real examples & use cases
- **Implementation**: [`PRODUCT_SEARCH_IMPLEMENTATION_SUMMARY.md`](./PRODUCT_SEARCH_IMPLEMENTATION_SUMMARY.md) - Technical details

## 🎨 Features

✅ **Automatic Detection** - No manual input needed  
✅ **Smart Fallback** - Works without API setup  
✅ **Google Integration** - Optional for better accuracy  
✅ **Beautiful UI** - Product cards with icons  
✅ **Mobile Responsive** - Works on all devices  
✅ **Secure** - All links open safely in new tabs  

## 💰 Pricing

**Basic (No API)**: FREE
- Automatic URL construction
- Works immediately
- Good for standard e-commerce

**Enhanced (Google API)**: OPTIONAL
- 100 searches/day FREE
- $5 per 1,000 searches after
- Better accuracy

## 🎯 How to Use

### Method 1: Be Specific
```
"Write an email featuring our 'Premium Moisturizer' and 'Face Serum'"
```

### Method 2: Quote Product Names
```
"Create a campaign for the 'Winter Collection'"
```

### Method 3: Multiple Products
```
"Write about our 'Organic Coffee', 'Dark Roast', and 'Decaf'"
```

## 🔧 Optional: Google Custom Search Setup

For even better results (takes 5 minutes):

1. **Get API Key**: https://console.cloud.google.com
2. **Create Search Engine**: https://programmablesearchengine.google.com
3. **Add to `.env.local`**:
   ```env
   GOOGLE_SEARCH_API_KEY=your-key
   GOOGLE_SEARCH_CX=your-search-engine-id
   ```
4. **Restart**: `npm run dev`

## 📱 What You'll See

```
┌────────────────────────────────────────┐
│  [AI Generated Email Copy]             │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │ 📦 Products Mentioned             │  │
│  ├──────────────────────────────────┤  │
│  │ 🔗 Premium Moisturizer           │  │
│  │    Daily hydrating moisturizer...│  │
│  │    https://site.com/products/... │  │
│  ├──────────────────────────────────┤  │
│  │ 🔗 Face Serum                    │  │
│  │    Lightweight anti-aging...     │  │
│  │    https://site.com/products/... │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

## 🐛 Troubleshooting

### No product links appearing?
- ✅ Check brand has website URL set
- ✅ Try putting product names in quotes
- ✅ Use specific product names

### Links go to wrong pages?
- 📝 Set up Google Custom Search API for accuracy
- 📝 Or customize URL patterns in `lib/web-search.ts`

### Want different URL patterns?
Edit `lib/web-search.ts`:
```typescript
const possibleUrls = [
  `${baseUrl}/your-pattern/${slug}`,
];
```

## 🎉 Benefits

- ✅ **Saves Time**: No manual link insertion
- ✅ **Increases CTR**: Direct product access
- ✅ **Reduces Friction**: Fewer steps to purchase
- ✅ **Professional**: Polished, complete emails
- ✅ **Trackable**: Monitor which products get clicks

## 🔒 Security

- Server-side API keys only
- External links open safely
- No sensitive data in URLs
- Validated before display

## 📊 Technical Details

**Files Modified**: 6  
**New Files**: 4  
**Database Changes**: 1 column added  
**API Dependencies**: Google Custom Search (optional)  
**Performance Impact**: Negligible (<10ms without API)

## 🎓 Learn More

1. Read the [Quick Start Guide](./PRODUCT_SEARCH_QUICK_START.md)
2. Check out [Examples](./PRODUCT_SEARCH_EXAMPLES.md)
3. Review [Full Documentation](./PRODUCT_SEARCH_FEATURE.md)
4. See [Implementation Details](./PRODUCT_SEARCH_IMPLEMENTATION_SUMMARY.md)

## 💡 Pro Tips

1. **Mention products by exact name** for best results
2. **Use quotes** to make detection clearer
3. **Test with real product names** from your site
4. **Set up Google API** if your URLs are non-standard
5. **Customize patterns** for your specific site structure

## 🚀 Next Steps

1. ✅ Run the database migration
2. ✅ Add website URL to your brands
3. ✅ Test with a product mention
4. ✅ (Optional) Set up Google Custom Search
5. ✅ Start creating better email campaigns!

---

## Support

Questions? Issues? Ideas?
- Check the [Troubleshooting Guide](./PRODUCT_SEARCH_FEATURE.md#troubleshooting)
- Review the [Examples](./PRODUCT_SEARCH_EXAMPLES.md)
- Customize `lib/web-search.ts` for your needs

---

**Status**: ✅ Production Ready  
**Version**: 1.0.0  
**Last Updated**: January 20, 2025

Happy Marketing! 🎉

