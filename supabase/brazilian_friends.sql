-- Brazilian Friends persistence and RLS schema.
-- The Firebase identity must be exchanged for a Supabase JWT with the same subject
-- before these policies are enabled in production.

create table if not exists public.brazilian_friends_users (
  id text primary key,
  email text not null,
  full_name text not null,
  ip_region text,
  ip_country text,
  updated_at timestamptz not null default now()
);

create table if not exists public.brazilian_friends_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id text not null references public.brazilian_friends_users(id) on delete cascade,
  receiver_id text not null references public.brazilian_friends_users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  constraint brazilian_friends_messages_distinct_users check (sender_id <> receiver_id)
);

create index if not exists brazilian_friends_messages_conversation_idx
  on public.brazilian_friends_messages (sender_id, receiver_id, created_at);

alter table public.brazilian_friends_users enable row level security;
alter table public.brazilian_friends_messages enable row level security;

drop policy if exists "Friends can read profiles" on public.brazilian_friends_users;
create policy "Friends can read profiles"
  on public.brazilian_friends_users for select
  using (auth.uid()::text is not null);

drop policy if exists "Users can create their own profile" on public.brazilian_friends_users;
create policy "Users can create their own profile"
  on public.brazilian_friends_users for insert
  with check (id = auth.uid()::text);

drop policy if exists "Users can update their own profile" on public.brazilian_friends_users;
create policy "Users can update their own profile"
  on public.brazilian_friends_users for update
  using (id = auth.uid()::text)
  with check (id = auth.uid()::text);

drop policy if exists "Participants can read messages" on public.brazilian_friends_messages;
create policy "Participants can read messages"
  on public.brazilian_friends_messages for select
  using (sender_id = auth.uid()::text or receiver_id = auth.uid()::text);

drop policy if exists "Users can send as themselves" on public.brazilian_friends_messages;
create policy "Users can send as themselves"
  on public.brazilian_friends_messages for insert
  with check (sender_id = auth.uid()::text);

alter publication supabase_realtime add table public.brazilian_friends_messages;
