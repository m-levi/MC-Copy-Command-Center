import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/brands/latest
 * 
 * Returns the ID of the most recently created brand for the current user.
 * Used after brand creation to redirect to voice builder.
 */
export async function GET() {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get most recent brand where user is creator (via created_by or legacy user_id)
    const { data, error } = await supabase
      .from('brands')
      .select('id')
      .or(`created_by.eq.${user.id},user_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      return NextResponse.json({ brandId: null });
    }

    return NextResponse.json({ brandId: data.id });
  } catch (error: any) {
    console.error('[Latest Brand] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}






































