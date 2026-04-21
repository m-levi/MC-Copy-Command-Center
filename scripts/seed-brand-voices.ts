/**
 * Seed brand voice content into the brands table.
 *
 * Reads every /data/brand-voices/<slug>/brand.md and updates the matching
 * brands row by case-insensitive name match. Slug is derived from the
 * directory name; a brand named "Really Good Whisky" matches the
 * `really-good-whisky` directory. Writes brand_md and brand_slug.
 *
 * Usage:
 *   DRY_RUN=1 npx tsx scripts/seed-brand-voices.ts   # preview
 *   npx tsx scripts/seed-brand-voices.ts             # apply
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 *
 * Idempotent: re-running overwrites brand_md with the latest filesystem
 * content, so this also doubles as a "redeploy voice" command.
 */

import { createClient } from '@supabase/supabase-js';
import { listShippedBrandVoices, inferSlug } from '../lib/brand-voice';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.env.DRY_RUN === '1';

async function main() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const seeds = listShippedBrandVoices();
  if (seeds.length === 0) {
    console.log('No brand voice files found under /data/brand-voices.');
    return;
  }

  const { data: brands, error } = await supabase
    .from('brands')
    .select('id, name, brand_md, brand_slug');
  if (error) throw error;

  let updated = 0;
  let skipped = 0;
  let unmatched: string[] = [];

  for (const seed of seeds) {
    const seedSlug = seed.slug;
    const matches = (brands ?? []).filter(
      (b) =>
        inferSlug(String(b.name ?? '')) === seedSlug ||
        b.brand_slug === seedSlug,
    );
    if (matches.length === 0) {
      unmatched.push(seedSlug);
      continue;
    }
    for (const brand of matches) {
      const same =
        (brand.brand_md ?? '').trim() === seed.brandMd.trim() &&
        brand.brand_slug === seedSlug;
      if (same) {
        skipped++;
        continue;
      }
      if (DRY_RUN) {
        console.log(
          `[dry-run] would update "${brand.name}" (${brand.id}) ← ${seedSlug}/brand.md (${seed.brandMd.length} chars)`,
        );
        updated++;
        continue;
      }
      const { error: updErr } = await supabase
        .from('brands')
        .update({ brand_md: seed.brandMd, brand_slug: seedSlug })
        .eq('id', brand.id);
      if (updErr) {
        console.error(`Failed to update ${brand.name}:`, updErr.message);
        continue;
      }
      console.log(`✓ ${brand.name} ← ${seedSlug}/brand.md`);
      updated++;
    }
  }

  console.log('');
  console.log(`Done. Updated: ${updated}. Skipped (already current): ${skipped}.`);
  if (unmatched.length > 0) {
    console.log(
      `Unmatched seeds (no brand row found): ${unmatched.join(', ')}.\n` +
        'Create the brand in the app first, then re-run this script.',
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
