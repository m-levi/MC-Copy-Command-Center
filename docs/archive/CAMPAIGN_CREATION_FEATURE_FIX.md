# Campaign Creation Feature Fix

## Issue
The planning mode feature was not properly detecting campaign ideas and displaying the "Create Campaign in Writing Mode" button when the AI suggested campaign concepts.

## Root Cause
The campaign detection logic was working correctly during message streaming, but there were two missing pieces:

1. **Campaign tags were not being stripped from display**: The `<campaign_idea>` XML tags were being shown in the UI, which made the response look messy.
2. **Campaign detection on page load was missing**: When users returned to a conversation with a campaign idea, the button wasn't appearing because campaign detection only happened during streaming, not when loading existing messages.

## Changes Made

### 1. Updated ChatMessage Component (`components/ChatMessage.tsx`)

**Added import:**
```typescript
import { stripCampaignTags } from '@/lib/campaign-parser';
```

**Updated planning mode display:**
- Now strips campaign XML tags from the displayed content while keeping them in the database
- This ensures the UI looks clean while preserving the tags for detection

```typescript
<ReactMarkdown>{stripCampaignTags(message.content || 'No content')}</ReactMarkdown>
```

### 2. Updated Chat Page (`app/brands/[brandId]/chat/page.tsx`)

**Added campaign detection when loading messages from cache:**
```typescript
// Detect campaign ideas in planning mode from last assistant message
if (conversationMode === 'planning' && cached.length > 0) {
  const lastMessage = cached[cached.length - 1];
  if (lastMessage.role === 'assistant' && lastMessage.content) {
    const campaignIdea = extractCampaignIdea(lastMessage.content);
    if (campaignIdea) {
      console.log('[Campaign] Detected campaign from cache:', campaignIdea.title);
      setDetectedCampaign({
        title: campaignIdea.title,
        brief: campaignIdea.brief
      });
    }
  }
}
```

**Added campaign detection when loading messages from database:**
```typescript
// Detect campaign ideas in planning mode from last assistant message
if (conversationMode === 'planning' && data.length > 0) {
  const lastMessage = data[data.length - 1];
  if (lastMessage.role === 'assistant' && lastMessage.content) {
    const campaignIdea = extractCampaignIdea(lastMessage.content);
    if (campaignIdea) {
      console.log('[Campaign] Detected campaign on load:', campaignIdea.title);
      setDetectedCampaign({
        title: campaignIdea.title,
        brief: campaignIdea.brief
      });
    }
  }
}
```

## How It Works Now

### Campaign Creation Flow

1. **User discusses campaign ideas in Planning Mode**
   - User and AI have a strategic conversation about marketing campaigns
   - AI provides advice, brainstorming, and strategic guidance

2. **AI detects actionable campaign concept**
   - When the discussion produces a concrete, actionable campaign
   - AI wraps it in XML tags:
   ```xml
   <campaign_idea>
   <title>Campaign Name</title>
   <brief>Campaign description with key details</brief>
   </campaign_idea>
   ```

3. **System detects campaign tags**
   - During streaming: Campaign is detected in real-time
   - On page load: Campaign is detected from the last assistant message
   - Campaign tags are stored in the database but stripped from display

4. **Button appears**
   - A prominent green button appears below the chat
   - Shows the campaign title
   - Button text: "Create Campaign in Writing Mode"

5. **User clicks button**
   - Creates a new conversation in email_copy mode
   - Pre-fills the input with campaign details:
   ```
   Create an email for this campaign:
   
   Campaign: [Campaign Title]
   
   [Campaign Brief]
   ```
   - User can immediately start writing the email

### Button Display Conditions

The "Create Campaign in Writing Mode" button appears when ALL of these conditions are met:

1. ✅ Current conversation exists
2. ✅ Conversation mode is 'planning'
3. ✅ Campaign has been detected (`detectedCampaign` is not null)
4. ✅ There are messages in the conversation
5. ✅ The last message is from the assistant
6. ✅ Not currently generating a response

## Testing

### Manual Test
1. Start a new conversation in Planning Mode
2. Ask the AI: "Help me create a welcome email series for new customers with a 20% discount"
3. Continue the conversation until the AI suggests a concrete campaign
4. The AI should wrap the campaign in `<campaign_idea>` tags
5. The button should appear automatically
6. Click the button to create a new conversation with pre-filled details

### Verified Functionality
- ✅ Campaign parser correctly extracts title and brief from XML tags
- ✅ Campaign tags are stripped from display
- ✅ Campaign detection works during streaming
- ✅ Campaign detection works when loading existing messages
- ✅ Button appears with correct styling and information
- ✅ Clicking button creates new conversation with pre-filled content

## Files Modified

1. `components/ChatMessage.tsx`
   - Added `stripCampaignTags` import
   - Updated planning mode display to strip campaign tags

2. `app/brands/[brandId]/chat/page.tsx`
   - Added campaign detection when loading from cache
   - Added campaign detection when loading from database

## Files Already Existing (No Changes Needed)

1. `lib/campaign-parser.ts` - Campaign detection utilities (already working)
2. `lib/prompts/planning-mode.prompt.ts` - Planning mode prompt with campaign instructions (already correct)

## Notes

- Campaign tags are stored in the database but hidden from users
- This allows the system to detect campaigns even after page reload
- The feature only works in Planning Mode (not in Writing Mode)
- Campaign detection is case-insensitive and handles various XML formatting

