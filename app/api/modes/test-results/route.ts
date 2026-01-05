import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/modes/test-results
 * Get test result history for the current user
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const modeId = searchParams.get('mode_id');
  const comparisonGroupId = searchParams.get('comparison_group_id');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  let query = supabase
    .from('mode_test_results')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (modeId) {
    query = query.eq('mode_id', modeId);
  }

  if (comparisonGroupId) {
    query = query.eq('comparison_group_id', comparisonGroupId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * DELETE /api/modes/test-results
 * Delete test results
 */
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const comparisonGroupId = searchParams.get('comparison_group_id');
  const clearAll = searchParams.get('clear_all') === 'true';

  if (clearAll) {
    // Delete all test results for user
    const { error } = await supabase
      .from('mode_test_results')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'All test results cleared' });
  }

  if (comparisonGroupId) {
    // Delete all results in a comparison group
    const { error } = await supabase
      .from('mode_test_results')
      .delete()
      .eq('user_id', user.id)
      .eq('comparison_group_id', comparisonGroupId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  if (id) {
    // Delete specific result
    const { error } = await supabase
      .from('mode_test_results')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'No id, comparison_group_id, or clear_all provided' }, { status: 400 });
}

/**
 * PATCH /api/modes/test-results
 * Update test result (rating, notes)
 */
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { id, rating, notes } = body;

  if (!id) {
    return NextResponse.json({ error: 'Test result ID is required' }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  
  if (rating !== undefined) {
    if (rating !== null && (rating < 1 || rating > 5)) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }
    updateData.rating = rating;
  }
  
  if (notes !== undefined) {
    updateData.notes = notes;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('mode_test_results')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
























