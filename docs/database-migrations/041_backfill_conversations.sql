-- 041_backfill_conversations.sql
--
-- Backfill conversations.skill_slug for pre-existing threads that still
-- have a legacy `mode` column. Mapping is intentionally conservative:
--   - planning -> 'planning'
--   - flow     -> 'planning' (flow-specific skills aren't shipped in v1)
--   - anything else -> null, so Auto picks per turn.
-- Run AFTER 040_skills.sql and AFTER the Node runtime starts populating
-- the /skills directory so the slugs exist.

update conversations
set skill_slug = case
  when mode in ('planning', 'flow') then 'planning'
  when mode = 'email_copy' then null
  else null
end
where skill_slug is null
  and mode is not null;
