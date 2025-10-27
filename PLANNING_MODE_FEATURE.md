# Planning Mode Feature

## Overview

The Planning Mode feature provides a two-phase approach to email creation, allowing users to brainstorm and strategize before generating email copy.

## Key Features

### 1. **Mode Toggle**
- Located in the conversation header
- Two modes available:
  - **💡 Planning Mode**: For brainstorming, strategy discussions, and planning email structure
  - **✉️ Email Copy Mode**: For generating actual email content

### 2. **Planning Mode Benefits**
- Discuss email campaign ideas with AI
- Explore different messaging approaches
- Refine target audience and tone
- Get strategic advice before committing to copy
- Iterate on structure and approach without generating full emails

### 3. **Transfer Plan to Email Copy**
- After finalizing a plan in Planning Mode, click the "Transfer Plan" button
- Automatically switches to Email Copy Mode
- Pre-fills the input with a prompt based on your plan
- Maintains context from planning conversation

### 4. **Smart Empty States**
- Different guidance for each mode:
  - **Planning Mode**: Encourages brainstorming and strategy
  - **Email Copy Mode**: Prompts for specific email creation

### 5. **Context-Aware Placeholders**
- Input placeholder changes based on mode:
  - Planning: "Discuss your email ideas, strategy, and structure..."
  - Email Copy: "Describe the email you'd like to create..."

### 6. **Quick Actions by Mode**
- **Planning Mode**: Shows "Transfer Plan" button after AI responses
- **Email Copy Mode**: Shows Quick Actions (shorten, add urgency, etc.)

## User Workflow

### Typical Planning → Copy Flow:

1. **Start New Conversation** (defaults to Planning Mode)
2. **Discuss Strategy**
   - "I want to create a welcome email series for new customers"
   - AI provides strategic advice and structure recommendations
3. **Refine Approach**
   - Continue conversation to refine messaging, tone, and structure
   - Get AI feedback on your ideas
4. **Transfer to Email Copy**
   - Click "Transfer Plan" button
   - Review pre-filled prompt based on your plan
   - Edit if needed
5. **Generate Email**
   - Send the prompt to generate actual email copy
   - Use Quick Actions to refine as needed

### Direct Email Copy Flow:

1. **Start New Conversation**
2. **Switch to Email Copy Mode** using the toggle
3. **Describe Email**
   - "Create a flash sale email for 24-hour discount on running shoes"
4. **Generate and Refine**
   - AI generates complete email
   - Use Quick Actions to adjust

## Technical Implementation

### Database Schema
```sql
ALTER TABLE conversations 
ADD COLUMN mode TEXT CHECK (mode IN ('planning', 'email_copy')) DEFAULT 'planning';
```

### TypeScript Types
```typescript
export type ConversationMode = 'planning' | 'email_copy';

interface Conversation {
  // ... other fields
  mode?: ConversationMode;
}
```

### Key Components Modified
- `app/brands/[brandId]/chat/page.tsx` - Main chat logic
- `components/ChatInput.tsx` - Mode-aware input component
- `types/index.ts` - Type definitions

## Benefits

1. **Reduced Trial and Error**: Plan before generating to get better results faster
2. **Strategic Thinking**: Encourages thoughtful approach to email creation
3. **Context Preservation**: Plan context carries over to email generation
4. **Flexible Workflow**: Users can choose direct copy or planning first
5. **Better AI Utilization**: Planning conversations help AI understand goals better

## Migration

Run the `PLANNING_MODE_MIGRATION.sql` file in your Supabase SQL Editor to add the mode column to existing databases.

Existing conversations will default to:
- `email_copy` mode if they have messages (assumed to be active)
- `planning` mode if they're empty (new conversations)

## Future Enhancements

Potential improvements:
- Save planning notes separately from email copy
- Template creation from successful plans
- Planning history and reuse
- Multi-email campaign planning
- Visual planning canvas


