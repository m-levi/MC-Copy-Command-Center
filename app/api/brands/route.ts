import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  withErrorHandling,
  throwAuthenticationError,
  handleSupabaseError,
} from '@/lib/api-error';

/**
 * GET /api/brands
 * Returns all brands for the current user
 */
export const GET = withErrorHandling(async () => {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throwAuthenticationError();
  }

  // Get brands where user is creator (via created_by or legacy user_id column)
  const { data: brands, error } = await supabase
    .from('brands')
    .select('id, name, website_url, created_at')
    .or(`created_by.eq.${user.id},user_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (error) {
    handleSupabaseError(error, 'fetch brands');
  }

  return NextResponse.json(brands || []);
});













