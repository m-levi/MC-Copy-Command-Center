import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export interface LocalMemoryRow {
  id: string;
  content: string;
  category: string;
  title: string | null;
  createdAt: string;
  score?: number;
}

/**
 * DB-backed memory fallback used when SUPERMEMORY_API_KEY isn't
 * configured. Reads + writes the `memory_notes` table which is scoped
 * per (user_id, brand_id) via RLS. Search is naive substring matching
 * for now — will be swapped for pgvector once embeddings are wired.
 */
export async function localMemorySearch(
  userId: string,
  brandId: string | null,
  query: string,
  limit = 5,
): Promise<LocalMemoryRow[]> {
  const supabase = await createClient();
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  const { data, error } = await supabase
    .from('memory_notes')
    .select('id, content, category, title, created_at')
    .eq('user_id', userId)
    .eq(brandId ? 'brand_id' : 'user_id', brandId ?? userId)
    .ilike('content', `%${needle}%`)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    logger.warn('[memory:local] search failed:', error);
    return [];
  }
  // Crude relevance: longer overlap = higher score.
  return (data ?? []).map((row) => ({
    id: row.id as string,
    content: row.content as string,
    category: row.category as string,
    title: (row.title as string | null) ?? null,
    createdAt: row.created_at as string,
    score: Math.min(1, (row.content?.toLowerCase().split(needle).length - 1) / 3),
  }));
}

export async function localMemoryAdd(params: {
  userId: string;
  brandId: string | null;
  content: string;
  category: string;
  title?: string;
}): Promise<{ id: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('memory_notes')
    .insert({
      user_id: params.userId,
      brand_id: params.brandId,
      content: params.content,
      category: params.category,
      title: params.title ?? null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return { id: data.id as string };
}

export async function localMemoryList(
  userId: string,
  brandId: string | null,
  limit = 50,
): Promise<LocalMemoryRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from('memory_notes')
    .select('id, content, category, title, created_at')
    .eq('user_id', userId);
  if (brandId) query = query.eq('brand_id', brandId);
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    logger.warn('[memory:local] list failed:', error);
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id as string,
    content: row.content as string,
    category: row.category as string,
    title: (row.title as string | null) ?? null,
    createdAt: row.created_at as string,
  }));
}
