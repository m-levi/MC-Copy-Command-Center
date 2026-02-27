import { NextRequest, NextResponse } from 'next/server';
import { processPendingPushNotifications } from '@/lib/push/processor';

export const runtime = 'nodejs';

/**
 * Vercel Cron endpoint for web push delivery.
 * Requires: Authorization: Bearer ${CRON_SECRET}
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processPendingPushNotifications();
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Push cron error:', error);
    return NextResponse.json(
      {
        error: 'Push processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

