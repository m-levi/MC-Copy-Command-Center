# Standard Email Prompt - Quick Start Guide

**Updated**: November 10, 2025

---

## What Changed?

The Standard Design Email prompt has been **completely rebuilt** with a new API-first architecture.

### TL;DR
- ✅ New separate system & user prompts
- ✅ 10x thinking budget (2,000 → 10,000 tokens)
- ✅ 5x max output (4,096 → 20,000 tokens)
- ✅ Temperature: 1 (more creative)
- ✅ Latest Claude model
- ✅ No `<email_copy>` tags needed
- ✅ Backward compatible

---

## For Developers

### Quick Integration

```typescript
// Import the new function
import { buildStandardEmailPromptV2 } from '@/lib/chat-prompts';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  defaultHeaders: {
    'anthropic-beta': 'web-search-2025-03-05'
  }
});

// Build prompts
const context = {
  brandInfo: buildBrandInfo(brandContext),
  ragContext: '', // Optional - can add back later
  contextInfo: buildContextInfo(conversationContext),
  memoryContext: memoryPrompt,
  websiteUrl: brandContext?.website_url
};

const { systemPrompt, userPromptTemplate } = buildStandardEmailPromptV2(context);

// Fill in COPY_BRIEF
const userPrompt = userPromptTemplate.replace('{{COPY_BRIEF}}', userMessage);

// Make API call
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 20000,
  temperature: 1,
  system: systemPrompt,
  messages: [{ role: 'user', content: userPrompt }],
  thinking: {
    type: 'enabled',
    budget_tokens: 10000
  },
  tools: [{
    type: 'web_search_20250305',
    name: 'web_search',
    max_uses: 5
  }],
  stream: true
});
```

### API Settings Reference

| Parameter | Old Value | New Value | Why Changed |
|-----------|-----------|-----------|-------------|
| `model` | `claude-sonnet-4-20250514` | `claude-sonnet-4-5-20250929` | Latest model version |
| `max_tokens` | `4096` | `20000` | Allow comprehensive emails |
| `temperature` | _(not set)_ | `1` | More creative output |
| `thinking.budget_tokens` | `2000` | `10000` | Deeper strategic analysis |

---

## For Prompt Engineers

### Prompt Structure

#### System Prompt
Defines the AI's role and core capabilities:
- Senior email copywriter identity
- Core responsibilities (brand authenticity #1 priority)
- Tool usage philosophy
- Quality standards
- Output requirements

#### User Prompt Template
Contains the task with placeholders:
- `{{COPY_BRIEF}}` - Actual email brief from user
- `{{BRAND_VOICE_GUIDELINES}}` - Copywriting style guide
- `{{ADDITIONAL_CONTEXT}}` - Brand details + RAG + memory

### Key Sections in User Prompt

1. **Critical Requirements** - Thinking tag mandate
2. **Length Enforcement** - Word count rules
3. **Workflow** - Strategic analysis steps
4. **F-Pattern Optimization** - Scannability rules
5. **Content Format Variety** - 11 different formats
6. **Output Structure** - Required email sections
7. **Examples** - 4 detailed examples
8. **Conversion Psychology** - Persuasion principles
9. **Inputs** - Placeholder variables
10. **Final Checklist** - Quality verification

---

## For Testers

### Test Cases

#### Test 1: Simple Promotional Email
```
Brief: Black Friday sale, 30% off everything
Brand Voice: Minimal, confident, feminine
Expected: Clean structure, varied formats, clear CTAs
```

#### Test 2: Product Launch
```
Brief: New eco-friendly water bottle launch
Include: Specs, benefits, pricing, pre-order discount
Expected: Multiple sections, product details, urgency
```

#### Test 3: Web Search Utilization
```
Brief: Email about our latest tech product
(Don't provide product details - let AI search)
Expected: Accurate info from web search, cited sources
```

### What to Check

✅ **Output Format**:
- No `<email_copy>` tags (direct output)
- Starts with "HERO SECTION:" or "**HERO SECTION:**"
- Clear section structure
- Markdown formatting

✅ **Content Quality**:
- Brand voice authenticity
- 3-5 different content formats used
- Paragraphs under 30 words
- Headlines 6-8 words max

✅ **Thinking Content**:
- Strategic analysis in thinking blocks
- No strategic commentary in main output
- Evidence of deep analysis (10k token budget)

✅ **Web Search** (if applicable):
- Used appropriately
- Real product details
- Competitor insights

---

## For Product Managers

### Why This Change?

**Problem**: Old prompt was monolithic, had limited thinking capacity, and mixed system/user instructions.

**Solution**: New API-first architecture with:
- Clearer separation of concerns
- 10x more strategic thinking capacity
- 5x more output capacity
- Better brand voice authenticity

### Business Impact

1. **Higher Quality Emails**
   - Deeper strategic analysis
   - More authentic brand voice
   - Better conversion psychology

2. **More Comprehensive Campaigns**
   - Can generate much longer emails
   - Support for complex multi-section layouts
   - 11 different content format options

3. **More Creative Output**
   - Temperature: 1 encourages variety
   - Less repetitive patterns
   - More human-like writing

4. **Future-Proof Architecture**
   - Latest Claude model
   - Better scalability
   - Easier to maintain and update

---

## Common Questions

### Q: Will old emails break?
**A**: No. The system is backward compatible. Parsing handles both old format (with tags) and new format (without tags).

### Q: Do I need to change existing code?
**A**: No. Old `buildStandardEmailPrompt()` still works. New `buildStandardEmailPromptV2()` is available for new implementations.

### Q: What happened to RAG?
**A**: Temporarily disabled as requested. Can easily re-enable by uncommenting RAG context in `ADDITIONAL_CONTEXT` builder.

### Q: Why no `<email_copy>` tags?
**A**: New prompt relies on thinking tags for strategic analysis. Email copy is output directly, making parsing simpler and more reliable.

### Q: What about the 30-word paragraph limit?
**A**: Still enforced! Prompt explicitly instructs AI to count words in real-time and cut to 30 words max for paragraphs.

### Q: Can I use different models?
**A**: The prompt is optimized for Claude Sonnet 4.5 (20250929). Other Claude models should work, but settings may need adjustment.

---

## Troubleshooting

### Issue: Output too short
**Check**: 
- max_tokens set to 20000? ✓
- Brief provides enough detail? ✓

### Issue: No strategic thinking visible
**Check**:
- Thinking blocks being captured? ✓
- thinking.budget_tokens set to 10000? ✓

### Issue: Wrong format/structure
**Check**:
- Using `STANDARD_EMAIL_SYSTEM_PROMPT` as system? ✓
- User prompt placeholders filled correctly? ✓
- Temperature set to 1? ✓

### Issue: Parser not working
**Check**:
- Output contains "HERO SECTION:" marker? ✓
- parseStreamedContent function updated? ✓
- Email markers list includes expected values? ✓

---

## Next Steps

1. **Test in Development**
   - Try simple promotional email
   - Verify output format
   - Check thinking content

2. **Monitor Performance**
   - Compare old vs new email quality
   - Measure thinking token usage
   - Track output length

3. **Iterate as Needed**
   - Adjust prompt based on results
   - Fine-tune API settings
   - Add RAG back when ready

---

## Resources

- **Full Technical Docs**: `STANDARD_EMAIL_PROMPT_REBUILD.md`
- **Prompt File**: `lib/prompts/standard-email.prompt.ts`
- **Prompt Builder**: `lib/chat-prompts.ts`
- **API Handler**: `lib/unified-stream-handler.ts`
- **Parser**: `app/brands/[brandId]/chat/page.tsx`

---

## Need Help?

**Common Issues**:
- Prompt not working? Check system vs user prompt separation
- Output too short? Verify max_tokens: 20000
- No thinking? Verify budget_tokens: 10000
- Wrong format? Check temperature: 1

**Still Stuck?**:
- Review sample output in `STANDARD_EMAIL_PROMPT_REBUILD.md`
- Check console logs for parsing status
- Verify API settings in unified-stream-handler.ts

