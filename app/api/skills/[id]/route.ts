import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { skillFrontmatterSchema } from '@/lib/skills/types';

export const runtime = 'nodejs';

const updateSchema = z.object({
  description: z.string().min(10).optional(),
  body: z.string().min(1).optional(),
  frontmatter: skillFrontmatterSchema.partial().optional(),
  resources: z.array(z.object({ path: z.string(), content: z.string() })).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 });
  }
  const patch: Record<string, unknown> = {};
  if (parsed.data.description !== undefined) patch.description = parsed.data.description;
  if (parsed.data.body !== undefined) patch.body = parsed.data.body;
  if (parsed.data.frontmatter !== undefined) patch.frontmatter = parsed.data.frontmatter;
  if (parsed.data.resources !== undefined) patch.resources = parsed.data.resources;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No fields provided' }, { status: 400 });
  }

  const { data, error } = await supabase.from('skills').update(patch).eq('id', id).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ skill: data });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase.from('skills').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: 204 });
}
