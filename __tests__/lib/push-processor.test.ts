/**
 * @jest-environment node
 */

import { processPendingPushNotifications } from '@/lib/push/processor';
import { createClient } from '@/lib/supabase/server';
import { isWebPushConfigured, sendWebPushNotification } from '@/lib/push/web-push';

jest.mock('@/lib/supabase/server');
jest.mock('@/lib/push/web-push');

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockIsWebPushConfigured = isWebPushConfigured as jest.MockedFunction<typeof isWebPushConfigured>;
const mockSendWebPushNotification = sendWebPushNotification as jest.MockedFunction<typeof sendWebPushNotification>;

describe('processPendingPushNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns early when web push is not configured', async () => {
    mockIsWebPushConfigured.mockReturnValue(false);

    const result = await processPendingPushNotifications();

    expect(result.reason).toContain('not configured');
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('sends pending notification and marks it as sent', async () => {
    mockIsWebPushConfigured.mockReturnValue(true);
    mockSendWebPushNotification.mockResolvedValue({ success: true });

    const notificationsTable = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'notif-1',
            user_id: 'user-1',
            type: 'comment_added',
            title: 'New comment',
            message: 'A teammate commented.',
            link: '/brands/brand-1/chat?conversation=abc',
            metadata: {},
            created_at: new Date().toISOString(),
            push_attempts: 0,
          },
        ],
        error: null,
      }),
      update: jest.fn().mockReturnThis(),
    };

    const userPreferencesTable = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          push_notifications: {
            enabled: true,
            comment_added: true,
          },
        },
        error: null,
      }),
    };

    const pushSubscriptionsTable = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'sub-1',
            endpoint: 'https://push.example/device',
            p256dh: 'p256dh',
            auth: 'auth',
          },
        ],
        error: null,
      }),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
    };

    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'notifications') return notificationsTable;
        if (table === 'user_preferences') return userPreferencesTable;
        if (table === 'push_subscriptions') return pushSubscriptionsTable;
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    mockCreateClient.mockResolvedValue(mockSupabase as never);

    const result = await processPendingPushNotifications();

    expect(result.processed).toBe(1);
    expect(result.sent).toBe(1);
    expect(mockSendWebPushNotification).toHaveBeenCalledTimes(1);
    expect(notificationsTable.update).toHaveBeenCalledWith(
      expect.objectContaining({ push_status: 'sent' })
    );
  });
});

