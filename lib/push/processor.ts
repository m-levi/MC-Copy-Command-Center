import { createClient } from '@/lib/supabase/server';
import {
  isWebPushConfigured,
  sendWebPushNotification,
  type PushMessagePayload,
  type StoredPushSubscription,
} from '@/lib/push/web-push';
import type { PushNotificationPreferences } from '@/types';

const DEFAULT_PUSH_PREFS: PushNotificationPreferences = {
  enabled: true,
  comment_added: true,
  comment_assigned: true,
  comment_mention: true,
  review_requested: true,
  review_completed: true,
  team_invite: true,
};

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  push_attempts: number;
};

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function isPushTypeEnabled(
  preferences: PushNotificationPreferences | null | undefined,
  notificationType: string
) {
  const prefs = { ...DEFAULT_PUSH_PREFS, ...(preferences || {}) };

  if (prefs.enabled === false) return false;

  const knownTypeKeys = [
    'comment_added',
    'comment_assigned',
    'comment_mention',
    'review_requested',
    'review_completed',
    'team_invite',
  ] as const;

  if ((knownTypeKeys as readonly string[]).includes(notificationType)) {
    return prefs[notificationType as keyof PushNotificationPreferences] !== false;
  }

  // Unknown notification type: default to enabled when master toggle is enabled.
  return true;
}

export async function processPendingPushNotifications(limit = 100) {
  if (!isWebPushConfigured()) {
    return {
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      reason: 'Web push not configured',
    };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('id, user_id, type, title, message, link, metadata, created_at, push_attempts')
    .eq('push_status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load pending notifications: ${error.message}`);
  }

  if (!notifications || notifications.length === 0) {
    return {
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    };
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const notification of notifications as NotificationRow[]) {
    const attempts = (notification.push_attempts || 0) + 1;

    const { data: userPrefs } = await supabase
      .from('user_preferences')
      .select('push_notifications')
      .eq('user_id', notification.user_id)
      .single();

    const pushPreferences = userPrefs?.push_notifications as PushNotificationPreferences | undefined;
    if (!isPushTypeEnabled(pushPreferences, notification.type)) {
      skipped += 1;
      await supabase
        .from('notifications')
        .update({
          push_status: 'failed',
          push_last_error: 'Push disabled by user preferences',
          push_attempts: attempts,
        })
        .eq('id', notification.id);
      continue;
    }

    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', notification.user_id);

    if (subscriptionsError) {
      failed += 1;
      await supabase
        .from('notifications')
        .update({
          push_status: 'failed',
          push_last_error: subscriptionsError.message,
          push_attempts: attempts,
        })
        .eq('id', notification.id);
      continue;
    }

    if (!subscriptions || subscriptions.length === 0) {
      skipped += 1;
      await supabase
        .from('notifications')
        .update({
          push_status: 'failed',
          push_last_error: 'No active push subscriptions',
          push_attempts: attempts,
        })
        .eq('id', notification.id);
      continue;
    }

    const payload: PushMessagePayload = {
      title: notification.title,
      body: notification.message,
      icon: '/pwa-192.svg',
      badge: '/pwa-192.svg',
      url: notification.link,
      tag: `notification-${notification.id}`,
    };

    let delivered = false;
    let lastError = '';

    for (const subscription of subscriptions as PushSubscriptionRow[]) {
      const result = await sendWebPushNotification(subscription as StoredPushSubscription, payload);

      if (result.success) {
        delivered = true;
        await supabase
          .from('push_subscriptions')
          .update({ last_used_at: now })
          .eq('id', subscription.id);
        continue;
      }

      lastError = result.error || 'Push send failed';

      // Remove stale subscriptions.
      if (result.statusCode === 404 || result.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', subscription.id);
      }
    }

    if (delivered) {
      sent += 1;
      await supabase
        .from('notifications')
        .update({
          push_status: 'sent',
          push_sent_at: now,
          push_attempts: attempts,
          push_last_error: null,
        })
        .eq('id', notification.id);
    } else {
      failed += 1;
      await supabase
        .from('notifications')
        .update({
          push_status: 'failed',
          push_attempts: attempts,
          push_last_error: lastError || 'Push delivery failed for all subscriptions',
        })
        .eq('id', notification.id);
    }
  }

  return {
    processed: notifications.length,
    sent,
    failed,
    skipped,
  };
}

