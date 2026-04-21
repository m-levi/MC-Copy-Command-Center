/**
 * @jest-environment node
 */
import { activateSkill, SkillActivationError } from '@/lib/skills/activation';
import type { Skill } from '@/lib/skills/types';

const makeSkill = (overrides: Partial<Skill['frontmatter']> = {}): Skill => ({
  id: 'builtin:design-email',
  slug: 'design-email',
  scope: 'builtin',
  orgId: null,
  brandId: null,
  userId: null,
  frontmatter: {
    name: 'design-email',
    description: 'Writes designed marketing emails in three variants.',
    workflow_type: 'durable_agent',
    tools: ['generate_email_variants'],
    variables: [
      { name: 'copyBrief', required: true, description: 'What the user wants' },
      { name: 'tone', required: false, default: 'punchy' },
    ],
    resources: [],
    ...overrides,
  },
  body: 'body',
  sourcePath: '/skills/design-email',
  isBuiltin: true,
});

describe('activateSkill', () => {
  it('returns the matched skill with provided variables', () => {
    const result = activateSkill({
      skills: [makeSkill()],
      slug: 'design-email',
      variables: { copyBrief: 'welcome email for new subs' },
    });
    expect(result.skill.slug).toBe('design-email');
    expect(result.variables.copyBrief).toBe('welcome email for new subs');
  });

  it('applies defaults when a variable is not provided', () => {
    const result = activateSkill({
      skills: [makeSkill()],
      slug: 'design-email',
      variables: { copyBrief: 'x' },
    });
    expect(result.variables.tone).toBe('punchy');
  });

  it('throws MISSING_VARIABLE when a required variable is absent', () => {
    try {
      activateSkill({ skills: [makeSkill()], slug: 'design-email', variables: {} });
      fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(SkillActivationError);
      expect((err as SkillActivationError).code).toBe('MISSING_VARIABLE');
    }
  });

  it('throws UNKNOWN_SKILL when the slug is not in the list', () => {
    try {
      activateSkill({ skills: [makeSkill()], slug: 'not-a-skill' });
      fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(SkillActivationError);
      expect((err as SkillActivationError).code).toBe('UNKNOWN_SKILL');
    }
  });

  it('treats empty-string variables as missing', () => {
    try {
      activateSkill({
        skills: [makeSkill()],
        slug: 'design-email',
        variables: { copyBrief: '' },
      });
      fail('should have thrown');
    } catch (err) {
      expect((err as SkillActivationError).code).toBe('MISSING_VARIABLE');
    }
  });
});
