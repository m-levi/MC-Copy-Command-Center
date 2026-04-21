-- 042_drop_custom_prompts.sql
--
-- Run AFTER /scripts/migrate-custom-prompts-to-skills.ts copies each
-- custom_prompts row into the skills table. Drops the legacy table and
-- the legacy `mode` column on conversations.

drop table if exists custom_prompts cascade;

alter table conversations
  drop column if exists mode;
