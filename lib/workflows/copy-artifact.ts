/**
 * Shared prompt + parser for the `<copy>…</copy>` convention.
 *
 * Every skill (built-in or user-authored) leans on this to surface
 * finished marketing deliverables as a structured Artifact card. The
 * instruction is appended to the base system prompt so a skill does not
 * need to think about formatting — it just writes copy; the client
 * splits prose from deliverables on render.
 */
export const COPY_ARTIFACT_INSTRUCTION = `## Output format for marketing copy

When you produce finished marketing copy the user can ship (emails, SMS, subject lines, preheaders, ad copy, landing-page copy, push notifications), wrap every deliverable in \`<copy>\` tags. The app renders the inside as a copyable, formatted Artifact card; everything outside the tags is conversational response.

Inside \`<copy>\`:
- Use **Markdown** — headings, bold, lists, inline code, tables.
- Include subject lines, preheaders, and body in the same block unless the user asked for them separately.
- Do NOT add your own commentary, \`<note>\` tags, meta explanations, or angle discussion inside — those belong outside as prose.

Outside \`<copy>\`:
- Your angle, reasoning, alternatives, clarifying questions, and \`<note>\`/\`<missing>\` annotations.

Example:
  Here's the angle I'd take — urgency-driven without being pushy.

  \`<copy>\`
  **Subject:** 25% off everything. Sunday's the cutoff.
  **Preheader:** No code. No minimum. Just pick what you want.

  # 25% Off Everything

  No code. No minimum. Just pick what you want before Sunday at midnight.

  [Shop the Sale]
  \`</copy>\`

  Want a different angle? I can try…

Rules:
- One \`<copy>\` block per deliverable. If you produce A/B/C variants, emit three \`<copy>\` blocks back-to-back.
- Never nest \`<copy>\` tags.
- Never place prose INSIDE the tags.
- If the user asked for something that is NOT a shippable deliverable (analysis, recommendations, a plan), do not use \`<copy>\` tags at all — respond as normal prose.`;

export type CopySegment =
  | { kind: "prose"; content: string }
  | { kind: "copy"; content: string; streaming?: boolean };

/**
 * Split an assistant text into prose/copy segments. Handles streaming:
 * an unclosed `<copy>` is returned with `streaming: true` so the UI can
 * render a placeholder state.
 */
export function parseCopySegments(text: string): CopySegment[] {
  const OPEN = "<copy>";
  const CLOSE = "</copy>";
  const out: CopySegment[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const openIdx = text.indexOf(OPEN, cursor);
    if (openIdx === -1) {
      if (cursor < text.length) {
        out.push({ kind: "prose", content: text.slice(cursor) });
      }
      break;
    }
    if (openIdx > cursor) {
      out.push({ kind: "prose", content: text.slice(cursor, openIdx) });
    }
    const contentStart = openIdx + OPEN.length;
    const closeIdx = text.indexOf(CLOSE, contentStart);
    if (closeIdx === -1) {
      // Still streaming — render what we have.
      out.push({
        kind: "copy",
        content: text.slice(contentStart),
        streaming: true,
      });
      cursor = text.length;
      break;
    }
    out.push({ kind: "copy", content: text.slice(contentStart, closeIdx) });
    cursor = closeIdx + CLOSE.length;
  }

  return out;
}

/**
 * Pull out a short title from the first line or heading of a copy block.
 * Falls back to "Copy" if nothing obvious is there. Used as the artifact
 * header so the user can tell variants apart at a glance.
 */
export function deriveCopyTitle(content: string): string {
  const firstHeading = content.match(/^\s*#+\s+(.+?)\s*$/m);
  if (firstHeading) return trim(firstHeading[1]);
  const subject = content.match(/\*?\*?Subject(?:\s*Line)?:?\*?\*?\s*(.+?)\s*$/im);
  if (subject) return trim(subject[1].replace(/^\*+|\*+$/g, ""));
  const firstLine = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (firstLine) return trim(firstLine.replace(/^\*+|\*+$/g, ""));
  return "Copy";
}

function trim(s: string): string {
  return s.length > 72 ? s.slice(0, 70).trimEnd() + "…" : s;
}
