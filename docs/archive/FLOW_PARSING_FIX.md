# Flow Content Parsing Fix

## Problem

When creating a flow conversation, users saw "thought process" with content, but the main message area showed "No content". This was happening because the AI response parser was incorrectly classifying flow outline responses as `email_copy` instead of `other` (general response).

## Root Cause

The response parsing system was designed to handle three types of AI responses:
1. `<email_copy>` - Structured email content
2. `<clarification_request>` - Questions for the user
3. `<non_copy_response>` - General conversation/responses

However, flow outline responses were not using any of these tags, and the fallback logic in the parser was incorrectly defaulting untagged content to `email_copy` type, which caused it to be filtered out when displayed.

## Solution

### 1. Updated Flow Outline Prompt (`lib/prompts/flow-outline.prompt.ts`)

Added explicit instructions for the AI to wrap all flow outline responses in `<non_copy_response>` tags:

```typescript
## OUTPUT FORMAT

**CRITICAL: Wrap ALL your responses in <non_copy_response> tags**

Always structure your outline with clear sections for each email. Make it scannable and easy to approve.

Example format:
```
<non_copy_response>
[Your questions or outline content here]
</non_copy_response>
```
```

### 2. Enhanced Response Parser (`lib/streaming/ai-response-parser.ts`)

Added intelligent pattern detection to identify flow outline content even without tags:

```typescript
// Detect if content is a flow outline (not email copy)
const FLOW_OUTLINE_PATTERNS = [
  /##\s+.+?\s+OUTLINE/i,
  /\*\*Flow Goal:\*\*/i,
  /\*\*Target Audience:\*\*/i,
  /\*\*Total Emails:\*\*/i,
  /###\s+Email\s+\d+:/i,
  /\*\*Email Type:\*\*/i,
  /\*\*Timing:\*\*/i,
  /\*\*Purpose:\*\*/i,
  /\*\*Key Points:\*\*/i,
];

function isFlowOutlineContent(content: string): boolean {
  // Need at least 3 flow outline patterns to confidently identify
  const matchCount = FLOW_OUTLINE_PATTERNS.filter(pattern => pattern.test(content)).length;
  return matchCount >= 3;
}
```

Updated the parsing logic to:
1. First check for explicit tags (`<email_copy>`, `<clarification_request>`, `<non_copy_response>`)
2. If no tags found, use pattern detection:
   - Check if it's a flow outline → classify as `other`
   - Check if it has email structure → classify as `email_copy`
   - Check for clarification signals → classify as `clarification`
   - Default to `other` for general conversation

### 3. Updated Chat Page Handler (`app/brands/[brandId]/chat/page.tsx`)

Modified `parseStreamedContent` function to properly handle the `other` content type:

```typescript
function parseStreamedContent(fullContent: string): {
  emailCopy: string;
  clarification: string;
  otherContent: string;  // NEW: Added other content field
  thoughtContent: string;
  responseType: 'email_copy' | 'clarification' | 'other';
  productLinks: ProductLink[];
}
```

Updated all parsing locations to properly extract and display `other` content:

```typescript
finalContent =
  finalResponseType === 'clarification'
    ? finalClarification
    : finalResponseType === 'other'
      ? finalOtherContent  // NEW: Handle 'other' type properly
      : finalEmailCopy || parsed.clarification || '';
```

## Impact

### What Changed
- Flow outline responses are now correctly identified and displayed
- Pattern-based detection provides backup if AI doesn't use tags
- More robust handling of different response types
- Better defaults for untagged content

### What Wasn't Broken
- Email copy generation and parsing
- Clarification request handling
- Thinking/reasoning display
- Product link extraction
- All other message types

### Backward Compatibility
- Existing conversations are unaffected
- Old flow outlines (if any) will still be parsed correctly due to pattern detection
- All response types continue to work as before

## Testing

To verify the fix:

1. **Start a new flow:**
   - Click Flow button
   - Select any template (e.g., "Abandoned Cart")
   - Type your requirements

2. **Verify outline appears:**
   - AI response should show the flow outline with all details
   - Should see "Flow Goal", "Target Audience", email breakdown
   - No "No content" message

3. **Check all response types:**
   - Flow outlines → Display as regular conversation
   - Email copy → Display in email preview format
   - Clarifications → Display as question lists
   - General chat → Display as conversation

## Files Modified

1. `lib/prompts/flow-outline.prompt.ts` - Added tag instructions
2. `lib/streaming/ai-response-parser.ts` - Added pattern detection and improved fallback logic
3. `app/brands/[brandId]/chat/page.tsx` - Added `otherContent` field handling

## Prevention

This issue won't recur because:
1. **Explicit tags** - AI is instructed to use tags
2. **Pattern detection** - Backup detection if tags are missing
3. **Better defaults** - Untagged content defaults to `other` not `email_copy`
4. **Comprehensive testing** - All response types are now properly handled

