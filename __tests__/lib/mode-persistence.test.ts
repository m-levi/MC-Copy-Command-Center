import { MODE_SELECT_FIELDS, normalizeModePayload } from '@/lib/modes/mode-persistence';

describe('mode persistence normalization', () => {
  it('applies defaults for new modes', () => {
    const normalized = normalizeModePayload(
      {
        name: '  Agent  ',
        system_prompt: '  You are helpful.  ',
      },
      { includeDefaults: true }
    );

    expect(normalized.name).toBe('Agent');
    expect(normalized.system_prompt).toBe('You are helpful.');
    expect(normalized.enabled_tools).toBeDefined();
    expect(normalized.primary_artifact_types).toEqual(['email']);
    expect(normalized.is_agent_enabled).toBe(true);
    expect(normalized.agent_type).toBe('specialist');
    expect(normalized.can_invoke_agents).toEqual([]);
  });

  it('sanitizes advanced agent fields', () => {
    const normalized = normalizeModePayload({
      enabled_tools: { create_artifact: { enabled: true } },
      primary_artifact_types: ['email', '  calendar  ', '', 'email'],
      is_agent_enabled: true,
      agent_type: 'hybrid',
      can_invoke_agents: ['email_writer', '  ', 'email_writer', 'subject_line_expert'],
      default_agent: '  email_writer ',
      agent_behavior: {
        show_thinking: true,
        chain_limit: 99,
      },
    });

    expect(normalized.primary_artifact_types).toEqual(['email', 'calendar']);
    expect(normalized.can_invoke_agents).toEqual(['email_writer', 'subject_line_expert']);
    expect(normalized.default_agent).toBe('email_writer');
    expect(normalized.agent_type).toBe('hybrid');
    expect(normalized.agent_behavior).toEqual({
      show_thinking: true,
      chain_limit: 10,
    });
  });

  it('exposes all advanced fields in select clause', () => {
    expect(MODE_SELECT_FIELDS).toContain('enabled_tools');
    expect(MODE_SELECT_FIELDS).toContain('primary_artifact_types');
    expect(MODE_SELECT_FIELDS).toContain('is_agent_enabled');
    expect(MODE_SELECT_FIELDS).toContain('agent_type');
    expect(MODE_SELECT_FIELDS).toContain('can_invoke_agents');
    expect(MODE_SELECT_FIELDS).toContain('default_agent');
    expect(MODE_SELECT_FIELDS).toContain('agent_behavior');
  });
});
