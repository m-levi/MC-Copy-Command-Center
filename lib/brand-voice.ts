import 'server-only';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '@/lib/logger';

/**
 * Resolve a brand's voice markdown.
 *
 * Order of precedence:
 *   1. `brand.brand_md` column if set  — the in-app editable source.
 *   2. Filesystem fallback at `/skills/mc-brand-voice/brands/<slug>/brand.md`
 *      if the brand has a `brand_slug` that maps to a shipped file.
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
  const path = join(process.cwd(), 'skills', 'mc-brand-voice', 'brands', slug, 'brand.md');
  if (!existsSync(path)) return '';
  try {
    return readFileSync(path, 'utf8');
  } catch (err) {
    logger.warn('[brand-voice] failed to read filesystem fallback:', err);
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
