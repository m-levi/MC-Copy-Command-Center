# 🔍 Web Search, Web Fetch & Unified Memory System

## Overview
Implemented comprehensive tool usage for both Claude and GPT-5, including web search, web fetch, and a unified memory system that works seamlessly across both AI models.

## ✅ What's Enabled

### 1. **Web Search** (Both Models)

**Claude Sonnet 4.5 & Opus 4:**
```typescript
tools: [{
  type: 'web_search_20250305',
  name: 'web_search',
  max_uses: 5,
  allowed_domains: [
    // Brand website + trusted e-commerce sources
    'brand-website.com',
    'shopify.com',
    'amazon.com',
    'yelp.com',
    'trustpilot.com',
  ]
}]
```

**GPT-5:**
```typescript
tools: [{
  type: 'web_search',
}],
tool_choice: 'auto'
```

**Pricing:**
- **Claude**: $10 per 1,000 searches (+ token costs for results)
- **OpenAI**: Included with API usage

**Use Cases:**
- ✅ Current product pricing & availability
- ✅ Recent customer reviews & testimonials
- ✅ Competitor analysis & market trends
- ✅ Real-time statistics & data
- ✅ Industry news & updates

### 2. **Web Fetch** (Claude Models)

```typescript
tools: [{
  type: 'web_fetch_20250305',
  name: 'web_fetch',
  max_uses: 3,
}]
```

**Use Cases:**
- ✅ Fetch specific product pages
- ✅ Analyze landing page content
- ✅ Verify current website information
- ✅ Check links and resources
- ✅ Review competitor pages

### 3. **Unified Memory System** (Both Models)

**Features:**
- 💾 Persistent conversation memory
- 🔄 Works across both Claude and GPT-5
- 🎯 Categorized storage (preferences, brand context, campaign info, product details, decisions, facts)
- ⏰ Optional expiration dates
- 🔒 Full RLS security

**Memory Categories:**
1. `user_preference` - User's style/tone preferences
2. `brand_context` - Brand-specific information
3. `campaign_info` - Campaign details & goals
4. `product_details` - Product information discovered
5. `decision` - Strategic decisions made
6. `fact` - Important facts to remember

**Database Schema:**
```sql
CREATE TABLE conversation_memories (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id),
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  category TEXT CHECK (category IN (...)),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  UNIQUE(conversation_id, key)
);
```

## 🎯 How It Works

### Tool Usage Flow

```
User sends message
     ↓
API loads conversation memories
     ↓
System prompt includes:
  - Brand context
  - RAG documents
  - Conversation memory
  - Available tools info
     ↓
AI decides to use tool (web search/fetch)
     ↓
[TOOL:web_search:START] marker sent
     ↓
Tool executes and returns results
     ↓
[TOOL:web_search:RESULTS] marker sent
     ↓
AI incorporates results into response
     ↓
Response generated with cited sources
     ↓
Memory instructions parsed and saved
```

### Console Output

**When Web Search is Used:**
```
[Anthropic] Tool use started: web_search
[Anthropic] Web search results received
[Anthropic] Processed 45 chunks, 3421 chars
```

**When Web Fetch is Used:**
```
[Anthropic] Tool use started: web_fetch
[Anthropic] Web fetch results received
[Anthropic] Fetched content from https://example.com/product
```

**Memory Operations:**
```
[Memory] Loaded 12 memories for conversation xyz
[Memory] Saved preference: tone_preference = casual
[Memory] Saved decision: target_audience = millennials
```

## 📊 System Prompts Updated

Both planning and email copy modes now inform the AI about available tools:

```markdown
## AVAILABLE TOOLS

🔍 Web Search: Search the internet for current information
🌐 Web Fetch: Directly fetch content from specific URLs
💭 Memory: Remember important facts across conversations
```

## 🗄️ Memory System API

**Load Memories:**
```typescript
import { loadMemories, buildMemoryContext, formatMemoryForPrompt } from '@/lib/conversation-memory-store';

const memories = await loadMemories(conversationId);
const context = buildMemoryContext(memories);
const prompt = formatMemoryForPrompt(context);
```

**Save Memory:**
```typescript
import { saveMemory } from '@/lib/conversation-memory-store';

await saveMemory(
  conversationId,
  'tone_preference',
  'casual and friendly',
  'user_preference',
  30 // expires in 30 days
);
```

**Memory in Prompt:**
```xml
<conversation_memory>
  <user_preferences>
    - tone_preference: casual and friendly
    - cta_style: action-oriented
  </user_preferences>
  
  <brand_context_memory>
    - target_audience: millennials
    - price_range: mid-tier
  </brand_context_memory>
  
  <remembered_facts>
    - seasonal_promotion: summer sale 20% off
    - bestseller: blue widget
  </remembered_facts>
</conversation_memory>
```

## 🎨 User Experience

### In Chat:

**User:** "What are the latest reviews for our product?"

**AI:** 
- 🔍 Uses web search to find recent reviews
- Cites sources with URLs
- 💾 Remembers key product feedback
- Generates response with real data

**User:** "Create a promotional email based on that"

**AI:**
- 📖 References memories from previous conversation
- Uses remembered review highlights
- Creates consistent, informed copy

## 🚀 Implementation Files

### New Files:
- ✅ `lib/conversation-memory-store.ts` - Unified memory system
- ✅ `CONVERSATION_MEMORY_MIGRATION.sql` - Database migration
- ✅ `WEB_SEARCH_AND_MEMORY_FEATURE.md` - This documentation

### Modified Files:
- ✅ `app/api/chat/route.ts` - Added tools & memory integration
  - Web search for both Claude & GPT
  - Web fetch for Claude
  - Memory loading & context building
  - Updated streaming handlers for tool events
  - Enhanced system prompts with tool info

## 📋 Setup Instructions

### 1. Run Database Migration

```bash
# Copy contents of CONVERSATION_MEMORY_MIGRATION.sql
# Paste into Supabase SQL Editor
# Run the query
```

This creates:
- `conversation_memories` table
- Indexes for performance
- RLS policies for security

### 2. Enable Web Search in Anthropic Console

1. Go to [Anthropic Console](https://console.anthropic.com)
2. Navigate to Organization Settings
3. Enable "Web Search Tool"
4. Configure domain allowlists if desired

### 3. Verify Environment Variables

Ensure these are set:
```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

### 4. Test the Features

**Test Web Search:**
```
"What are the current bestsellers in the coffee machine category?"
```

**Test Web Fetch:**
```
"Analyze the product page at https://brand.com/products/widget"
```

**Test Memory:**
```
User: "I prefer casual tone"
AI: [Remembers preference]
User: "Create an email" 
AI: [Uses casual tone from memory]
```

## 💰 Cost Considerations

### Web Search:
- **Claude**: $10/1,000 searches + token costs for results
- **OpenAI**: Included in API usage
- **Average tokens per search**: ~1,000-2,000 tokens

### Web Fetch:
- **Claude**: Token costs only (no additional fee)
- **Average tokens per fetch**: ~500-3,000 tokens depending on page

### Memory:
- **Storage**: Minimal (text only)
- **Queries**: Fast indexed lookups
- **Expiration**: Auto-cleanup of expired memories

### Example Monthly Cost (1000 messages):
- Assuming 20% use web search
- 200 searches × $0.01 = **$2.00**
- Base API costs remain the same
- Memory storage: negligible

## 🎯 Best Practices

### Web Search:
1. **Let AI decide** - Don't force searches, let the model determine when needed
2. **Domain filtering** - Use allowed_domains to focus searches on trusted sources
3. **Max uses** - Limit to 5 searches per request to control costs

### Web Fetch:
1. **Specific URLs** - Works best with direct product/page URLs
2. **Fallback** - AI will adapt if fetch fails
3. **Complement search** - Use together with web search for comprehensive research

### Memory:
1. **Categorize properly** - Use appropriate categories for organization
2. **Set expirations** - For time-sensitive info (promotions, seasonal)
3. **Key naming** - Use clear, consistent key names (snake_case)
4. **Don't overuse** - Save important facts only, not every detail

## 🔍 Debugging

### Check Tool Usage:
```typescript
// Look for these console logs:
[Anthropic] Tool use started: web_search
[Anthropic] Tool use started: web_fetch
[OpenAI] Tool call: web_search
```

### Check Memory:
```typescript
// In browser console:
console.log('Memory context:', memoryContext);
// Or check database:
SELECT * FROM conversation_memories WHERE conversation_id = 'xxx';
```

### Monitor Streaming:
```typescript
// Look for tool markers in stream:
[TOOL:web_search:START]
[TOOL:web_search:RESULTS]
[TOOL:web_fetch:START]
[TOOL:web_fetch:RESULTS]
```

## 📈 Future Enhancements

### Potential Additions:
1. **Memory UI** - Show/edit memories in sidebar
2. **Memory Analytics** - Track most referenced memories
3. **Cross-conversation Memory** - Share memories across brand conversations
4. **Memory Search** - Find conversations by remembered facts
5. **Tool Analytics** - Dashboard showing tool usage & costs
6. **Custom Tools** - Add brand-specific tool integrations

## 🎉 Summary

Both Claude and GPT-5 now have:
- ✅ **Web Search** - Real-time internet access
- ✅ **Web Fetch** - Direct URL content access (Claude)
- ✅ **Unified Memory** - Persistent context across conversations
- ✅ **Smart Tool Use** - Automatic decision-making
- ✅ **Source Citations** - Transparent sourcing
- ✅ **Cost Control** - Rate limits & domain filtering

The AI can now:
- 🔍 Research current product information
- 📊 Find real statistics and data
- 🌐 Analyze specific web pages
- 💾 Remember important context
- 📝 Create more accurate, informed content
- 🎯 Provide personalized responses

This creates a more powerful, intelligent, and context-aware AI system that delivers better results with transparency and control! 🚀


