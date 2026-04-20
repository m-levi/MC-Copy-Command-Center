import {
  CHAT_FALLBACKS,
  ARTIFACT_KIND_LABELS,
  buildArtifactCreatedFallback,
} from '@/lib/chat/fallbacks';

describe('chat/fallbacks', () => {
  describe('CHAT_FALLBACKS', () => {
    it('defines all the strings the chat pipeline uses', () => {
      expect(CHAT_FALLBACKS.emptyMessageDisplay).toBeTruthy();
      expect(CHAT_FALLBACKS.streamProducedNothing).toBeTruthy();
      expect(CHAT_FALLBACKS.thinkingOnly).toBeTruthy();
      expect(CHAT_FALLBACKS.sendRetry).toBeTruthy();
      expect(CHAT_FALLBACKS.regenerateSectionRetry).toBeTruthy();
    });

    it('never returns the dead "No content" string', () => {
      for (const value of Object.values(CHAT_FALLBACKS)) {
        expect(value).not.toBe('No content');
        expect(value.toLowerCase()).not.toBe('no content');
      }
    });
  });

  describe('buildArtifactCreatedFallback', () => {
    it('formats a single artifact with its human label', () => {
      const result = buildArtifactCreatedFallback([
        { kind: 'email', title: 'Summer Sale Launch' },
      ]);
      expect(result).toContain('email copy "Summer Sale Launch"');
      expect(result).toContain('sidebar');
    });

    it('joins multiple artifacts with " and "', () => {
      const result = buildArtifactCreatedFallback([
        { kind: 'calendar', title: 'April Plan' },
        { kind: 'email_brief', title: 'Kickoff Email' },
      ]);
      expect(result).toContain('calendar "April Plan"');
      expect(result).toContain('email brief "Kickoff Email"');
      expect(result).toContain(' and ');
    });

    it('falls back to the raw kind when unmapped', () => {
      const result = buildArtifactCreatedFallback([
        { kind: 'mystery', title: 'X' },
      ]);
      expect(result).toContain('mystery "X"');
    });

    it('has a human label registered for every kind the chat route persists', () => {
      // These kinds all appear in app/api/chat/route.ts artifact handling.
      const kindsFromRoute = [
        'email',
        'flow',
        'campaign',
        'template',
        'subject_lines',
        'content_brief',
        'email_brief',
        'calendar',
        'markdown',
        'spreadsheet',
        'code',
        'checklist',
      ];
      for (const kind of kindsFromRoute) {
        expect(ARTIFACT_KIND_LABELS[kind]).toBeTruthy();
      }
    });
  });
});
