# AI-Powered Suggested Prompts Feature

## Overview

We've upgraded the "Suggested Prompts" feature to use AI-generated, brand-specific suggestions instead of generic hardcoded prompts. This provides users with contextual, relevant starting points tailored to their specific brand, products, and industry.

## Cost-Effective Implementation

### Model Selection: GPT-4o Mini

After researching the most cost-effective AI models available, we selected **OpenAI's GPT-4o Mini** for this feature:

**GPT-4o Mini Pricing:**
- Input: $0.15 per 1M tokens
- Output: $0.60 per 1M tokens
- **60% cheaper than GPT-3.5 Turbo**
- 6.6x cheaper than Claude Haiku 4.5

**Why GPT-4o Mini?**
- Most cost-effective option for generating short suggestions
- High quality outputs (82% on MMLU benchmark)
- Fast response times
- Perfect for non-critical, creative tasks like suggestion generation

**Cost Analysis:**
- Each suggestion request: ~200 input tokens + ~100 output tokens
- Cost per request: ~$0.00009 (less than 0.01 cents)
- Even with 1,000 users generating suggestions daily: ~$3/month

### Alternative Considered

**Claude Haiku 4.5:**
- Input: $1 per 1M tokens
- Output: $5 per 1M tokens
- Faster but 6.6x more expensive
- Better for real-time critical tasks (not needed for suggestions)

## Technical Implementation

### 1. API Route (`/app/api/suggestions/route.ts`)

A new Edge API route that:
- Accepts `brandId`, `mode`, and `emailType` parameters
- Fetches brand data from Supabase (name, details, guidelines, website)
- Fetches recent brand documents for additional context
- Calls GPT-4o Mini with a specialized prompt for each mode
- Returns 3 contextual suggestions with relevant emoji icons
- Falls back to static suggestions if any errors occur

**Key Features:**
- Edge runtime for global low latency
- Automatic fallback to static suggestions
- Structured JSON output format
- Context-aware prompts based on mode

### 2. ChatInput Component Updates

**New Props:**
- `brandId?: string` - Pass brand ID to generate contextual suggestions

**New State:**
- `dynamicSuggestions` - Stores AI-generated suggestions
- `suggestionsLoading` - Loading state for suggestion fetch

**New Logic:**
- Fetches suggestions on mount (only for empty conversations)
- Re-fetches when `brandId`, `mode`, or `emailType` changes
- Resets suggestions when conversation gets messages
- Falls back to static suggestions if fetch fails or is loading

### 3. Chat Page Integration

Updated `/app/brands/[brandId]/chat/page.tsx` to pass `brandId` prop to `ChatInput` component.

## Prompt Engineering

### System Prompts by Mode

#### Planning Mode
Generates strategic questions and consultation prompts:
- Marketing strategy questions
- Campaign ideation requests
- Audience analysis prompts
- General marketing advice queries

**Example Output:**
```json
{
  "suggestions": [
    { "text": "What makes a good email subject line?", "icon": "💡" },
    { "text": "Help me understand our target audience", "icon": "🎯" },
    { "text": "How can I improve engagement rates?", "icon": "📈" }
  ]
}
```

#### Write Mode (Design Emails)
Generates concrete email campaign ideas:
- Promotional email concepts
- Product-focused campaigns
- Seasonal or timely ideas
- Engagement-focused email types

**Example Output (tailored to brand):**
```json
{
  "suggestions": [
    { "text": "Write a summer sale email for our skincare line", "icon": "☀️" },
    { "text": "Announce the launch of our new serum", "icon": "🚀" },
    { "text": "Create a customer appreciation newsletter", "icon": "💙" }
  ]
}
```

#### Flow Mode (Email Sequences)
Generates automation sequence ideas:
- Welcome and onboarding flows
- Re-engagement campaigns
- Behavior-triggered sequences
- Post-purchase flows

**Example Output (tailored to brand):**
```json
{
  "suggestions": [
    { "text": "Create a new subscriber welcome sequence", "icon": "👋" },
    { "text": "Build a post-purchase thank you flow", "icon": "🙏" },
    { "text": "Design a win-back campaign for inactive customers", "icon": "🔄" }
  ]
}
```

## Brand Context Building

The system intelligently builds context from multiple sources:

1. **Brand Name** - Used in suggestions for personalization
2. **Brand Details** - Understanding of products, audience, positioning
3. **Brand Guidelines** - Voice, tone, personality
4. **Website URL** - Domain context
5. **Brand Documents** - Recent uploads (style guides, product catalogs, etc.)

**Context String Example:**
```
Brand: Glow Naturals

About: Glow Naturals is a clean beauty brand offering organic skincare products made with sustainably sourced ingredients. Our target audience is eco-conscious millennials...

Brand Voice: Warm, authentic, and educational. We speak like a trusted friend who happens to be a skincare expert...

Website: https://glownaturals.com

Brand Documents:
- Product Catalog: Complete list of our organic skincare line including serums, moisturizers...
- Brand Guidelines: Our voice and tone framework for all communications...
```

## User Experience

### Before (Static Suggestions)
- Same 3 generic prompts for every brand
- No personalization
- Limited relevance

**Example:**
- 🎉 "Write a promotional email for a sale"
- 🚀 "Create a product launch announcement"
- 📧 "Draft a newsletter update"

### After (AI-Generated Suggestions)
- 3 brand-specific, contextual prompts
- Mentions actual products/audience when relevant
- Adapts to brand personality and industry

**Example (for sustainable fashion brand):**
- 🌿 "Promote our new eco-friendly summer collection"
- 💚 "Announce our carbon-neutral shipping initiative"
- ✨ "Share styling tips for sustainable wardrobes"

## Performance & Caching Strategy

### Current Implementation
- Fetches suggestions on component mount for empty conversations
- Fetches fresh suggestions when mode changes
- No caching (ensures always fresh, brand-relevant suggestions)

### Future Optimization Opportunities

If cost becomes a concern at scale:

1. **Session Caching**
   - Cache suggestions in component state per mode/emailType
   - Only re-fetch when brand data changes

2. **Local Storage Caching**
   - Cache suggestions per brand/mode for 24 hours
   - Reduce API calls for repeat visitors

3. **Server-Side Caching**
   - Cache suggestions in Redis/Vercel KV
   - Expire after 6-24 hours
   - Refresh on brand data updates

**Current Cost is so low ($0.00009/request) that caching is not necessary.**

## Error Handling & Fallbacks

The system is designed to never fail visibly:

1. **Brand Fetch Fails** → Returns fallback static suggestions
2. **OpenAI API Error** → Returns fallback static suggestions
3. **JSON Parse Error** → Returns fallback static suggestions
4. **Network Error** → Uses static suggestions from component

Users always see suggestions, whether AI-generated or static.

## Testing Checklist

- [x] API endpoint returns valid JSON
- [x] Suggestions are contextual to brand
- [x] Fallback to static suggestions works
- [ ] Test with various brand types (e-commerce, SaaS, services)
- [ ] Test all three modes (planning, design, flow)
- [ ] Test with brands that have minimal data
- [ ] Test with brands that have rich documentation
- [ ] Verify cost stays under $0.0001 per request

## Future Enhancements

### 1. Learning from User Behavior
Track which suggestions users click most often and refine prompts over time.

### 2. Product-Specific Suggestions
If brand has products in database, suggest specific product campaigns:
- "Create a promotional email for [Product Name]"
- "Announce a sale on [Product Category]"

### 3. Seasonal Awareness
Incorporate current date/season into suggestions:
- "Create a Black Friday campaign for [Brand]"
- "Write a summer collection announcement"

### 4. Previous Campaign Context
If user has created campaigns before, suggest related follow-ups:
- "Build on your previous Mother's Day campaign"
- "Create a sequel to your welcome series"

### 5. A/B Testing Different Prompt Styles
Test different prompt formats to see what drives higher engagement:
- Question format vs. Action format
- Short vs. Detailed
- Generic vs. Hyper-specific

## Environment Variables Required

```bash
OPENAI_API_KEY=sk-...
```

Make sure this is set in your `.env.local` file and in your production environment (Vercel).

## Monitoring & Analytics

### Metrics to Track (Future)

1. **Suggestion Click Rate**
   - % of users who click a suggestion vs. typing custom prompt
   - Which suggestions get clicked most

2. **Cost Tracking**
   - Daily/monthly OpenAI API costs for suggestions
   - Cost per active user

3. **Quality Metrics**
   - User satisfaction with generated suggestions
   - Suggestion relevance ratings

4. **Performance**
   - Average API response time
   - Cache hit rates (if caching implemented)

## Summary

This feature significantly improves the user onboarding experience by providing relevant, brand-specific starting points for every conversation. At a cost of less than 0.01 cents per suggestion, it's an extremely cost-effective way to add intelligence and personalization to the platform.

The system is robust with multiple fallback layers, ensuring users always have helpful suggestions even if the AI generation fails. The contextual nature of the suggestions helps users get started faster and creates a more personalized, professional experience.

