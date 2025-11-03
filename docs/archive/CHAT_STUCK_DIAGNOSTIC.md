# Chat "Analyzing" Issue - Diagnostic Guide

## 🐛 Issue: Chat Getting Stuck on "Analyzing" Status

### Symptoms
- Chat shows "Analyzing brand voice..." status
- Never progresses to next status
- No content appears
- Happens with both GPT-5 and Claude 4.5

---

## 🔍 What I Added (Diagnostic Logging)

I've added comprehensive logging to help diagnose the issue. The logs will show **exactly where** the process is getting stuck.

### Added Logs in `/api/chat/route.ts`:

**OpenAI Handler:**
```
[OpenAI] Starting request with model: gpt-5
[OpenAI] Calling API...
[OpenAI] Stream received, starting to read...
[OpenAI] Sent initial status
[OpenAI] Starting to iterate stream chunks...
[OpenAI] Processed 10 chunks, 234 chars
[OpenAI] Processed 20 chunks, 567 chars
...
[OpenAI] Stream complete. Total chunks: 45, chars: 1234
[OpenAI] Stream controller closed successfully
```

**Anthropic Handler:**
```
[Anthropic] Starting request with model: claude-4.5-sonnet
[Anthropic] Calling API...
[Anthropic] Stream received, starting to read...
[Anthropic] Sent initial status
[Anthropic] Starting to iterate stream chunks...
[Anthropic] Processed 10 chunks, 198 chars
...
[Anthropic] Stream complete. Total chunks: 52, chars: 1456
[Anthropic] Stream controller closed successfully
```

---

## 🧪 How to Diagnose

### Step 1: Open Browser DevTools
1. Open your app in browser
2. Press `F12` (or `Cmd+Option+I` on Mac)
3. Go to **Console** tab
4. Keep it open

### Step 2: Send a Message
1. Send a message in chat
2. Watch the console logs appear

### Step 3: Identify Where It Stops

**Scenario A: Stops at "Starting request"**
```
[OpenAI] Starting request with model: gpt-5
(nothing after this)
```
**Problem**: OpenAI client initialization failing
**Likely cause**: Missing or invalid `OPENAI_API_KEY`

---

**Scenario B: Stops at "Calling API"**
```
[OpenAI] Starting request with model: gpt-5
[OpenAI] Calling API...
(nothing after this)
```
**Problem**: API call is hanging or failing
**Likely causes**:
- Invalid API key
- Network timeout
- Rate limiting
- Model doesn't exist (GPT-5 might not be available yet)

---

**Scenario C: Stops at "Stream received"**
```
[OpenAI] Starting request with model: gpt-5
[OpenAI] Calling API...
[OpenAI] Stream received, starting to read...
(nothing after this)
```
**Problem**: Stream is created but no chunks arriving
**Likely causes**:
- AI is thinking (extended thinking enabled)
- Stream is empty
- Stream format issue

---

**Scenario D: Stops at "Sent initial status"**
```
[OpenAI] Stream received, starting to read...
[OpenAI] Sent initial status
[OpenAI] Starting to iterate stream chunks...
(no "Processed X chunks" logs)
```
**Problem**: For loop never gets chunks
**Likely causes**:
- Stream is empty
- Wrong chunk format
- API returning error in stream

---

## 🔧 Most Likely Causes & Fixes

### 1. GPT-5 Model Not Available
**Issue**: GPT-5 might not exist yet (currently GPT-4 is latest)

**Fix**: Update model ID
```typescript
// In lib/ai-models.ts
{
  id: 'gpt-4-turbo',  // Change from 'gpt-5'
  name: 'GPT-4 Turbo',
  provider: 'openai',
}
```

**Or update in chat page:**
```typescript
const [selectedModel, setSelectedModel] = useState<AIModel>('gpt-4-turbo');
```

---

### 2. Invalid API Keys
**Check `.env.local`:**
```bash
OPENAI_API_KEY=sk-... (should start with sk-)
ANTHROPIC_API_KEY=sk-ant-... (should start with sk-ant-)
```

**Test API keys:**
```bash
# Test OpenAI
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Test Anthropic
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01"
```

---

### 3. Extended Thinking Causing Delay
**Issue**: Both models have extended thinking enabled which can take 10-30 seconds before streaming starts

**Current config:**
- OpenAI: `reasoning_effort: 'high'`  
- Anthropic: `budget_tokens: 2000`

**Quick Fix** (temporarily disable):
```typescript
// In handleOpenAI - line 562
const stream = await openai.chat.completions.create({
  model: modelId,
  messages: formattedMessages,
  stream: true,
  // reasoning_effort: 'high', // COMMENT OUT temporarily
});

// In handleAnthropic - line 667
const stream = await anthropic.messages.create({
  model: anthropicModel,
  max_tokens: 4096,
  system: systemPrompt,
  messages: formattedMessages,
  stream: true,
  // thinking: {  // COMMENT OUT temporarily
  //   type: 'enabled',
  //   budget_tokens: 2000,
  // },
});
```

---

### 4. Model Names Incorrect

**Check if these model names are correct:**

**OpenAI**: Line 558
- Current: Uses `modelId` directly (`gpt-5`)
- Might need: `gpt-4-turbo`, `gpt-4`, or `gpt-3.5-turbo`

**Anthropic**: Line 655-657
- Current: `claude-sonnet-4-20250514`
- Check: Is this the correct model name?
- Alternative: `claude-3-5-sonnet-20241022`

---

## 🚀 Quick Diagnostic Script

Run this to test your API setup:

```typescript
// Create test-api.ts in your project root
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

async function testOpenAI() {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
    
    console.log('Testing OpenAI...');
    const stream = await openai.chat.completions.create({
      model: 'gpt-4-turbo',  // Try this instead of gpt-5
      messages: [{ role: 'user', content: 'Say hi' }],
      stream: true,
    });
    
    let chunks = 0;
    for await (const chunk of stream) {
      chunks++;
      if (chunks === 1) console.log('✅ OpenAI streaming works!');
    }
    console.log(`✅ OpenAI complete: ${chunks} chunks`);
  } catch (error) {
    console.error('❌ OpenAI error:', error);
  }
}

async function testAnthropic() {
  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
    
    console.log('Testing Anthropic...');
    const stream = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',  // Try this
      max_tokens: 1024,
      messages: [{ role: 'user', content: 'Say hi' }],
      stream: true,
    });
    
    let chunks = 0;
    for await (const chunk of stream) {
      chunks++;
      if (chunks === 1) console.log('✅ Anthropic streaming works!');
    }
    console.log(`✅ Anthropic complete: ${chunks} chunks`);
  } catch (error) {
    console.error('❌ Anthropic error:', error);
  }
}

testOpenAI();
testAnthropic();
```

---

## 🎯 Recommended Action Plan

### Step 1: Check Console Logs
1. Open chat in browser
2. Open DevTools → Console
3. Send a message
4. **See where logs stop**
5. **Report back which scenario (A, B, C, or D)**

### Step 2: Verify API Keys
```bash
# Check if environment variables are loaded
echo $OPENAI_API_KEY
echo $ANTHROPIC_API_KEY
```

### Step 3: Try Different Models
Update `lib/ai-models.ts` to use known working models:
- OpenAI: `gpt-4-turbo` or `gpt-4`
- Anthropic: `claude-3-5-sonnet-20241022`

### Step 4: Disable Extended Thinking (Temporary)
Comment out the `reasoning_effort` and `thinking` parameters

---

## 📊 What the Logs Will Tell Us

| Log Message | Meaning | Next Step |
|-------------|---------|-----------|
| Stops before "Calling API" | Client init issue | Check API keys |
| Stops after "Calling API" | API request failing | Check model names, rate limits |
| Stops after "Stream received" | Stream format issue | Check model compatibility |
| Shows "Processed X chunks" | **Working!** Extended thinking just slow | Wait longer or disable |
| No logs at all | Request not reaching API | Check network, CORS |

---

## 🚨 Emergency Quick Fix

If you need it working **right now**, use these proven models:

```typescript
// In lib/ai-models.ts
export const AI_MODELS: AIModelConfig[] = [
  {
    id: 'gpt-4-turbo',  // ← Change from gpt-5
    name: 'GPT-4 Turbo',
    provider: 'openai',
    icon: '🤖',
  },
  {
    id: 'claude-3-5-sonnet-20241022',  // ← Use exact model name
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    icon: '🧠',
  },
];
```

And in `/api/chat/route.ts`, remove extended thinking temporarily:
```typescript
// Line 558-563 (OpenAI)
const stream = await openai.chat.completions.create({
  model: modelId,
  messages: formattedMessages,
  stream: true,
  // reasoning_effort: 'high',  // ← Comment out
});

// Line 667-677 (Anthropic)
const stream = await anthropic.messages.create({
  model: anthropicModel,
  max_tokens: 4096,
  system: systemPrompt,
  messages: formattedMessages,
  stream: true,
  // thinking: { type: 'enabled', budget_tokens: 2000 },  // ← Comment out
});
```

---

## 📝 Next Steps

1. **Send me the console logs** - Tell me which scenario (A, B, C, or D)
2. **I'll provide specific fix** - Based on where it's stuck
3. **Test the fix** - Should work immediately

The diagnostic logging is now in place, so **just try sending a message and check your browser console** to see exactly where it's failing!

