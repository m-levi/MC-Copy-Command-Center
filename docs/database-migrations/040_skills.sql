-- 040_skills.sql
--
-- Agent Skills storage. Follows the SKILL.md shape: frontmatter in a jsonb
-- column, markdown body in text. Built-in skills live on the filesystem
-- under /skills/<name>/SKILL.md and are NOT stored here — only user / org /
-- brand customizations land in this table.
--
-- Scope precedence (enforced at read time in lib/skills/registry.ts):
--   user > brand > org > global > builtin
--
-- RLS mirrors the existing pattern from 019_conversation_sharing.sql.

create extension if not exists "pgcrypto";

create table if not exists skills (
  id uuid primary key default gen_random_uuid(),
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  description text not null check (length(description) >= 10),
  scope text not null check (scope in ('global', 'org', 'brand', 'user')),
  org_id uuid references organizations(id) on delete cascade,
  brand_id uuid references brands(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  frontmatter jsonb not null default '{}'::jsonb,
  body text not null default '',
  resources jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint skills_scope_owner_ck check (
    (scope = 'global' and org_id is null and brand_id is null and user_id is null) or
    (scope = 'org' and org_id is not null and brand_id is null and user_id is null) or
    (scope = 'brand' and brand_id is not null and user_id is null) or
    (scope = 'user' and user_id is not null)
  )
);

create unique index if not exists skills_slug_scope_global_uq
  on skills (slug)
  where scope = 'global';

create unique index if not exists skills_slug_scope_org_uq
  on skills (slug, org_id)
  where scope = 'org';

create unique index if not exists skills_slug_scope_brand_uq
  on skills (slug, brand_id)
  where scope = 'brand';

create unique index if not exists skills_slug_scope_user_uq
  on skills (slug, user_id)
  where scope = 'user';

create index if not exists skills_org_id_ix on skills (org_id) where org_id is not null;
create index if not exists skills_brand_id_ix on skills (brand_id) where brand_id is not null;
create index if not exists skills_user_id_ix on skills (user_id) where user_id is not null;

create or replace function set_skills_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists skills_updated_at on skills;
create trigger skills_updated_at
  before update on skills
  for each row execute function set_skills_updated_at();

alter table skills enable row level security;

-- Read: anyone can read global; org members can read their org scope;
-- brand members can read their brand scope; users can read their own.
drop policy if exists "skills_read_global" on skills;
create policy "skills_read_global" on skills
  for select using (scope = 'global');

drop policy if exists "skills_read_org" on skills;
create policy "skills_read_org" on skills
  for select using (
    scope = 'org' and exists (
      select 1 from organization_members om
      where om.organization_id = skills.org_id and om.user_id = auth.uid()
    )
  );

drop policy if exists "skills_read_brand" on skills;
create policy "skills_read_brand" on skills
  for select using (
    scope = 'brand' and exists (
      select 1 from brands b
      join organization_members om on om.organization_id = b.organization_id
      where b.id = skills.brand_id and om.user_id = auth.uid()
    )
  );

drop policy if exists "skills_read_user" on skills;
create policy "skills_read_user" on skills
  for select using (scope = 'user' and user_id = auth.uid());

-- Write: only the owner (and org admins for org scope) can write.
drop policy if exists "skills_write_user" on skills;
create policy "skills_write_user" on skills
  for all using (scope = 'user' and user_id = auth.uid())
  with check (scope = 'user' and user_id = auth.uid());

drop policy if exists "skills_write_brand" on skills;
create policy "skills_write_brand" on skills
  for all using (
    scope = 'brand' and exists (
      select 1 from brands b
      join organization_members om on om.organization_id = b.organization_id
      where b.id = skills.brand_id
        and om.user_id = auth.uid()
        and om.role in ('owner', 'admin', 'editor')
    )
  )
  with check (
    scope = 'brand' and exists (
      select 1 from brands b
      join organization_members om on om.organization_id = b.organization_id
      where b.id = skills.brand_id
        and om.user_id = auth.uid()
        and om.role in ('owner', 'admin', 'editor')
    )
  );

drop policy if exists "skills_write_org" on skills;
create policy "skills_write_org" on skills
  for all using (
    scope = 'org' and exists (
      select 1 from organization_members om
      where om.organization_id = skills.org_id
        and om.user_id = auth.uid()
        and om.role in ('owner', 'admin')
    )
  )
  with check (
    scope = 'org' and exists (
      select 1 from organization_members om
      where om.organization_id = skills.org_id
        and om.user_id = auth.uid()
        and om.role in ('owner', 'admin')
    )
  );

-- Track which skill a conversation is locked to. NULL = Auto mode.
alter table conversations
  add column if not exists skill_id uuid references skills(id) on delete set null,
  add column if not exists skill_slug text,
  add column if not exists skill_variables jsonb not null default '{}'::jsonb;

create index if not exists conversations_skill_id_ix on conversations (skill_id);

comment on column conversations.skill_id is
  'Non-null when the user has locked this conversation to a specific skill; null for Auto mode.';
comment on column conversations.skill_slug is
  'Denormalized skill slug (including builtins, which have no row in the skills table).';
