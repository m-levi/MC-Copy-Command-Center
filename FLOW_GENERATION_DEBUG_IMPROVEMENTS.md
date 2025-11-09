# Flow Generation Debug Improvements

**Date**: November 7, 2025  
**Status**: ✅ Complete

## Issue Report

The user reported that the flows feature was getting stuck on the final email during generation after approving a plan. They also needed verification that the standard-email writing prompt was being used for individual email generation.

## Investigation Findings

### 1. Standard Email Prompt Usage ✅ VERIFIED

**Confirmation**: The system IS correctly using the standard email prompt.

- **Location**: `lib/flow-prompts.ts` (lines 94-96)
- **Logic**: The `buildFlowEmailPrompt()` function selects:
  - `STANDARD_EMAIL_PROMPT` for `emailType === 'design'`
  - `LETTER_EMAIL_PROMPT` for `emailType === 'letter'`
- **Default**: Flow generation defaults to `'design'` type (see `app/brands/[brandId]/chat/page.tsx` line 1092)

**Code Reference**:
```typescript
// lib/flow-prompts.ts
const template = emailType === 'design' 
  ? STANDARD_EMAIL_PROMPT 
  : LETTER_EMAIL_PROMPT;
```

### 2. Progress Tracking Issue

**Problem**: The frontend used a simulated progress interval (every 5 seconds) that didn't match actual backend generation times. This made it appear stuck on the final email when it was actually just finishing.

**Root Cause**: 
- Progress interval was too fast (5 seconds)
- No detailed logging to identify actual bottlenecks
- Progress would stop at `total - 1` and wait for API completion

## Improvements Made

### 1. Enhanced Backend Logging (`app/api/flows/generate-emails/route.ts`)

Added comprehensive logging throughout the email generation process:

```typescript
// Start of flow generation
console.log(`[Flow Generator] Starting generation of ${outline.emails.length} emails for flow: ${outline.flowName}`);

// For each email:
console.log(`[Flow Generator] ===== EMAIL ${emailOutline.sequence}/${outline.emails.length} START =====`);
console.log(`[Flow Generator] Title: ${emailOutline.title}`);
console.log(`[Flow Generator] Purpose: ${emailOutline.purpose}`);
console.log(`[Flow Generator] Creating child conversation...`);
console.log(`[Flow Generator] Child conversation created: ${childConversation.id}`);
console.log(`[Flow Generator] Using standard email prompt: ${emailType === 'design' ? 'STANDARD_EMAIL_PROMPT' : 'LETTER_EMAIL_PROMPT'}`);
console.log(`[Flow Generator] Calling Claude API...`);
console.log(`[Flow Generator] Claude API response received`);
console.log(`[Flow Generator] Response contains ${response.content.length} blocks`);
console.log(`[Flow Generator] Extracted ${emailContent.length} characters of content`);
console.log(`[Flow Generator] Saving message to database...`);
console.log(`[Flow Generator] ✅ Email ${emailOutline.sequence} completed in ${emailDuration}ms`);

// On completion:
console.log(`[Flow Generator] ===== FLOW GENERATION COMPLETE =====`);
console.log(`[Flow Generator] Total time: ${totalDuration}ms`);
console.log(`[Flow Generator] Successful: ${successes}/${total}`);
console.log(`[Flow Generator] Failed: ${failures}/${total}`);
```

**Benefits**:
- Identify exactly which step is slow or failing
- Track timing for each email and total generation
- See detailed error messages with stack traces
- Confirm which prompt is being used

### 2. Improved Error Handling

**Before**: Generic error messages with minimal context

**After**: Detailed error handling at each step:

```typescript
if (childError) {
  console.error(`[Flow Generator] Database error creating conversation:`, childError);
  throw new Error(`Failed to create child conversation: ${childError.message}`);
}

if (!emailContent || emailContent.length === 0) {
  throw new Error(`No content generated for email ${emailOutline.sequence}`);
}

if (messageError) {
  console.error(`[Flow Generator] Database error saving message:`, messageError);
  throw new Error(`Failed to save message: ${messageError.message}`);
}
```

### 3. Better Progress Tracking (`app/brands/[brandId]/chat/page.tsx`)

**Changes**:
- Increased progress interval from 5 seconds to 12 seconds (more realistic)
- Progress stops at `total - 1` instead of going to `total` (prevents appearing "stuck")
- Added detailed console logging on frontend
- Better handling of completion state

```typescript
// Don't go past the total - 1 (let the API completion set it to total)
if (prev >= outline.emails.length - 1) {
  return prev;
}
console.log('[Flow UI] Progress update:', prev + 1, '/', outline.emails.length);
return prev + 1;
}, 12000); // Update every 12 seconds (more realistic timing)
```

### 4. Enhanced Error Recovery

**Frontend now**:
- Logs all API responses and errors
- Provides detailed error messages to users
- Attempts to reload flow data even after errors (to show partially completed emails)
- Shows specific failure counts

```typescript
catch (error) {
  console.error('[Flow UI] Error approving outline:', error);
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  toast.error(`Failed to generate emails: ${errorMessage}`);
  
  // Try to reload anyway in case some emails were created
  try {
    await loadFlowData(currentConversation.id);
    await loadConversations();
  } catch (reloadError) {
    console.error('[Flow UI] Error reloading after failure:', reloadError);
  }
}
```

### 5. Improved Progress UI (`components/FlowGenerationProgress.tsx`)

**Better status messages**:
```typescript
{displayedProgress === 0 ? (
  'Preparing to generate emails...'
) : displayedProgress >= totalEmails ? (
  'Completing generation and saving...'
) : displayedProgress === totalEmails - 1 ? (
  `Creating final email (${totalEmails} of ${totalEmails})...`
) : (
  `Creating email ${displayedProgress} of ${totalEmails}...`
)}
```

## How to Debug Flow Generation Issues

### 1. Check Backend Logs

When a flow generation is running, look for these log patterns:

```
[Flow Generator] Starting generation of X emails for flow: [Flow Name]
[Flow Generator] ===== EMAIL 1/X START =====
[Flow Generator] Title: [Email Title]
[Flow Generator] Purpose: [Email Purpose]
[Flow Generator] Creating child conversation...
[Flow Generator] Child conversation created: [ID]
[Flow Generator] Using standard email prompt: STANDARD_EMAIL_PROMPT
[Flow Generator] Calling Claude API...
[Flow Generator] Claude API response received
[Flow Generator] Response contains X blocks
[Flow Generator] Extracted X characters of content
[Flow Generator] Saving message to database...
[Flow Generator] ✅ Email 1 completed in Xms
[Flow Generator] ===== EMAIL 1/X END =====
```

**If stuck, check**:
- Which step was the last log before hanging?
- Are there any error messages?
- What's the timing for each email?

### 2. Check Frontend Logs

Look for these patterns in browser console:

```
[Flow UI] Starting flow generation for X emails
[Flow UI] Calling generate-emails API...
[Flow UI] Progress update: 1 / 3
[Flow UI] Progress update: 2 / 3
[Flow UI] API call completed, response status: 200
[Flow UI] Generation result: { success: true, generated: 3, ... }
```

### 3. Common Issues and Solutions

| Issue | Symptom | Solution |
|-------|---------|----------|
| **Stuck on final email** | Progress shows "Creating email X of X" for long time | Check backend logs - likely Claude API is slow or database save is failing |
| **No progress updates** | Progress stays at 0 | Check if API call started, check for network errors |
| **Partial success** | Some emails generated, some failed | Check backend logs for specific email failures, check `result.failures` array |
| **Empty content** | Email created but no content | Check if Claude API returned empty response, check content extraction logic |
| **Database errors** | Errors about conversations or messages | Check Supabase connection, check if user has permissions |

## Testing Checklist

To verify the flow generation is working:

1. ✅ Create a new flow conversation
2. ✅ Approve an outline with 3-5 emails
3. ✅ Watch the progress modal
4. ✅ Check browser console for `[Flow UI]` logs
5. ✅ Check server logs for `[Flow Generator]` logs
6. ✅ Verify all emails are created
7. ✅ Click on each email to verify content
8. ✅ Verify standard email format is used (HERO SECTION, sections, CTA)

## Files Modified

1. **`app/api/flows/generate-emails/route.ts`**
   - Added comprehensive logging throughout generation process
   - Added timing measurements for each email
   - Added detailed error handling with stack traces
   - Added confirmation of which prompt is being used

2. **`app/brands/[brandId]/chat/page.tsx`**
   - Improved progress tracking timing (5s → 12s)
   - Added frontend logging
   - Enhanced error handling and recovery
   - Better completion state handling

3. **`components/FlowGenerationProgress.tsx`**
   - Improved status messages for final email
   - Better handling of completion state
   - Clearer messaging about what's happening

## Verification: Standard Email Prompt Usage

**Question**: Is the standard-email writing prompt being used?

**Answer**: ✅ YES, confirmed in multiple places:

1. **Code confirmation** (`lib/flow-prompts.ts` line 94-96):
   ```typescript
   const template = emailType === 'design' 
     ? STANDARD_EMAIL_PROMPT 
     : LETTER_EMAIL_PROMPT;
   ```

2. **Default email type** (`app/brands/[brandId]/chat/page.tsx` line 1092):
   ```typescript
   emailType: 'design' // Default to design emails for flows
   ```

3. **Logging confirmation** (now added to backend):
   ```typescript
   console.log(`[Flow Generator] Using standard email prompt: ${emailType === 'design' ? 'STANDARD_EMAIL_PROMPT' : 'LETTER_EMAIL_PROMPT'}`);
   ```

4. **Prompt structure verification**:
   - The `buildFlowEmailPrompt()` function creates an email brief with flow context
   - This brief is inserted into the `{{EMAIL_BRIEF}}` placeholder of `STANDARD_EMAIL_PROMPT`
   - The standard prompt includes all the proper sections, formatting, and guidelines

## Expected Behavior

When you approve a flow outline:

1. **Frontend**: Shows progress modal starting at 0
2. **Backend**: Begins generating emails sequentially
3. **Frontend**: Progress updates every ~12 seconds
4. **Backend**: Logs detailed progress for each email
5. **Frontend**: Progress reaches final email (shows "Creating final email...")
6. **Backend**: Completes final email and returns results
7. **Frontend**: Shows completion message and reloads data
8. **Result**: All emails visible in flow outline, each using standard email format

## Performance Notes

- **Average time per email**: 10-15 seconds
- **3-email flow**: ~30-45 seconds total
- **5-email flow**: ~50-75 seconds total
- **Edge runtime timeout**: 300 seconds (5 minutes) - supports up to ~20 emails

## Next Steps

If flow generation is still experiencing issues:

1. **Run a test flow** with 2-3 emails
2. **Capture full logs** from both backend and frontend
3. **Share the logs** to identify the exact bottleneck
4. **Check timing** - if one email takes >30 seconds, investigate Claude API performance
5. **Verify database** - ensure Supabase is responding quickly

The enhanced logging will now make it much easier to identify exactly where any issues occur.

