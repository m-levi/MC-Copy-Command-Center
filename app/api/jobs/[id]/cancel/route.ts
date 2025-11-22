import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authenticationError, authorizationError, withErrorHandling } from '@/lib/api-error';
import { messageQueue } from '@/lib/queue/message-queue';

export const runtime = 'nodejs';

// POST: Cancel a job
export const POST = withErrorHandling(async (
  req: NextRequest,
  context?: { params: Promise<{ id: string }> }
) => {
  const { id: jobId } = await context!.params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return authenticationError('Please log in');
  }

  // Verify user owns the job
  const { data: job } = await supabase
    .from('message_jobs')
    .select('user_id')
    .eq('id', jobId)
    .single();

  if (!job || job.user_id !== user.id) {
    return authorizationError('You do not have permission to cancel this job');
  }

  await messageQueue.cancel(jobId);

  return NextResponse.json({ success: true });
});




