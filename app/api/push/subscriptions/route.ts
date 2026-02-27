import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

interface PushSubscriptionPayload {
  endpoint: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, device_label, user_agent, created_at, updated_at, last_used_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to load push subscriptions' }, { status: 500 });
  }

  return NextResponse.json({ subscriptions: data || [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const subscription = body.subscription as PushSubscriptionPayload | undefined;
  const deviceLabel = typeof body.deviceLabel === 'string' ? body.deviceLabel : null;

  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription payload' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: req.headers.get('user-agent'),
        device_label: deviceLabel,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,endpoint' }
    )
    .select('id, endpoint, device_label, created_at, updated_at, last_used_at')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to save push subscription' }, { status: 500 });
  }

  return NextResponse.json({ subscription: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const endpoint = typeof body.endpoint === 'string' ? body.endpoint : null;

  let query = supabase.from('push_subscriptions').delete().eq('user_id', user.id);
  if (endpoint) {
    query = query.eq('endpoint', endpoint);
  }

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: 'Failed to remove push subscription' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

