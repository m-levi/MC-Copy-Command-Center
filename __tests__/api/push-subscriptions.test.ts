/**
 * @jest-environment node
 */

import { GET, POST, DELETE } from '@/app/api/push/subscriptions/route';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server');

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

function buildAuthMock(userId: string | null) {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
        error: null,
      }),
    },
  };
}

describe('/api/push/subscriptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET returns unauthorized when no user', async () => {
    const mockSupabase = buildAuthMock(null);
    mockCreateClient.mockResolvedValue(mockSupabase as never);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('POST validates subscription payload', async () => {
    const mockSupabase = buildAuthMock('user-1');
    mockCreateClient.mockResolvedValue(mockSupabase as never);

    const req = new Request('http://localhost/api/push/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ subscription: { endpoint: '' } }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req as never);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid subscription payload');
  });

  it('POST upserts a valid subscription', async () => {
    const savedSubscription = {
      id: 'sub-1',
      endpoint: 'https://push.example/device',
      device_label: 'MacIntel',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_used_at: new Date().toISOString(),
    };

    const fromMock = jest.fn().mockReturnValue({
      upsert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: savedSubscription,
            error: null,
          }),
        }),
      }),
    });

    const mockSupabase = {
      ...buildAuthMock('user-1'),
      from: fromMock,
    };

    mockCreateClient.mockResolvedValue(mockSupabase as never);

    const req = new Request('http://localhost/api/push/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        subscription: {
          endpoint: 'https://push.example/device',
          keys: {
            p256dh: 'key-p256dh',
            auth: 'key-auth',
          },
        },
        deviceLabel: 'Laptop',
      }),
      headers: {
        'Content-Type': 'application/json',
        'user-agent': 'jest-agent',
      },
    });

    const response = await POST(req as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.subscription.endpoint).toBe('https://push.example/device');
    expect(fromMock).toHaveBeenCalledWith('push_subscriptions');
  });

  it('DELETE removes subscription by endpoint', async () => {
    const deleteQuery = {
      eq: jest.fn(),
    };

    deleteQuery.eq.mockImplementation((field: string) => {
      if (field === 'user_id') return deleteQuery;
      return Promise.resolve({ error: null });
    });

    const mockSupabase = {
      ...buildAuthMock('user-1'),
      from: jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnValue(deleteQuery),
      }),
    };

    mockCreateClient.mockResolvedValue(mockSupabase as never);

    const req = new Request('http://localhost/api/push/subscriptions', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint: 'https://push.example/device' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await DELETE(req as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(deleteQuery.eq).toHaveBeenCalledWith('endpoint', 'https://push.example/device');
  });
});

