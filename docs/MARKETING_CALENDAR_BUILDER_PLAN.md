# Marketing Calendar Builder - Implementation Plan

## Executive Summary

The Marketing Calendar Builder is an agentic feature that helps users plan monthly email campaigns through conversational AI. Each conversation represents a calendar, the AI creates email briefs as artifacts, and approved briefs can spawn child conversations for actual email copy creation.

**Key Insight**: This leverages heavily from existing infrastructure:
- Custom Modes system for the "Calendar Planner" mode
- Parent-child conversations (already exists via `parent_conversation_id`)
- Artifact system (use `spreadsheet` for calendar view + new `email_brief` kind)
- Tool system (`create_artifact`, `create_bulk_conversations`, `suggest_conversation_plan`)
- Shopify MCP for product data access

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Calendar Planner Mode                         │
│                                                                   │
│  ┌──────────────┐     ┌──────────────┐     ┌─────────────────┐ │
│  │   Calendar   │────▶│ Email Briefs │────▶│ Child Convos    │ │
│  │  Artifact    │     │  (Artifacts) │     │ (Email Copy)    │ │
│  │ (Spreadsheet)│     │              │     │                 │ │
│  └──────────────┘     └──────────────┘     └─────────────────┘ │
│         │                    │                      │           │
│         ▼                    ▼                      ▼           │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    AI Agent Layer                          │ │
│  │  • Product analysis (Shopify MCP)                          │ │
│  │  • Brand context (voice, style guide)                      │ │
│  │  • Calendar date awareness                                 │ │
│  │  • Brief generation with approval flow                     │ │
│  │  • Bulk conversation creation                              │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Calendar Planner Mode

### 1.1 Create Calendar Planner Mode Template

Add to `lib/mode-templates.ts`:

```typescript
{
  id: 'calendar-planner',
  name: 'Campaign Calendar Planner',
  description: 'Plan monthly email campaigns with AI-powered brief generation',
  category: 'strategy',
  icon: '📅',
  color: 'green',
  tags: ['calendar', 'planning', 'campaigns', 'briefs'],
  difficulty: 'intermediate',
  use_cases: ['Monthly planning', 'Campaign calendars', 'Email brief generation'],
  system_prompt: CALENDAR_PLANNER_PROMPT, // See below
}
```

### 1.2 Calendar Planner System Prompt

Create `lib/prompts/calendar-planner.prompt.ts`:

```typescript
export const CALENDAR_PLANNER_PROMPT = `You are a strategic email marketing calendar planner for {{BRAND_NAME}}.

<brand_context>
{{BRAND_INFO}}
</brand_context>

## YOUR ROLE

You help plan monthly email marketing calendars by:
1. Understanding the brand's products, promotions, and seasonal opportunities
2. Creating a strategic calendar artifact with send dates and campaign types
3. Generating detailed email briefs for each calendar slot
4. Helping refine briefs until they're ready for copywriting

## WORKFLOW

**Step 1: Gather Context**
When a user starts a calendar planning session:
- Ask which month they're planning for (or suggest the upcoming month)
- Review their products and any upcoming promotions using product_search
- Consider seasonal/holiday opportunities for that month
- Ask about any specific campaigns they already have in mind

**Step 2: Create Calendar Artifact**
Once you have context, create a calendar artifact showing:
- Recommended send dates (typically 2-4 per week)
- Campaign type for each slot (promotional, content, announcement, etc.)
- Brief description of each email concept
- Target segment (if applicable)

**Step 3: Generate Email Briefs**
For each calendar slot, create detailed email_brief artifacts containing:
- Campaign objective
- Target audience/segment
- Key message and value proposition
- Product focus (if applicable)
- Call to action
- Subject line direction
- Content guidelines
- Approval status (draft/approved)

**Step 4: Iteration & Approval**
- Help the user refine briefs based on feedback
- Mark briefs as approved when ready
- Suggest the "Create Emails" action when all briefs are approved

## TOOLS AVAILABLE

- **create_artifact**: Create calendar (spreadsheet) and email_brief artifacts
- **product_search**: Access Shopify product catalog (if connected)
- **suggest_conversation_plan**: Propose the email creation workflow
- **create_bulk_conversations**: Create child conversations for each approved brief

## OUTPUT GUIDELINES

**Calendar Artifact Format** (spreadsheet kind):
| Date | Day | Campaign Type | Email Concept | Segment | Status |
|------|-----|---------------|---------------|---------|--------|
| Jan 3 | Tue | Welcome | New Year Welcome | All | Draft |
| Jan 5 | Thu | Promotional | Winter Sale | Engaged | Draft |
...

**Email Brief Format** (email_brief kind):
- Title: "[Date] - [Campaign Type] - [Concept]"
- Structured content with all brief elements
- Clear approval status

## IMPORTANT NOTES

- Always align with the brand voice and style guide
- Consider email frequency best practices (don't over-email)
- Balance promotional and value-add content
- Leave room for reactive/timely campaigns
- Think about the customer journey and flow between emails`;
```

### 1.3 Mode Tool Configuration

The Calendar Planner mode should enable these tools:

```typescript
const calendarPlannerToolConfig: ModeToolConfig = {
  create_artifact: {
    enabled: true,
    allowed_kinds: ['spreadsheet', 'email_brief', 'checklist'],
  },
  create_conversation: {
    enabled: true,
  },
  create_bulk_conversations: {
    enabled: true, // Critical for "Create All Emails"
  },
  suggest_conversation_plan: {
    enabled: true,
  },
  suggest_action: {
    enabled: true,
  },
  web_search: {
    enabled: true,
    max_uses: 5,
  },
  save_memory: {
    enabled: true,
  },
  shopify_product_search: {
    enabled: true, // For product-aware planning
  },
  generate_image: {
    enabled: false, // Not needed for planning
  },
};
```

---

## Phase 2: Email Brief Artifact Type

### 2.1 Add `email_brief` to ArtifactKind

Update `types/artifacts.ts`:

```typescript
export type ArtifactKind =
  | 'email'
  | 'flow'
  | 'campaign'
  | 'template'
  | 'subject_lines'
  | 'content_brief'
  | 'email_brief'     // NEW
  | 'markdown'
  | 'spreadsheet'
  | 'code'
  | 'checklist';
```

### 2.2 Email Brief Artifact Schema

```typescript
export interface EmailBriefArtifactMetadata extends SharedMetadata {
  // Core brief fields
  campaign_type: 'promotional' | 'content' | 'announcement' | 'transactional' | 'nurture';
  send_date?: string;
  target_segment?: string;

  // Brief content
  objective: string;
  key_message: string;
  value_proposition?: string;
  product_ids?: string[];  // Reference Shopify products
  call_to_action: string;

  // Direction for copywriter
  subject_line_direction?: string;
  tone_notes?: string;
  content_guidelines?: string;

  // Approval workflow
  approval_status: 'draft' | 'pending_review' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  rejection_notes?: string;

  // Parent calendar reference
  calendar_artifact_id?: string;
  calendar_slot_index?: number;
}

export interface EmailBriefArtifact extends BaseArtifact<'email_brief', EmailBriefArtifactMetadata> {}
```

### 2.3 Email Brief Viewer Component

Create `components/artifacts/EmailBriefArtifactView.tsx`:

```typescript
// A card-based view showing:
// - Brief title and date
// - Campaign type badge
// - Objective and key message
// - Product references (with images if available)
// - CTA direction
// - Approval status with approve/reject buttons
// - "Create Email" button when approved
```

---

## Phase 3: Calendar Artifact Enhancement

### 3.1 Use Spreadsheet with Calendar Metadata

Rather than a new artifact type, enhance `SpreadsheetArtifactMetadata`:

```typescript
export interface SpreadsheetArtifactMetadata extends SharedMetadata {
  // Existing fields...
  columns: SpreadsheetColumn[];
  rows: SpreadsheetRow[];
  has_header?: boolean;

  // NEW: Calendar-specific fields
  is_calendar?: boolean;
  calendar_month?: string;      // "2025-01" format
  calendar_year?: number;
  linked_brief_ids?: string[];  // Reference email_brief artifacts
}
```

### 3.2 Calendar View Enhancement

Update `SpreadsheetArtifactView.tsx` to:
- Detect `is_calendar: true`
- Render as a calendar grid (week/month view)
- Show brief status indicators
- Link cells to brief artifacts
- Add "Create All Emails" button when all approved

---

## Phase 4: Parent-Child Conversation System

### 4.1 Enhance Existing Flow System

The flow system already supports parent-child via:
- `parent_conversation_id`
- `is_flow`
- `flow_type`
- `flow_sequence_order`

Extend for calendars:

```typescript
// In types/index.ts
export type FlowType =
  | 'welcome_series'
  | 'abandoned_cart'
  // ... existing types
  | 'calendar_emails';  // NEW

// New conversation fields
export interface Conversation {
  // ... existing fields

  // Calendar-specific
  calendar_month?: string;           // "2025-01"
  email_brief_artifact_id?: string;  // Links to the brief
}
```

### 4.2 Folder/Grouping in Sidebar

Leverage existing `useFlowChildren` hook:
- Calendar conversation is parent (`is_flow: true`)
- Email conversations are children (`parent_conversation_id` points to calendar)
- Sidebar shows expandable calendar with child emails

---

## Phase 5: Agentic Workflow

### 5.1 Create Email Brief Tool

Add to `lib/tools/email-brief-tool.ts`:

```typescript
export const createEmailBriefTool = tool({
  description: `Create an email brief artifact for a calendar slot.

Use this when planning individual emails for a campaign calendar.
Include all fields the copywriter needs to write effective copy.`,

  inputSchema: z.object({
    title: z.string().describe('Brief title (e.g., "Jan 5 - Winter Sale - 30% Off")'),
    campaign_type: z.enum(['promotional', 'content', 'announcement', 'transactional', 'nurture']),
    send_date: z.string().describe('Planned send date'),
    target_segment: z.string().optional(),
    objective: z.string().describe('What this email should achieve'),
    key_message: z.string().describe('The main message/hook'),
    value_proposition: z.string().optional(),
    product_focus: z.array(z.string()).optional().describe('Product names or IDs'),
    call_to_action: z.string().describe('Primary CTA'),
    subject_line_direction: z.string().optional(),
    tone_notes: z.string().optional(),
    content: z.string().describe('Full brief content in markdown'),
  }),

  execute: async (input) => {
    return { status: 'pending', kind: 'email_brief', title: input.title };
  },
});
```

### 5.2 Create All Emails Action

The `create_bulk_conversations` tool already exists. Enhance it:

```typescript
// When AI calls create_bulk_conversations with approved briefs:
{
  parent_conversation_id: calendarConversationId,
  conversations: [
    {
      title: "Email: Jan 5 Winter Sale",
      mode: "email_copy",  // or custom mode for email writing
      email_brief_artifact_id: "brief_abc123",
      flow_sequence_order: 1,
    },
    // ... more emails
  ]
}
```

### 5.3 Multi-Step Agent Flow

The calendar planner uses `generateText` with `maxSteps`:

```typescript
// In the chat route when mode is calendar-planner:
const result = await streamText({
  model,
  system: calendarPlannerPrompt,
  tools: {
    create_artifact: createArtifactTool,
    product_search: shopifyProductTool,
    suggest_conversation_plan: suggestPlanTool,
    create_bulk_conversations: createBulkConvosTool,
  },
  maxSteps: 10, // Allow multi-step reasoning
});
```

---

## Phase 6: UI Components

### 6.1 Calendar Sidebar Actions

Add to artifact sidebar:

```tsx
// When viewing a calendar artifact
{isCalendarArtifact && (
  <div className="flex gap-2">
    <Button onClick={handleViewBriefs}>
      View All Briefs
    </Button>
    <Button
      onClick={handleCreateAllEmails}
      disabled={!allBriefsApproved}
    >
      Create All Emails
    </Button>
  </div>
)}
```

### 6.2 Brief Approval Flow

```tsx
// In EmailBriefArtifactView
<div className="flex gap-2">
  <Button
    variant="success"
    onClick={() => handleApproval('approved')}
  >
    Approve Brief
  </Button>
  <Button
    variant="outline"
    onClick={() => handleApproval('pending_review')}
  >
    Request Changes
  </Button>
</div>
```

### 6.3 Calendar Creation Welcome

When entering calendar planner mode:

```tsx
// In AIPromptInput or ChatHeader
{mode === 'calendar-planner' && !hasMessages && (
  <div className="calendar-welcome">
    <h3>Let's plan your {nextMonth} email calendar</h3>
    <div className="quick-actions">
      <Button onClick={() => sendMessage("Let's plan my email calendar for " + nextMonth)}>
        Start Planning {nextMonth}
      </Button>
      <Button onClick={() => sendMessage("Show me what campaigns performed well last month")}>
        Review Last Month
      </Button>
    </div>
  </div>
)}
```

---

## Phase 7: Extensibility Framework

### 7.1 Generic "Builder" Pattern

Abstract the calendar pattern for reuse:

```typescript
interface BuilderModeConfig {
  id: string;
  name: string;
  planningArtifactKind: ArtifactKind;  // 'spreadsheet' for calendar
  itemArtifactKind: ArtifactKind;       // 'email_brief' for calendar
  outputMode: ConversationMode;          // 'email_copy' for calendar

  // Custom prompts
  systemPrompt: string;
  welcomePrompt: string;

  // Tool configuration
  tools: ModeToolConfig;

  // Approval workflow
  requiresApproval: boolean;
  approvalField?: string;
}

const CALENDAR_BUILDER: BuilderModeConfig = {
  id: 'calendar-planner',
  name: 'Campaign Calendar',
  planningArtifactKind: 'spreadsheet',
  itemArtifactKind: 'email_brief',
  outputMode: 'email_copy',
  // ... etc
};

// Future: Social media calendar, content calendar, etc.
const SOCIAL_CALENDAR_BUILDER: BuilderModeConfig = {
  id: 'social-calendar',
  name: 'Social Media Calendar',
  planningArtifactKind: 'spreadsheet',
  itemArtifactKind: 'social_brief',  // New artifact type
  outputMode: 'social_copy',
  // ...
};
```

### 7.2 Builder Registry

```typescript
// lib/builders/registry.ts
export const BUILDER_REGISTRY: Record<string, BuilderModeConfig> = {
  'calendar-planner': CALENDAR_BUILDER,
  // Future builders...
};

export function isBuilderMode(modeId: string): boolean {
  return modeId in BUILDER_REGISTRY;
}

export function getBuilderConfig(modeId: string): BuilderModeConfig | null {
  return BUILDER_REGISTRY[modeId] || null;
}
```

---

## Implementation Order

### Sprint 1: Foundation
1. Add `email_brief` artifact kind to types
2. Create EmailBriefArtifactView component
3. Add calendar-planner mode template
4. Create calendar planner prompt

### Sprint 2: Core Workflow
5. Implement email brief tool
6. Enhance spreadsheet for calendar metadata
7. Add calendar view to SpreadsheetArtifactView
8. Wire up mode in chat route

### Sprint 3: Parent-Child System
9. Add calendar_emails flow type
10. Implement "Create All Emails" action
11. Enhance sidebar grouping for calendars
12. Add brief approval workflow

### Sprint 4: Polish & Extensibility
13. Add welcome experience for calendar mode
14. Create builder abstraction
15. Add analytics/tracking
16. Documentation and testing

---

## Technical Considerations

### Database Changes

```sql
-- Add calendar fields to conversations
ALTER TABLE conversations ADD COLUMN calendar_month VARCHAR(7);
ALTER TABLE conversations ADD COLUMN email_brief_artifact_id UUID REFERENCES email_artifacts(id);

-- Add approval fields to artifacts (if not using metadata)
ALTER TABLE email_artifacts ADD COLUMN approval_status VARCHAR(20) DEFAULT 'draft';
ALTER TABLE email_artifacts ADD COLUMN approved_by UUID REFERENCES auth.users(id);
ALTER TABLE email_artifacts ADD COLUMN approved_at TIMESTAMPTZ;
```

### API Endpoints

- `POST /api/calendar/create-emails` - Create all email conversations from approved briefs
- `PATCH /api/artifacts/[id]/approve` - Approve/reject a brief
- `GET /api/calendar/[conversationId]/briefs` - Get all briefs for a calendar

### State Management

```typescript
// In ArtifactContext
interface CalendarState {
  calendarArtifactId: string | null;
  briefs: EmailBriefArtifact[];
  approvedCount: number;
  totalCount: number;
  canCreateEmails: boolean;
}
```

---

## Success Metrics

1. **Usage**: % of users who create at least one calendar
2. **Completion**: % of calendars with all briefs approved
3. **Conversion**: % of approved briefs that become email conversations
4. **Time savings**: Time to plan a month vs. manual planning
5. **Quality**: User satisfaction with generated briefs

---

## Open Questions

1. **Brief granularity**: Should briefs be very detailed (AI writes first draft) or directional (human writes copy)?
   - Recommendation: Offer both via mode settings

2. **Calendar view**: Full month calendar UI vs. list view?
   - Recommendation: Start with list, add calendar view later

3. **Multi-model support**: Should this work with all models or Claude-only?
   - Recommendation: Design for all models, optimize for Claude's tool use

4. **Collaboration**: Should team members be able to approve briefs?
   - Recommendation: Yes, leverage existing visibility system

---

## Phase 8: Rethinking Modes - The Agentic Workplace Assistant

### The Current Problem

Right now, modes are essentially **static prompt templates**. The user picks a mode, and that mode's prompt gets injected. This is limiting because:

1. Users have to know which mode to use
2. Switching modes loses context
3. The AI can't orchestrate across capabilities
4. Each mode is isolated - no collaboration between specialists

### The Vision: Modes as Specialist Agents

Instead of modes being prompt templates, they become **specialist agents** that a master orchestrator can invoke:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Master Orchestrator Agent                         │
│                                                                      │
│  "I need to help the user with their request..."                    │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     Specialist Agents                          │  │
│  │                                                                │  │
│  │  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌───────────────────┐ │  │
│  │  │ Email   │ │ Calendar │ │ Subject │ │ Competitor        │ │  │
│  │  │ Writer  │ │ Planner  │ │ Line    │ │ Analyst           │ │  │
│  │  └─────────┘ └──────────┘ └─────────┘ └───────────────────┘ │  │
│  │                                                                │  │
│  │  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌───────────────────┐ │  │
│  │  │ Brand   │ │ Data     │ │ Creative│ │ Flow              │ │  │
│  │  │ Voice   │ │ Analyst  │ │ Director│ │ Architect         │ │  │
│  │  └─────────┘ └──────────┘ └─────────┘ └───────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                        Tool Layer                             │  │
│  │  • create_artifact    • product_search    • web_search       │  │
│  │  • create_conversation • save_memory      • analyze_data     │  │
│  │  • send_notification  • schedule_task    • invoke_specialist │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### How It Works

**User says**: "I need to plan my January email calendar and write the first 3 emails"

**Master Agent thinks**:
1. "This involves calendar planning - I'll invoke the Calendar Planner specialist"
2. Calendar Planner creates calendar artifact and email briefs
3. "Now I need to write emails - I'll invoke the Email Writer specialist for each"
4. Email Writer creates email artifacts with A/B/C versions
5. Master Agent summarizes what was done and asks what's next

### Key Components

#### 8.1 Master Orchestrator Prompt

```typescript
export const MASTER_ORCHESTRATOR_PROMPT = `You are a marketing AI assistant for {{BRAND_NAME}}. You have access to specialist agents that each excel at different tasks.

<brand_context>
{{BRAND_INFO}}
</brand_context>

## YOUR ROLE

You are the user's marketing partner. You:
1. Understand what they need (ask clarifying questions if unclear)
2. Break complex requests into sub-tasks
3. Invoke the right specialist(s) for each sub-task
4. Orchestrate multi-step workflows
5. Synthesize results and present them cohesively

## AVAILABLE SPECIALISTS

{{SPECIALIST_DESCRIPTIONS}}

## TOOLS

- **invoke_specialist**: Call a specialist agent with a specific task
- **create_artifact**: Directly create simple artifacts yourself
- **product_search**: Access product catalog
- **web_search**: Research trends and competitors
- **save_memory**: Remember important information
- **schedule_task**: Set reminders or schedule future work
- **send_notification**: Alert the user about something

## WORKFLOW PRINCIPLES

1. **Be proactive**: If a task has obvious next steps, suggest or take them
2. **Think in workflows**: Complex tasks often need multiple specialists
3. **Maintain context**: Pass relevant context when invoking specialists
4. **Synthesize**: Don't just chain outputs - integrate them meaningfully
5. **Learn**: Use save_memory to remember preferences and patterns

## WHEN TO USE SPECIALISTS

Use specialists when:
- Task requires deep expertise (email copy, subject lines, etc.)
- Task has established best practices (flows, calendars)
- Task benefits from specialized output format

Handle yourself when:
- Simple questions or clarifications
- Quick edits or feedback
- Summarizing or synthesizing
- General conversation

## EXAMPLE INTERACTIONS

**User**: "Help me write an abandoned cart email"
**You**: Invoke email_writer specialist with the task

**User**: "I want to plan my Q1 campaigns"
**You**: Ask clarifying questions, then invoke calendar_planner for each month

**User**: "Analyze my competitor's email strategy"
**You**: Invoke competitor_analyst, then synthesize findings

**User**: "Make the CTA more urgent"
**You**: Handle directly - simple edit doesn't need specialist`;
```

#### 8.2 Invoke Specialist Tool

```typescript
export const invokeSpecialistTool = tool({
  description: `Invoke a specialist agent to handle a specific task.

Specialists are expert agents optimized for specific types of work.
Pass them a clear task description and any relevant context.`,

  inputSchema: z.object({
    specialist: z.enum([
      'email_writer',
      'calendar_planner',
      'subject_line_expert',
      'competitor_analyst',
      'brand_voice_coach',
      'creative_director',
      'data_interpreter',
      'flow_architect',
    ]).describe('Which specialist to invoke'),

    task: z.string().describe('What you want the specialist to do'),

    context: z.object({
      artifacts: z.array(z.string()).optional().describe('Relevant artifact IDs'),
      products: z.array(z.string()).optional().describe('Relevant product IDs'),
      previousOutput: z.string().optional().describe('Output from a previous specialist'),
      preferences: z.record(z.string()).optional().describe('User preferences'),
    }).optional(),

    expectedOutput: z.enum([
      'artifact',        // Specialist should create an artifact
      'analysis',        // Specialist should provide analysis/insights
      'recommendations', // Specialist should give recommendations
      'draft',           // Specialist should create a draft for review
    ]).optional(),
  }),

  execute: async (input) => {
    // This triggers a sub-agent call with the specialist's prompt
    return {
      status: 'pending',
      specialist: input.specialist,
      task: input.task,
    };
  },
});
```

#### 8.3 Multi-Model Routing

Different tasks might benefit from different models:

```typescript
interface ModelConfig {
  reasoning: string;     // Complex planning (Claude Opus)
  generation: string;    // Content creation (Claude Sonnet)
  analysis: string;      // Data analysis (GPT-4o)
  quick: string;         // Simple tasks (Claude Haiku / GPT-4o-mini)
  vision: string;        // Image analysis (GPT-4o / Gemini)
}

const SPECIALIST_MODEL_MAP: Record<string, keyof ModelConfig> = {
  'calendar_planner': 'reasoning',
  'email_writer': 'generation',
  'data_interpreter': 'analysis',
  'competitor_analyst': 'analysis',
  'subject_line_expert': 'quick',
  'brand_voice_coach': 'generation',
};

// In orchestrator
const model = getModelForSpecialist(specialist, userPreferences);
```

#### 8.4 Agent State & Memory

```typescript
interface AgentState {
  // Current conversation context
  conversationId: string;
  brandId: string;

  // What we're working on
  currentTask?: {
    description: string;
    specialists: string[];
    artifacts: string[];
    status: 'planning' | 'executing' | 'reviewing' | 'complete';
  };

  // Memory
  shortTermMemory: {
    recentArtifacts: string[];
    recentDecisions: string[];
    userFeedback: string[];
  };

  // From Supermemory
  longTermMemory: {
    brandPreferences: Record<string, unknown>;
    pastCampaigns: string[];
    performanceInsights: string[];
  };
}
```

### The New Mode Experience

Instead of picking modes, users just talk:

```
User: "I need to get my January emails ready"

Agent: "I'd love to help with January! Let me check what we have...

[Looks at calendar, products, upcoming holidays]

I see you have a Winter Sale starting Jan 5 and some new arrivals.
Should I:
1. Plan out the full January calendar (8-10 emails)
2. Focus just on the Winter Sale campaign (3-4 emails)
3. Something else?

What sounds right for where you're at?"

User: "Let's do the full calendar"

Agent: [Invokes calendar_planner specialist]
"Perfect. I'm mapping out January now...

[Creates calendar artifact]

Here's my recommended calendar. I've planned 9 sends:
- 3 for Winter Sale (launch, reminder, last chance)
- 2 for New Arrivals
- 2 value/content emails
- 2 for end-of-month engagement

Take a look at the calendar. Want me to create detailed briefs
for each, or should we adjust the plan first?"

User: "Looks good, create the briefs"

Agent: [Invokes calendar_planner to create briefs]
"Creating briefs for all 9 emails...

[Creates 9 email_brief artifacts]

All briefs are ready! I've linked them to your calendar.
You can review and approve each one.

Once approved, say 'write the emails' and I'll create
first drafts for all of them."
```

### Backwards Compatibility

The existing mode system still works - it's just now one way to interact:

1. **Direct mode selection**: User picks "Email Copy" mode - they get that specialist directly
2. **Orchestrated mode**: User talks naturally - master agent routes to specialists
3. **Hybrid**: User can say "switch to calendar planner mode" mid-conversation

```typescript
// When starting a conversation
if (selectedMode && selectedMode !== 'orchestrator') {
  // Direct specialist mode - use that mode's prompt
  return buildSpecialistPrompt(selectedMode, brandContext);
} else {
  // Orchestrator mode - master agent with specialist access
  return buildOrchestratorPrompt(brandContext, availableSpecialists);
}
```

### Implementation Approach

**Phase 8a: Orchestrator Foundation**
1. Create master orchestrator prompt
2. Implement `invoke_specialist` tool
3. Wire up specialist sub-calls in chat route
4. Add orchestrator as default/option

**Phase 8b: Multi-Model Routing**
5. Add model routing configuration
6. Implement model selection per specialist
7. Add user preferences for models
8. Test with different model combinations

**Phase 8c: State & Memory**
9. Implement agent state tracking
10. Connect to Supermemory for long-term memory
11. Add proactive suggestions based on state
12. Implement scheduled/background tasks

---

## Summary

### The Calendar Builder (Phases 1-7)

Leverages 80%+ existing infrastructure:

| Component | Existing | New |
|-----------|----------|-----|
| Custom Modes | ✅ | New template |
| Artifacts | ✅ Spreadsheet | New email_brief kind |
| Parent-Child Convos | ✅ Flow system | Calendar flow type |
| Tools | ✅ Most exist | email_brief tool |
| Sidebar Grouping | ✅ useFlowChildren | Minimal changes |
| Approval Workflow | ❌ | New (simple) |
| Calendar View | ❌ | New component |

### The Agentic Transformation (Phase 8)

The bigger opportunity - transforming modes from static prompts to an orchestrated agent system:

| Current State | Future State |
|--------------|--------------|
| User picks a mode | User just talks, AI routes |
| One mode per conversation | Specialists collaborate |
| Same model for everything | Best model per task |
| Reactive to user | Proactive suggestions |
| Each conversation isolated | Continuous learning |

### Implementation Priority

**Option A: Calendar First (Incremental)**
1. Build calendar planner as custom mode (Phases 1-4)
2. Prove the pattern works
3. Refactor into orchestrator architecture (Phase 8)

**Option B: Orchestrator First (Foundational)**
1. Build orchestrator foundation (Phase 8a)
2. Calendar planner as first specialist
3. Add more specialists over time

**Recommendation**: Option B is more work upfront but avoids rebuilding. The calendar planner is a perfect first specialist because it:
- Has clear workflow (plan → briefs → emails)
- Uses multiple tools
- Benefits from model routing (reasoning for planning, generation for briefs)
- Has measurable outputs

### The Big Picture

The app becomes a **marketing workplace assistant** where:

1. **Users talk naturally** - No mode selection needed
2. **AI orchestrates** - Knows which specialist to use
3. **Work flows through** - Calendar → Briefs → Emails → Send
4. **System learns** - Remembers preferences, past campaigns
5. **Team collaborates** - Approvals, comments, shared context
6. **Anyone can build** - The specialist/builder pattern is extensible

This isn't just a calendar feature - it's the foundation for a truly agentic marketing platform.
