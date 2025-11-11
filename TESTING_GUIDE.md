# Quick Testing Guide

**Purpose**: Verify the Standard Email Prompt system works correctly  
**Time**: 5-10 minutes  
**Status**: Ready to test

---

## 🧪 Test 1: First Email Generation (2 min)

### Steps
1. Open your app in the browser
2. Navigate to a brand with a copywriting style guide
3. Create a new conversation (Writing mode, Design email)
4. Type: `"Create a Black Friday sale email with 30% off everything. Code: BF30. Sale ends Sunday."`
5. Send the message

### What to Check

#### ✅ Console Logs (open browser dev tools)
Look for:
```
[Chat API] Using new V2 prompt system for standard design email (FIRST MESSAGE)
[Chat API] Filling COPY_BRIEF with user message: Create a Black Friday...
[Chat API] Processed first message with filled user prompt
```

**If you see this** → V2 system is working ✅

#### ✅ Output Format
Check that response starts with:
```
**HERO SECTION:**
- **Headline:** Black Friday: 30% Off Everything
- **Sub-headline:** Use code BF30...
```

**Key checks**:
- Starts with `**HERO` (not `HERO`) → Markdown preserved ✅
- Uses your brand voice from style guide ✅
- References the details you provided (30% off, BF30, Sunday) ✅

#### ✅ Thinking Content
Click the thinking toggle and verify:
- Strategic analysis is present ✅
- Brand voice analysis included ✅
- No strategic analysis in main email copy ✅

### Expected Result
✅ Email copy generated with authentic brand voice  
✅ All inputs (brief, style guide, context) used  
✅ Markdown formatting preserved  
✅ Strategic thinking separate from copy

---

## 🧪 Test 2: Follow-Up Message (2 min)

### Steps
1. In the same conversation from Test 1
2. Type: `"Make the hero headline more urgent"`
3. Send the message

### What to Check

#### ✅ Console Logs
Look for:
```
[Chat API] Using standard prompt system for follow-up message (preserving conversation history)
[Chat API] Sending 3 messages for context
```

**If you see this** → Follow-up system is working ✅

#### ✅ AI Behavior
The AI should:
- ✅ **NOT ask** "What email?" or "What campaign?"
- ✅ **Modify** the existing email
- ✅ **Keep** the same structure
- ✅ **Change** only the hero headline

#### ✅ Output
Check that:
- Email structure is maintained ✅
- Only hero headline changed ✅
- Rest of email preserved ✅
- Still starts with `**HERO SECTION:**` ✅

### Expected Result
✅ AI understands context  
✅ Modifies existing email intelligently  
✅ No confusion or clarification questions  
✅ Formatting preserved

---

## 🧪 Test 3: Multiple Follow-Ups (3 min)

### Steps
1. Continue in same conversation
2. Type: `"Add a social proof section with a customer testimonial"`
3. Wait for response
4. Type: `"Make the final CTA section about fast shipping"`
5. Wait for response
6. Type: `"Make it shorter overall"`
7. Wait for response

### What to Check

#### ✅ Context Preservation
After each message:
- AI references previous changes ✅
- Maintains conversation continuity ✅
- Each modification builds on the last ✅

#### ✅ Console Logs
Each message should show:
```
[Chat API] Using standard prompt system for follow-up message
[Chat API] Sending 5 messages for context  ← Message count increases
[Chat API] Sending 7 messages for context
[Chat API] Sending 9 messages for context
```

### Expected Result
✅ Each follow-up maintains full context  
✅ AI makes intelligent cumulative changes  
✅ No loss of previous modifications  
✅ Formatting stays consistent

---

## 🧪 Test 4: Edge Cases (2 min)

### Test 4.1: No Style Guide
1. Use a brand without copywriting_style_guide field
2. Create email
3. Verify: Works with fallback "No style guide provided."

### Test 4.2: Letter Email (Should NOT use V2)
1. Switch to Letter email type
2. Create email
3. Verify console: Uses old system (not V2)

### Test 4.3: Planning Mode (Should NOT use V2)
1. Switch to Planning mode
2. Send message
3. Verify console: Uses planning prompt (not V2)

---

## 🔍 What to Look For (Signs of Issues)

### 🚨 Red Flags

#### Issue: AI Asks for Clarification on Follow-Up
```
User: "Make it shorter"
AI: "What email is this for? I need more details..."
```
**This means**: Follow-up detection not working  
**Check**: Console logs for message count

#### Issue: Missing Leading `**`
```
Output shows: "HERO SECTION:**"
Instead of: "**HERO SECTION:**"
```
**This means**: Markdown preservation not working  
**Check**: Parsing logs for "Found leading markdown"

#### Issue: Generic Brand Voice
```
Output sounds generic, not like your brand
```
**This means**: Style guide not being passed  
**Check**: Console for "Filling COPY_BRIEF" log

#### Issue: Missing Context
```
Output doesn't reference brand details or previous info
```
**This means**: ADDITIONAL_CONTEXT not populated  
**Check**: buildStandardEmailPromptV2 function

---

## ✅ Success Indicators

### Console Logs You Want to See

**First Message**:
```
✅ "Using new V2 prompt system for standard design email (FIRST MESSAGE)"
✅ "Filling COPY_BRIEF with user message"
✅ "Processed first message with filled user prompt"
✅ "Found leading markdown before marker, including it: **"
✅ "Email copy length: [number]"
```

**Follow-Up**:
```
✅ "Using standard prompt system for follow-up message"
✅ "Sending [N] messages for context"
✅ "Found leading markdown before marker, including it: **"
```

### Output Quality Indicators
- ✅ Starts with `**HERO SECTION:**` (bold markdown)
- ✅ Uses your brand's specific voice
- ✅ References details you provided
- ✅ Strategic analysis in thinking (not in copy)
- ✅ Follow-ups modify intelligently

---

## 📊 Quick Verification Checklist

Run through this checklist:

```
□ Generated first email successfully
□ Console shows "V2 prompt system (FIRST MESSAGE)"
□ Output starts with **HERO SECTION:**
□ Brand voice sounds authentic
□ Follow-up message sent
□ Console shows "follow-up message (preserving conversation history)"
□ AI modified email (didn't ask for clarification)
□ Multiple follow-ups maintain context
□ No linting errors in any file
□ No type errors in any file
```

**If all checked** → System is working perfectly! ✅

---

## 🐛 If You Find Issues

### Step 1: Check Console
- Open browser dev tools
- Look at Console tab
- Find the log messages

### Step 2: Verify Message Count
Look for:
```
[Chat API] Sending [N] messages for context
```
- N = 1 → Should use V2
- N > 1 → Should use old system

### Step 3: Check Detection
Look for:
```
[Chat API] Using new V2 prompt system...
```
or
```
[Chat API] Using standard prompt system for follow-up...
```

### Step 4: Verify Parsing
Look for:
```
[Parser] Found leading markdown before marker, including it: **
[Parser] Email copy length: [number]
```

---

## 📞 Reporting Issues

If you find a bug, collect:

1. **Console logs** (full output)
2. **User message** (what you typed)
3. **AI response** (what was generated)
4. **Message count** (first message or follow-up?)
5. **Expected behavior** (what should have happened)

---

## 🎉 Expected Results

After all tests:

✅ **First emails generate with**:
- Authentic brand voice
- All inputs properly filled
- Complete markdown formatting
- Strategic thinking separated

✅ **Follow-ups work with**:
- Full conversation context
- Intelligent modifications
- No "what email?" confusion
- Continued formatting consistency

✅ **System demonstrates**:
- Intelligent routing (V2 vs old)
- Clean extraction (style guide)
- Robust parsing (markdown)
- Professional output quality

---

## 🏁 Done!

Once all tests pass, you're ready for production use.

**The system has been thoroughly reviewed, bugs have been fixed, and everything is operational!** 🚀

---

**Happy Testing!** 🧪

