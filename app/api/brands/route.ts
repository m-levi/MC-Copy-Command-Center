import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/brands
 * Returns all brands for the current user
 */
export async function GET() {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Try to get brands by created_by first
    let { data: brands, error } = await supabase
      .from('brands')
      .select('id, name, website_url, created_at')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    // If no brands found, try user_id column
    if ((!brands || brands.length === 0) && !error) {
      const { data: altBrands, error: altError } = await supabase
        .from('brands')
        .select('id, name, website_url, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (!altError) {
        brands = altBrands;
      }
    }

    if (error) {
      console.error('[Brands API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(brands || []);
  } catch (error: any) {
    console.error('[Brands API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


