import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authenticationError, withErrorHandling } from '@/lib/api-error';
import { messageQueue } from '@/lib/queue/message-queue';

export const runtime = 'nodejs';

// GET: List user's jobs
export const GET = withErrorHandling(async (req: NextRequest) => {
  const searchParams = req.nextUrl.searchParams;
  const status = searchParams.get('status') as any;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return authenticationError('Please log in');
  }

  const jobs = await messageQueue.getUserJobs(user.id, status);

  return NextResponse.json({ jobs });
});





