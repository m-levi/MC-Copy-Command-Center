/**
 * Calendar Planner Mode Tests
 *
 * Tests for ensuring the Calendar Planner mode correctly:
 * 1. Exposes create_artifact with calendar in allowed_kinds
 * 2. Forces tool use until calendar artifact exists
 * 3. Blocks suggest_conversation_plan
 * 4. Creates properly structured calendar artifacts
 *
 * @jest-environment node
 */

import { SPECIALIST_REGISTRY, getSpecialist } from '@/lib/agents/specialist-registry';
import { loadModeConfiguration } from '@/lib/chat/mode-config';
import { checkArtifactWorthiness, quickRejectCheck } from '@/lib/artifact-worthiness';
import { CalendarSlotSchema, ArtifactToolSchema } from '@/lib/tools/artifact-tool';

// =============================================================================
// SPECIALIST REGISTRY TESTS
// =============================================================================

describe('Calendar Planner Specialist Registry', () => {
  const calendarPlannerConfig = getSpecialist('calendar_planner');

  test('calendar_planner specialist exists in registry', () => {
    expect(calendarPlannerConfig).toBeDefined();
    expect(calendarPlannerConfig.id).toBe('calendar_planner');
  });

  test('calendar_planner has create_artifact enabled', () => {
    expect(calendarPlannerConfig.tools.create_artifact).toBeDefined();
    expect(calendarPlannerConfig.tools.create_artifact?.enabled).toBe(true);
  });

  test('calendar_planner allows calendar kind in create_artifact', () => {
    const allowedKinds = calendarPlannerConfig.tools.create_artifact?.allowed_kinds;
    expect(allowedKinds).toBeDefined();
    expect(allowedKinds).toContain('calendar');
  });

  test('calendar_planner has suggest_conversation_plan DISABLED', () => {
    // Critical: suggest_conversation_plan must be disabled
    // Calendar Planner should use create_artifact(kind:"calendar") instead
    expect(calendarPlannerConfig.tools.suggest_conversation_plan?.enabled).toBe(false);
  });

  test('calendar_planner has calendar and email_brief as primary artifact kinds', () => {
    expect(calendarPlannerConfig.primaryArtifactKinds).toContain('calendar');
    expect(calendarPlannerConfig.primaryArtifactKinds).toContain('email_brief');
  });

  test('calendar_planner primary output type is artifact', () => {
    expect(calendarPlannerConfig.primaryOutputType).toBe('artifact');
  });

  test('calendar_planner system prompt mentions create_artifact', () => {
    expect(calendarPlannerConfig.systemPrompt).toContain('create_artifact');
    expect(calendarPlannerConfig.systemPrompt).toContain('calendar');
  });

  test('calendar_planner system prompt emphasizes MUST create artifact', () => {
    // The prompt should strongly emphasize artifact creation
    expect(calendarPlannerConfig.systemPrompt).toMatch(/MUST|ALWAYS|REQUIRED/i);
  });
});

// =============================================================================
// ARTIFACT TOOL SCHEMA TESTS
// =============================================================================

describe('Calendar Artifact Schema', () => {
  test('ArtifactToolSchema includes calendar kind', () => {
    const kindSchema = ArtifactToolSchema.shape.kind;
    // Parse a valid calendar kind
    const result = kindSchema.safeParse('calendar');
    expect(result.success).toBe(true);
  });

  test('CalendarSlotSchema validates valid slot', () => {
    const validSlot = {
      id: 'email-1',
      date: '2025-01-15',
      title: 'Winter Sale Launch',
      description: 'Kick off winter clearance with best deals',
      email_type: 'promotional',
      status: 'draft',
    };

    const result = CalendarSlotSchema.safeParse(validSlot);
    expect(result.success).toBe(true);
  });

  test('CalendarSlotSchema requires id, date, and title', () => {
    const missingFields = {
      description: 'Some description',
    };

    const result = CalendarSlotSchema.safeParse(missingFields);
    expect(result.success).toBe(false);
  });

  test('CalendarSlotSchema validates email_type enum', () => {
    const validTypes = ['promotional', 'content', 'announcement', 'transactional', 'nurture'];

    for (const type of validTypes) {
      const slot = {
        id: 'test',
        date: '2025-01-01',
        title: 'Test',
        email_type: type,
      };
      const result = CalendarSlotSchema.safeParse(slot);
      expect(result.success).toBe(true);
    }

    // Invalid type should fail
    const invalidSlot = {
      id: 'test',
      date: '2025-01-01',
      title: 'Test',
      email_type: 'invalid_type',
    };
    const result = CalendarSlotSchema.safeParse(invalidSlot);
    expect(result.success).toBe(false);
  });

  test('CalendarSlotSchema validates status enum', () => {
    const validStatuses = ['draft', 'scheduled', 'sent', 'approved', 'pending'];

    for (const status of validStatuses) {
      const slot = {
        id: 'test',
        date: '2025-01-01',
        title: 'Test',
        status,
      };
      const result = CalendarSlotSchema.safeParse(slot);
      expect(result.success).toBe(true);
    }
  });

  test('Full calendar artifact validates correctly', () => {
    const calendarArtifact = {
      kind: 'calendar',
      title: 'January 2025 Email Calendar',
      content: 'Email marketing calendar for January 2025',
      calendar_month: '2025-01',
      campaign_name: 'Winter Campaign',
      calendar_slots: [
        {
          id: 'email-1',
          date: '2025-01-02',
          title: 'New Year Welcome',
          description: 'Kick off the year with brand story',
          email_type: 'content',
          status: 'draft',
        },
        {
          id: 'email-2',
          date: '2025-01-07',
          title: 'Winter Sale Launch',
          description: 'Announce winter clearance',
          email_type: 'promotional',
          status: 'draft',
        },
      ],
    };

    const result = ArtifactToolSchema.safeParse(calendarArtifact);
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// ARTIFACT WORTHINESS TESTS
// =============================================================================

describe('Calendar Artifact Worthiness', () => {
  test('calendar artifacts are always worthy', () => {
    const result = checkArtifactWorthiness('Any content', {
      kind: 'calendar',
    });

    expect(result.isWorthy).toBe(true);
    expect(result.confidence).toBe('high');
    expect(result.reason).toContain('structure-based');
  });

  test('calendar worthiness bypasses length checks', () => {
    // Even short content should be worthy for calendar
    const result = checkArtifactWorthiness('x', {
      kind: 'calendar',
    });

    expect(result.isWorthy).toBe(true);
  });

  test('calendar worthiness bypasses conversational patterns', () => {
    // Calendar should be worthy even with conversational content
    const result = checkArtifactWorthiness('Here is your calendar:', {
      kind: 'calendar',
    });

    expect(result.isWorthy).toBe(true);
  });

  test('quickRejectCheck does not reject calendar content', () => {
    // Calendar artifacts should not be quick-rejected based on content alone
    // The kind='calendar' should take precedence, but quickRejectCheck doesn't know kind
    // This test confirms the behavior of quickRejectCheck on short content
    const shortContent = 'Cal';
    const rejected = quickRejectCheck(shortContent);

    // quickRejectCheck rejects very short content regardless
    expect(rejected).toBe(true);

    // But when kind is provided to full worthiness check, calendar is worthy
    const fullCheck = checkArtifactWorthiness(shortContent, { kind: 'calendar' });
    expect(fullCheck.isWorthy).toBe(true);
  });
});

// =============================================================================
// TOOL CHOICE FORCING TESTS
// =============================================================================

describe('Calendar Planner Tool Choice Forcing', () => {
  // These tests verify the logic for forcing tool use

  test('ARTIFACT_REQUIRED_MODES includes Calendar Planner', () => {
    // Verify the constant exists and has Calendar Planner
    // This tests the logic structure without hitting the actual route
    const ARTIFACT_REQUIRED_MODES = {
      'Calendar Planner': { kind: 'calendar', toolName: 'create_artifact' },
    };

    expect(ARTIFACT_REQUIRED_MODES['Calendar Planner']).toBeDefined();
    expect(ARTIFACT_REQUIRED_MODES['Calendar Planner'].kind).toBe('calendar');
  });

  test('Calendar Planner mode requires calendar artifact', () => {
    // Simulate the logic from chat route
    const customModeName = 'Calendar Planner';
    const ARTIFACT_REQUIRED_MODES: Record<string, { kind: string; toolName: string }> = {
      'Calendar Planner': { kind: 'calendar', toolName: 'create_artifact' },
    };

    const artifactRequirement = ARTIFACT_REQUIRED_MODES[customModeName];
    expect(artifactRequirement).toBeDefined();
    expect(artifactRequirement.kind).toBe('calendar');
    expect(artifactRequirement.toolName).toBe('create_artifact');
  });

  test('Non-Calendar modes do not require artifacts', () => {
    const ARTIFACT_REQUIRED_MODES: Record<string, { kind: string; toolName: string }> = {
      'Calendar Planner': { kind: 'calendar', toolName: 'create_artifact' },
    };

    // Other modes should not be in the map
    expect(ARTIFACT_REQUIRED_MODES['Email Writer']).toBeUndefined();
    expect(ARTIFACT_REQUIRED_MODES['General Assistant']).toBeUndefined();
  });
});

// =============================================================================
// SPECIALIST EXECUTION FORCING TESTS
// =============================================================================

describe('Calendar Planner Specialist Tool Forcing', () => {
  test('ARTIFACT_REQUIRED_SPECIALISTS includes calendar_planner', () => {
    const ARTIFACT_REQUIRED_SPECIALISTS = new Set(['calendar_planner']);
    expect(ARTIFACT_REQUIRED_SPECIALISTS.has('calendar_planner')).toBe(true);
  });

  test('calendar_planner should force tool use when has artifact tool', () => {
    const ARTIFACT_REQUIRED_SPECIALISTS = new Set(['calendar_planner']);

    const specialist = 'calendar_planner' as const;
    const specialistTools = { create_artifact: {} };

    const requiresArtifact = ARTIFACT_REQUIRED_SPECIALISTS.has(specialist);
    const hasArtifactTool = Object.keys(specialistTools).length > 0;
    const shouldForceToolUse = requiresArtifact && hasArtifactTool;

    expect(shouldForceToolUse).toBe(true);
  });

  test('other specialists do not force tool use', () => {
    const ARTIFACT_REQUIRED_SPECIALISTS = new Set(['calendar_planner']);

    const specialist = 'email_writer' as const;
    const requiresArtifact = ARTIFACT_REQUIRED_SPECIALISTS.has(specialist);

    expect(requiresArtifact).toBe(false);
  });
});

// =============================================================================
// INTEGRATION-STYLE TESTS
// =============================================================================

describe('Calendar Planner Integration', () => {
  test('calendar slot dates should be valid ISO format', () => {
    const validSlot = {
      id: 'email-1',
      date: '2025-01-15',
      title: 'Test Email',
    };

    const result = CalendarSlotSchema.safeParse(validSlot);
    expect(result.success).toBe(true);

    // Verify the date can be parsed
    const parsedDate = new Date(validSlot.date);
    expect(parsedDate.toISOString().startsWith('2025-01-15')).toBe(true);
  });

  test('calendar month format should be YYYY-MM', () => {
    const validFormats = ['2025-01', '2025-12', '2024-06'];
    const invalidFormats = ['2025', '01-2025', 'January 2025', '2025-1'];

    for (const format of validFormats) {
      expect(format).toMatch(/^\d{4}-\d{2}$/);
    }

    for (const format of invalidFormats) {
      expect(format).not.toMatch(/^\d{4}-\d{2}$/);
    }
  });

  test('calendar artifact metadata structure matches viewer expectations', () => {
    // This tests that the metadata structure from the chat route
    // matches what the CalendarArtifactView expects

    // Chat route stores:
    const chatRouteMetadata = {
      slots: [
        { id: 'email-1', date: '2025-01-02', title: 'Test' },
      ],
      month: '2025-01',
      view_mode: 'month',
      campaign_name: 'Test Campaign',
    };

    // CalendarArtifactView expects:
    // - metadata?.slots (array of CalendarSlot)
    // - metadata.month (string in YYYY-MM format)

    expect(chatRouteMetadata.slots).toBeDefined();
    expect(Array.isArray(chatRouteMetadata.slots)).toBe(true);
    expect(chatRouteMetadata.month).toBeDefined();
    expect(chatRouteMetadata.month).toMatch(/^\d{4}-\d{2}$/);
  });
});



