# Planning Mode Redesign - Complete Implementation

## Overview

Planning mode has been completely rebuilt from the ground up as an independent brand strategy consultant. It is now a separate conversation type focused on creative marketing advice, campaign ideation, and strategic discussions.

## Core Changes

### 1. Separate Conversation Types

**Before**: Users could toggle between Planning and Writing modes within the same conversation.

**After**: Planning and Writing are completely separate conversation types:
- Mode is set at conversation creation and cannot be changed
- Each conversation is permanently either `planning` or `email_copy`
- No mid-conversation mode switching

### 2. New Conversation Flow

When users click "New Conversation":
1. A modal appears with two options: **Plan** or **Write**
2. Plan → Creates a planning conversation for strategy and ideation
3. Write → Creates a writing conversation for email creation
4. Each type has distinct UI, capabilities, and AI behavior

### 3. Planning as Brand Strategy Consultant

**Planning Mode Purpose**:
- Get marketing advice and best practices
- Brainstorm creative campaign ideas
- Explore brand positioning and messaging
- Develop marketing strategies
- Ask general marketing questions

**What Planning Mode Does NOT Do**:
- ❌ Generate actual email copy
- ❌ Create email structures (HERO, BODY, CTA sections)
- ❌ Write subject lines or CTAs
- ❌ Produce ready-to-send content

### 4. Smart Campaign Detection

When planning conversations produce actionable campaign ideas, the AI wraps them in XML tags:

```xml
<campaign_idea>
<title>Campaign Name</title>
<brief>Brief description of the campaign concept</brief>
</campaign_idea>
```

When detected, a "Create Campaign in Writing Mode" button appears, allowing users to seamlessly transition the concept into email creation.

## Technical Implementation

### Database Schema

```sql
-- Mode column is now required and permanent
ALTER TABLE conversations
ALTER COLUMN mode SET NOT NULL;

-- Mode is set at creation and cannot be changed
COMMENT ON COLUMN conversations.mode IS 'Conversation mode (planning or email_copy) - set at creation, cannot be changed';
```

### AI Prompts

**Planning Prompt** (`lib/prompts/planning-mode.prompt.ts`):
- Emphasizes role as brand strategist and creative consultant
- Focuses on marketing advice, ideation, and strategy
- Includes instructions for campaign_idea XML tags
- Removes all references to email generation

**Key Features**:
- Web search capability for product info and market research
- Web fetch for analyzing specific pages
- Memory system for remembering brand preferences
- Strategic thinking and reasoning display

### UI Components

**Removed**:
- `PlanningStageIndicator.tsx` - Stage-based planning workflow
- Mode toggle buttons from `ChatInput.tsx`
- Transfer Plan button and functionality

**Added**:
- `ModeSelector.tsx` - Modal for choosing Plan vs Write
- `campaign-parser.ts` - Utilities for detecting and parsing campaign XML tags
- Campaign creation button in planning mode

### Message Display

**Planning Mode**:
- Clean chat interface
- No email section parsing
- No structured email display
- Simple markdown rendering
- Thinking/reasoning display for strategy explanations

**Writing Mode** (unchanged):
- Email preview with sections
- Structured email display
- Quick actions for editing
- Email-specific features

## User Workflows

### Starting a Planning Session

1. Click "New Conversation"
2. Select "Plan" from modal
3. Start asking questions or discussing ideas
4. AI acts as strategic consultant

### Creating a Campaign from Planning

1. Discuss campaign idea in planning conversation
2. AI wraps concept in `<campaign_idea>` tags
3. "Create Campaign" button appears
4. Click button → new writing conversation created with campaign brief
5. Continue in writing mode to generate email

### Separate Planning and Writing

Users can have multiple conversations of each type:
- Planning conversations for ongoing strategy discussions
- Writing conversations for specific email creation
- No confusion between ideation and production

## Key Files Modified

1. **Types**: `types/index.ts`
   - Made `mode` required in Conversation interface

2. **Prompts**: `lib/prompts/planning-mode.prompt.ts`
   - Complete rewrite as strategy consultant
   - Added campaign_idea XML instructions

3. **Chat Page**: `app/brands/[brandId]/chat/page.tsx`
   - Removed mode toggle functionality
   - Added mode selector modal
   - Added campaign detection and handler
   - Updated empty states

4. **Chat Input**: `components/ChatInput.tsx`
   - Removed PLAN/WRITE toggle buttons
   - Removed onModeChange prop

5. **Chat Message**: `components/ChatMessage.tsx`
   - Conditional email parsing (only in email_copy mode)
   - Clean chat display for planning mode

6. **New Files**:
   - `components/ModeSelector.tsx`
   - `lib/campaign-parser.ts`
   - `docs/database-migrations/016_lock_conversation_modes.sql`

## Benefits

1. **Clarity**: Clear separation between strategy and production
2. **Focus**: Each mode optimized for its specific purpose
3. **Flexibility**: Planning mode can handle diverse conversations
4. **Seamless**: Smart campaign detection bridges planning → writing
5. **Simple**: No confusing mode switches mid-conversation

## Migration Notes

Existing conversations retain their current mode:
- Conversations with mode set keep that mode permanently
- Conversations without mode default to `email_copy`
- No data loss or disruption

## Examples

### Planning Conversation
```
User: "What are best practices for abandoned cart emails?"

AI: "Great question! Abandoned cart emails typically perform best when:
- Sent within 1-3 hours of abandonment
- Include product images to remind them
- Offer help (maybe they had questions?)
- Create gentle urgency (limited stock, sale ending)

The key is being helpful, not pushy..."
```

### Campaign Development
```
User: "Let's create a 3-email welcome series with 20% off"

AI: "That's a solid approach! Welcome series typically see great engagement.

<campaign_idea>
<title>New Customer Welcome Series</title>
<brief>3-email welcome sequence for new subscribers featuring brand intro, product highlights, and 20% discount incentive to drive first purchase</brief>
</campaign_idea>

Email 1 (Immediate): Welcome + brand story + introduce discount
Email 2 (Day 2): Product highlights + social proof  
Email 3 (Day 5): Reminder about discount expiring + urgency"

[Create Campaign button appears]
```

## Success Metrics

- ✅ Planning and Writing are separate conversation types
- ✅ No mode switching mid-conversation
- ✅ Planning shows clean chat UI
- ✅ AI uses XML tags to signal campaign ideas
- ✅ Campaign button creates new writing conversation
- ✅ Clear empty states for both modes
- ✅ Mode selector on conversation creation
- ✅ Planning focuses on creative strategy
- ✅ All email UI removed from planning mode

