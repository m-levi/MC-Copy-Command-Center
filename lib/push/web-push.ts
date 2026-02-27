import webpush from 'web-push';

export interface StoredPushSubscription {
  id?: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushMessagePayload {
  title: string;
  body?: string | null;
  icon?: string;
  badge?: string;
  url?: string | null;
  tag?: string;
}

export interface PushSendResult {
  success: boolean;
  statusCode?: number;
  error?: string;
}

let vapidConfigured = false;

export function isWebPushConfigured() {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT
  );
}

function ensureVapidConfiguration() {
  if (vapidConfigured) return true;
  if (!isWebPushConfigured()) return false;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT as string,
    process.env.VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string
  );
  vapidConfigured = true;
  return true;
}

export async function sendWebPushNotification(
  subscription: StoredPushSubscription,
  payload: PushMessagePayload
): Promise<PushSendResult> {
  if (!ensureVapidConfiguration()) {
    return {
      success: false,
      error: 'Web push is not configured',
    };
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload),
      { TTL: 300 }
    );

    return { success: true };
  } catch (error: unknown) {
    const statusCode =
      typeof error === 'object' && error !== null && 'statusCode' in error
        ? Number((error as { statusCode: number }).statusCode)
        : undefined;
    const body =
      typeof error === 'object' && error !== null && 'body' in error
        ? String((error as { body: string }).body)
        : undefined;
    const message =
      typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: string }).message)
        : undefined;

    return {
      success: false,
      statusCode,
      error: body || message || 'Unknown push error',
    };
  }
}

