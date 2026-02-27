/**
 * @jest-environment node
 */

import { GET } from '@/app/api/cron/process-push-notifications/route';
import { processPendingPushNotifications } from '@/lib/push/processor';

jest.mock('@/lib/push/processor');

const mockProcessPendingPushNotifications = processPendingPushNotifications as jest.MockedFunction<
  typeof processPendingPushNotifications
>;

describe('/api/cron/process-push-notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = 'test-cron-secret';
  });

  it('rejects unauthorized requests', async () => {
    const req = new Request('http://localhost/api/cron/process-push-notifications', {
      method: 'GET',
      headers: {
        authorization: 'Bearer wrong-secret',
      },
    });

    const response = await GET(req as never);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns processing results on success', async () => {
    mockProcessPendingPushNotifications.mockResolvedValue({
      processed: 3,
      sent: 2,
      failed: 1,
      skipped: 0,
    });

    const req = new Request('http://localhost/api/cron/process-push-notifications', {
      method: 'GET',
      headers: {
        authorization: 'Bearer test-cron-secret',
      },
    });

    const response = await GET(req as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.result).toEqual(
      expect.objectContaining({
        processed: 3,
        sent: 2,
        failed: 1,
      })
    );
  });

  it('returns 500 when processor throws', async () => {
    mockProcessPendingPushNotifications.mockRejectedValue(new Error('processor failed'));

    const req = new Request('http://localhost/api/cron/process-push-notifications', {
      method: 'GET',
      headers: {
        authorization: 'Bearer test-cron-secret',
      },
    });

    const response = await GET(req as never);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Push processing failed');
    expect(data.details).toContain('processor failed');
  });
});

