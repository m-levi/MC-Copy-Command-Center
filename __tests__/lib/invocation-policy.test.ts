import { evaluateAgentInvocationPolicy, getAgentChainLimit } from '@/lib/agents/invocation-policy';

describe('agent invocation policy', () => {
  it('blocks invocation when mode is not present', () => {
    const result = evaluateAgentInvocationPolicy({
      mode: null,
      requestedAgentId: 'email_writer',
      currentInvocationCount: 0,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('custom agent modes');
  });

  it('blocks invocation when invoke_agent tool disabled', () => {
    const result = evaluateAgentInvocationPolicy({
      mode: {
        is_agent_enabled: true,
        agent_type: 'hybrid',
        can_invoke_agents: ['email_writer'],
        enabled_tools: {
          invoke_agent: { enabled: false },
        },
        agent_behavior: {},
      },
      requestedAgentId: 'email_writer',
      currentInvocationCount: 0,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('invoke_agent tool is disabled');
  });

  it('enforces allowed agent lists and chain limit', () => {
    const mode = {
      is_agent_enabled: true,
      agent_type: 'hybrid' as const,
      can_invoke_agents: ['email_writer'],
      enabled_tools: {
        invoke_agent: {
          enabled: true,
          allowed_agents: ['email_writer'],
        },
      },
      agent_behavior: {
        chain_limit: 2,
      },
    };

    const allowed = evaluateAgentInvocationPolicy({
      mode,
      requestedAgentId: 'email_writer',
      currentInvocationCount: 1,
    });
    expect(allowed.allowed).toBe(true);
    expect(allowed.targetAgentId).toBe('email_writer');

    const deniedByAgentList = evaluateAgentInvocationPolicy({
      mode,
      requestedAgentId: 'subject_line_expert',
      currentInvocationCount: 0,
    });
    expect(deniedByAgentList.allowed).toBe(false);
    expect(deniedByAgentList.reason).toContain('allowed_agents');

    const deniedByChain = evaluateAgentInvocationPolicy({
      mode,
      requestedAgentId: 'email_writer',
      currentInvocationCount: 2,
    });
    expect(deniedByChain.allowed).toBe(false);
    expect(deniedByChain.reason).toContain('chain limit');
  });

  it('normalizes chain limits', () => {
    expect(getAgentChainLimit({ agent_behavior: { chain_limit: 0 } })).toBe(1);
    expect(getAgentChainLimit({ agent_behavior: { chain_limit: 12 } })).toBe(10);
    expect(getAgentChainLimit({ agent_behavior: {} })).toBe(3);
  });
});
