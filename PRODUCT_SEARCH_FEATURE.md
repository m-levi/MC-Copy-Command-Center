# Product Search Feature

## Overview

The AI can now automatically search for products mentioned in email copy and include relevant product links at the end of messages. This feature helps create more actionable email campaigns by providing direct links to products.

## How It Works

1. **AI Mentions Products**: When generating email copy, if the AI mentions product names, they are automatically detected.

2. **Web Search**: The system searches the brand's website for those products using Google Custom Search API (if configured) or constructs URLs based on common patterns.

3. **Display Links**: Product links are displayed in a dedicated "Products Mentioned" section at the end of the AI's message.

## Setup Instructions

### 1. Run Database Migration

Execute the SQL migration to add the `website_url` field to the brands table:

```sql
-- In Supabase SQL Editor, run:
ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS website_url TEXT;
```

Or use the provided migration file:
```bash
# Copy contents from PRODUCT_SEARCH_MIGRATION.sql to Supabase SQL Editor
```

### 2. Add Brand Website URL

When creating or editing a brand:
1. Go to your brand settings
2. Fill in the "Website URL" field (e.g., `https://www.yourbrand.com`)
3. Save the brand

### 3. (Optional) Configure Google Custom Search

For more accurate product search, set up Google Custom Search API:

#### Step 1: Get API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable "Custom Search API"
3. Create credentials → API Key
4. Copy the API key

#### Step 2: Create Custom Search Engine
1. Go to [Programmable Search Engine](https://programmablesearchengine.google.com/)
2. Click "Add"
3. Enter your website domain
4. Click "Create"
5. Copy the "Search engine ID" (cx parameter)

#### Step 3: Add to Environment Variables
Add to your `.env.local`:
```env
GOOGLE_SEARCH_API_KEY=your-google-api-key-here
GOOGLE_SEARCH_CX=your-search-engine-id-here
```

### 4. Restart Your Application

```bash
npm run dev
```

## Usage

### Automatic Detection

The AI automatically detects product mentions in several ways:

1. **Quoted Products**: Products mentioned in quotes
   - Example: "Shop our new **'Winter Collection'**"
   
2. **Action Keywords**: Products following keywords like "Shop", "Get", "Buy"
   - Example: "Get your **Premium Moisturizer** today"

3. **Collection References**: Products in collections
   - Example: "Explore our **Skincare Line**"

### Fallback Behavior

If Google Custom Search API is not configured:
- System constructs product URLs using common patterns
- Tries: `/products/{slug}`, `/shop/{slug}`, `/product/{slug}`
- Product slug is created from the product name (lowercase, hyphenated)

### Example Output

When the AI mentions products in an email, users will see:

```
[AI Message Content]

📦 Products Mentioned:
┌─────────────────────────────────────────┐
│ 🔗 Premium Moisturizer                  │
│    Hydrating daily moisturizer with...  │
│    https://yourbrand.com/products/...   │
└─────────────────────────────────────────┘
```

## Product Detection Patterns

The system looks for these patterns in AI responses:

1. **Quoted text**: `"Product Name"`
2. **Shop/Get/Buy phrases**: `Shop our Product Name today`
3. **Collection mentions**: `Discover our Product Name collection`

Products are filtered to:
- Be between 3-50 characters
- Have proper capitalization
- Avoid duplicate mentions

## Customization

### Modify Product URL Patterns

Edit `lib/web-search.ts` → `constructProductUrl()`:

```typescript
const possibleUrls = [
  `${baseUrl}/products/${slug}`,      // Shopify default
  `${baseUrl}/shop/${slug}`,          // WooCommerce
  `${baseUrl}/product/${slug}`,       // Alternative
  `${baseUrl}/item/${slug}`,          // Your custom pattern
];
```

### Adjust Product Detection

Edit `lib/web-search.ts` → `extractProductMentions()`:

```typescript
// Add custom patterns
const customPatterns = [
  /your custom regex here/gi,
];
```

## Technical Details

### Architecture

```
User Request
    ↓
Chat API Route
    ↓
AI Model (OpenAI/Anthropic)
    ↓
Stream Response
    ↓
Extract Product Mentions (lib/web-search.ts)
    ↓
Search Products (Google API or Fallback)
    ↓
Append Product Links to Response
    ↓
Display in ChatMessage Component
```

### Key Files

- **`lib/web-search.ts`**: Product search and URL construction logic
- **`app/api/chat/route.ts`**: Streaming integration and product extraction
- **`components/ChatMessage.tsx`**: Product links display UI
- **`components/BrandModal.tsx`**: Website URL input
- **`types/index.ts`**: ProductLink and Brand type definitions

### API Costs

**Google Custom Search API** (Optional):
- Free tier: 100 queries/day
- Paid: $5 per 1,000 queries
- Consider: Most emails mention 1-3 products max

**Without API** (Fallback):
- No additional costs
- URLs constructed automatically
- Works immediately without setup

## Troubleshooting

### Products Not Detected

**Issue**: AI mentions products but no links appear

**Solutions**:
1. Ensure brand has `website_url` set
2. Check product names are in quotes or follow action keywords
3. Verify product names are 3-50 characters

### Invalid Product URLs

**Issue**: Product URLs don't match your site structure

**Solutions**:
1. Set up Google Custom Search API for accurate results
2. Customize URL patterns in `lib/web-search.ts`
3. Ensure your website follows standard URL conventions

### Search API Errors

**Issue**: Google Search API returning errors

**Solutions**:
1. Verify API key is correct in `.env.local`
2. Check Custom Search Engine ID (cx parameter)
3. Ensure Custom Search API is enabled in Google Cloud Console
4. Verify you haven't exceeded quota (100/day free)

### Missing Product Links in Database

**Issue**: Product links don't persist after regeneration

**Solutions**:
1. Verify `metadata` column exists in messages table (should be JSONB)
2. Check that `productLinks` array is being saved correctly
3. Reload messages from database after regeneration

## Future Enhancements

Potential improvements:
- [ ] Cache product URLs to reduce API calls
- [ ] Support multiple product URL patterns per brand
- [ ] Add product images/prices from API
- [ ] Integrate with e-commerce platforms (Shopify, WooCommerce)
- [ ] Product inventory checking
- [ ] A/B testing different product link styles

## Security Notes

- API keys are server-side only (Edge runtime)
- Product URLs are validated before display
- External links open in new tab with `noopener noreferrer`
- Rate limiting recommended for production (not included)

## Support

For issues or questions:
1. Check this documentation
2. Review `lib/web-search.ts` for customization
3. Verify environment variables are set correctly
4. Check browser console for errors

---

**Feature Version**: 1.0.0  
**Last Updated**: 2025-01-20  
**Status**: ✅ Production Ready

