# Email Strategy Feature - Complete Guide

## Overview
The Email Strategy feature separates the AI's strategic planning from the actual email copy, giving users clean, deliverable email content while maintaining visibility into the AI's thinking process.

---

## 🎯 How It Works

### **AI Response Structure**

When the AI generates an email, it now creates **three distinct parts**:

1. **Email Strategy** (collapsible indigo section)
   - Strategic analysis and planning
   - 10-point analysis framework
   - Hidden in collapsible toggle by default

2. **Thought Process** (collapsible gray section)
   - AI's reasoning and tool usage
   - Web search results
   - Internal thinking

3. **Email Copy** (main visible content)
   - Clean, formatted email
   - Ready to copy and use
   - No meta-commentary

---

## 📝 What Goes in Email Strategy

The strategy section contains the AI's complete strategic analysis:

1. **Context Analysis** - Relevant info from RAG/memory
2. **Brief Analysis** - Objectives, audience, requirements
3. **Brand Analysis** - Voice, tone, personality guidelines
4. **Audience Psychology** - Motivations, pain points, objections
5. **Product Listing** - Specific products to showcase
6. **Hero Strategy** - Approach for opening section
7. **Structure Planning** - Section layout and justification
8. **CTA Strategy** - Planned call-to-action phrases
9. **Objection Handling** - How to address customer concerns
10. **Product Integration** - Product showcase strategy

---

## 🎨 Visual Appearance

```
┌──────────────────────────────────────────┐
│ AI Response                              │
├──────────────────────────────────────────┤
│                                          │
│ ┌────────────────────────────────────┐  │
│ │ 📄 Email Strategy              ▶  │  │ ← Indigo collapsible
│ └────────────────────────────────────┘  │
│                                          │
│ ┌────────────────────────────────────┐  │
│ │ 💭 Thought Process             ▶  │  │ ← Gray collapsible
│ └────────────────────────────────────┘  │
│                                          │
│ HERO SECTION:                           │
│ Headline: Your Amazing Headline         │
│ CTA: Get Started Now                    │
│                                          │
│ ---                                      │
│                                          │
│ SECTION 2: Main Benefit                 │
│ Headline: Transform Your Business       │
│ Content: Simple, clear copy...          │
│                                          │
└──────────────────────────────────────────┘
```

---

## 🔧 Technical Implementation

### **1. Prompt Update**

Updated `lib/prompts/standard-email.prompt.ts` to instruct AI:

```
Your response should follow this EXACT format:

[STRATEGY:START]
**Context Analysis**: [Your analysis here]
**Brief Analysis**: [Your analysis here]
... [Complete all 10 analysis points]
[STRATEGY:END]

HERO SECTION:
Headline: [Your headline]
...
```

### **2. Stream Parsing**

In `app/brands/[brandId]/chat/page.tsx`:

```typescript
// Detect strategy markers in stream
if (chunk.includes('[STRATEGY:START]')) {
  isInStrategyBlock = true;
  // Extract content after marker
}

if (chunk.includes('[STRATEGY:END]')) {
  isInStrategyBlock = false;
  // Finalize strategy content
}

// Accumulate strategy while in block
if (isInStrategyBlock) {
  strategyContent += chunk;
  // Update UI in real-time
}
```

### **3. Database Storage**

Messages table now has `strategy` column:

```sql
ALTER TABLE messages ADD COLUMN strategy TEXT;
```

### **4. UI Component**

`components/EmailStrategy.tsx` - Collapsible toggle similar to ThoughtProcess:
- Indigo color scheme (vs gray for thought process)
- Document icon (📄)
- "Email Strategy" label
- Collapsed by default
- Click to expand/collapse

---

## 📍 Where to See It

### **In the Chat UI:**

1. Send a message to generate an email
2. Wait for AI to respond
3. Look for the **indigo "Email Strategy"** section above the email
4. Click the toggle to expand and see the strategic analysis
5. The actual email copy below will be clean and ready to use

### **Order of Sections:**

```
1. Activity Indicator (if streaming)
2. Email Strategy (indigo toggle) ← Strategy analysis
3. Thought Process (gray toggle) ← AI reasoning/tools
4. Email Copy (main content) ← Clean deliverable
5. Product Links (if any)
6. Action Toolbar (copy, regenerate, reactions)
```

---

## 🧪 Testing the Feature

### **To See Email Strategy:**

1. **Refresh your app** (Cmd/Ctrl + Shift + R)
2. **Create a new conversation**
3. **Send a prompt** like: "Write a promotional email for our summer sale"
4. **Watch the response**:
   - Strategy section appears first (as AI plans)
   - Then email copy streams below
5. **Click** the "Email Strategy ▶" toggle to see the analysis

### **What You'll See:**

When expanded, the strategy section shows:
```
**Context Analysis**: Based on the brand guidelines...
**Brief Analysis**: The objective is to promote a summer sale...
**Brand Analysis**: The brand voice is friendly and approachable...
**Audience Psychology**: Target customers are value-conscious...
[... continues for all 10 analysis points]
```

---

## ⚙️ Configuration

### **When Strategy Appears:**

- ✅ Design emails (default behavior)
- ✅ Letter emails (can be added if needed)
- ❌ Planning mode (uses thinking only, no email structure)
- ❌ Flow mode (different format)

### **Customization:**

The strategy analysis can be toggled on/off by users:
- Collapsed by default
- Persists state during session
- Independent of Thought Process toggle

---

## 🎯 User Benefits

### **Clean Output:**
- Main email copy is clean and professional
- No "I need to..." or "Let me analyze..." text
- Copy-paste ready immediately

### **Transparency:**
- Users can see the strategic thinking if they want
- Understand why certain decisions were made
- Learn from the AI's approach

### **Education:**
- Strategy section teaches email marketing
- Shows proper analysis framework
- Helps users understand best practices

### **Quality Control:**
- Verify AI understood the requirements
- Check that brand voice was applied correctly
- Ensure all brief points were addressed

---

## 🔍 Troubleshooting

### **"I don't see the Email Strategy toggle"**

Check:
1. Is this a new message? (Old messages don't have strategy)
2. Did you refresh the app after the migration?
3. Is this an email in Write mode? (Planning mode won't show it)
4. Did the AI actually generate strategy content? (Check console logs)

### **"Strategy content is showing in email copy"**

This means:
- The AI didn't use `[STRATEGY:START]` and `[STRATEGY:END]` markers
- Or the parsing logic missed them
- Check console logs for `[Stream]` messages

### **"Strategy toggle is empty"**

Possible causes:
- AI didn't generate strategy content
- Stream parsing failed
- Check if `message.strategy` has content in dev tools

---

## 📊 Performance Notes

- Strategy content streams in real-time (updates as AI writes)
- Collapsed by default (no performance impact)
- Only parsed when AI uses the markers
- Negligible database storage overhead

---

## 🚀 Future Enhancements

Potential improvements:
- Export strategy as PDF
- Compare strategies across emails
- Strategy templates/suggestions
- Analytics on strategy effectiveness

---

**Implementation Date**: November 6, 2025  
**Status**: ✅ Complete  
**Migration**: ✅ Applied via MCP  
**Ready to Use**: Yes!


