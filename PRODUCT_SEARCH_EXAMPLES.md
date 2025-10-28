# Product Search Feature - Examples

## 📧 Example 1: Promotional Email

### User Prompt:
```
Write a promotional email for our Winter Sale featuring the "Cozy Wool Sweater" 
and "Thermal Leggings"
```

### AI Response:

```markdown
EMAIL SUBJECT LINE:
Winter Warmth: 30% Off Cozy Essentials

PREVIEW TEXT:
Bundle up in style with our softest winter favorites

---

HERO SECTION:
Accent: Limited Time
Headline: Winter Sale: Stay Cozy & Save
Subhead: 30% off select cold-weather favorites
CTA: Shop Winter Essentials

---

SECTION 2: Featured Products
Headline: Customer Favorites Are On Sale
Content: Our best-selling Cozy Wool Sweater and 
Thermal Leggings are finally discounted. Perfect 
for layering or lounging.
CTA: Browse Sale Items

---

CALL-TO-ACTION SECTION:
Headline: Don't Miss Out on Winter Comfort
Content: Sale ends Sunday. Stock up on warmth today.
CTA: Shop the Sale
```

### Product Links Displayed:

```
┌─────────────────────────────────────────────────────────┐
│ 📦 Products Mentioned                                    │
├─────────────────────────────────────────────────────────┤
│ 🔗 Cozy Wool Sweater                                    │
│    Ultra-soft merino wool blend sweater for ultimate... │
│    https://yourbrand.com/products/cozy-wool-sweater    │
├─────────────────────────────────────────────────────────┤
│ 🔗 Thermal Leggings                                     │
│    Fleece-lined leggings with moisture-wicking...      │
│    https://yourbrand.com/products/thermal-leggings     │
└─────────────────────────────────────────────────────────┘
```

---

## 📧 Example 2: New Product Launch

### User Prompt:
```
Create an announcement email for our new "Eco-Friendly Water Bottle" launch
```

### AI Response:

```markdown
EMAIL SUBJECT LINE:
Meet Your New Hydration Hero

PREVIEW TEXT:
Introducing the sustainable water bottle you've been waiting for

---

HERO SECTION:
Accent: Just Launched
Headline: Say Hello to Eco-Friendly Hydration
Subhead: Sustainable, stylish, and keeps drinks cold for 24 hours
CTA: Get Yours Now

---

SECTION 2: Why You'll Love It
Headline: Designed for Your Active Lifestyle
Content:
• Made from 100% recycled stainless steel
• Leak-proof lid with carrying loop
• Fits most cup holders
• Available in 5 colors

---

SECTION 3: Make the Switch
Headline: Better for You, Better for the Planet
Content: Every Eco-Friendly Water Bottle purchased helps 
remove 1 pound of ocean plastic. Join the movement.
CTA: Shop Now

---

CALL-TO-ACTION SECTION:
Headline: Ready to Make a Difference?
Content: Order your Eco-Friendly Water Bottle today and 
start your sustainable journey.
CTA: Order Your Bottle
```

### Product Links Displayed:

```
┌─────────────────────────────────────────────────────────┐
│ 📦 Products Mentioned                                    │
├─────────────────────────────────────────────────────────┤
│ 🔗 Eco-Friendly Water Bottle                            │
│    Sustainable stainless steel water bottle with...    │
│    https://yourbrand.com/products/eco-friendly-water... │
└─────────────────────────────────────────────────────────┘
```

---

## 📧 Example 3: Collection Launch

### User Prompt:
```
Write an email announcing our new "Summer Essentials Collection" 
with the "Linen Beach Dress" and "Wide Brim Sun Hat"
```

### AI Response:

```markdown
EMAIL SUBJECT LINE:
Your Summer Wardrobe Upgrade Has Arrived

PREVIEW TEXT:
Discover breezy, sun-ready styles in our new collection

---

HERO SECTION:
Accent: New Arrivals
Headline: Welcome the Summer Essentials Collection
Subhead: Effortless pieces for warm-weather adventures
CTA: Explore the Collection

---

SECTION 2: Collection Highlights
Headline: Vacation-Ready Pieces You Need
Content: Our Linen Beach Dress flows beautifully and packs 
easily. Pair it with the Wide Brim Sun Hat for all-day 
sun protection with style.

---

SECTION 3: Limited First-Release
Headline: Shop Now Before They Sell Out
Content: These pieces are selling fast. Get your favorites 
before summer hits.
CTA: Shop Summer Essentials

---

CALL-TO-ACTION SECTION:
Headline: Build Your Perfect Summer Look
Content: Mix, match, and make memories in our newest collection.
CTA: Start Shopping
```

### Product Links Displayed:

```
┌─────────────────────────────────────────────────────────┐
│ 📦 Products Mentioned                                    │
├─────────────────────────────────────────────────────────┤
│ 🔗 Summer Essentials Collection                         │
│    Browse our complete collection of summer styles...  │
│    https://yourbrand.com/collections/summer-essentials │
├─────────────────────────────────────────────────────────┤
│ 🔗 Linen Beach Dress                                    │
│    Lightweight linen dress perfect for beach days...   │
│    https://yourbrand.com/products/linen-beach-dress    │
├─────────────────────────────────────────────────────────┤
│ 🔗 Wide Brim Sun Hat                                    │
│    UPF 50+ sun protection with adjustable chin strap..│
│    https://yourbrand.com/products/wide-brim-sun-hat    │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Product Detection Breakdown

### What Gets Detected:

✅ **Quoted Product Names**
- `"Cozy Wool Sweater"` → Detected
- `"Thermal Leggings"` → Detected

✅ **Action Keywords + Product**
- `Shop our Premium Moisturizer` → Detected
- `Get your Eco-Friendly Water Bottle` → Detected

✅ **Collection Names**
- `Summer Essentials Collection` → Detected
- `Skincare Line` → Detected

✅ **Possessive + Product**
- `our Linen Beach Dress` → Detected
- `the Wide Brim Sun Hat` → Detected

### What Gets Filtered Out:

❌ **Too Short** (< 3 characters)
- `"TV"` → Filtered
- `"Go"` → Filtered

❌ **Too Long** (> 50 characters)
- `"Super Ultra Mega Premium Deluxe Limited Edition..."` → Filtered

❌ **Generic Words**
- `"sale"` → Filtered (no capitalization)
- `"products"` → Filtered

❌ **Duplicate Mentions**
- First mention: ✅ Kept
- Second mention: ❌ Removed

---

## 🔗 URL Construction Examples

### With Google Custom Search API:

**Input**: "Cozy Wool Sweater"  
**Search**: `site:yourbrand.com Cozy Wool Sweater`  
**Result**: `https://yourbrand.com/products/cozy-wool-sweater`  
**Description**: "Ultra-soft merino wool blend sweater..." (from page)

### Without API (Fallback):

**Input**: "Cozy Wool Sweater"  
**Slug Creation**: `cozy-wool-sweater` (lowercase, hyphenated)  
**Pattern Match**:
1. Try: `/products/cozy-wool-sweater` ✅ (most common)
2. Try: `/shop/cozy-wool-sweater`
3. Try: `/product/cozy-wool-sweater`

**Result**: `https://yourbrand.com/products/cozy-wool-sweater`  
**Description**: "Product page for Cozy Wool Sweater" (generated)

---

## 💡 Pro Tips for Best Results

### 1. Use Exact Product Names
❌ Generic: "Write about our sweaters"  
✅ Specific: "Write about the 'Merino V-Neck Sweater'"

### 2. Quote Product Names
❌ Hard to parse: "Write about Premium Moisturizer with Retinol"  
✅ Clear: "Write about our 'Premium Moisturizer' with retinol"

### 3. Mention Multiple Products
```
Write an email featuring:
- "Organic Face Wash"
- "Hydrating Toner"  
- "Night Repair Serum"
```

### 4. Use Collection Names
"Write about our 'Holiday Gift Set' and 'Winter Skincare Bundle'"

### 5. Match Your Website Names
If your site uses "Moisturizer - Premium Formula", mention it exactly as:
"Premium Formula Moisturizer"

---

## 🎨 Visual UI Preview

### Desktop View:
```
┌─────────────────────────────────────────────────────────┐
│ AI Message                                               │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [Email content here...]                              │ │
│ │                                                       │ │
│ │ CALL-TO-ACTION SECTION:                              │ │
│ │ Headline: Ready to Shop?                             │ │
│ │ Content: Get these items today...                    │ │
│ │ CTA: Shop Now                                        │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📦 Products Mentioned                                │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │ 🔗 Premium Moisturizer               [hover: →] │ │ │
│ │ │ Daily hydrating moisturizer with...             │ │ │
│ │ │ https://yourbrand.com/products/premium-moist... │ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ │                                                       │ │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │ 🔗 Face Serum                        [hover: →] │ │ │
│ │ │ Lightweight serum for all skin...              │ │ │
│ │ │ https://yourbrand.com/products/face-serum       │ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Mobile View:
```
┌────────────────────────┐
│ AI Message             │
│ ┌────────────────────┐ │
│ │ [Email content...] │ │
│ └────────────────────┘ │
│                        │
│ ┌────────────────────┐ │
│ │ 📦 Products        │ │
│ │ Mentioned          │ │
│ ├────────────────────┤ │
│ │ 🔗 Premium Moist.. │ │
│ │ Daily hydrating... │ │
│ │ yourbrand.com/p... │ │
│ ├────────────────────┤ │
│ │ 🔗 Face Serum      │ │
│ │ Lightweight ser... │ │
│ │ yourbrand.com/p... │ │
│ └────────────────────┘ │
└────────────────────────┘
```

---

## 🧪 Testing Scenarios

### Test 1: Single Product
**Prompt**: "Write email about our 'Organic Coffee Beans'"  
**Expected**: 1 product link

### Test 2: Multiple Products
**Prompt**: "Feature 'Morning Blend', 'Dark Roast', and 'Decaf'"  
**Expected**: 3 product links

### Test 3: Collection + Products
**Prompt**: "Announce 'Coffee Lover's Bundle' with 'French Press' included"  
**Expected**: 2 product links (bundle + press)

### Test 4: No Quotes
**Prompt**: "Write about our premium coffee"  
**Expected**: May or may not detect (less reliable)

### Test 5: Regeneration
**Action**: Regenerate message  
**Expected**: Product links update if products change

---

## 📊 Comparison: With vs Without Google API

### Without API (Fallback):
```
Product: "Eco-Friendly Water Bottle"
URL: https://yourbrand.com/products/eco-friendly-water-bottle
Description: "Product page for Eco-Friendly Water Bottle"
Accuracy: 70-80% (depends on URL patterns)
Speed: Instant
```

### With Google API:
```
Product: "Eco-Friendly Water Bottle"
URL: https://yourbrand.com/collections/drinkware/products/eco-bottle-stainless
Description: "Sustainable stainless steel water bottle with double-wall insulation. BPA-free, keeps drinks cold for 24 hours..."
Accuracy: 90-95% (actual pages)
Speed: ~300ms per product
```

---

## 🎯 Real-World Use Cases

### Use Case 1: E-commerce Store
**Scenario**: Fashion brand launching new collection  
**Result**: Each product mentioned gets direct link to purchase page  
**Benefit**: Higher click-through rates, easier customer journey

### Use Case 2: Digital Products
**Scenario**: SaaS company promoting features  
**Result**: Links to feature pages, pricing, demos  
**Benefit**: Direct path to conversion

### Use Case 3: Service Business
**Scenario**: Spa promoting treatment packages  
**Result**: Links to booking pages for each service  
**Benefit**: Simplified booking process

### Use Case 4: Content Creator
**Scenario**: Course creator promoting bundles  
**Result**: Links to course landing pages  
**Benefit**: Clear call-to-action for each offering

---

## 🚀 Best Practices

1. **Always mention products by name** in your prompts
2. **Use quotes** for clarity
3. **Match your website's naming** conventions
4. **Test links** after generation
5. **Set up Google API** for non-standard URL structures
6. **Keep product names** between 5-30 characters for best detection

---

**Need Help?** See `PRODUCT_SEARCH_FEATURE.md` for troubleshooting and customization.

