/**
 * Template engine for SKILL.md bodies.
 *
 * Supports `{{key}}` and `{{a.b.c}}` dotted paths. Missing paths render as
 * empty strings (so a skill can include `{{memory}}` without blowing up
 * when the recall tool returns nothing). Escape `\{\{` or `\}\}` to emit
 * literal braces.
 */
export type TemplateScope = Record<string, unknown>;

const TOKEN_RE = /\\\{\\\{|\\\}\\\}|\{\{\s*([a-zA-Z_][\w.]*)\s*\}\}/g;

export function interpolate(template: string, scope: TemplateScope): string {
  return template.replace(TOKEN_RE, (match, path: string | undefined) => {
    if (match === '\\{\\{') return '{{';
    if (match === '\\}\\}') return '}}';
    if (!path) return '';
    const v = lookup(scope, path);
    if (v === undefined || v === null) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    try {
      return JSON.stringify(v);
    } catch {
      return '';
    }
  });
}

function lookup(scope: TemplateScope, path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = scope;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return cur;
}

/**
 * Builds the standard scope every skill body can rely on. Callers extend
 * this with skill-specific variables (e.g. copyBrief, emailBrief).
 */
export interface StandardScope {
  brand: {
    name: string;
    info: string;
    voice: string;
    websiteUrl: string;
  };
  rag: string;
  memory: string;
}

export function emptyStandardScope(): StandardScope {
  return {
    brand: { name: '', info: '', voice: '', websiteUrl: '' },
    rag: '',
    memory: '',
  };
}
