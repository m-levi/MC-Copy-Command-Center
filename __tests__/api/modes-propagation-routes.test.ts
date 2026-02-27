/**
 * @jest-environment node
 */

import { POST as duplicateMode } from '@/app/api/modes/[id]/duplicate/route';
import { POST as importModes } from '@/app/api/modes/import/route';
import { GET as exportModes } from '@/app/api/modes/export/route';
import { POST as useTemplateMode } from '@/app/api/modes/templates/[id]/use/route';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

type AuthResult = {
  data: {
    user: { id: string } | null;
  };
};

function buildAuth(userId = 'user-1') {
  return {
    getUser: jest.fn<Promise<AuthResult>, []>().mockResolvedValue({
      data: { user: { id: userId } },
    }),
  };
}

function buildImmediateQueryResult<T>(data: T, error: { message: string } | null = null) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ data, error }),
    single: jest.fn().mockResolvedValue({ data, error }),
    then: (resolve: (value: { data: T; error: { message: string } | null }) => unknown) =>
      Promise.resolve({ data, error }).then(resolve),
  };
}

describe('/api/modes propagation routes', () => {
  const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('duplicate route preserves advanced agent fields', async () => {
    const originalMode = {
      id: 'mode-1',
      name: 'Planner',
      system_prompt: 'Prompt',
      enabled_tools: { invoke_agent: { enabled: true, allowed_agents: ['email_writer'] } },
      primary_artifact_types: ['email', 'calendar'],
      is_agent_enabled: true,
      agent_type: 'hybrid',
      can_invoke_agents: ['email_writer'],
      default_agent: 'email_writer',
      agent_behavior: { chain_limit: 4 },
    };

    const getOriginal = buildImmediateQueryResult(originalMode);
    const getSortOrder = buildImmediateQueryResult([{ sort_order: 2 }]);

    const insertSingle = jest.fn().mockResolvedValue({
      data: { id: 'mode-copy', name: 'Planner (Copy)' },
      error: null,
    });
    const insertSelect = jest.fn().mockReturnValue({ single: insertSingle });
    const insert = jest.fn().mockReturnValue({ select: insertSelect });

    const supabase = {
      auth: buildAuth(),
      from: jest
        .fn()
        .mockReturnValueOnce(getOriginal)
        .mockReturnValueOnce(getSortOrder)
        .mockReturnValueOnce({ insert }),
    };

    mockCreateClient.mockResolvedValue(supabase as unknown as Awaited<ReturnType<typeof createClient>>);

    const response = await duplicateMode(new Request('http://localhost/api/modes/mode-1/duplicate', { method: 'POST' }), {
      params: Promise.resolve({ id: 'mode-1' }),
    });

    expect(response.status).toBe(201);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled_tools: originalMode.enabled_tools,
        primary_artifact_types: originalMode.primary_artifact_types,
        is_agent_enabled: true,
        agent_type: 'hybrid',
        can_invoke_agents: ['email_writer'],
        default_agent: 'email_writer',
        agent_behavior: { chain_limit: 4 },
      })
    );
  });

  it('import route accepts and persists advanced fields', async () => {
    const existingNames = buildImmediateQueryResult([{ name: 'Planner' }]);
    const lastMode = buildImmediateQueryResult([{ sort_order: 6 }]);

    const insertSelect = jest.fn().mockResolvedValue({
      data: [{ id: 'mode-3', name: 'Planner (1)' }],
      error: null,
    });
    const insert = jest.fn().mockReturnValue({ select: insertSelect });

    const supabase = {
      auth: buildAuth(),
      from: jest
        .fn()
        .mockReturnValueOnce(existingNames)
        .mockReturnValueOnce(lastMode)
        .mockReturnValueOnce({ insert }),
    };
    mockCreateClient.mockResolvedValue(supabase as unknown as Awaited<ReturnType<typeof createClient>>);

    const response = await importModes(
      new Request('http://localhost/api/modes/import', {
        method: 'POST',
        body: JSON.stringify({
          modes: [
            {
              name: 'Planner',
              system_prompt: 'Prompt',
              enabled_tools: {
                invoke_agent: { enabled: true, allowed_agents: ['email_writer'] },
              },
              primary_artifact_types: ['email', 'calendar'],
              is_agent_enabled: true,
              agent_type: 'hybrid',
              can_invoke_agents: ['email_writer'],
              default_agent: 'email_writer',
              agent_behavior: { chain_limit: 8 },
            },
          ],
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(insert).toHaveBeenCalledWith([
      expect.objectContaining({
        name: 'Planner',
        enabled_tools: {
          invoke_agent: { enabled: true, allowed_agents: ['email_writer'] },
        },
        primary_artifact_types: ['email', 'calendar'],
        is_agent_enabled: true,
        agent_type: 'hybrid',
        can_invoke_agents: ['email_writer'],
        default_agent: 'email_writer',
        agent_behavior: { chain_limit: 8 },
      }),
    ]);
  });

  it('export route includes advanced fields in payload', async () => {
    const modeRows = [
      {
        id: 'mode-1',
        name: 'Agent Mode',
        system_prompt: 'Prompt',
        is_active: true,
        enabled_tools: { invoke_agent: { enabled: true } },
        primary_artifact_types: ['email'],
        is_agent_enabled: true,
        agent_type: 'orchestrator',
        can_invoke_agents: ['email_writer'],
        default_agent: 'email_writer',
        agent_behavior: { chain_limit: 3 },
      },
    ];
    const listModes = buildImmediateQueryResult(modeRows);

    const supabase = {
      auth: buildAuth(),
      from: jest.fn().mockReturnValue(listModes),
    };
    mockCreateClient.mockResolvedValue(supabase as unknown as Awaited<ReturnType<typeof createClient>>);

    const response = await exportModes(new Request('http://localhost/api/modes/export'));
    const payload = JSON.parse(await response.text());

    expect(response.status).toBe(200);
    expect(payload.modes[0]).toMatchObject({
      enabled_tools: { invoke_agent: { enabled: true } },
      primary_artifact_types: ['email'],
      is_agent_enabled: true,
      agent_type: 'orchestrator',
      can_invoke_agents: ['email_writer'],
      default_agent: 'email_writer',
      agent_behavior: { chain_limit: 3 },
    });
  });

  it('template use route preserves advanced template fields', async () => {
    const templateQuery = buildImmediateQueryResult({
      id: 'template-1',
      name: 'Template Agent',
      system_prompt: 'Template prompt',
      enabled_tools: { invoke_agent: { enabled: true, allowed_agents: ['email_writer'] } },
      primary_artifact_types: ['calendar'],
      is_agent_enabled: true,
      agent_type: 'hybrid',
      can_invoke_agents: ['email_writer'],
      default_agent: 'email_writer',
      agent_behavior: { chain_limit: 6 },
    });
    const modeSortQuery = buildImmediateQueryResult([{ sort_order: 1 }]);

    const insertSingle = jest.fn().mockResolvedValue({
      data: { id: 'mode-new', name: 'Template Agent' },
      error: null,
    });
    const insertSelect = jest.fn().mockReturnValue({ single: insertSingle });
    const insert = jest.fn().mockReturnValue({ select: insertSelect });

    const supabase = {
      auth: buildAuth(),
      rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
      from: jest
        .fn()
        .mockReturnValueOnce(templateQuery)
        .mockReturnValueOnce(modeSortQuery)
        .mockReturnValueOnce({ insert }),
    };
    mockCreateClient.mockResolvedValue(supabase as unknown as Awaited<ReturnType<typeof createClient>>);

    const response = await useTemplateMode(
      new Request('http://localhost/api/modes/templates/template-1/use', { method: 'POST' }),
      { params: Promise.resolve({ id: 'template-1' }) }
    );

    expect(response.status).toBe(201);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled_tools: { invoke_agent: { enabled: true, allowed_agents: ['email_writer'] } },
        primary_artifact_types: ['calendar'],
        is_agent_enabled: true,
        agent_type: 'hybrid',
        can_invoke_agents: ['email_writer'],
        default_agent: 'email_writer',
        agent_behavior: { chain_limit: 6 },
      })
    );
    expect(supabase.rpc).toHaveBeenCalledWith('increment_template_use_count', { p_template_id: 'template-1' });
  });
});
