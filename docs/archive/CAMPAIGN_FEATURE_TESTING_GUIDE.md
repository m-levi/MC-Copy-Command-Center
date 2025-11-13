# Campaign Creation Feature - Testing Guide

## What Was Fixed

The campaign creation button in Planning Mode was not appearing when the AI suggested campaign ideas. This has been fixed with the following changes:

### Changes Made:
1. ✅ Campaign tags are now stripped from display (but kept in database for detection)
2. ✅ Campaign detection now works when loading existing conversations
3. ✅ Campaign detection works from both cache and database
4. ✅ Button appears correctly when all conditions are met

## How to Test

### Test 1: Create a New Campaign Idea

1. **Navigate to a brand's chat page** (e.g., `http://localhost:3000/brands/[brandId]/chat`)

2. **Start a new conversation** (click the "New Conversation" button)

3. **Toggle to Planning Mode** (switch the toggle from "Writing" to "Planning")

4. **Ask the AI to help create a campaign**. Try one of these prompts:
   ```
   Help me create a welcome email series for new customers with a 20% discount
   ```
   or
   ```
   I want to create a 3-email sequence to promote our summer sale
   ```

5. **Continue the conversation** until the AI provides a concrete campaign concept

6. **Look for the campaign tags** in the AI's response:
   - The response should include campaign details
   - The XML tags (`<campaign_idea>`, `<title>`, `<brief>`) should NOT be visible
   - The campaign information should be displayed naturally

7. **Check for the button**:
   - A green button should appear below the chat
   - It should say "Create Campaign in Writing Mode"
   - It should display the campaign title
   - Button should have a checkmark icon and arrow icon

8. **Click the button**:
   - Should create a new conversation
   - Should switch to "Writing" mode (email_copy)
   - Should pre-fill the input box with:
     ```
     Create an email for this campaign:
     
     Campaign: [Campaign Title]
     
     [Campaign Brief]
     ```

9. **Verify the new conversation**:
   - The input should be pre-filled with campaign details
   - You should be in Writing Mode
   - You can immediately send the message to start writing the email

### Test 2: Reload Conversation with Campaign

1. **After completing Test 1**, refresh the page or navigate away and back

2. **Select the Planning Mode conversation** that has the campaign idea

3. **Verify the button appears**:
   - The green "Create Campaign in Writing Mode" button should appear immediately
   - No need to regenerate the response
   - Campaign is detected from the stored message

### Test 3: Multiple Campaigns in One Conversation

1. **In Planning Mode**, discuss multiple campaign ideas with the AI

2. **The button should update** to show the most recent campaign idea

3. **Each time the AI suggests a new concrete campaign**, the button should update with the new title

### Test 4: Campaign Detection Edge Cases

1. **Test without campaign tags**:
   - Ask general marketing questions
   - Button should NOT appear
   - Only appears when AI uses the campaign tags

2. **Test switching modes**:
   - If you switch from Planning to Writing mode
   - Button should disappear (only shows in Planning mode)
   - Switch back to Planning mode
   - Button should reappear if campaign was detected

3. **Test with empty conversation**:
   - Start new conversation in Planning mode
   - Button should NOT appear (no messages yet)

## Expected Behavior

### When Button Should Appear:
- ✅ In Planning Mode
- ✅ After AI suggests a concrete campaign with XML tags
- ✅ Last message is from the assistant
- ✅ Not currently generating a response
- ✅ Conversation has messages

### When Button Should NOT Appear:
- ❌ In Writing Mode (email_copy)
- ❌ No campaign detected in messages
- ❌ Currently generating a response
- ❌ Empty conversation
- ❌ Last message is from user

## Visual Indicators

### Button Appearance:
- **Background**: Green gradient (from-green-50 to-emerald-50 in light mode)
- **Icon**: Green checkmark in circle
- **Text**: "Campaign idea ready!" with campaign title below
- **Button**: Green with "Create Campaign in Writing Mode" and arrow icon
- **Hover**: Button scales up slightly and shadow increases

### Campaign Tags (Should NOT be visible):
```xml
<campaign_idea>
<title>Campaign Name</title>
<brief>Campaign description</brief>
</campaign_idea>
```

These tags should be invisible to users but stored in the database.

## Debugging

If the button doesn't appear, check the browser console for:

```
[Campaign] Checking for campaign idea in planning mode
[Campaign] Full content length: [number]
[Campaign] Content preview: [text]
[Campaign] Extracted campaign idea: [object or null]
```

If campaign idea is `null`, the AI didn't use the proper XML tags.

If campaign idea is detected but button doesn't appear, check:
1. Are you in Planning Mode?
2. Is the last message from the assistant?
3. Are you currently generating a response?

## Success Criteria

✅ Campaign tags are hidden from users
✅ Button appears when campaign is detected
✅ Button persists after page reload
✅ Clicking button creates new conversation with pre-filled details
✅ New conversation is in Writing Mode
✅ Campaign details are properly formatted in the input

## Known Limitations

- Only the most recent campaign idea in a conversation is tracked
- Button only appears in Planning Mode
- Campaign must use the exact XML tag format specified in the prompt
- Campaign detection requires both `<title>` and `<brief>` tags

## Files Modified

- `components/ChatMessage.tsx` - Strip campaign tags from display
- `app/brands/[brandId]/chat/page.tsx` - Add campaign detection on load
- `CAMPAIGN_CREATION_FEATURE_FIX.md` - Technical documentation

