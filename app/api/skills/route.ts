import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { loadBuiltinSkills } from '@/lib/skills/registry';
import { skillFrontmatterSchema } from '@/lib/skills/types';

export const runtime = 'nodejs';

/**
 * GET /api/skills — returns every skill visible to the caller: builtins
 * (filesystem) + RLS-filtered custom rows. The UI uses this to populate
 * the picker and the skill editor.
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const brandId = url.searchParams.get('brandId');

  const builtins = loadBuiltinSkills().map((s) => ({
    id: s.id,
    slug: s.slug,
    scope: 'builtin' as const,
    display_name: s.frontmatter.display_name ?? s.slug,
    description: s.frontmatter.description,
    icon: s.frontmatter.icon,
    workflow_type: s.frontmatter.workflow_type,
    is_builtin: true,
  }));

  let query = supabase.from('skills').select('*');
  if (brandId) query = query.or(`user_id.eq.${user.id},brand_id.eq.${brandId},scope.eq.global`);
  else query = query.eq('user_id', user.id);
  const { data: rows } = await query;

  const custom = (rows ?? []).map((r) => ({
    id: r.id,
    slug: r.slug,
    scope: r.scope,
    display_name: r.frontmatter?.display_name ?? r.slug,
    description: r.description,
    icon: r.frontmatter?.icon,
    workflow_type: r.frontmatter?.workflow_type ?? 'chat',
    is_builtin: false,
  }));

  return NextResponse.json({ skills: [...builtins, ...custom] });
}

const createSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  scope: z.enum(['user', 'brand', 'org']),
  brand_id: z.string().uuid().optional(),
  org_id: z.string().uuid().optional(),
  description: z.string().min(10),
  body: z.string().min(1),
  frontmatter: skillFrontmatterSchema.partial().optional(),
  resources: z.array(z.object({ path: z.string(), content: z.string() })).optional(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 });
  }
  const { slug, scope, brand_id, org_id, description, body, frontmatter = {}, resources = [] } = parsed.data;

  const row: Record<string, unknown> = {
    slug,
    scope,
    name: frontmatter.display_name ?? slug,
    description,
    body,
    frontmatter: { ...frontmatter, name: slug, description },
    resources,
    created_by: user.id,
  };
  if (scope === 'user') row.user_id = user.id;
  if (scope === 'brand') row.brand_id = brand_id;
  if (scope === 'org') row.org_id = org_id;

  const { data, error } = await supabase.from('skills').insert(row).select('*').single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ skill: data }, { status: 201 });
}
