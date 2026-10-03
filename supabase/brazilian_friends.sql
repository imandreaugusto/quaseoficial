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
  expires_at timestamptz not null default (now() + interval '5 days'),
  constraint brazilian_friends_messages_distinct_users check (receiver_id is null or sender_id <> receiver_id)
);

alter table public.brazilian_friends_messages alter column receiver_id drop not null;
update public.brazilian_friends_messages
set expires_at = created_at + interval '5 days'
where expires_at is null;
alter table public.brazilian_friends_messages
  alter column expires_at set default (now() + interval '5 days'),
  alter column expires_at set not null;

create index if not exists brazilian_friends_messages_conversation_idx
  on public.brazilian_friends_messages (sender_id, receiver_id, created_at);

create table if not exists public.brazilian_friends_pinned_messages (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(trim(body)) between 1 and 2000),
  pinned_by text not null,
  pinned_at timestamptz not null default now(),
  is_active boolean not null default true
);

create index if not exists brazilian_friends_pinned_messages_active_idx
  on public.brazilian_friends_pinned_messages (is_active, pinned_at desc);

alter table public.brazilian_friends_users enable row level security;
alter table public.brazilian_friends_messages enable row level security;
alter table public.brazilian_friends_pinned_messages enable row level security;

create or replace function public.cleanup_expired_brazilian_friend_messages_count()
returns integer
language sql
security definer
set search_path = public
as $$
  with deleted as (
    delete from public.brazilian_friends_messages
    where expires_at is not null and expires_at <= now()
    returning 1
  )
  select count(*)::integer from deleted;
$$;
revoke all on function public.cleanup_expired_brazilian_friend_messages_count() from public;
grant execute on function public.cleanup_expired_brazilian_friend_messages_count() to anon, authenticated;

update public.brazilian_friends_users set ip_region = null, ip_country = null
where ip_region is not null or ip_country is not null;

drop policy if exists "Friends can read profiles" on public.brazilian_friends_users;
drop policy if exists "Users can create their own profile" on public.brazilian_friends_users;
drop policy if exists "Users can update their own profile" on public.brazilian_friends_users;
drop policy if exists "brazilian_friends_users_all_access" on public.brazilian_friends_users;
drop policy if exists "friends_profiles_authenticated_read" on public.brazilian_friends_users;
create policy "friends_profiles_authenticated_read"
  on public.brazilian_friends_users for select to authenticated
  using (true);
drop policy if exists "friends_profile_insert_own" on public.brazilian_friends_users;
create policy "friends_profile_insert_own"
  on public.brazilian_friends_users for insert to authenticated
  with check (id = auth.uid()::text);
drop policy if exists "friends_profile_update_own" on public.brazilian_friends_users;
create policy "friends_profile_update_own"
  on public.brazilian_friends_users for update to authenticated
  using (id = auth.uid()::text)
  with check (id = auth.uid()::text);
drop policy if exists "friends_profile_delete_own" on public.brazilian_friends_users;
create policy "friends_profile_delete_own"
  on public.brazilian_friends_users for delete to authenticated
  using (id = auth.uid()::text);

drop policy if exists "Participants can read messages" on public.brazilian_friends_messages;
drop policy if exists "Users can send as themselves" on public.brazilian_friends_messages;
drop policy if exists "brazilian_friends_messages_all_access" on public.brazilian_friends_messages;
drop policy if exists "friends_messages_participant_read" on public.brazilian_friends_messages;
create policy "friends_messages_participant_read"
  on public.brazilian_friends_messages for select to authenticated
  using (sender_id = auth.uid()::text or receiver_id = auth.uid()::text or receiver_id is null);
drop policy if exists "friends_messages_sender_insert" on public.brazilian_friends_messages;
create policy "friends_messages_sender_insert"
  on public.brazilian_friends_messages for insert to authenticated
  with check (sender_id = auth.uid()::text);
drop policy if exists "friends_messages_sender_update" on public.brazilian_friends_messages;
create policy "friends_messages_sender_update"
  on public.brazilian_friends_messages for update to authenticated
  using (sender_id = auth.uid()::text)
  with check (sender_id = auth.uid()::text);
drop policy if exists "friends_messages_sender_delete" on public.brazilian_friends_messages;
create policy "friends_messages_sender_delete"
  on public.brazilian_friends_messages for delete to authenticated
  using (sender_id = auth.uid()::text);

revoke all on public.brazilian_friends_users, public.brazilian_friends_messages from anon, authenticated;
grant select (id, full_name, photo_url, status_message, updated_at)
  on public.brazilian_friends_users to authenticated;
grant insert (id, email, full_name, photo_url, status_message),
  update (email, full_name, photo_url, status_message, updated_at)
  on public.brazilian_friends_users to authenticated;
grant select, insert, update, delete on public.brazilian_friends_messages to authenticated;

revoke all on public.brazilian_friends_pinned_messages from anon, authenticated;
grant select on public.brazilian_friends_pinned_messages to authenticated;

alter publication supabase_realtime add table public.brazilian_friends_messages;
