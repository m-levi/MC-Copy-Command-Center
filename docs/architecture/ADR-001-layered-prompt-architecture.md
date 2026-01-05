# ADR-001: Layered Prompt Architecture with Dynamic Tool & Artifact Configuration

**Status:** Accepted
**Date:** 2025-12-22
**Decision Makers:** Architecture Team
**Affected Components:** Chat API, Modes System, Artifacts System, Prompts

---

## Context

We needed a flexible system where:
1. Users can customize AI behavior through "modes" (custom system prompts)
2. Modes can specify which tools and artifact types they work with
3. The AI receives only relevant information (not all tools and artifacts)
4. Users can create custom artifact types without code changes
5. The system remains performant and maintainable

### Previous Approach

**Before this decision:**
- All artifact types were hardcoded in TypeScript
- All tools were globally available or hardcoded per mode
- Root system prompt included all artifacts and tools (wasteful)
- Adding new artifact types required code changes and deployment
- No way for custom modes to declare tool preferences

**Problems with previous approach:**
- Limited extensibility - users couldn't create custom artifact types
- Token waste - AI received information about all artifacts even if irrelevant
- Maintenance burden - adding artifact types required touching multiple files
- Unclear capabilities - hard to tell what a mode can do
- No fine-grained control - tools were all-or-nothing

---

## Decision

We adopt a **three-layer prompt architecture** with **dynamic configuration injection**:

```
┌─────────────────────────────────────────────────────┐
│ Layer 1: Root System Prompt (Dynamic)              │
│ ─────────────────────────────────────────────────  │
│ • System information (date, time, timezone)        │
│ • DYNAMIC: Available tools (based on mode config)  │
│ • DYNAMIC: Artifact types (based on mode config)   │
│ • Output format guidelines                         │
│ • Core behaviors                                   │
│                                                     │
│ Purpose: Defines the "operating system" for the AI │
│ Stability: Stable structure, dynamic content       │
└─────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│ Layer 2: Mode-Specific Prompt                      │
│ ─────────────────────────────────────────────────  │
│ • Personality and expertise                        │
│ • Behavior instructions                            │
│ • Output preferences                               │
│ • Domain knowledge                                 │
│                                                     │
│ Purpose: Defines the "agent" specialization        │
│ Stability: User-customizable, frequently changed   │
└─────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│ Layer 3: Dynamic Context Injection                 │
│ ─────────────────────────────────────────────────  │
│ • Brand voice and guidelines                       │
│ • RAG context (relevant documents)                 │
│ • Memory context (Supermemory)                     │
│ • Conversation context (goals, audience, etc.)     │
│                                                     │
│ Purpose: Situational awareness for this request    │
│ Stability: Changes every request                   │
└─────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

#### 1. **User-Configurable Artifact Types**

**Decision:** Store artifact type definitions in the database (`artifact_types` table).

**Structure:**
```sql
artifact_types (
  id UUID,
  kind VARCHAR(50) UNIQUE,      -- e.g., 'linkedin_post'
  name VARCHAR(100),             -- 'LinkedIn Post'
  description TEXT,
  icon VARCHAR(50),
  field_schema JSONB,            -- JSON Schema for validation
  supports_variants BOOLEAN,
  supports_sharing BOOLEAN,
  viewer_type VARCHAR(50),       -- 'generic', 'email', 'flow', 'custom'
  is_system BOOLEAN,             -- Built-in vs user-created
  created_by_user_id UUID
)
```

**Rationale:**
- **Extensibility:** Users can create new artifact types through UI
- **No deployments:** New artifact types don't require code changes
- **Type safety:** JSON Schema validates artifact metadata
- **Flexibility:** Each artifact type can specify capabilities
- **Ownership:** Users control their custom types

#### 2. **Mode-Specific Tool Configuration**

**Decision:** Let modes declare which tools they need via `enabled_tools` JSONB field.

**Structure:**
```typescript
interface ModeToolConfig {
  create_artifact?: {
    enabled: boolean;
    allowed_kinds?: string[] | null;  // Restrict to specific artifact types
  };
  create_conversation?: { enabled: boolean };
  create_bulk_conversations?: { enabled: boolean };
  suggest_action?: { enabled: boolean };
  web_search?: {
    enabled: boolean;
    allowed_domains?: string[];
    max_uses?: number;
  };
  save_memory?: { enabled: boolean };
}
```

**Rationale:**
- **Explicit capabilities:** Clear what each mode can do
- **Security:** Restrict dangerous tools (e.g., web_search) per mode
- **Performance:** Only document relevant tools in prompt (saves tokens)
- **User control:** Users decide tool availability for custom modes
- **Granular restrictions:** Can limit artifact types, domains, usage limits

#### 3. **Dynamic Prompt Injection**

**Decision:** Inject only relevant artifacts and tools based on mode configuration.

**Implementation:**
```typescript
// Load mode configuration
const { toolConfig, artifactTypes } = await loadModeConfiguration(supabase, {
  customModeId,
  conversationMode,
});

// Build prompt with only relevant information
const systemPrompt = composeSystemPrompt({
  modePrompt: customMode.system_prompt,
  brandContext,
  memoryContext,
  artifactTypes,  // Only types this mode uses
  toolConfig,     // Only tools this mode has enabled
});
```

**Rationale:**
- **Token efficiency:** Don't waste tokens on irrelevant tools/artifacts
- **Focused AI:** AI sees only what it needs for this mode
- **Better results:** Less confusion from irrelevant options
- **Cost savings:** ~200-400 tokens saved per request (~$40/month for 100k requests)

#### 4. **Registry Pattern for Artifacts**

**Decision:** Use a registry pattern (`ARTIFACT_KIND_REGISTRY`) as a migration path.

**Current state:**
```typescript
export const ARTIFACT_KIND_REGISTRY: Record<ArtifactKind, ArtifactKindConfig> = {
  email: { kind: 'email', label: 'Email Copy', ... },
  flow: { kind: 'flow', label: 'Email Flow', ... },
  // ... etc
};
```

**Rationale:**
- **Backward compatibility:** Existing code continues to work
- **Migration path:** Gradual move from hardcoded to database-driven
- **Type safety:** TypeScript still knows about built-in types
- **Performance:** Fast lookup for common cases (built-in types)
- **Future:** Can deprecate once fully database-driven

#### 5. **Generic Artifact Viewer**

**Decision:** Create a generic viewer that renders artifacts based on their schema.

**Rationale:**
- **Extensibility:** Works with any artifact type without code changes
- **Consistency:** All artifacts get a standard viewer experience
- **Custom viewers:** Can still create specialized viewers (email, flow) for better UX
- **Fallback:** Unknown artifact types get a basic but functional viewer

---

## Consequences

### Positive

1. **User Empowerment**
   - Users can create custom artifact types without developer intervention
   - Users control tool availability per mode
   - Non-technical users can extend the system

2. **Performance Improvement**
   - Token savings: ~200-400 tokens per request
   - Cost savings: ~$40/month for 100k requests
   - Faster AI responses (fewer tokens to process)

3. **Maintainability**
   - Less code to maintain (database-driven configuration)
   - Fewer deployments needed
   - Clear separation of concerns

4. **Flexibility**
   - Easy to add new artifact types
   - Easy to create specialized modes
   - Easy to experiment with new tools

5. **Security**
   - Fine-grained control over tool access
   - Can restrict dangerous tools per mode
   - User-level permissions via RLS

### Negative

1. **Complexity**
   - More database queries (1-2 additional per request)
   - More configuration options to understand
   - Migration effort for existing code

2. **Database Dependency**
   - Artifact type definitions are critical data
   - Database migrations required for schema changes
   - Need to manage artifact type versioning

3. **Type Safety Challenges**
   - JSON Schema validation at runtime vs TypeScript at compile-time
   - Potential mismatch between schema and actual data
   - Generic viewer may not be as good as specialized viewers

4. **Learning Curve**
   - Users need to understand artifact schemas
   - Developers need to understand new architecture
   - Documentation burden

### Mitigation Strategies

1. **Performance:** Database queries run in parallel with existing queries (<5ms impact)
2. **Complexity:** Comprehensive integration guide and documentation
3. **Type Safety:** Validate JSON Schemas strictly, provide TypeScript types for common cases
4. **Learning Curve:** UI wizards for creating artifact types, templates for common patterns

---

## Alternatives Considered

### Alternative 1: Keep Everything Hardcoded

**Pros:** Simple, type-safe, fast
**Cons:** Not extensible, requires deployments, high maintenance

**Why rejected:** Doesn't meet extensibility requirements. Users can't customize without code changes.

### Alternative 2: Full DSL for Artifact Definition

Create a domain-specific language for defining artifacts.

**Pros:** More expressive, compile-time validation
**Cons:** Complex to implement, steep learning curve, over-engineered

**Why rejected:** JSON Schema provides 90% of benefits with 10% of complexity.

### Alternative 3: Plugin System

Allow users to upload JavaScript code for custom artifact types.

**Pros:** Maximum flexibility
**Cons:** Security nightmare, execution risks, complex sandboxing

**Why rejected:** Security and complexity risks outweigh benefits. JSON Schema is safer.

### Alternative 4: Microservices for Artifact Types

Separate service for artifact type management.

**Pros:** Better separation, independent scaling
**Cons:** Adds latency, operational complexity, network dependencies

**Why rejected:** Over-engineered for current scale. Database-driven approach is simpler.

---

## Implementation Plan

### Phase 1: Foundation (Completed)
- [x] Database migrations for artifact_types table
- [x] Database migrations for custom_modes tool configuration
- [x] Update TypeScript types
- [x] Create artifact type service layer
- [x] Create API routes for artifact types

### Phase 2: Core Integration (In Progress)
- [x] Update root system prompt for dynamic injection
- [x] Create mode configuration loader
- [x] Update chat route integration points (documented in guide)
- [ ] Update tool selection logic
- [ ] Test with existing conversations

### Phase 3: UI Components (Pending)
- [ ] Create artifact type editor page
- [ ] Update mode editor for tool configuration
- [ ] Create generic artifact viewer
- [ ] Create artifact type picker component

### Phase 4: Polish & Documentation (Pending)
- [ ] User-facing documentation
- [ ] Video tutorials for custom artifact types
- [ ] Example artifact type templates
- [ ] Performance monitoring

---

## Success Metrics

### Adoption Metrics
- Number of custom artifact types created by users
- Number of custom modes using tool configuration
- Usage frequency of custom artifact types

### Performance Metrics
- Average tokens saved per request (target: 200-400)
- Chat response time (should remain < 2s)
- Database query time for artifact types (target: < 5ms)

### Quality Metrics
- Number of bugs related to artifact system
- User satisfaction with custom artifact types
- Support tickets related to configuration

---

## References

- [Integration Guide](../../INTEGRATION_GUIDE.md)
- [Artifact Types Schema](../../docs/database-migrations/063_artifact_types_system.sql)
- [Mode Tool Configuration Schema](../../docs/database-migrations/062_enhanced_custom_modes_tools.sql)
- [Root System Prompt Implementation](../../lib/prompts/root-system-prompt.ts)
- [Mode Configuration Loader](../../lib/chat/mode-config.ts)

---

## Review and Updates

**Last Reviewed:** 2025-12-22
**Next Review:** 2026-01-22 (1 month)
**Update Frequency:** Review after major feature additions or when issues arise

### Changelog
- **2025-12-22:** Initial ADR created documenting layered prompt architecture
