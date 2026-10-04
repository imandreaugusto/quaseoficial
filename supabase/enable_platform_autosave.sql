-- Apply in the Supabase SQL Editor to enable cross-device platform autosaving.
alter table public.bia_shared_content enable row level security;

drop policy if exists "shared_content_authenticated_read" on public.bia_shared_content;
drop policy if exists "shared_content_ceo_insert" on public.bia_shared_content;
drop policy if exists "shared_content_ceo_update" on public.bia_shared_content;
drop policy if exists "shared_content_ceo_delete" on public.bia_shared_content;

create policy "shared_content_authenticated_read" on public.bia_shared_content
for select to authenticated using (true);

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
