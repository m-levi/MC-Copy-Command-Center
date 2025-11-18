import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  authenticationError,
  withErrorHandling,
} from '@/lib/api-error';

export const runtime = 'nodejs';

// GET: Get user's notifications
export const GET = withErrorHandling(async (req: NextRequest) => {
  const searchParams = req.nextUrl.searchParams;
  const unreadOnly = searchParams.get('unreadOnly') === 'true';
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return authenticationError('Please log in');
  }

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.eq('read', false);
  }

  const { data: notifications, error } = await query;

  if (error) throw error;

  return NextResponse.json({ notifications: notifications || [] });
});

// PUT: Mark notification as read
export const PUT = withErrorHandling(async (req: NextRequest) => {
  const { notificationId, read } = await req.json();

  if (!notificationId) {
    return NextResponse.json(
      { error: 'notificationId is required' },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return authenticationError('Please log in');
  }

  const { data: notification, error: updateError } = await supabase
    .from('notifications')
    .update({ read: read !== undefined ? read : true })
    .eq('id', notificationId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (updateError) throw updateError;

  return NextResponse.json({ notification });
});




