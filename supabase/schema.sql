-- Prompt Vault: optional cloud sync schema
-- 1) Enable Anonymous Sign-ins in Supabase Auth settings.
-- 2) Run this script in the Supabase SQL Editor.
-- 3) Use only the publishable/anon key in the browser. Never expose service_role.

create extension if not exists pgcrypto;

create table if not exists public.prompts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'أخرى',
  description text not null default '',
  prompt text not null,
  tags text[] not null default '{}',
  tool text not null default '',
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.prompts enable row level security;

drop policy if exists "Users can read own prompts" on public.prompts;
create policy "Users can read own prompts" on public.prompts
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can insert own prompts" on public.prompts;
create policy "Users can insert own prompts" on public.prompts
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users can update own prompts" on public.prompts;
create policy "Users can update own prompts" on public.prompts
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own prompts" on public.prompts;
create policy "Users can delete own prompts" on public.prompts
  for delete to authenticated using (auth.uid() = user_id);

create index if not exists prompts_user_updated_idx on public.prompts(user_id, updated_at desc);
