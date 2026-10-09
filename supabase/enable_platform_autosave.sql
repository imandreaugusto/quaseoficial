-- Apply in the Supabase SQL Editor to enable cross-device platform autosaving.
alter table public.bia_shared_content enable row level security;

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

drop policy if exists "shared_content_all_access" on public.bia_shared_content;
drop policy if exists "shared_content_public_read" on public.bia_shared_content;
drop policy if exists "shared_content_authenticated_read" on public.bia_shared_content;
drop policy if exists "shared_content_ceo_insert" on public.bia_shared_content;
drop policy if exists "shared_content_ceo_update" on public.bia_shared_content;
drop policy if exists "shared_content_ceo_delete" on public.bia_shared_content;

create policy "shared_content_authenticated_read" on public.bia_shared_content
for select to authenticated using (public.has_active_bia_subscription());

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
