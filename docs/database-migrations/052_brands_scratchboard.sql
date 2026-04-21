-- 052_brands_scratchboard.sql
--
-- Per-brand scratchboard: free-form Markdown notes the operator keeps
-- alongside the brand. NOT loaded into the AI context — this is a
-- private workspace for the human (URLs to investigate, ideas to
-- circle back to, briefs in flight). If you want notes the AI sees,
-- save them as memories or put them in brand_md.

alter table brands
  add column if not exists scratchboard text;

comment on column brands.scratchboard is
  'Free-form operator notes per brand. Not surfaced to the AI; for human use only.';
