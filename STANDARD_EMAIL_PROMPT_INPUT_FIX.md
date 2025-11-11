# Standard Email Prompt - Input Integration Fix ✅

**Date**: November 10, 2025  
**Status**: ✅ COMPLETED

---

## Problem

The new Standard Email Prompt system wasn't receiving the correct inputs:
- ❌ `{{COPY_BRIEF}}` placeholder was not being filled with user's message
- ❌ `{{BRAND_VOICE_GUIDELINES}}` was not receiving the copywriting style guide
- ❌ `{{ADDITIONAL_CONTEXT}}` was not receiving brand details, RAG, memory, etc.
- ❌ The new `buildStandardEmailPromptV2()` function was created but **never used**

**Root Cause**: The chat API was still using the old `buildSystemPrompt()` function, which returned a combined prompt with unfilled placeholders.

---

## Solution

### 1. Updated Chat API Route (`app/api/chat/route.ts`)

Added intelligent routing that detects when to use the new V2 prompt system:

```typescript
// NEW: Detect standard design email mode
if (emailType === 'design' && conversationMode === 'email_copy' && !regenerateSection) {
  // Use V2 prompt builder
  const { systemPrompt: v2SystemPrompt, userPromptTemplate } = buildStandardEmailPromptV2({
    brandInfo,
    ragContext,
    contextInfo,
    memoryContext: memoryPrompt,
    websiteUrl: brandContext?.website_url
  });
  
  // Extract user's message (the copy brief)
  const lastUserMessage = messages.filter((m: Message) => m.role === 'user').pop();
  const copyBrief = lastUserMessage?.content || '';
  
  // Fill in the COPY_BRIEF placeholder
  const filledUserPrompt = userPromptTemplate.replace('{{COPY_BRIEF}}', copyBrief);
  
  // Replace the last user message with filled prompt
  processedMessages = messages.map((msg: Message, idx: number) => {
    if (idx === messages.length - 1 && msg.role === 'user') {
      return { ...msg, content: filledUserPrompt };
    }
    return msg;
  });
}
```

### 2. How It Works Now

#### Step 1: User sends message
```
User types: "Create a Black Friday sale email for our jewelry brand"
```

#### Step 2: System detects mode
```typescript
emailType === 'design' && conversationMode === 'email_copy'
// → Use V2 prompt system
```

#### Step 3: Build prompts with context
```typescript
buildStandardEmailPromptV2({
  brandInfo: "Brand Name: Melissa Lovy\nCopywriting Style Guide: Minimal, confident...",
  ragContext: "...",
  contextInfo: "...",
  memoryContext: "...",
  websiteUrl: "https://melissalovy.com"
})

// Returns:
{
  systemPrompt: "You are a senior email copywriter...",
  userPromptTemplate: "<task>Create email...</task>...{{COPY_BRIEF}}...{{BRAND_VOICE_GUIDELINES}}..."
}
```

#### Step 4: Extract placeholder values
```typescript
// COPY_BRIEF = user's actual message
copyBrief = "Create a Black Friday sale email for our jewelry brand"

// BRAND_VOICE_GUIDELINES = extracted from brandInfo
brandVoiceGuidelines = "Minimal, confident, feminine warmth..."

// ADDITIONAL_CONTEXT = combined brand details, RAG, etc.
additionalContext = `
<brand_details>
Brand Name: Melissa Lovy
...
</brand_details>
<rag_context>
...previous campaign data...
</rag_context>
`
```

#### Step 5: Fill in placeholders
```typescript
const filledUserPrompt = userPromptTemplate
  .replace('{{COPY_BRIEF}}', copyBrief)
  // BRAND_VOICE_GUIDELINES and ADDITIONAL_CONTEXT already filled by buildStandardEmailPromptV2
```

#### Step 6: Send to Claude API
```typescript
{
  system: "You are a senior email copywriter...", // Clean system prompt
  messages: [
    {
      role: 'user',
      content: `<task>Create email...</task>
      
      <copy_brief>
      Create a Black Friday sale email for our jewelry brand
      </copy_brief>
      
      <brand_voice_guidelines>
      Minimal, confident, feminine warmth...
      </brand_voice_guidelines>
      
      <additional_context>
      <brand_details>...</brand_details>
      <rag_context>...</rag_context>
      </additional_context>`
    }
  ]
}
```

---

## What Gets Passed Now

### ✅ COPY_BRIEF
**Source**: User's actual message from chat input  
**Example**: `"Create a Black Friday sale email with 30% off discount code BF30"`  
**Location**: Wrapped in `<copy_brief>` tags in user prompt

### ✅ BRAND_VOICE_GUIDELINES
**Source**: Extracted from `brandContext.copywriting_style_guide`  
**Example**: 
```
Minimal, confident, feminine warmth.
Short sentences. No flowery language.
Benefit-driven, not feature-focused.
```
**Location**: Wrapped in `<brand_voice_guidelines>` tags in user prompt

### ✅ ADDITIONAL_CONTEXT
**Source**: Combined from multiple sources:
- **Brand Details**: Name, details, guidelines from `brandContext`
- **RAG Context**: Relevant documents from vector store
- **Conversation Context**: Campaign type, audience, tone preferences
- **Memory Context**: Saved facts and preferences from conversation history

**Example**:
```xml
<brand_details>
Brand Name: Melissa Lovy
Brand Details: Costume jewelry brand specializing in...
Brand Guidelines: Target audience 30-35+ women...
</brand_details>

<rag_context>
Previous campaign: Black Friday 2023 had 40% off...
Best-selling products: Diamond-look studs, hoops...
</rag_context>

<conversation_context>
Campaign Type: Promotional
Target Audience: Existing subscribers
</conversation_context>

<memory_context>
User prefers: Direct headlines, minimal urgency language
Brand never uses: Excessive exclamation points
</memory_context>
```
**Location**: Wrapped in `<additional_context>` tags in user prompt

---

## Routing Logic

The system intelligently routes to the correct prompt builder:

```typescript
if (isFlowMode && flowType) {
  // Flow mode → buildFlowOutlinePrompt()
  
} else if (emailType === 'design' && conversationMode === 'email_copy' && !regenerateSection) {
  // Standard design email → buildStandardEmailPromptV2() ✅ NEW
  
} else {
  // Everything else → buildSystemPrompt() (old function)
  // - Letter emails
  // - Planning mode
  // - Section regeneration
}
```

---

## Console Output (for Debugging)

When the new system is used, you'll see:

```
[Chat API] Using new V2 prompt system for standard design email
[Chat API] Filling COPY_BRIEF with user message: Create a Black Friday sale email with 30% off...
[Chat API] Processed messages with filled user prompt
```

---

## Benefits

### 1. **Proper Context Delivery**
- Claude now receives ALL brand information correctly formatted
- Copywriting style guide gets highlighted priority in `<brand_voice_guidelines>`
- Additional context provides comprehensive background

### 2. **Clear Separation of Concerns**
- System prompt: Role and capabilities
- User prompt: Specific task with all inputs
- No mixed instructions

### 3. **Better Brand Voice Authenticity**
- Style guide is explicitly labeled and prioritized
- Claude can focus on brand voice as #1 priority
- All relevant context is properly structured

### 4. **Scalable Architecture**
- Easy to add more placeholder variables
- Clear where each input comes from
- Maintainable and debuggable

---

## Verification Checklist

To verify the system is working correctly:

### ✅ Console Logs
Look for:
```
[Chat API] Using new V2 prompt system for standard design email
[Chat API] Filling COPY_BRIEF with user message: ...
[Chat API] Processed messages with filled user prompt
```

### ✅ Brand Voice Quality
- Does the output sound distinctly like the brand?
- Are specific vocabulary and tone patterns present?
- Is the voice consistent throughout?

### ✅ Context Usage
- Does Claude reference specific brand details?
- Are RAG documents being utilized?
- Does it remember conversation preferences?

### ✅ Complete Inputs
- Check that copywriting style guide is being used
- Verify brand details are present
- Confirm memory context is included

---

## Testing Recommendations

### Test 1: Simple Brief
```
User: "Create a welcome email for new subscribers"
```

**Expected**:
- Console shows V2 system in use
- Output reflects brand voice from style guide
- Brand details and context are incorporated

### Test 2: Complex Brief
```
User: "Black Friday campaign email:
- 30% off everything
- Code: BF30
- Ends Sunday
- Focus on diamond-look studs and hoops"
```

**Expected**:
- All details from brief are used
- Brand voice is maintained
- Product names match brand's actual products
- RAG context helps with product details

### Test 3: Multi-turn Conversation
```
Turn 1: "Create a product launch email"
Turn 2: "Make it more urgent"
Turn 3: "Add social proof"
```

**Expected**:
- Each turn uses V2 system
- Conversation context builds up
- Memory preserves preferences
- Brand voice stays consistent

---

## Backward Compatibility

The system maintains full backward compatibility:

### ✅ Letter Emails
Still use old `buildSystemPrompt()` → works as before

### ✅ Planning Mode
Still use old `buildSystemPrompt()` → works as before

### ✅ Section Regeneration
Still use old `buildSystemPrompt()` → works as before

### ✅ Flow Mode
Still use `buildFlowOutlinePrompt()` → works as before

**Only standard design emails** use the new V2 system.

---

## Files Modified

1. ✅ `app/api/chat/route.ts` - Added V2 routing logic
   - Import `buildStandardEmailPromptV2`, `buildBrandInfo`, `buildContextInfo`
   - Added detection for standard design email mode
   - Extract user message and fill COPY_BRIEF
   - Process messages with filled prompt
   - Update fallback to use processed messages

2. ✅ `lib/chat-prompts.ts` - Already had `buildStandardEmailPromptV2()` from previous work

3. ✅ `lib/prompts/standard-email.prompt.ts` - Already had new prompt structure from previous work

**No linting errors** - all type annotations added ✅

---

## Next Steps

### 1. Test in Development
- Create a test brand with copywriting style guide
- Send various briefs
- Monitor console logs
- Verify output quality

### 2. Monitor Production (when deployed)
- Track which prompts are using V2 system
- Compare email quality metrics
- Gather user feedback

### 3. Iterate as Needed
- Adjust placeholder extraction logic if needed
- Fine-tune context building
- Add more placeholder variables if required

---

## Troubleshooting

### Issue: V2 system not being used
**Check**:
- Is `emailType === 'design'`?
- Is `conversationMode === 'email_copy'`?
- Is `regenerateSection` false/undefined?

### Issue: COPY_BRIEF is empty
**Check**:
- Are there user messages in the conversation?
- Is the last message from the user?
- Check console for extracted copyBrief value

### Issue: BRAND_VOICE_GUIDELINES missing
**Check**:
- Does brand have `copywriting_style_guide` field?
- Is it non-empty?
- Check the extraction logic in `buildStandardEmailPromptV2()`

### Issue: ADDITIONAL_CONTEXT incomplete
**Check**:
- Is brandContext being passed correctly?
- Is RAG search completing successfully?
- Are memory contexts loading?

---

## Summary

✅ **Problem**: Placeholders not being filled  
✅ **Solution**: Integrated V2 prompt builder into chat API  
✅ **Result**: All inputs now properly passed to Claude

The Standard Email Prompt system now correctly receives:
- User's copy brief
- Brand voice guidelines from copywriting style guide
- Complete additional context (brand details, RAG, memory, etc.)

**The system is fully functional and ready for testing!** 🎉

