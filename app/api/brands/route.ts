import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

/**
 * One-click new client creation. The UI pops a single-field dialog with
 * just a name; everything else on the brand can be filled in later. We
 * create the row, return it, and the UI routes straight into an empty
 * Auto chat.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { name?: string; organizationId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  let organizationId = body.organizationId ?? null;
  if (!organizationId) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    organizationId = membership?.organization_id ?? null;
  }
  if (!organizationId) {
    return NextResponse.json(
      { error: 'User has no organization; create one first.' },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from('brands')
    .insert({
      name,
      organization_id: organizationId,
      created_by: user.id,
    })
    .select('*')
    .single();

  if (error || !data) {
    logger.error('[brands/POST] insert failed:', error);
    return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });
  }
  return NextResponse.json({ brand: data }, { status: 201 });
}
