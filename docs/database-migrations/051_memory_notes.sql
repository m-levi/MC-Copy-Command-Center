-- 051_memory_notes.sql
--
-- DB-backed memory fallback. When SUPERMEMORY_API_KEY isn't configured
-- (or the service is down), memory_recall / memory_save read and write
-- this table so the memory feature still works locally. Schema is
-- deliberately simple — content + category + embedding-optional for
-- future cosine search.

create extension if not exists "pgcrypto";

create table if not exists memory_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_id uuid references brands(id) on delete cascade,
  content text not null check (length(content) between 1 and 4000),
  category text not null check (category in (
    'user_preference',
    'brand_context',
    'campaign_info',
    'product_details',
    'decision',
    'fact'
  )),
  title text,
  created_at timestamptz not null default now()
);

create index if not exists memory_notes_user_brand_ix
  on memory_notes (user_id, brand_id, created_at desc);

alter table memory_notes enable row level security;

drop policy if exists "memory_notes_owner_select" on memory_notes;
create policy "memory_notes_owner_select" on memory_notes
  for select using (user_id = auth.uid());

drop policy if exists "memory_notes_owner_write" on memory_notes;
create policy "memory_notes_owner_write" on memory_notes
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

comment on table memory_notes is
  'DB-backed memory store used when Supermemory is not configured. Scope: (user_id, brand_id).';
