-- RankPods creator magic-link sessions
-- Run this in the Supabase SQL editor if migrations are not applied automatically.

create table if not exists public.creator_sessions (
  id uuid primary key default gen_random_uuid(),
  podcast_id uuid not null references public.podcasts (id) on delete cascade,
  email text not null,
  token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists creator_sessions_email_created_at_idx
  on public.creator_sessions (email, created_at desc);

create index if not exists creator_sessions_podcast_id_idx
  on public.creator_sessions (podcast_id);

alter table public.creator_sessions enable row level security;

drop policy if exists creator_sessions_insert on public.creator_sessions;
create policy creator_sessions_insert
  on public.creator_sessions
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists creator_sessions_select on public.creator_sessions;
create policy creator_sessions_select
  on public.creator_sessions
  for select
  to anon, authenticated
  using (true);
