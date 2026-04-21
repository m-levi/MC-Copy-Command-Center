/**
 * @jest-environment node
 */
import { parseSkillFile, parseYaml } from '@/lib/skills/parser';

describe('parseYaml', () => {
  it('parses simple key/value pairs', () => {
    const out = parseYaml('name: planning\nicon: lightbulb\n');
    expect(out).toEqual({ name: 'planning', icon: 'lightbulb' });
  });

  it('parses scalar booleans and numbers', () => {
    const out = parseYaml('enabled: true\ncount: 3\nratio: 0.5\n');
    expect(out).toEqual({ enabled: true, count: 3, ratio: 0.5 });
  });

  it('parses folded scalars with >-', () => {
    const out = parseYaml(
      [
        'description: >-',
        '  Use when the user wants',
        '  to brainstorm or plan.',
      ].join('\n'),
    );
    expect(out.description).toBe('Use when the user wants to brainstorm or plan.');
  });

  it('parses arrays of scalars', () => {
    const out = parseYaml(
      ['tools:', '  - web_search', '  - brand_knowledge_search', '  - memory_recall'].join('\n'),
    );
    expect(out.tools).toEqual(['web_search', 'brand_knowledge_search', 'memory_recall']);
  });

  it('parses arrays of objects with nested fields', () => {
    const out = parseYaml(
      [
        'variables:',
        '  - name: copyBrief',
        '    required: true',
        '    description: The brief',
        '  - name: tone',
        '    required: false',
      ].join('\n'),
    );
    expect(out.variables).toEqual([
      { name: 'copyBrief', required: true, description: 'The brief' },
      { name: 'tone', required: false },
    ]);
  });

  it('treats empty lines and # comments as skippable', () => {
    const out = parseYaml(['# top comment', '', 'name: foo', '', '# trailing'].join('\n'));
    expect(out).toEqual({ name: 'foo' });
  });
});

describe('parseSkillFile', () => {
  it('splits frontmatter from body', () => {
    const text = [
      '---',
      'name: planning',
      'description: Strategic planning and brainstorming partner.',
      '---',
      'This is the body.',
      '',
      'More body.',
    ].join('\n');
    const { frontmatter, body } = parseSkillFile(text);
    expect(frontmatter.name).toBe('planning');
    expect(frontmatter.description).toBe('Strategic planning and brainstorming partner.');
    expect(body).toBe('This is the body.\n\nMore body.');
  });

  it('rejects files without frontmatter', () => {
    expect(() => parseSkillFile('no frontmatter here')).toThrow(/missing YAML frontmatter/);
  });

  it('rejects invalid names (must be kebab-case)', () => {
    const text = [
      '---',
      'name: Invalid Name',
      'description: Something long enough to pass validation.',
      '---',
      'body',
    ].join('\n');
    expect(() => parseSkillFile(text)).toThrow(/kebab-case/);
  });

  it('requires a description of at least 10 chars', () => {
    const text = [
      '---',
      'name: valid-name',
      'description: short',
      '---',
      'body',
    ].join('\n');
    expect(() => parseSkillFile(text)).toThrow();
  });

  it('applies defaults for optional fields', () => {
    const text = [
      '---',
      'name: minimal',
      'description: A minimally valid skill with nothing optional.',
      '---',
      'body',
    ].join('\n');
    const { frontmatter } = parseSkillFile(text);
    expect(frontmatter.workflow_type).toBe('chat');
    expect(frontmatter.tools).toEqual([]);
    expect(frontmatter.variables).toEqual([]);
    expect(frontmatter.resources).toEqual([]);
  });
});
