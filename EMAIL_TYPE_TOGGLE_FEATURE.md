# Email Type Toggle Feature

## Overview

Added a new feature that allows users to switch between two different email generation modes in Write mode:
1. **Design Email** (default) - Full structured email with hero sections, body sections, and CTAs
2. **Letter Email** - Short, direct response letter-style emails that feel personal and conversational

## Implementation Summary

### 1. Type Definitions (`types/index.ts`)
- Added new `EmailType` type: `'design' | 'letter'`
- This type is used throughout the application to track which email format the user wants

### 2. UI Components

#### ChatInput Component (`components/ChatInput.tsx`)
- Added `emailType` and `onEmailTypeChange` props to the interface
- Added a toggle button UI that appears **only in Write mode**
- The toggle shows two options:
  - **DESIGN** - Default option for structured design emails
  - **LETTER** - Option for letter-based emails
- Toggle uses the same styling as the PLAN/WRITE mode toggle for consistency
- Positioned next to the model picker dropdown

**Visual Layout in Write Mode:**
```
[PLAN] [WRITE]  [SONNET 4.5 ▼]  [DESIGN] [LETTER]
```

**Visual Layout in Planning Mode:**
```
[PLAN] [WRITE]  [SONNET 4.5 ▼]
```
(No email type toggle shown)

### 3. Chat Page State Management (`app/brands/[brandId]/chat/page.tsx`)
- Added `emailType` state that defaults to `'design'`
- Imported `EmailType` type from types
- Passed `emailType` in the API request body when sending messages
- Connected the state to ChatInput component via props:
  - `emailType={emailType}`
  - `onEmailTypeChange={setEmailType}`

### 4. API Route Updates (`app/api/chat/route.ts`)

#### New Function: `buildLetterEmailPrompt()`
A specialized prompt function that guides the AI to:
- Write short, conversational letter-style emails (3-5 paragraphs max)
- Ask for key details first (sender name, recipient, purpose, key message, tone)
- Generate personalized, authentic-feeling emails
- Include proper letter formatting (greeting, body, sign-off, signature, optional P.S.)
- Maintain brand voice while being more personal and direct

**Letter Email Characteristics:**
- Personal and conversational tone
- Shorter length
- Direct, one-on-one communication style
- Often includes sender name and signature
- Less structured than design emails
- Focuses on relationship and authentic communication

#### Updated Functions:
- `POST()` - Now extracts `emailType` from request body
- `buildSystemPrompt()` - Added `emailType` parameter and conditional logic:
  - If `emailType === 'letter'`, uses `buildLetterEmailPrompt()`
  - Otherwise, uses the standard design email prompt

## User Experience

### Default Behavior
- When a user creates a new conversation and switches to Write mode, the toggle appears
- **Design Email** is selected by default (maintaining existing functionality)
- The user can click **Letter** to switch to letter-based email generation

### When Design Email is Selected
- AI uses the full structured email prompt with:
  - Hero sections
  - Body sections with headlines
  - Multiple CTAs
  - Design notes
  - Preview text
  - Comprehensive formatting

### When Letter Email is Selected
- AI uses the letter-style email prompt
- First interaction: AI will ask for:
  1. Who is this from?
  2. Who is it to?
  3. What's the purpose?
  4. Key message/offer?
  5. Tone preference?
- After receiving details: AI generates a short, personal letter-style email with:
  - Subject line
  - Personal greeting
  - 2-3 short paragraphs
  - Call to action
  - Sign-off with name/role
  - Optional P.S.

## Example Use Cases

### Design Email (Default)
Best for:
- Promotional campaigns
- Product launches
- Newsletter content
- Feature announcements
- Complex multi-section emails
- Marketing campaigns with multiple products

### Letter Email
Best for:
- Thank you emails
- Order confirmations
- Personal updates
- Follow-up emails
- Customer service responses
- Re-engagement messages
- One-on-one communication
- Founder/team member emails

## Technical Details

### State Flow
1. User selects email type in ChatInput component
2. `onEmailTypeChange` callback updates state in chat page
3. State is included in API request to `/api/chat`
4. API route receives `emailType` parameter
5. `buildSystemPrompt()` conditionally uses letter or design prompt
6. AI generates response according to selected email type

### Persistence
- Email type selection is **per session** (not persisted to database)
- User can switch between types at any time during the conversation
- Each message is generated based on the currently selected type

## Files Modified

1. ✅ `types/index.ts` - Added EmailType type definition
2. ✅ `components/ChatInput.tsx` - Added toggle UI and props
3. ✅ `app/brands/[brandId]/chat/page.tsx` - Added state management
4. ✅ `app/api/chat/route.ts` - Added letter prompt and conditional logic

## Testing

To test the feature:

1. **Navigate to a brand's chat page**
   - Open any brand conversation

2. **Switch to Write mode**
   - Click the "WRITE" button in the mode toggle
   - You should now see the email type toggle appear

3. **Test Design Email (Default)**
   - Ensure "DESIGN" is selected (default)
   - Enter a prompt like: "Create a flash sale email for our new collection"
   - Verify the AI generates a structured email with hero, body sections, and CTAs

4. **Test Letter Email**
   - Click the "LETTER" button in the toggle
   - Enter a prompt like: "Write a thank you email to a customer"
   - Verify the AI asks for details (sender name, recipient, purpose, etc.)
   - Provide the details
   - Verify the AI generates a short, personal letter-style email

5. **Test Toggle Visibility**
   - Switch to Planning mode
   - Verify the email type toggle is hidden
   - Switch back to Write mode
   - Verify the toggle reappears

6. **Test Toggle Behavior**
   - Switch between DESIGN and LETTER multiple times
   - Verify the selected state updates correctly
   - Verify each generates appropriate email styles

## Future Enhancements

Potential improvements:
- Persist email type preference per conversation in database
- Add more email types (e.g., "Social Media", "SMS", "Push Notification")
- Add templates specific to each email type
- Add quick-switch shortcuts for common letter email types (thank you, follow-up, etc.)
- Add preview mode to show example outputs before generating

## Notes

- The toggle uses consistent styling with the existing mode toggle (PLAN/WRITE)
- Letter emails still respect brand voice guidelines from the brand settings
- Both email types have access to memory, web search, and other tools
- The feature is only visible in Write mode to avoid confusion
- Default is "Design Email" to maintain backward compatibility



