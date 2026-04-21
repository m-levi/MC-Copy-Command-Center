/**
 * @jest-environment node
 */
import { buildDiscoveryBlock, toDiscoveryEntry } from '@/lib/skills/discovery';
import type { Skill } from '@/lib/skills/types';

const skill = (slug: string, description: string, displayName?: string): Skill => ({
  id: `builtin:${slug}`,
  slug,
  scope: 'builtin',
  orgId: null,
  brandId: null,
  userId: null,
  frontmatter: {
    name: slug,
    display_name: displayName,
    description,
    workflow_type: 'chat',
    tools: [],
    variables: [],
    resources: [],
  },
  body: 'body',
  sourcePath: null,
  isBuiltin: true,
});

describe('toDiscoveryEntry', () => {
  it('uses display_name when provided, falls back to title-cased slug', () => {
    expect(toDiscoveryEntry(skill('planning', 'x'.repeat(20))).displayName).toBe('Planning');
    expect(
      toDiscoveryEntry(skill('quick-shorter', 'x'.repeat(20), 'Make it shorter')).displayName,
    ).toBe('Make it shorter');
  });
});

describe('buildDiscoveryBlock', () => {
  it('returns empty string when no skills are available', () => {
    expect(buildDiscoveryBlock([])).toBe('');
  });

  it('emits one <skill> line per entry wrapped in <available_skills>', () => {
    const block = buildDiscoveryBlock([
      skill('planning', 'Strategic planning partner.', 'Planning'),
      skill('design-email', 'Writes designed marketing emails in three variants.', 'Design Email'),
    ]);
    expect(block).toContain('<available_skills>');
    expect(block).toContain('</available_skills>');
    expect(block).toContain('slug="planning"');
    expect(block).toContain('slug="design-email"');
    expect(block).toContain('name="Planning"');
    expect(block).toContain('name="Design Email"');
  });

  it('collapses multi-line descriptions to a single line', () => {
    const block = buildDiscoveryBlock([
      skill('s', 'line one\n  line two\n  line three of description'),
    ]);
    expect(block).not.toContain('\n  line');
    expect(block).toMatch(/line one line two line three/);
  });

  it('escapes quotes in display names so the XML stays valid', () => {
    const block = buildDiscoveryBlock([skill('s', 'description here, long enough', 'The "Best" Skill')]);
    expect(block).toContain('&quot;Best&quot;');
    expect(block).not.toContain('name="The "Best"');
  });

  it('keeps the per-skill token budget small', () => {
    const block = buildDiscoveryBlock([
      skill('planning', 'Strategic planning and brainstorming partner for marketing campaigns.'),
    ]);
    expect(block.length).toBeLessThan(400);
  });
});
