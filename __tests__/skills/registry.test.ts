/**
 * @jest-environment node
 */
import {
  loadBuiltinSkills,
  mergeSkills,
  __resetBuiltinCacheForTests,
} from '@/lib/skills/registry';
import type { Skill } from '@/lib/skills/types';

describe('loadBuiltinSkills', () => {
  beforeEach(() => __resetBuiltinCacheForTests());

  it('loads every SKILL.md under /skills and validates them', () => {
    const skills = loadBuiltinSkills();
    const slugs = skills.map((s) => s.slug).sort();
    expect(slugs).toEqual([
      'design-email',
      'letter-email',
      'planning',
      'quick-add-urgency',
      'quick-shorter',
      'quick-stronger-cta',
    ]);
    for (const s of skills) {
      expect(s.scope).toBe('builtin');
      expect(s.isBuiltin).toBe(true);
      expect(s.frontmatter.description.length).toBeGreaterThanOrEqual(10);
    }
  });

  it('caches results across calls', () => {
    const a = loadBuiltinSkills();
    const b = loadBuiltinSkills();
    expect(a).toBe(b);
  });

  it('validates that frontmatter.name matches the directory name', () => {
    const skills = loadBuiltinSkills();
    for (const s of skills) {
      expect(s.frontmatter.name).toBe(s.slug);
    }
  });
});

describe('mergeSkills', () => {
  const builtin = (slug: string): Skill => ({
    id: `builtin:${slug}`,
    slug,
    scope: 'builtin',
    orgId: null,
    brandId: null,
    userId: null,
    frontmatter: {
      name: slug,
      description: 'builtin version, long enough to pass validation',
      workflow_type: 'chat',
      tools: [],
      variables: [],
      resources: [],
    },
    body: 'builtin body',
    sourcePath: `/skills/${slug}`,
    isBuiltin: true,
  });

  const custom = (slug: string, scope: Skill['scope']): Skill => ({
    ...builtin(slug),
    id: `${scope}:abc`,
    scope,
    isBuiltin: false,
    body: `${scope} body`,
    sourcePath: null,
    userId: scope === 'user' ? 'u1' : null,
    brandId: scope === 'brand' ? 'b1' : null,
    orgId: scope === 'org' ? 'o1' : null,
  });

  it('prefers user scope over brand/org/global/builtin for same slug', () => {
    const merged = mergeSkills(
      [builtin('design-email')],
      [custom('design-email', 'org'), custom('design-email', 'user'), custom('design-email', 'brand')],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].scope).toBe('user');
  });

  it('prefers brand over org over global over builtin', () => {
    expect(
      mergeSkills([builtin('s')], [custom('s', 'org'), custom('s', 'brand')])[0].scope,
    ).toBe('brand');
    expect(mergeSkills([builtin('s')], [custom('s', 'org')])[0].scope).toBe('org');
    expect(mergeSkills([builtin('s')], [custom('s', 'global')])[0].scope).toBe('global');
    expect(mergeSkills([builtin('s')], [])[0].scope).toBe('builtin');
  });

  it('includes non-overlapping slugs from both sources', () => {
    const merged = mergeSkills([builtin('a')], [custom('b', 'user')]);
    expect(merged.map((s) => s.slug).sort()).toEqual(['a', 'b']);
  });
});
