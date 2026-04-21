import type { Skill, SkillDiscoveryEntry } from './types';

/**
 * Convert a skill to its discovery entry — the tiny shape loaded into the
 * system prompt at the discovery layer (~50-100 tokens per skill).
 */
export function toDiscoveryEntry(skill: Skill): SkillDiscoveryEntry {
  const fm = skill.frontmatter;
  return {
    slug: fm.name,
    name: fm.name,
    displayName: fm.display_name ?? titleCase(fm.name),
    description: fm.description,
    icon: fm.icon,
  };
}

/**
 * Build the `<available_skills>` system-prompt block. Only emits skills the
 * caller wants the model to auto-route to; pass in an already-filtered list.
 */
export function buildDiscoveryBlock(skills: Skill[]): string {
  if (skills.length === 0) return '';
  const entries = skills.map(toDiscoveryEntry);
  const lines = entries.map((e) => {
    const desc = oneLine(e.description);
    return `  <skill slug="${e.slug}" name="${escapeAttr(e.displayName)}">${desc}</skill>`;
  });
  return [
    '<available_skills>',
    '  You can activate a skill by calling the `use_skill` tool with its slug.',
    '  Only activate a skill when the user\'s request clearly matches its description.',
    '  If no skill fits, just respond directly.',
    ...lines,
    '</available_skills>',
  ].join('\n');
}

function oneLine(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, '&quot;');
}

function titleCase(slug: string): string {
  return slug
    .split('-')
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}
