/**
 * Migrate legacy custom_prompts rows into the new `skills` table.
 *
 * Usage:
 *   DRY_RUN=1 npx tsx scripts/migrate-custom-prompts-to-skills.ts
 *   npx tsx scripts/migrate-custom-prompts-to-skills.ts           # write
 *
 * Each custom_prompts row becomes a user-scoped skill. Slug is derived
 * from the prompt's name. Skills with existing (slug, user_id) rows are
 * skipped so the script is idempotent.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DRY_RUN = process.env.DRY_RUN === '1';

async function main() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: prompts, error } = await supabase
    .from('custom_prompts')
    .select('id, user_id, name, description, prompt_template, created_at');
  if (error) throw error;
  if (!prompts?.length) {
    console.log('No custom_prompts rows to migrate.');
    return;
  }

  let created = 0;
  let skipped = 0;
  for (const p of prompts) {
    const slug = slugify(p.name);
    const description =
      p.description && p.description.length >= 10
        ? p.description
        : `Custom prompt migrated from legacy custom_prompts: ${p.name}`;
    const body = p.prompt_template ?? '';
    const row = {
      slug,
      scope: 'user' as const,
      user_id: p.user_id,
      name: p.name,
      description,
      body,
      frontmatter: { name: slug, display_name: p.name, workflow_type: 'chat', tools: [] },
      resources: [],
      created_by: p.user_id,
    };

    if (DRY_RUN) {
      console.log('[dry-run] would insert', slug, 'for user', p.user_id);
      continue;
    }

    const { error: insertErr } = await supabase
      .from('skills')
      .insert(row)
      .select('id')
      .single();

    if (insertErr) {
      if ((insertErr as { code?: string }).code === '23505') {
        skipped++;
        continue;
      }
      console.error('Failed to insert', slug, insertErr);
      continue;
    }
    created++;
  }

  console.log(`Done. Created: ${created}, skipped (already-exists): ${skipped}.`);
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || `custom-${Date.now()}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
