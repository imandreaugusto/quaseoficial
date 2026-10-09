begin;

create or replace function public.has_active_bia_subscription()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'andrejrcardoso93@gmail.com'
    or exists (
      select 1
      from public.bia_subscription_profiles subscription
      where subscription.user_id = auth.uid()::text
        and lower(subscription.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        and subscription.status = 'active'
        and subscription.subscription_expires_at > now()
    );
$$;
revoke all on function public.has_active_bia_subscription() from public, anon;
grant execute on function public.has_active_bia_subscription() to authenticated, service_role;

alter table public.bia_shared_content enable row level security;
drop policy if exists "shared_content_all_access" on public.bia_shared_content;
drop policy if exists "shared_content_public_read" on public.bia_shared_content;
drop policy if exists "shared_content_authenticated_read" on public.bia_shared_content;
drop policy if exists "shared_content_ceo_insert" on public.bia_shared_content;
drop policy if exists "shared_content_ceo_update" on public.bia_shared_content;
drop policy if exists "shared_content_ceo_delete" on public.bia_shared_content;
create policy "shared_content_authenticated_read"
  on public.bia_shared_content for select to authenticated
  using (public.has_active_bia_subscription());
create policy "shared_content_ceo_insert" on public.bia_shared_content
  for insert to authenticated
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) in (
    'andrejrcardoso93@gmail.com',
    'brazilianinaction@gmail.com',
    'brazilianinactionidiomas@gmail.com'
  ));
create policy "shared_content_ceo_update" on public.bia_shared_content
  for update to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) in (
    'andrejrcardoso93@gmail.com',
    'brazilianinaction@gmail.com',
    'brazilianinactionidiomas@gmail.com'
  ))
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) in (
    'andrejrcardoso93@gmail.com',
    'brazilianinaction@gmail.com',
    'brazilianinactionidiomas@gmail.com'
  ));
create policy "shared_content_ceo_delete" on public.bia_shared_content
  for delete to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) in (
    'andrejrcardoso93@gmail.com',
    'brazilianinaction@gmail.com',
    'brazilianinactionidiomas@gmail.com'
  ));
revoke all on public.bia_shared_content from anon, authenticated;
grant select, insert, update, delete on public.bia_shared_content to authenticated;

alter table public.brazilian_friends_users enable row level security;
drop policy if exists "Friends can read profiles" on public.brazilian_friends_users;
drop policy if exists "brazilian_friends_users_all_access" on public.brazilian_friends_users;
drop policy if exists "friends_profiles_authenticated_read" on public.brazilian_friends_users;
create policy "friends_profiles_authenticated_read"
  on public.brazilian_friends_users for select to authenticated
  using (public.has_active_bia_subscription());
drop policy if exists "friends_profile_insert_own" on public.brazilian_friends_users;
create policy "friends_profile_insert_own"
  on public.brazilian_friends_users for insert to authenticated
  with check (public.has_active_bia_subscription() and id = auth.uid()::text);
drop policy if exists "friends_profile_update_own" on public.brazilian_friends_users;
create policy "friends_profile_update_own"
  on public.brazilian_friends_users for update to authenticated
  using (public.has_active_bia_subscription() and id = auth.uid()::text)
  with check (public.has_active_bia_subscription() and id = auth.uid()::text);
drop policy if exists "friends_profile_delete_own" on public.brazilian_friends_users;
create policy "friends_profile_delete_own"
  on public.brazilian_friends_users for delete to authenticated
  using (public.has_active_bia_subscription() and id = auth.uid()::text);

alter table public.brazilian_friends_messages enable row level security;
drop policy if exists "Participants can read messages" on public.brazilian_friends_messages;
drop policy if exists "Users can send as themselves" on public.brazilian_friends_messages;
drop policy if exists "brazilian_friends_messages_all_access" on public.brazilian_friends_messages;
drop policy if exists "friends_messages_participant_read" on public.brazilian_friends_messages;
create policy "friends_messages_participant_read"
  on public.brazilian_friends_messages for select to authenticated
  using (
    public.has_active_bia_subscription()
    and (sender_id = auth.uid()::text or receiver_id = auth.uid()::text or receiver_id is null)
  );
drop policy if exists "friends_messages_sender_insert" on public.brazilian_friends_messages;
create policy "friends_messages_sender_insert"
  on public.brazilian_friends_messages for insert to authenticated
  with check (public.has_active_bia_subscription() and sender_id = auth.uid()::text);
drop policy if exists "friends_messages_sender_update" on public.brazilian_friends_messages;
create policy "friends_messages_sender_update"
  on public.brazilian_friends_messages for update to authenticated
  using (public.has_active_bia_subscription() and sender_id = auth.uid()::text)
  with check (public.has_active_bia_subscription() and sender_id = auth.uid()::text);
drop policy if exists "friends_messages_sender_delete" on public.brazilian_friends_messages;
create policy "friends_messages_sender_delete"
  on public.brazilian_friends_messages for delete to authenticated
  using (public.has_active_bia_subscription() and sender_id = auth.uid()::text);

alter table public.bia_ceo_friend_messages enable row level security;
drop policy if exists "ceo_friend_messages_all_access" on public.bia_ceo_friend_messages;
drop policy if exists "ceo_friend_messages_participant_read" on public.bia_ceo_friend_messages;
create policy "ceo_friend_messages_participant_read"
  on public.bia_ceo_friend_messages for select to authenticated
  using (
    public.has_active_bia_subscription()
    and (sender_id = auth.uid()::text or receiver_id = auth.uid()::text)
  );
drop policy if exists "ceo_friend_messages_sender_insert" on public.bia_ceo_friend_messages;
create policy "ceo_friend_messages_sender_insert"
  on public.bia_ceo_friend_messages for insert to authenticated
  with check (public.has_active_bia_subscription() and sender_id = auth.uid()::text);
drop policy if exists "ceo_friend_messages_sender_delete" on public.bia_ceo_friend_messages;
create policy "ceo_friend_messages_sender_delete"
  on public.bia_ceo_friend_messages for delete to authenticated
  using (public.has_active_bia_subscription() and sender_id = auth.uid()::text);

commit;
