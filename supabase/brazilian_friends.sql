-- Brazilian Friends persistence and RLS schema.
-- The Firebase identity must be exchanged for a Supabase JWT with the same subject
-- before these policies are enabled in production.

create table if not exists public.brazilian_friends_users (
  id text primary key,
  email text not null,
  full_name text not null,
  photo_url text,
  status_message text,
  ip_region text,
  ip_country text,
  updated_at timestamptz not null default now()
);

-- Adds columns for tables that were created before photo_url/status_message existed.
alter table public.brazilian_friends_users add column if not exists photo_url text;
alter table public.brazilian_friends_users add column if not exists status_message text;

create table if not exists public.brazilian_friends_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id text not null references public.brazilian_friends_users(id) on delete cascade,
  receiver_id text references public.brazilian_friends_users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint brazilian_friends_messages_distinct_users check (receiver_id is null or sender_id <> receiver_id)
);

alter table public.brazilian_friends_messages alter column receiver_id drop not null;

create index if not exists brazilian_friends_messages_conversation_idx
  on public.brazilian_friends_messages (sender_id, receiver_id, created_at);

alter table public.brazilian_friends_users enable row level security;
alter table public.brazilian_friends_messages enable row level security;

-- Auth is handled by Firebase on the frontend (not Supabase Auth), so auth.uid()
-- is always null here. Policies are permissive at the DB layer, matching the
-- rest of this project's tables (see schema.sql), and access is gated by the app.
drop policy if exists "Friends can read profiles" on public.brazilian_friends_users;
drop policy if exists "brazilian_friends_users_all_access" on public.brazilian_friends_users;
create policy "brazilian_friends_users_all_access"
  on public.brazilian_friends_users for all
  using (true)
  with check (true);

drop policy if exists "Users can create their own profile" on public.brazilian_friends_users;
drop policy if exists "Users can update their own profile" on public.brazilian_friends_users;

drop policy if exists "Participants can read messages" on public.brazilian_friends_messages;
drop policy if exists "brazilian_friends_messages_all_access" on public.brazilian_friends_messages;
create policy "brazilian_friends_messages_all_access"
  on public.brazilian_friends_messages for all
  using (true)
  with check (true);

drop policy if exists "Users can send as themselves" on public.brazilian_friends_messages;

alter publication supabase_realtime add table public.brazilian_friends_messages;
