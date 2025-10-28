# Planning Mode V2 - Improvements Summary

## Overview

The planning mode has been significantly enhanced to provide a true step-by-step collaborative planning experience. The AI now acts as a strategic consultant rather than immediately generating email copy.

## Key Improvements

### 1. **Distinct AI Behavior by Mode**

#### Planning Mode
- **Purpose**: Strategic consultation and planning
- **AI Role**: Ask questions, provide guidance, create outlines
- **What it does**:
  - Asks clarifying questions about goals, audience, and objectives
  - Helps brainstorm messaging angles and approaches
  - Creates strategic outlines (NOT email copy)
  - Discusses best practices and tactics
  - Guides users through thinking about their campaign
  
- **What it DOESN'T do**:
  - ❌ Generate actual email copy
  - ❌ Write subject lines or CTAs
  - ❌ Create finished email sections
  - ❌ Output in email format structure

#### Email Copy Mode
- **Purpose**: Generate high-converting email copy
- **AI Role**: Expert copywriter creating finished emails
- **What it does**:
  - Generates complete email structure
  - Writes subject lines, hero sections, body copy
  - Creates compelling CTAs
  - Follows all copywriting best practices

### 2. **Visual Planning Stages**

A new `PlanningStageIndicator` component shows progress through three stages:

#### Stage 1: Discovery (0-4 exchanges)
- Understanding goals and audience
- Identifying key products/offers
- Clarifying context and timing
- **Visual**: Blue icon, pulse animation

#### Stage 2: Strategy (5-8 exchanges)  
- Building structure and approach
- Discussing tone and positioning
- Identifying key messages
- **Visual**: Progress bar at 50%

#### Stage 3: Ready (9+ exchanges)
- Plan is complete and ready
- Ready to transfer to Email Copy mode
- **Visual**: Green checkmark, 100% progress

### 3. **Improved Context Transfer**

When transferring from Planning to Email Copy:
- Captures the ENTIRE planning conversation
- Creates a comprehensive brief including all discussed points
- Preserves context so the AI understands what was planned
- Pre-fills the input with the full brief for review

**Example Transfer**:
```
Based on our planning discussion, create an email campaign. Here's what we discussed:

User: I want to create a promotional email for our winter sale...
Planning Session: Great! Let me ask a few questions...
[Full conversation context]

Please generate the complete email copy following all the guidelines we discussed in the planning phase.
```

### 4. **Enhanced Empty States**

#### Planning Mode Empty State
- Explains the 3-stage process
- Shows example of how to start
- Sets expectations for collaborative planning
- Emphasizes it's NOT for writing copy yet

#### Email Copy Mode Empty State  
- Direct and action-oriented
- Tips for what to include
- Option to switch to Planning if needed

### 5. **Better User Guidance**

- **Stage hints**: Each stage shows what to focus on
- **Progress tracking**: See how many exchanges have occurred
- **Context-aware prompts**: Input placeholder changes by mode
- **Clear next steps**: AI suggests when to move to next phase

## User Workflows

### Workflow A: Start with Planning (Recommended for complex campaigns)

1. **Create new conversation** (defaults to Planning mode)
2. **Discovery Phase**:
   ```
   User: "I want to promote our new eco-friendly product line"
   AI: "Great! Let me ask a few questions:
        - Who is your target audience?
        - What's the main goal - awareness or sales?
        - Any timing or urgency elements?"
   ```
3. **Strategy Phase**:
   ```
   User: "Target is eco-conscious millennials, goal is to drive sales"
   AI: "Here are some strategic approaches we could take:
        1. Problem-solution: Environmental impact → Our solution
        2. Value-first: Sustainability benefits + quality
        3. Social proof: Customer testimonials + impact metrics
        
        Suggested Outline:
        - Hero: Lead with environmental impact stat
        - Section 1: Product benefits (sustainability + quality)
        - Section 2: Social proof
        - CTA: Limited-time launch offer"
   ```
4. **Transfer to Email Copy**:
   - Click "Transfer Plan" button
   - Review comprehensive brief
   - Send to generate actual email

### Workflow B: Direct Email Copy (For simple, straightforward campaigns)

1. **Create new conversation**
2. **Switch to Email Copy mode**
3. **Describe email**: "Create a flash sale email for 24-hour 30% off winter boots"
4. **Generate and refine** using Quick Actions

### Workflow C: Start in Planning, Switch Back (Exploratory)

1. **Start in Planning mode**
2. **Ask questions**: "What are best practices for abandoned cart emails?"
3. **Get advice and outline**
4. **Stay in planning** to explore multiple approaches
5. **When ready**, transfer to Email Copy

## Technical Implementation

### API Changes

**File**: `app/api/chat/route.ts`

```typescript
// New parameter: conversationMode
const { messages, modelId, brandContext, conversationMode } = await req.json();

// Different prompts by mode
function buildSystemPrompt(
  brandContext: any,
  ragContext: string,
  regenerateSection?: { type: string; title: string },
  conversationContext?: any,
  conversationMode?: string  // NEW
): string {
  if (conversationMode === 'planning') {
    return buildPlanningPrompt(brandInfo, ragContext, contextInfo);
  }
  // ... existing email copy prompt
}

// New function for planning-specific prompts
function buildPlanningPrompt(
  brandInfo: string, 
  ragContext: string, 
  contextInfo: string
): string {
  // Returns strategist/consultant prompt
  // Emphasizes questions, outlines, NO email copy
}
```

### Component Changes

**New Component**: `components/PlanningStageIndicator.tsx`
- Automatically determines stage based on message count
- Shows visual progress through stages
- Provides stage-specific hints

**Updated**: `app/brands/[brandId]/chat/page.tsx`
- Passes `conversationMode` to API
- Shows `PlanningStageIndicator` in planning mode
- Shows `ConversationStats` in email copy mode
- Improved `handleTransferPlanToEmail` with full context

### Database Schema

No database changes required - uses existing `mode` column on `conversations` table:
```sql
mode TEXT CHECK (mode IN ('planning', 'email_copy')) DEFAULT 'planning'
```

## Benefits

1. **Prevents premature email generation**: Users don't get unwanted copy when they're still planning
2. **Better email quality**: Thoughtful planning leads to better briefs and better output
3. **Clearer workflow**: Visual stages make the process obvious
4. **Flexible approach**: Can use planning or skip directly to email copy
5. **Educational**: Users learn email marketing strategy through the planning process
6. **Context preservation**: Full planning conversation transfers to email generation

## Examples of Planning Mode Responses

### Good Planning Response ✅
```
Great question! For a welcome email series, let's think through this:

**Key Questions:**
- Are these new customers or newsletter subscribers?
- What's your main goal - education, first purchase, or brand building?
- How many emails in the series?

**Strategic Considerations:**
For new customers, I typically recommend:
1. Email 1 (immediate): Thank you + brand story
2. Email 2 (day 2): Value proposition + best sellers
3. Email 3 (day 5): Social proof + special offer

**Suggested Structure for Email 1:**
- Hero: Warm welcome + what to expect
- Section 1: Your brand story (why you exist)
- Section 2: What makes you different
- CTA: Explore the collection

What resonates with your brand approach?
```

### Bad Planning Response ❌ (Now Prevented)
```
Here's your welcome email:

EMAIL SUBJECT LINE: Welcome to [Brand]! Here's 10% Off

HERO SECTION:
Headline: Welcome to the Family
CTA: Start Shopping
...
```

## Migration Notes

- Existing conversations maintain their current mode
- No data migration needed
- All existing functionality preserved
- New behavior only affects new messages sent in planning mode

## Future Enhancements

Potential improvements:
- Save planning notes as structured data
- Template creation from successful plans
- Planning history library
- Visual planning canvas with drag-and-drop
- A/B test planning (compare multiple approaches)
- Campaign calendar integration
- Multi-email sequence planning

## User Education

Recommended onboarding flow:
1. Show planning mode tour on first use
2. Highlight the stage indicator
3. Demonstrate transfer plan button
4. Provide sample planning conversations

## Testing Checklist

- [x] Planning mode shows stage indicator
- [x] Planning mode doesn't generate email copy
- [x] AI asks strategic questions in planning mode
- [x] Email Copy mode generates full emails
- [x] Transfer plan carries full context
- [x] Mode toggle works correctly
- [x] Empty states show correct guidance
- [x] Visual stages update correctly

## Support & Troubleshooting

**Issue**: AI still generating email copy in planning mode
**Solution**: Clear conversation cache, ensure `conversationMode` is passed to API

**Issue**: Transfer plan loses context  
**Solution**: Check that full message history is being captured in transfer

**Issue**: Stage indicator not updating
**Solution**: Verify message count logic in `PlanningStageIndicator.tsx`

