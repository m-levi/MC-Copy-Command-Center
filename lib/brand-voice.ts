import 'server-only';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '@/lib/logger';

const BRAND_VOICES_DIR = join(process.cwd(), 'data', 'brand-voices');

/**
 * Resolve a brand's voice markdown.
 *
 * Order of precedence:
 *   1. `brand.brand_md` column when populated — the in-app editable
 *      source of truth.
 *   2. Filesystem seed at `/data/brand-voices/<slug>/brand.md` if a slug
 *      maps to one of the brand profiles shipped in this repo. This is
 *      a *seed*, not a skill — it's what the brand page loads when the
 *      DB column is empty so a fresh brand starts populated instead of
 *      blank.
 *   3. Empty string.
 */
export function loadBrandVoiceMarkdown(brand: {
  brand_md?: string | null;
  brand_slug?: string | null;
  name?: string | null;
}): string {
  if (brand.brand_md && brand.brand_md.trim().length > 0) {
    return brand.brand_md;
  }
  const slug = (brand.brand_slug ?? inferSlug(brand.name ?? ''))?.trim();
  if (!slug) return '';
  const path = join(BRAND_VOICES_DIR, slug, 'brand.md');
  if (!existsSync(path)) return '';
  try {
    return readFileSync(path, 'utf8');
  } catch (err) {
    logger.warn('[brand-voice] failed to read filesystem seed:', err);
    return '';
  }
}

/** Kebab-case slug from a brand name. */
export function inferSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * List every (slug, brand.md, references[]) shipped in /data/brand-voices.
 * Used by the seed script to populate brands.brand_md by name match.
 */
export function listShippedBrandVoices(): Array<{
  slug: string;
  brandMd: string;
  references: Array<{ filename: string; content: string }>;
}> {
  if (!existsSync(BRAND_VOICES_DIR)) return [];
  const out: ReturnType<typeof listShippedBrandVoices> = [];
  for (const entry of readdirSync(BRAND_VOICES_DIR)) {
    const dir = join(BRAND_VOICES_DIR, entry);
    if (!statSync(dir).isDirectory()) continue;
    const brandMdPath = join(dir, 'brand.md');
    if (!existsSync(brandMdPath)) continue;
    const brandMd = readFileSync(brandMdPath, 'utf8');
    const references: Array<{ filename: string; content: string }> = [];
    const refDir = join(dir, 'references');
    if (existsSync(refDir) && statSync(refDir).isDirectory()) {
      for (const refFile of readdirSync(refDir)) {
        if (!refFile.endsWith('.md')) continue;
        references.push({
          filename: refFile,
          content: readFileSync(join(refDir, refFile), 'utf8'),
        });
      }
    }
    out.push({ slug: entry, brandMd, references });
  }
  return out;
}

