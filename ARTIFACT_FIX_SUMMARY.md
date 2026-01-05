# Artifact System - Comprehensive Fix Summary

## Problem Statement

Artifacts were not being created when AI generated email content. The console showed `Error creating artifact: {}` with no useful information, and even when no errors appeared, artifacts weren't being detected or created.

---

## Root Causes Identified

### **1. Content Detection Was Too Narrow**

**File:** `contexts/ArtifactContext.tsx` - `hasArtifactContent()`

The detection function only checked for specific patterns:
```typescript
// OLD - Only matched these exact patterns:
/\*\*(HERO|SUBJECT|TEXT|CTA|BUTTON)\*\*/i
```

**What AI actually outputs (3 different formats):**

| Format | Used By | Example |
|--------|---------|---------|
| Design Email V2 | First message in email_copy mode | `<version_a>`...`**HERO**`...`</version_a>` |
| Standard Email | Subsequent messages | `**HERO SECTION:**\n- **Headline:**...` |
| Letter Email | Letter email type | `SUBJECT LINE:\n...\nHi there,` |

**The patterns didn't match:**
- `**HERO SECTION:**` (has "SECTION:" before closing `**`)
- `<version_a>` tags (completely missed)
- `SUBJECT LINE:` (letter format has no bold blocks)

### **2. No Retry Mechanism**

**File:** `app/brands/[brandId]/chat/page.tsx` - `ArtifactMessageProcessor`

When artifact creation failed (e.g., due to race conditions with conversation creation), the message was marked as "processed" and never retried:

```typescript
// OLD - Always marked as processed
globalProcessedMessageIds.add(latestAIMessage.id);
artifactContext.processAIResponse(...)
```

### **3. Poor Error Logging**

Supabase error objects don't serialize well:
```typescript
// OLD - Unhelpful output
console.error('Error creating artifact:', err);
// Output: "Error creating artifact: {}"
```

### **4. Content Extraction Issues**

**File:** `hooks/useEmailArtifacts.ts` - `createArtifactFromMessage()`

- Didn't extract content from code blocks (AI wraps output in triple backticks)
- Didn't skip preamble text ("Here's your email:")
- Didn't handle the different output formats

---

## Solutions Implemented

### **1. Comprehensive Content Detection**

**File:** `contexts/ArtifactContext.tsx`

New `hasArtifactContent()` detects ALL email formats:

```typescript
// Now detects:
// 1. Version tags: <version_a>, <version_b>, <version_c>
// 2. Email copy wrapper: <email_copy>
// 3. Block markers: **HERO**, **TEXT**, **PRODUCT CARD**, etc.
// 4. Section format: **HERO SECTION:**
// 5. Letter format: SUBJECT LINE:
// 6. Field labels: **Headline:**
// 7. Version headings: ## Version A, **Version A**
// 8. Content inside code blocks
```

Each detection logs what it found for debugging:
```
[hasArtifactContent] Detected: version_a/b/c tags
[hasArtifactContent] Detected: **BLOCK** marker
[hasArtifactContent] Detected: SUBJECT LINE (letter format)
```

### **2. Automatic Retry on Failure**

**File:** `app/brands/[brandId]/chat/page.tsx`

Messages are only marked as processed when artifact creation succeeds:

```typescript
artifactContext.processAIResponse(latestAIMessage.id, latestAIMessage.content, isEdit)
  .then((artifact) => {
    if (artifact !== null) {
      globalProcessedMessageIds.add(latestAIMessage.id);
    } else {
      console.log('[ArtifactProcessor] Will retry on next render');
    }
  })
  .catch((error) => {
    // Don't mark as processed - allow retry
  });
```

### **3. Detailed Error Logging**

**File:** `hooks/useEmailArtifacts.ts`

All errors now extract specific Supabase properties:

```typescript
console.error('Artifact creation error:', {
  message: artifactError.message,
  code: artifactError.code,
  details: artifactError.details,
  hint: artifactError.hint,
  conversationId,
});
```

Special handling for foreign key violations (temp conversation IDs):
```typescript
if (artifactError.code === '23503') {
  console.warn('Conversation not in database yet');
  return null; // Will retry
}
```

### **4. Robust Content Extraction**

**File:** `hooks/useEmailArtifacts.ts` - `createArtifactFromMessage()`

**Step-by-step extraction:**

```typescript
// Step 1: Try <email_copy> tags
// Step 2: Try code blocks containing email content
// Step 3: Remove remaining code block markers
// Step 4: Skip preamble text (find **HERO** or SUBJECT LINE:)
// Step 5: Parse for A/B/C versions
// Step 6: Create artifact with fallbacks
```

**Now handles:**
- Content wrapped in `<email_copy>` tags
- Content inside code blocks (triple backticks)
- Preamble text like "Here's your email:"
- All three email formats (Design V2, Standard, Letter)

---

## Mode System Analysis

The conversation modes determine which prompt is used:

| Mode | Email Type | Prompt Used | Output Format |
|------|-----------|-------------|---------------|
| `email_copy` | `design` (first msg) | Design Email V2 | `<version_a/b/c>` + `**HERO**` |
| `email_copy` | `design` (follow-up) | Standard Email | `**HERO SECTION:**` in code block |
| `email_copy` | `letter` | Letter Email | `SUBJECT LINE:` in code block |
| `planning` | any | Planning | No structured email output |
| `flow` | any | Flow prompts | Various |

**Key insight:** Artifact detection should work for all `email_copy` mode outputs, not just one format.

---

## Files Modified

### `contexts/ArtifactContext.tsx`
- Completely rewrote `hasArtifactContent()` to detect all email formats
- Added detailed logging for each detection type
- Added `conversationId` to dependency array for `processAIResponse`

### `hooks/useEmailArtifacts.ts`
- Enhanced `createArtifact()` with detailed error logging
- Added foreign key violation handling
- Improved `createArtifactFromMessage()` with multi-step content extraction
- Added logging throughout the creation flow
- All catch blocks now extract meaningful error info

### `app/brands/[brandId]/chat/page.tsx`
- Modified `ArtifactMessageProcessor` with retry mechanism
- Only marks messages as processed on successful artifact creation

---

## Testing Checklist

### Test 1: Design Email (First Message)
1. Create new conversation in `email_copy` mode with `design` type
2. Send: "Create a Black Friday sale email for 30% off"
3. **Expected:** Console shows `[hasArtifactContent] Detected: version_a/b/c tags`
4. **Expected:** Artifact sidebar opens with 3 versions (A, B, C)

### Test 2: Design Email (Follow-up)
1. In same conversation, send: "Make the CTA more urgent"
2. **Expected:** Console shows `[hasArtifactContent] Detected: **BLOCK** marker`
3. **Expected:** New version added to existing artifact

### Test 3: Letter Email
1. Create new conversation with `letter` type
2. Send: "Write a thank you email to new subscribers"
3. **Expected:** Console shows `[hasArtifactContent] Detected: SUBJECT LINE`
4. **Expected:** Artifact sidebar opens with letter email

### Test 4: Error Recovery
1. Quickly create conversation + send message (race condition)
2. **Expected:** Console shows retry message if first attempt fails
3. **Expected:** Artifact eventually created on retry

---

## Console Log Reference

**Success flow:**
```
[useEmailArtifacts] Creating artifact from message { messageId, conversationId, contentLength }
[useEmailArtifacts] Extracted from code block
[useEmailArtifacts] Skipped preamble, content starts at: **HERO SECTION:**
[useEmailArtifacts] Parsed versions: { hasVersionA: true, hasVersionB: false, hasVersionC: false }
[ArtifactContext] Artifact created successfully: abc-123-xyz
```

**Retry flow:**
```
[useEmailArtifacts] Creating artifact from message { messageId, conversationId, isTempId: true }
Artifact creation failed: conversation not found in database
[ArtifactProcessor] Artifact creation returned null, will retry on next render
```

**Error with details:**
```
Artifact creation error: {
  message: "new row violates row-level security policy",
  code: "42501",
  details: null,
  hint: "Check RLS policies on artifacts table"
}
```

---

## If Artifacts Still Don't Work

1. **Check browser console** for specific logs above
2. **Verify conversation is saved** before sending message
3. **Check database migration** - run `041_email_artifacts.sql`
4. **Verify RLS policies** exist on `artifacts` table
5. **Test with simpler prompt** to confirm AI outputs expected format
6. **Check conversation mode** - planning mode won't generate artifacts

---

## Summary

The artifact system had four interconnected issues:
1. Detection patterns were too narrow → Fixed with comprehensive regex
2. No retry mechanism → Fixed with conditional processing
3. Error logging was useless → Fixed with property extraction
4. Content extraction was fragile → Fixed with multi-step extraction

All three email formats (Design V2, Standard, Letter) are now properly detected and processed.
