import { NextRequest, NextResponse } from 'next/server';
import { processMessageQueue } from '@/lib/queue/worker';

export const runtime = 'nodejs';

/**
 * Vercel Cron Job endpoint to process message queue
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/process-queue",
 *     "schedule": "every 10 minutes"
 *   }]
 * }
 */
export async function GET(req: NextRequest) {
  // Verify cron secret (set in Vercel environment variables)
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await processMessageQueue();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Processing failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

