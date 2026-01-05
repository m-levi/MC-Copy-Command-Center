# Agent & Artifact Builder Guide

This guide explains how to create custom agentic modes and artifact types in Command Center. Use the **Calendar Planner** mode as the reference implementation.

## Table of Contents

1. [Overview](#overview)
2. [Creating a Custom Mode](#creating-a-custom-mode)
3. [Creating a Custom Artifact Type](#creating-a-custom-artifact-type)
4. [Tool Configuration](#tool-configuration)
5. [Tool Choice Forcing](#tool-choice-forcing)
6. [Reference: Calendar Planner](#reference-calendar-planner)
7. [Checklist](#checklist)

---

## Overview

Command Center supports two types of customization:

1. **Custom Modes**: AI agent configurations with specific system prompts, tools, and behaviors
2. **Custom Artifact Types**: Structured content types with dedicated viewers and schemas

The flow for a custom mode with artifacts:

```
User Message → Custom Mode Config → System Prompt + Tools
                    ↓
              AI Generates Response
                    ↓
              Tool Call (create_artifact)
                    ↓
              Validation (worthiness + schema)
                    ↓
              Database Insert (artifacts table)
                    ↓
              Client Event (artifact_created)
                    ↓
              Viewer Renders (ArtifactSidebar → specific view)
```

---

## Creating a Custom Mode

### Step 1: Define the Mode Template

Create a mode template in `lib/mode-templates.ts`:

```typescript
{
  id: 'your-mode-id',
  name: 'Your Mode Name',
  description: 'What this mode does',
  icon: '🎯',
  system_prompt: `You are a specialized AI agent for [purpose].

## YOUR ROLE
[Define what the agent does]

## TOOLS AVAILABLE
- **create_artifact**: Create [artifact type] artifacts
- **web_search**: Search for information
- [other tools]

## WORKFLOW
1. [Step 1]
2. [Step 2]
3. ALWAYS call create_artifact with kind: "[your-kind]"

## IMPORTANT RULES
- ALWAYS create an artifact using create_artifact
- [other rules]`,

  enabled_tools: {
    create_artifact: {
      enabled: true,
      allowed_kinds: ['your-kind', 'other-kind'],
    },
    web_search: { enabled: true },
    // other tools...
  },
  
  primary_artifact_types: ['your-kind'],
  is_agent_enabled: true,
}
```

### Step 2: Add to Specialist Registry (if orchestrator-invokable)

If the mode should be callable by the orchestrator, add it to `lib/agents/specialist-registry.ts`:

```typescript
your_specialist: {
  id: 'your_specialist',
  name: 'Your Specialist Name',
  description: 'What this specialist does',
  shortDescription: 'Brief description',
  icon: '🎯',
  color: 'blue',
  capabilities: ['capability 1', 'capability 2'],
  primaryOutputType: 'artifact',
  primaryArtifactKinds: ['your-kind'],
  modelCategory: 'reasoning', // or 'generation', 'analysis', 'quick'
  tools: {
    create_artifact: {
      enabled: true,
      allowed_kinds: ['your-kind'],
    },
    // other tools...
  },
  systemPrompt: YOUR_SPECIALIST_PROMPT,
  useCases: ['use case 1', 'use case 2'],
  triggerKeywords: ['keyword1', 'keyword2'],
}
```

### Step 3: Database Mode (Optional)

If storing in database, create a migration:

```sql
INSERT INTO custom_modes (name, system_prompt, enabled_tools, primary_artifact_types, ...)
VALUES (
  'Your Mode Name',
  E'Your system prompt...',
  '{"create_artifact": {"enabled": true, "allowed_kinds": ["your-kind"]}}'::jsonb,
  ARRAY['your-kind'],
  ...
);
```

---

## Creating a Custom Artifact Type

### Step 1: Define the Type

Add your artifact kind to `types/artifacts.ts`:

```typescript
export type ArtifactKind =
  | 'email'
  | 'calendar'
  | 'your-kind'  // Add your kind
  // ...
```

### Step 2: Define Metadata Interface

Add a metadata interface in `types/artifacts.ts`:

```typescript
export interface YourKindMetadata extends SharedMetadata {
  // Required fields
  primary_field: string;
  
  // Optional fields
  secondary_field?: string;
  
  // Structured data
  items?: YourItem[];
}

export interface YourItem {
  id: string;
  title: string;
  // other fields...
}

export interface YourKindArtifact extends BaseArtifact<'your-kind', YourKindMetadata> {}
```

### Step 3: Add Tool Schema

Add schema validation in `lib/tools/artifact-tool.ts`:

```typescript
// Item schema
export const YourItemSchema = z.object({
  id: z.string().describe('Unique identifier'),
  title: z.string().describe('Item title'),
  // other fields...
});

// Add to ArtifactToolSchema
export const ArtifactToolSchema = z.object({
  kind: z.enum([..., 'your-kind']),
  // ...existing fields...
  
  // Your kind-specific fields
  your_kind_items: z.array(YourItemSchema).optional(),
  your_kind_setting: z.string().optional(),
});
```

### Step 4: Handle in Chat Route

Add metadata extraction in `app/api/chat/route.ts`:

```typescript
// For your_kind artifacts, extract data
if (artifactArgs.kind === 'your-kind' && toolArgs.your_kind_items) {
  baseMetadata.items = toolArgs.your_kind_items;
  baseMetadata.setting = toolArgs.your_kind_setting;
}
```

### Step 5: Add Validation (Optional)

Add validation in `lib/artifact-worthiness.ts`:

```typescript
export function validateYourKindInput(
  toolArgs: Record<string, unknown>
): ToolInputValidationResult {
  const errors: string[] = [];
  
  if (!toolArgs.your_kind_items || !Array.isArray(toolArgs.your_kind_items)) {
    errors.push('your_kind_items array is required');
  }
  
  return { isValid: errors.length === 0, errors, warnings: [] };
}

// Add to validateArtifactToolInput switch
case 'your-kind':
  return validateYourKindInput(toolArgs);
```

### Step 6: Create Viewer Component

Create `components/artifacts/YourKindArtifactView.tsx`:

```tsx
interface YourKindArtifactViewProps {
  items: YourItem[];
  title: string;
  metadata?: YourKindMetadata;
  isStreaming?: boolean;
}

export function YourKindArtifactView({
  items,
  title,
  metadata,
  isStreaming,
}: YourKindArtifactViewProps) {
  return (
    <div>
      <h2>{title}</h2>
      {items.map(item => (
        <div key={item.id}>
          {item.title}
        </div>
      ))}
    </div>
  );
}
```

### Step 7: Register in Artifact Sidebar

Add to the switch in `components/artifacts/ArtifactSidebar.tsx`:

```tsx
case 'your-kind':
  // Parse metadata
  const yourKindItems = metadata?.items || [];
  
  return (
    <YourKindArtifactView
      items={yourKindItems}
      title={artifact.title}
      metadata={metadata}
      isStreaming={isStreaming}
    />
  );
```

---

## Tool Configuration

### enabled_tools Structure

```typescript
enabled_tools: {
  create_artifact: {
    enabled: boolean;
    allowed_kinds?: ArtifactKind[];  // Restrict to specific kinds
  },
  web_search: {
    enabled: boolean;
    max_uses?: number;
    allowed_domains?: string[];
  },
  invoke_agent: {
    enabled: boolean;
    allowed_agents?: string[];
  },
  suggest_conversation_plan: {
    enabled: boolean;  // Usually false for artifact-focused modes
  },
  // ... other tools
}
```

### Tool Priority

For artifact-focused modes:
1. **Enable** `create_artifact` with specific `allowed_kinds`
2. **Disable** `suggest_conversation_plan` (use artifacts instead)
3. **Enable** supporting tools as needed (web_search, save_memory)

---

## Tool Choice Forcing

For modes that MUST create artifacts, force tool use until the artifact exists.

### For Custom Modes

Add to `ARTIFACT_REQUIRED_MODES` in `app/api/chat/route.ts`:

```typescript
const ARTIFACT_REQUIRED_MODES: Record<string, { kind: string; toolName: string }> = {
  'Calendar Planner': { kind: 'calendar', toolName: 'create_artifact' },
  'Your Mode Name': { kind: 'your-kind', toolName: 'create_artifact' },
};
```

### For Specialists

Add to `ARTIFACT_REQUIRED_SPECIALISTS` in `lib/agents/orchestrator-service.ts`:

```typescript
const ARTIFACT_REQUIRED_SPECIALISTS: Set<SpecialistType> = new Set([
  'calendar_planner',
  'your_specialist',
]);
```

---

## Reference: Calendar Planner

The Calendar Planner is the reference implementation for artifact-focused modes.

### Key Files

| File | Purpose |
|------|---------|
| `lib/agents/specialist-registry.ts` | Specialist config with tools and prompt |
| `lib/mode-templates.ts` | Mode template for custom mode creation |
| `lib/tools/artifact-tool.ts` | CalendarSlotSchema and tool input validation |
| `types/artifacts.ts` | CalendarSlot, CalendarArtifactMetadata types |
| `components/artifacts/CalendarArtifactView.tsx` | Visual calendar renderer |
| `components/artifacts/ArtifactSidebar.tsx` | Routing to CalendarArtifactView |
| `app/api/chat/route.ts` | Tool choice forcing and metadata extraction |
| `lib/artifact-worthiness.ts` | Calendar input validation |

### Configuration Summary

```typescript
// Tool Config
enabled_tools: {
  create_artifact: { enabled: true, allowed_kinds: ['calendar', 'email_brief'] },
  suggest_conversation_plan: { enabled: false },  // DISABLED
  web_search: { enabled: true },
}

// Tool Choice Forcing
ARTIFACT_REQUIRED_MODES['Calendar Planner'] = { kind: 'calendar', toolName: 'create_artifact' }
ARTIFACT_REQUIRED_SPECIALISTS.add('calendar_planner')

// Metadata Mapping
// Tool input: calendar_slots, calendar_month
// DB metadata: slots, month

// Viewer Props
<CalendarArtifactView slots={...} month={...} title={...} />
```

---

## Checklist

Use this checklist when creating a new mode or artifact type:

### New Custom Mode

- [ ] Define mode template in `lib/mode-templates.ts`
- [ ] Add to specialist registry if orchestrator-invokable
- [ ] Write clear system prompt with MUST/ALWAYS for artifact creation
- [ ] Configure `enabled_tools` with allowed artifact kinds
- [ ] Disable conflicting tools (e.g., `suggest_conversation_plan`)
- [ ] Add to `ARTIFACT_REQUIRED_MODES` if tool forcing needed
- [ ] Add to `ARTIFACT_REQUIRED_SPECIALISTS` if applicable
- [ ] Test mode creates artifact on first request
- [ ] Test mode doesn't fall back to plain text

### New Artifact Type

- [ ] Add kind to `ArtifactKind` type union
- [ ] Define metadata interface extending `SharedMetadata`
- [ ] Add Zod schema to `lib/tools/artifact-tool.ts`
- [ ] Add metadata extraction in `app/api/chat/route.ts`
- [ ] Add validation function in `lib/artifact-worthiness.ts`
- [ ] Create viewer component in `components/artifacts/`
- [ ] Register viewer in `ArtifactSidebar.tsx` switch
- [ ] Export viewer from `components/artifacts/index.ts`
- [ ] Add type guard function if needed
- [ ] Write tests for schema validation
- [ ] Test end-to-end: tool call → DB → viewer

---

## Common Pitfalls

1. **Forgetting to force tool choice**: Mode works on first message but falls back to text on subsequent turns
2. **Schema mismatch**: Tool input field names differ from metadata field names
3. **Missing viewer registration**: Artifact saves but shows "Unknown type" in sidebar
4. **Conflicting tools enabled**: `suggest_conversation_plan` competes with `create_artifact`
5. **No validation**: AI creates artifacts with missing required fields
6. **Prompt not emphatic enough**: AI doesn't consistently call tools without "MUST" / "ALWAYS"

---

## Quick Reference

### Adding a Simple Mode (No Custom Artifact)

1. Add to `lib/mode-templates.ts` with standard tools
2. (Optional) Add to specialist registry
3. Test

### Adding an Artifact-Focused Mode (Custom Artifact)

1. Define artifact type + metadata + schema
2. Add metadata extraction in chat route
3. Create viewer component + register
4. Define mode with forced tool choice
5. Add validation
6. Test end-to-end

### Debugging Tips

- Check `[Chat API]` logs for tool choice decisions
- Check `artifact_created` vs `artifact_error` events in stream
- Verify metadata structure matches viewer expectations
- Use browser devtools Network tab to inspect stream events



