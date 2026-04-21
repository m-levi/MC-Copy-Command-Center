-- 050_brands_brand_md.sql
--
-- Replace the four legacy voice fields (brand_details, brand_guidelines,
-- copywriting_style_guide, dos_donts — if present) with a single
-- `brand_md` column containing the full brand voice profile in Markdown.
-- Shape matches the mc-brand-voice skill's per-brand `brand.md` files.
--
-- The legacy columns are kept for now so existing data is not lost; the
-- UI is moved to `brand_md` only and a future migration can drop them.

alter table brands
  add column if not exists brand_md text;

-- Best-effort backfill: if any legacy field has content and brand_md is
-- empty, concatenate them as a seed. Safe under repeated migration.
update brands
set brand_md = coalesce(
  trim(both e'\n' from
    concat_ws(e'\n\n',
      nullif(brand_details, ''),
      case when coalesce(brand_guidelines, '') <> '' then e'## Guidelines\n' || brand_guidelines end,
      case when coalesce(copywriting_style_guide, '') <> '' then e'## Style guide\n' || copywriting_style_guide end
    )
  ),
  ''
)
where brand_md is null or brand_md = '';

-- Track the voice source so the chat route can prefer DB when set,
-- otherwise fall back to the filesystem brand file by slug.
alter table brands
  add column if not exists brand_slug text;

create index if not exists brands_brand_slug_ix on brands (brand_slug) where brand_slug is not null;

comment on column brands.brand_md is
  'The full brand voice profile in Markdown (see mc-brand-voice/brands/<slug>/brand.md). Renders as {{brand.voice}} in skill prompts.';
comment on column brands.brand_slug is
  'kebab-case slug that maps to /skills/mc-brand-voice/brands/<slug>/ for filesystem fallback.';
