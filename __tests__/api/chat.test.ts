/**
 * @jest-environment node
 */

import type { UIMessage } from 'ai';
import { POST } from '@/app/api/chat/route';
import { createClient } from '@/lib/supabase/server';
import { gateway } from '@/lib/ai-providers';
import { normalizeModelId } from '@/lib/ai-models';
import { searchRelevantDocuments, buildRAGContext } from '@/lib/rag-service';
import { runSkill } from '@/lib/workflows/run-skill';

jest.mock('@/lib/supabase/server');
jest.mock('@/lib/ai-providers', () => ({
  gateway: jest.fn(() => ({ id: 'mock-model' })),
}));
jest.mock('@/lib/ai-models', () => ({
  normalizeModelId: jest.fn((modelId?: string) => modelId ?? 'anthropic/claude-opus-4.6'),
}));
jest.mock('@/lib/skills/registry', () => ({
  loadBuiltinSkills: jest.fn(() => []),
  mergeSkills: jest.fn((builtin, custom) => [...builtin, ...custom]),
}));
jest.mock('@/lib/workflows/run-skill');
jest.mock('@/lib/rag-service');
jest.mock('@/lib/supermemory', () => ({
  isSupermemoryConfigured: jest.fn(() => false),
  searchMemories: jest.fn(),
}));
jest.mock('@/lib/memory-local', () => ({
  localMemorySearch: jest.fn(() => Promise.resolve([])),
}));
jest.mock('@/lib/brand-voice', () => ({
  loadBrandVoiceMarkdown: jest.fn(() => ''),
  inferSlug: jest.fn(() => 'test-brand'),
}));
jest.mock('@/lib/chat-prompts', () => ({
  formatBrandVoiceForPrompt: jest.fn(() => 'formatted brand voice'),
}));
jest.mock('@/lib/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGateway = gateway as jest.MockedFunction<typeof gateway>;
const mockNormalizeModelId = normalizeModelId as jest.MockedFunction<typeof normalizeModelId>;
const mockRunSkill = runSkill as jest.MockedFunction<typeof runSkill>;
const mockSearchRelevantDocuments = searchRelevantDocuments as jest.MockedFunction<
  typeof searchRelevantDocuments
>;
const mockBuildRAGContext = buildRAGContext as jest.MockedFunction<typeof buildRAGContext>;
const VALID_CONVERSATION_ID = '0ae2b5a1-1389-42dd-992e-a9a88f8b8116';

function uiText(text: string): UIMessage {
  return {
    id: 'msg-1',
    role: 'user',
    parts: [{ type: 'text', text }],
  };
}

function request(body: unknown) {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function createSupabaseMock({
  user = { id: 'user-123' },
  brand = {
    id: 'brand-123',
    name: 'Test Brand',
    brand_details: 'Premium goods',
    brand_guidelines: 'Keep it warm',
    brand_voice: null,
    brand_slug: 'test-brand',
    organization_id: null,
  },
  skills = [],
  conversationsUpsertMock,
  existingConversation = null,
}: {
  user?: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null;
  brand?: Record<string, unknown> | null;
  skills?: Array<Record<string, unknown>>;
  conversationsUpsertMock?: jest.Mock;
  existingConversation?: { id: string } | null;
} = {}) {
  const conversationsUpsert =
    conversationsUpsertMock ?? jest.fn().mockResolvedValue({ error: null });
  const conversationsUpdateEq = jest.fn().mockResolvedValue({ error: null });
  const messagesInsert = jest.fn().mockResolvedValue({ error: null });

  const supabase = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: jest.fn((table: string) => {
      if (table === 'brands') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: brand,
                error: brand ? null : new Error('not found'),
              }),
            }),
          }),
        };
      }

      if (table === 'skills') {
        return {
          select: jest.fn().mockReturnValue({
            or: jest.fn().mockResolvedValue({ data: skills, error: null }),
          }),
        };
      }

      if (table === 'conversations') {
        return {
          upsert: conversationsUpsert,
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: existingConversation,
                error: null,
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: conversationsUpdateEq,
          }),
        };
      }

      if (table === 'messages') {
        return {
          insert: messagesInsert,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return { supabase, conversationsUpsert, messagesInsert };
}

describe('/api/chat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-openai-key';
    mockSearchRelevantDocuments.mockResolvedValue([]);
    mockBuildRAGContext.mockReturnValue('<brand_knowledge>docs</brand_knowledge>');
    mockRunSkill.mockReturnValue({
      toUIMessageStreamResponse: () => new Response('ok', { status: 200 }),
    } as ReturnType<typeof runSkill>);
  });

  it('returns 400 when messages are missing', async () => {
    const response = await POST(request({ brandId: 'brand-123', messages: [] }));

    expect(response.status).toBe(400);
  });

  it('returns 401 when the user is not authenticated', async () => {
    const { supabase } = createSupabaseMock({ user: null });
    mockCreateClient.mockResolvedValue(supabase as any);

    const response = await POST(
      request({
        brandId: 'brand-123',
        messages: [uiText('Create an email')],
      }),
    );

    expect(response.status).toBe(401);
  });

  it('returns 404 when the brand cannot be loaded', async () => {
    const { supabase } = createSupabaseMock({ brand: null });
    mockCreateClient.mockResolvedValue(supabase as any);

    const response = await POST(
      request({
        brandId: 'missing-brand',
        messages: [uiText('Create an email')],
      }),
    );

    expect(response.status).toBe(404);
  });

  it('returns 400 when the conversation id is not a UUID', async () => {
    const response = await POST(
      request({
        brandId: 'brand-123',
        conversationId: 'not-a-uuid',
        messages: [uiText('Create an email')],
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Invalid conversationId');
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('builds RAG context and runs the selected model', async () => {
    const { supabase } = createSupabaseMock();
    mockCreateClient.mockResolvedValue(supabase as any);
    mockSearchRelevantDocuments.mockResolvedValue([
      {
        id: 'doc-1',
        brand_id: 'brand-123',
        doc_type: 'example',
        title: 'Reference',
        content: 'Reference copy',
        created_at: new Date().toISOString(),
      },
    ]);

    const response = await POST(
      request({
        brandId: 'brand-123',
        modelId: 'openai/gpt-5.1',
        messages: [uiText('Create an email')],
      }),
    );

    expect(response.status).toBe(200);
    expect(mockNormalizeModelId).toHaveBeenCalledWith('openai/gpt-5.1');
    expect(mockGateway).toHaveBeenCalledWith('openai/gpt-5.1');
    expect(mockSearchRelevantDocuments).toHaveBeenCalledWith(
      'brand-123',
      'Create an email',
      'test-openai-key',
      3,
    );
    expect(mockBuildRAGContext).toHaveBeenCalled();
    expect(mockRunSkill).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: 'openai/gpt-5.1',
        systemBase: expect.stringContaining('Brand Name: Test Brand'),
      }),
    );
  });

  it('persists the conversation before inserting the user turn', async () => {
    const { supabase, conversationsUpsert, messagesInsert } = createSupabaseMock();
    mockCreateClient.mockResolvedValue(supabase as any);

    await POST(
      request({
        brandId: 'brand-123',
        conversationId: VALID_CONVERSATION_ID,
        messages: [uiText('Create an email')],
      }),
    );

    expect(conversationsUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: VALID_CONVERSATION_ID,
        brand_id: 'brand-123',
        user_id: 'user-123',
        title: 'Create an email',
        conversation_type: 'email',
        mode: 'email_copy',
      }),
      { onConflict: 'id' },
    );
    expect(messagesInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        conversation_id: VALID_CONVERSATION_ID,
        role: 'user',
        content: 'Create an email',
        user_id: 'user-123',
      }),
    );
  });

  it('retries conversation persistence without missing optional columns', async () => {
    const conversationsUpsert = jest
      .fn()
      .mockResolvedValueOnce({
        error: {
          message: "Could not find the 'created_by' column of 'conversations' in the schema cache",
        },
      })
      .mockResolvedValueOnce({ error: null });
    const { supabase } = createSupabaseMock({ conversationsUpsertMock: conversationsUpsert });
    mockCreateClient.mockResolvedValue(supabase as any);

    const response = await POST(
      request({
        brandId: 'brand-123',
        conversationId: VALID_CONVERSATION_ID,
        messages: [uiText('Create an email')],
      }),
    );

    expect(response.status).toBe(200);
    expect(conversationsUpsert).toHaveBeenCalledTimes(2);
    expect(conversationsUpsert.mock.calls[0][0]).toEqual(
      expect.objectContaining({ created_by: 'user-123' }),
    );
    expect(conversationsUpsert.mock.calls[1][0]).not.toHaveProperty('created_by');
  });

  it('returns 500 instead of streaming an unsaved conversation when persistence fails', async () => {
    const conversationsUpsert = jest.fn().mockResolvedValue({
      error: { message: 'new row violates row-level security policy' },
    });
    const { supabase, messagesInsert } = createSupabaseMock({
      conversationsUpsertMock: conversationsUpsert,
    });
    mockCreateClient.mockResolvedValue(supabase as any);

    const response = await POST(
      request({
        brandId: 'brand-123',
        conversationId: VALID_CONVERSATION_ID,
        messages: [uiText('Create an email')],
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.text()).toBe('Failed to save conversation');
    expect(messagesInsert).not.toHaveBeenCalled();
    expect(mockRunSkill).not.toHaveBeenCalled();
  });

  it('continues when updating an already-readable conversation is blocked', async () => {
    const conversationsUpsert = jest.fn().mockResolvedValue({
      error: { message: 'new row violates row-level security policy' },
    });
    const { supabase, messagesInsert } = createSupabaseMock({
      conversationsUpsertMock: conversationsUpsert,
      existingConversation: { id: VALID_CONVERSATION_ID },
    });
    mockCreateClient.mockResolvedValue(supabase as any);

    const response = await POST(
      request({
        brandId: 'brand-123',
        conversationId: VALID_CONVERSATION_ID,
        messages: [uiText('Create an email')],
      }),
    );

    expect(response.status).toBe(200);
    expect(messagesInsert).toHaveBeenCalled();
    expect(mockRunSkill).toHaveBeenCalled();
  });
});
