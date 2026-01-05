# System Prompt Architecture & AI Tool Use Plan

## Executive Summary

Based on research of AI SDK best practices and the current codebase, here's the recommended architecture for:
1. System prompt layering (root + mode extensions)
2. Proper artifact implementation
3. AI tool use for app control

---

## Part 1: System Prompt Architecture

### Current State
The current implementation has multiple prompt builders that each construct full prompts:
- `buildDesignEmailV2Prompt` - Full email copywriter prompt
- `buildCustomModePrompt` - Custom mode prompts with variable replacement
- `buildPersonalAIPrompt` - Generic assistant prompt
- `buildFlowOutlinePrompt` - Flow planning prompt

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ROOT SYSTEM PROMPT                        │
│  (Always included, regardless of mode)                       │
├─────────────────────────────────────────────────────────────┤
│  • Current date/time                                         │
│  • Available tools & how to use them                         │
│  • Artifact creation guidelines                              │
│  • Core behaviors (be helpful, accurate, etc.)               │
│  • Output format standards (XML tags, markdown)              │
│  • User approval flow instructions                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    MODE EXTENSION                            │
│  (Appended based on selected mode)                           │
├─────────────────────────────────────────────────────────────┤
│  • Domain-specific role (email copywriter, planner, etc.)    │
│  • Mode-specific constraints & guidelines                    │
│  • Brand context injection points                            │
│  • Mode-specific tools (if any)                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    CONTEXT INJECTION                         │
│  (Dynamic per-request)                                       │
├─────────────────────────────────────────────────────────────┤
│  • Brand info (name, guidelines, voice)                      │
│  • Memory context (from Supermemory)                         │
│  • Conversation history context                              │
│  • Current task/brief                                        │
└─────────────────────────────────────────────────────────────┘
```

### Implementation

Create `lib/prompts/root-system-prompt.ts`:

```typescript
export const ROOT_SYSTEM_PROMPT = `
## SYSTEM INFORMATION
- Current Date: {{CURRENT_DATE}}
- Current Time: {{CURRENT_TIME}}
- Timezone: {{TIMEZONE}}

## AVAILABLE TOOLS

You have access to the following tools. Use them when appropriate:

### create_artifact
Use this to save structured content (emails, documents, plans) as persistent artifacts.
- Call this when you've generated content the user may want to save, edit, or reference later
- Always confirm with the user before creating artifacts with sensitive or important content
- Provide a clear title and description

### create_conversation
Use this to create new conversations or sub-conversations.
- For breaking complex tasks into separate focused discussions
- For implementing plans where each item needs its own conversation
- Always ask for user approval before creating

### suggest_action
Use this to suggest dynamic actions the user can take.
- Generates clickable buttons/actions in the UI
- User must approve before any action executes

### save_memory (when available)
Use this to save important information for future reference.
- Brand preferences, guidelines, decisions
- User-specific context that should persist

### web_search (when available)
Use this to search the web for current information.
- Product details, pricing, availability
- Brand/competitor research

## OUTPUT FORMAT GUIDELINES

When generating structured content:
1. Use XML tags for version variants: <version_a>, <version_b>, <version_c>
2. Use clear section headers with markdown
3. Format actionable items as lists
4. Separate content sections clearly

## USER APPROVAL FLOW

For actions that modify the app state (creating conversations, executing plans):
1. Clearly explain what you're about to do
2. List the specific actions that will be taken
3. Ask for explicit confirmation: "Would you like me to proceed?"
4. Only execute after receiving approval

## CORE BEHAVIORS

- Be helpful, accurate, and concise
- Ask clarifying questions when the request is ambiguous
- Offer alternatives when the primary approach may not work
- Acknowledge limitations and uncertainties
- Respect user preferences and brand guidelines
`;

export function buildRootPrompt(options: {
  timezone?: string;
  enabledTools?: string[];
}): string {
  const now = new Date();
  
  return ROOT_SYSTEM_PROMPT
    .replace('{{CURRENT_DATE}}', now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }))
    .replace('{{CURRENT_TIME}}', now.toLocaleTimeString('en-US'))
    .replace('{{TIMEZONE}}', options.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
}
```

---

## Part 2: Artifact Implementation (Best Practice)

### Current State (Pattern Matching - WEAK)
- AI generates content with XML tags
- Frontend pattern-matches to detect artifacts
- Creates artifacts via client-side context
- No AI awareness of artifact creation

### Proposed Architecture (Tool Calling - STRONG)

The AI should **explicitly call a tool** when it wants to create an artifact. This gives:
- Clear intent from the AI
- Structured data (type, title, content)
- Server-side artifact creation
- Proper streaming support

### Tool Definition

```typescript
// lib/tools/artifact-tool.ts
import { z } from 'zod';
import { tool } from 'ai';

export const createArtifactTool = tool({
  description: `Create a persistent artifact from generated content. Use this when you've created structured content (email copy, document, plan) that the user may want to save, edit, or reference later.`,
  parameters: z.object({
    type: z.enum(['email', 'document', 'plan', 'calendar']).describe('The type of artifact'),
    title: z.string().describe('A short, descriptive title for the artifact'),
    description: z.string().optional().describe('Brief description of the content'),
    content: z.string().describe('The full content of the artifact'),
    metadata: z.object({
      versions: z.array(z.object({
        id: z.string(),
        label: z.string(),
        content: z.string(),
      })).optional().describe('For email artifacts with A/B/C versions'),
      subject_line: z.string().optional().describe('Email subject line'),
      preview_text: z.string().optional().describe('Email preview text'),
    }).optional(),
  }),
  execute: async ({ type, title, description, content, metadata }) => {
    // This will be handled server-side
    // Return artifact ID for the frontend to display
    return {
      artifactId: 'pending', // Will be filled by server
      type,
      title,
      status: 'created',
    };
  },
});
```

### Server-Side Handling

In `app/api/chat/route.ts`:

```typescript
// Add to tools object
const artifactTools = {
  create_artifact: createArtifactTool,
};

// Handle tool results in stream
case 'tool-call':
  if (part.toolName === 'create_artifact') {
    // Create artifact in database
    const artifact = await supabase
      .from('artifacts')
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        type: part.args.type,
        title: part.args.title,
        content: part.args.content,
        metadata: part.args.metadata,
      })
      .select()
      .single();
    
    // Send artifact created event to frontend
    sendMessage('artifact_created', { 
      artifactId: artifact.data.id,
      type: part.args.type,
      title: part.args.title,
    });
  }
  break;
```

### Frontend Handling

Update the stream handler to listen for `artifact_created` events and open the artifact sidebar:

```typescript
case 'artifact_created':
  setCurrentArtifact(data.artifactId);
  setArtifactSidebarOpen(true);
  break;
```

---

## Part 3: AI Tool Use for App Control

### Tools Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     UNIVERSAL TOOLS                           │
│  (Available in all modes)                                     │
├──────────────────────────────────────────────────────────────┤
│  • create_artifact - Save structured content                  │
│  • create_conversation - Start new conversation               │
│  • suggest_action - Generate dynamic UI buttons               │
│  • save_memory - Persist important information                │
│  • web_search - Search the web                                │
└──────────────────────────────────────────────────────────────┘
                              +
┌──────────────────────────────────────────────────────────────┐
│                    MODE-SPECIFIC TOOLS                        │
│  (Added based on selected mode)                               │
├──────────────────────────────────────────────────────────────┤
│  Calendar Planner Mode:                                       │
│    • create_calendar_entry                                    │
│    • bulk_create_emails (create multiple conversations)       │
│                                                               │
│  Flow Builder Mode:                                           │
│    • create_flow_outline                                      │
│    • generate_flow_email                                      │
│                                                               │
│  Research Mode:                                               │
│    • analyze_competitors                                      │
│    • gather_market_data                                       │
└──────────────────────────────────────────────────────────────┘
```

### Tool: Create Conversation

```typescript
export const createConversationTool = tool({
  description: `Create a new conversation or sub-conversation. Use this to break complex tasks into separate focused discussions, or to implement plans where each item needs its own conversation. Always ask for user approval before creating.`,
  parameters: z.object({
    title: z.string().describe('Title for the new conversation'),
    initial_prompt: z.string().describe('The initial message/prompt for the conversation'),
    parent_conversation_id: z.string().optional().describe('ID of parent conversation if this is a sub-conversation'),
    mode: z.string().optional().describe('Mode to use for the new conversation'),
  }),
  execute: async ({ title, initial_prompt, parent_conversation_id, mode }) => {
    // Requires user approval - handled by frontend
    return {
      status: 'pending_approval',
      action: 'create_conversation',
      details: { title, initial_prompt, parent_conversation_id, mode },
    };
  },
});
```

### Tool: Suggest Action (Dynamic UI)

```typescript
export const suggestActionTool = tool({
  description: `Suggest a dynamic action/button for the user. The action will appear as a clickable element in the UI. User must approve before the action executes.`,
  parameters: z.object({
    label: z.string().describe('Button label'),
    action_type: z.enum([
      'create_emails_from_plan',
      'approve_flow',
      'schedule_calendar',
      'export_content',
    ]).describe('The type of action'),
    action_data: z.record(z.any()).describe('Data needed to execute the action'),
    description: z.string().describe('Explanation of what this action will do'),
  }),
  execute: async ({ label, action_type, action_data, description }) => {
    return {
      status: 'suggestion',
      button: { label, action_type, action_data, description },
    };
  },
});
```

### User Approval Flow

The frontend displays pending actions with approval UI:

```tsx
// In ChatMessage.tsx
{pendingActions.map(action => (
  <div key={action.id} className="pending-action-card">
    <p>{action.description}</p>
    <div className="flex gap-2">
      <button onClick={() => approveAction(action.id)}>
        Approve
      </button>
      <button onClick={() => rejectAction(action.id)}>
        Cancel
      </button>
    </div>
  </div>
))}
```

---

## Part 4: Implementation Plan

### Phase 1: Root System Prompt (1-2 hours)
1. Create `lib/prompts/root-system-prompt.ts`
2. Update `buildSystemPrompt` to compose root + mode
3. Add date/time/timezone injection
4. Update existing mode prompts to be "extensions"

### Phase 2: Proper Artifact Tool (2-3 hours)
1. Create `lib/tools/artifact-tool.ts`
2. Update `app/api/chat/route.ts` to:
   - Add artifact tool to tools object
   - Handle `create_artifact` tool calls
   - Create artifacts in database
   - Stream artifact events to frontend
3. Update frontend to handle `artifact_created` events
4. Remove pattern-matching artifact detection

### Phase 3: Conversation Creation Tool (2-3 hours)
1. Create `lib/tools/conversation-tool.ts`
2. Add approval flow state management
3. Implement frontend approval UI
4. Backend conversation creation endpoint

### Phase 4: Dynamic Actions (2-3 hours)
1. Create `lib/tools/action-tool.ts`
2. Implement action button rendering
3. Build approval workflow
4. Connect to existing app actions (create flow, etc.)

---

## Database Changes Required

### artifacts table (if not exists)
```sql
CREATE TABLE artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  user_id UUID REFERENCES auth.users(id),
  brand_id UUID REFERENCES brands(id),
  type TEXT NOT NULL, -- 'email', 'document', 'plan', 'calendar'
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  metadata JSONB,
  status TEXT DEFAULT 'draft', -- 'draft', 'approved', 'published'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### pending_actions table (new)
```sql
CREATE TABLE pending_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  message_id UUID REFERENCES messages(id),
  user_id UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  action_data JSONB NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'executed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  executed_at TIMESTAMPTZ
);
```

---

## Key Differences from Current Implementation

| Aspect | Current | Proposed |
|--------|---------|----------|
| System prompt | Multiple separate prompts | Root + mode layering |
| Artifact creation | Pattern matching on frontend | AI calls tool explicitly |
| Artifact awareness | AI unaware | AI knows when artifact created |
| App control | None | Tools with approval flow |
| Dynamic UI | Static | AI can suggest actions |
| Conversation creation | Manual only | AI can propose via tool |

---

## Benefits

1. **Cleaner Architecture**: Single root prompt with mode extensions
2. **Explicit Intent**: AI explicitly creates artifacts via tool calls
3. **Better UX**: AI can propose actions, user approves
4. **Scalability**: Easy to add new tools and modes
5. **Reliability**: Server-side artifact creation, proper database storage
6. **Flexibility**: AI can control more of the app with user consent

---

## Next Steps

1. **Review this plan** - Get your feedback
2. **Implement Phase 1** - Root system prompt
3. **Implement Phase 2** - Proper artifact tool
4. **Test thoroughly** - Ensure streaming works correctly
5. **Iterate** - Add more tools based on usage patterns




















