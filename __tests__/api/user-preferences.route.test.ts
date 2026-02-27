/**
 * @jest-environment node
 */

import { GET, POST } from '@/app/api/user-preferences/route';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server');

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

function mockAuthenticatedUser(userId = 'user-1') {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
  };
}

describe('/api/user-preferences route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET returns defaults including email and push notifications when no row exists', async () => {
    const single = jest.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST116' },
    });

    const mockSupabase = {
      ...mockAuthenticatedUser(),
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single,
          }),
        }),
      }),
    };

    mockCreateClient.mockResolvedValue(mockSupabase as never);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user_id).toBe('user-1');
    expect(data.email_notifications).toEqual(
      expect.objectContaining({
        enabled: true,
        comment_added: true,
      })
    );
    expect(data.push_notifications).toEqual(
      expect.objectContaining({
        enabled: true,
        review_requested: true,
      })
    );
  });

  it('POST persists email_notifications and push_notifications allowlisted fields', async () => {
    const single = jest.fn().mockResolvedValue({
      data: {
        id: 'pref-1',
        user_id: 'user-1',
        email_notifications: { enabled: false },
        push_notifications: { enabled: true },
      },
      error: null,
    });

    const upsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single,
      }),
    });

    const mockSupabase = {
      ...mockAuthenticatedUser(),
      from: jest.fn().mockReturnValue({
        upsert,
      }),
    };

    mockCreateClient.mockResolvedValue(mockSupabase as never);

    const req = new Request('http://localhost/api/user-preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email_notifications: { enabled: false, comment_added: false },
        push_notifications: { enabled: true, comment_added: true },
        unknown_field: 'ignored',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user_id).toBe('user-1');

    const upsertPayload = upsert.mock.calls[0][0] as Record<string, unknown>;
    expect(upsertPayload.user_id).toBe('user-1');
    expect(upsertPayload.email_notifications).toEqual({ enabled: false, comment_added: false });
    expect(upsertPayload.push_notifications).toEqual({ enabled: true, comment_added: true });
    expect('unknown_field' in upsertPayload).toBe(false);
  });
});

