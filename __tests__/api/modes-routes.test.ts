/**
 * @jest-environment node
 */

import { GET as getModes, POST as createMode } from '@/app/api/modes/route';
import { PUT as updateMode } from '@/app/api/modes/[id]/route';
import { MODE_SELECT_FIELDS } from '@/lib/modes/mode-persistence';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

type SupabaseAuthUserResult = {
  data: {
    user: { id: string } | null;
  };
};

function buildAuth(userId = 'user-1') {
  return {
    getUser: jest.fn<Promise<SupabaseAuthUserResult>, []>().mockResolvedValue({
      data: { user: { id: userId } },
    }),
  };
}

function buildListQuery(data: unknown[] = [], error: { message: string; code?: string } | null = null) {
  const query: {
    data: unknown[];
    error: { message: string; code?: string } | null;
    select: jest.Mock;
    eq: jest.Mock;
    order: jest.Mock;
    limit: jest.Mock;
  } = {
    data,
    error,
    select: jest.fn(),
    eq: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockResolvedValue({ data, error });
  return query;
}

describe('/api/modes routes', () => {
  const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/modes returns advanced agent fields', async () => {
    const modeRow = {
      id: 'mode-1',
      name: 'Agent Mode',
      system_prompt: 'Prompt',
      enabled_tools: { invoke_agent: { enabled: true } },
      primary_artifact_types: ['email', 'calendar'],
      is_agent_enabled: true,
      agent_type: 'hybrid',
      can_invoke_agents: ['email_writer'],
      default_agent: 'email_writer',
      agent_behavior: { chain_limit: 3 },
    };

    const query = buildListQuery([modeRow], null);
    const supabase = {
      auth: buildAuth(),
      from: jest.fn().mockReturnValue(query),
    };

    mockCreateClient.mockResolvedValue(supabase as unknown as Awaited<ReturnType<typeof createClient>>);

    const response = await getModes(new Request('http://localhost/api/modes'));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(supabase.from).toHaveBeenCalledWith('custom_modes');
    expect(query.select).toHaveBeenCalledWith(MODE_SELECT_FIELDS);
    expect(json[0]).toMatchObject({
      enabled_tools: modeRow.enabled_tools,
      primary_artifact_types: modeRow.primary_artifact_types,
      is_agent_enabled: true,
      agent_type: 'hybrid',
      can_invoke_agents: ['email_writer'],
      default_agent: 'email_writer',
      agent_behavior: { chain_limit: 3 },
    });
  });

  it('POST /api/modes persists advanced agent payload fields', async () => {
    const existingModesQuery = buildListQuery([{ sort_order: 7 }], null);
    const insertSingle = jest.fn().mockResolvedValue({
      data: {
        id: 'mode-2',
        name: 'Planner Agent',
        enabled_tools: { invoke_agent: { enabled: true, allowed_agents: ['email_writer'] } },
        can_invoke_agents: ['email_writer'],
      },
      error: null,
    });
    const insertSelect = jest.fn().mockReturnValue({ single: insertSingle });
    const insert = jest.fn().mockReturnValue({ select: insertSelect });

    const supabase = {
      auth: buildAuth(),
      from: jest
        .fn()
        .mockReturnValueOnce(existingModesQuery)
        .mockReturnValueOnce({ insert }),
    };

    mockCreateClient.mockResolvedValue(supabase as unknown as Awaited<ReturnType<typeof createClient>>);

    const response = await createMode(
      new Request('http://localhost/api/modes', {
        method: 'POST',
        body: JSON.stringify({
          name: '  Planner Agent  ',
          system_prompt: '  Coordinate specialists ',
          is_agent_enabled: true,
          agent_type: 'hybrid',
          can_invoke_agents: ['email_writer', 'email_writer', 'subject_line_expert'],
          default_agent: 'email_writer',
          agent_behavior: { chain_limit: 99, show_thinking: true },
          enabled_tools: {
            invoke_agent: { enabled: true, allowed_agents: ['email_writer'] },
          },
          primary_artifact_types: ['email', 'calendar', 'email'],
        }),
      })
    );

    expect(response.status).toBe(201);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        name: 'Planner Agent',
        system_prompt: 'Coordinate specialists',
        is_agent_enabled: true,
        agent_type: 'hybrid',
        can_invoke_agents: ['email_writer', 'subject_line_expert'],
        default_agent: 'email_writer',
        primary_artifact_types: ['email', 'calendar'],
        agent_behavior: {
          chain_limit: 10,
          show_thinking: true,
        },
      })
    );
    expect(insertSelect).toHaveBeenCalledWith(MODE_SELECT_FIELDS);
  });

  it('PUT /api/modes/[id] updates advanced agent fields', async () => {
    const fetchSingle = jest.fn().mockResolvedValue({
      data: { id: 'mode-1', is_default: false },
      error: null,
    });
    const fetchSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: fetchSingle,
        }),
      }),
    });

    const updateSingle = jest.fn().mockResolvedValue({
      data: { id: 'mode-1', agent_type: 'orchestrator' },
      error: null,
    });
    const updateSelect = jest.fn().mockReturnValue({ single: updateSingle });
    const updateEqUser = jest.fn().mockReturnValue({ select: updateSelect });
    const updateEqId = jest.fn().mockReturnValue({ eq: updateEqUser });
    const update = jest.fn().mockReturnValue({ eq: updateEqId });

    const supabase = {
      auth: buildAuth(),
      from: jest
        .fn()
        .mockReturnValueOnce({ select: fetchSelect })
        .mockReturnValueOnce({ update }),
    };

    mockCreateClient.mockResolvedValue(supabase as unknown as Awaited<ReturnType<typeof createClient>>);

    const response = await updateMode(
      new Request('http://localhost/api/modes/mode-1', {
        method: 'PUT',
        body: JSON.stringify({
          agent_type: 'orchestrator',
          can_invoke_agents: ['email_writer', 'email_writer'],
          agent_behavior: { chain_limit: 5, auto_invoke: true },
        }),
      }),
      { params: Promise.resolve({ id: 'mode-1' }) }
    );

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_type: 'orchestrator',
        can_invoke_agents: ['email_writer'],
        agent_behavior: {
          chain_limit: 5,
          auto_invoke: true,
        },
      })
    );
    expect(updateSelect).toHaveBeenCalledWith(MODE_SELECT_FIELDS);
  });
});
