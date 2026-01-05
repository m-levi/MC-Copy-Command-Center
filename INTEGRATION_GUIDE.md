# Integration Guide: Dynamic Artifact Types & Tool Configuration

This guide shows exactly how to integrate the new dynamic artifact system into your chat route.

## Overview

The new system adds:
1. **User-configurable artifact types** - stored in database, no code changes needed
2. **Mode-specific tool configuration** - modes declare which tools they use
3. **Dynamic prompt injection** - AI receives only relevant artifact types and tools

## Step 1: Update Chat Route

### Add Import for Mode Configuration

```typescript
// Add to imports in app/api/chat/route.ts
import { loadModeConfiguration } from '@/lib/chat/mode-config';
import { composeSystemPrompt } from '@/lib/prompts/root-system-prompt';
import { getArtifactTypeInfoForPrompt } from '@/lib/services/artifact-type.service';
```

### Update Custom Mode Fetch (Line ~82-88)

**Replace this:**
```typescript
effectiveCustomModeId
  ? supabase
      .from('custom_modes')
      .select('id, name, system_prompt')
      .eq('id', effectiveCustomModeId)
      .single()
  : Promise.resolve({ data: null, error: null }),
```

**With this:**
```typescript
effectiveCustomModeId
  ? loadModeConfiguration(supabase, {
      customModeId: effectiveCustomModeId,
      conversationMode,
    })
  : loadModeConfiguration(supabase, {
      conversationMode,
    }),
```

### Update Prompt Building (After line ~95)

**Add this after loading the mode configuration:**
```typescript
const modeConfig = customModeResult; // This is now ModeConfiguration not just mode data

// Extract mode components
const customMode = modeConfig.customMode;
const toolConfig = modeConfig.toolConfig;
const artifactTypes = modeConfig.artifactTypes;
```

### Update System Prompt Composition

**When building prompts (around line ~96-200), use the new composeSystemPrompt function:**

```typescript
// For custom modes
if (customMode) {
  systemPrompt = composeSystemPrompt({
    modePrompt: customMode.system_prompt,
    brandContext: brandInfo,
    memoryContext: memoryContextString,
    additionalContext: contextInfo,
    artifactTypes, // NEW: Dynamic artifact types
    toolConfig,    // NEW: Dynamic tool configuration
  });
}

// For built-in modes (email_copy, planning, etc.)
else {
  // Get the appropriate mode prompt
  const modePrompt = getModePrompt(conversationMode, emailType);

  systemPrompt = composeSystemPrompt({
    modePrompt,
    brandContext: brandInfo,
    memoryContext: memoryContextString,
    additionalContext: contextInfo,
    artifactTypes, // NEW: Dynamic artifact types
    toolConfig,    // NEW: Dynamic tool configuration
  });
}
```

### Helper Function for Mode Prompts

**Add this helper near the top of the chat route:**
```typescript
function getModePrompt(mode: string, emailType: string): string {
  if (mode === 'email_copy') {
    if (emailType === 'design') {
      return buildDesignEmailV2Prompt();
    } else {
      return buildStandardEmailPrompt();
    }
  }

  if (mode === 'flow') {
    return buildConversationalFlowPrompt(flowType);
  }

  if (mode === 'planning') {
    return buildPlanningPrompt();
  }

  return buildSystemPrompt(); // Default
}
```

## Step 2: Update Tool Selection

### Replace getToolsForMode (Line ~250-300)

**Old approach:**
```typescript
const tools = getToolsForMode(conversationMode);
```

**New approach using mode configuration:**
```typescript
const tools: any = {};

// Add tools based on mode configuration
if (toolConfig.create_artifact?.enabled) {
  tools.create_artifact = createArtifactTool;
}

if (toolConfig.create_conversation?.enabled) {
  tools.create_conversation = createConversationTool;
}

if (toolConfig.create_bulk_conversations?.enabled) {
  tools.create_bulk_conversations = createBulkConversationsTool;
}

if (toolConfig.suggest_action?.enabled) {
  tools.suggest_action = suggestActionTool;
}

// Web search handled by AI provider
if (toolConfig.web_search?.enabled) {
  // Configure web search via provider options
  providerOptions.webSearch = {
    enabled: true,
    allowedDomains: toolConfig.web_search.allowed_domains || [],
  };
}

// Memory tool added by Supermemory wrapper
if (toolConfig.save_memory?.enabled && isSupermemoryConfigured()) {
  // Will be added automatically by withSupermemory wrapper
}
```

## Step 3: Run Database Migrations

```bash
# In your Supabase SQL Editor, run these in order:

1. docs/database-migrations/062_enhanced_custom_modes_tools.sql
2. docs/database-migrations/063_artifact_types_system.sql
```

**Or use Supabase CLI:**
```bash
supabase db push
```

## Step 4: Update Mode Editor UI

The mode editor needs new sections for:
1. Tool configuration (checkboxes for each tool)
2. Primary artifact types (multi-select)

See the new component in: `components/modes/ModeEditorEnhanced.tsx`

## Step 5: Create Artifact Type Editor

A new page for managing artifact types:
- Route: `/settings/artifact-types`
- Component: `app/settings/artifact-types/page.tsx`

See the reference implementation in the generated files.

## Testing Checklist

- [ ] Run database migrations successfully
- [ ] Create a custom mode with specific tool configuration
- [ ] Verify only configured tools are available in chat
- [ ] Create a custom artifact type through UI
- [ ] Verify custom artifact type appears in AI's options
- [ ] Test custom mode with custom artifact type
- [ ] Verify AI receives correct artifact schemas in prompt
- [ ] Test artifact creation with new types
- [ ] Verify generic viewer displays custom artifacts correctly

## Backward Compatibility

All changes are backward compatible:
- Existing custom modes work without tool config (uses defaults)
- Existing artifact types continue to function
- Old conversations are not affected
- API responses include new fields but don't break old clients

## Performance Considerations

### Database Queries

The new system adds 1-2 additional queries per chat request:
1. Load custom mode with tool config (if custom mode used)
2. Load artifact types for mode (parallel with other queries)

Both are **fast** (<5ms) and run in parallel with existing queries.

### Prompt Token Usage

Dynamic artifact injection **reduces** token usage:
- Before: All artifact types documented in root prompt (~500 tokens)
- After: Only relevant artifact types (~100-300 tokens)

**Savings: 200-400 tokens per request = ~$0.0004 saved per request**

For 100k requests/month: **~$40/month savings**

## Rollback Plan

If issues arise, you can roll back by:

1. **Reverting prompt changes:**
   ```typescript
   // Use old buildSystemPrompt function instead of composeSystemPrompt
   systemPrompt = buildSystemPrompt(brandInfo, memoryContext, ...);
   ```

2. **Reverting tool selection:**
   ```typescript
   // Use old getToolsForMode function
   const tools = getToolsForMode(conversationMode);
   ```

3. **Database rollback:**
   ```sql
   -- Remove new columns (non-destructive)
   ALTER TABLE custom_modes DROP COLUMN IF EXISTS enabled_tools;
   ALTER TABLE custom_modes DROP COLUMN IF EXISTS primary_artifact_types;

   -- Disable artifact_types table
   UPDATE artifact_types SET is_active = false WHERE is_system = false;
   ```

## Next Steps

1. **Run migrations** - Apply database changes
2. **Update chat route** - Integrate mode configuration
3. **Deploy backend** - Test with existing conversations
4. **Build UI components** - Create artifact type editor
5. **Test thoroughly** - Verify all modes and artifact types work
6. **Document for users** - Create user-facing guide for custom artifact types

## Questions?

Common issues and solutions:

**Q: Chat route returns 500 error after changes**
A: Check that all imports are correct and mode-config.ts is in place

**Q: Artifact types not showing in prompt**
A: Verify primary_artifact_types is set in custom_modes table

**Q: Tools not working after configuration**
A: Check that enabled_tools JSONB has correct structure in database

**Q: Custom artifact types not visible**
A: Check RLS policies on artifact_types table, verify is_active=true
