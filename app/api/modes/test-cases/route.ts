import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/modes/test-cases
 * List all test cases for the current user
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const favorite = searchParams.get('favorite') === 'true';
  const search = searchParams.get('search');

  let query = supabase
    .from('mode_test_cases')
    .select('*')
    .eq('user_id', user.id)
    .order('is_favorite', { ascending: false })
    .order('usage_count', { ascending: false })
    .order('created_at', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  if (favorite) {
    query = query.eq('is_favorite', true);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,test_input.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * POST /api/modes/test-cases
 * Create a new test case
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, description, test_input, expected_keywords, tags, category, is_favorite } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  if (!test_input?.trim()) {
    return NextResponse.json({ error: 'Test input is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('mode_test_cases')
    .insert({
      user_id: user.id,
      name: name.trim(),
      description: description?.trim() || null,
      test_input: test_input.trim(),
      expected_keywords: expected_keywords || [],
      tags: tags || [],
      category: category || null,
      is_favorite: is_favorite || false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
