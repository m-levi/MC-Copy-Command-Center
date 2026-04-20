/**
 * Shared fallback strings and kind labels for chat responses.
 *
 * Centralised here so the server, client stream handlers, and message
 * components all speak with one voice when something goes wrong or the
 * model produces no visible text.
 */

export const CHAT_FALLBACKS = {
  /** Rendered when a persisted message row has empty content. */
  emptyMessageDisplay: "I wasn't able to generate a response. Please try again.",
  /** Emitted by the server when the stream finished with no text and no artifacts. */
  streamProducedNothing:
    "I wasn't able to generate a response this time. Please try rephrasing your request or send it again.",
  /** Used on the client when the final accumulated text is empty but thinking ran. */
  thinkingOnly:
    "I thought through your request but didn't produce a final response. Please try again or rephrase.",
  /** Used on the client in the main send flow when everything is empty. */
  sendRetry: "I wasn't able to generate a response. Please try again.",
  /** Used on the client after a failed regenerate-section call. */
  regenerateSectionRetry:
    "I wasn't able to regenerate this section. Please try again.",
} as const;

/**
 * Human-readable labels for artifact kinds. Used when synthesising a
 * "I've created X for you" message for tool-call-only responses.
 */
export const ARTIFACT_KIND_LABELS: Record<string, string> = {
  calendar: 'calendar',
  email: 'email copy',
  email_copy: 'email copy',
  email_brief: 'email brief',
  flow: 'flow',
  subject_lines: 'subject lines',
  content_brief: 'content brief',
  template: 'template',
  campaign: 'campaign plan',
  markdown: 'document',
  document: 'document',
  spreadsheet: 'spreadsheet',
  code: 'code snippet',
  checklist: 'checklist',
};

/**
 * Build the "I've created X and Y for you…" fallback sentence from a list
 * of created artifacts.
 */
export function buildArtifactCreatedFallback(
  artifacts: Array<{ kind: string; title: string }>
): string {
  const descriptions = artifacts.map(
    (a) => `${ARTIFACT_KIND_LABELS[a.kind] || a.kind} "${a.title}"`
  );
  return `I've created ${descriptions.join(
    ' and '
  )} for you. You can view and edit it in the sidebar.`;
}
