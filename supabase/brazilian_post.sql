-- Brazilian Post: armazenamento dos vídeos + permissões de moderação.
-- Rode uma vez no SQL Editor do Supabase. É seguro rodar de novo.

-- 1. Bucket público de leitura (os vídeos aprovados aparecem no mural).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bia-stories', 'bia-stories', true, 104857600, array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do update
set public = true,
    file_size_limit = 104857600,
    allowed_mime_types = array['video/mp4', 'video/webm', 'video/quicktime'];

-- 2. Storage: o aluno envia apenas para a própria pasta; a equipe BIA pode apagar qualquer vídeo.
drop policy if exists "bia_stories_upload_own_folder" on storage.objects;
create policy "bia_stories_upload_own_folder" on storage.objects
for insert to authenticated
with check (bucket_id = 'bia-stories' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "bia_stories_read" on storage.objects;
create policy "bia_stories_read" on storage.objects
for select to anon, authenticated
using (bucket_id = 'bia-stories');

drop policy if exists "bia_stories_delete_own_or_ceo" on storage.objects;
create policy "bia_stories_delete_own_or_ceo" on storage.objects
for delete to authenticated
using (
  bucket_id = 'bia-stories'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or lower(coalesce(auth.jwt() ->> 'email', '')) in (
      'andrejrcardoso93@gmail.com',
      'brazilianinaction@gmail.com',
      'brazilianinactionidiomas@gmail.com'
    )
  )
);

-- 3. Tabela stories: o aluno vê os próprios envios; a equipe BIA vê, publica, aprova e exclui tudo.
drop policy if exists "stories_select_own" on public.stories;
create policy "stories_select_own" on public.stories
for select to authenticated using (student_id = auth.uid()::text);

drop policy if exists "stories_ceo_select" on public.stories;
create policy "stories_ceo_select" on public.stories
for select to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) in (
  'andrejrcardoso93@gmail.com',
  'brazilianinaction@gmail.com',
  'brazilianinactionidiomas@gmail.com'
));

drop policy if exists "stories_ceo_insert" on public.stories;
create policy "stories_ceo_insert" on public.stories
for insert to authenticated
with check (lower(coalesce(auth.jwt() ->> 'email', '')) in (
  'andrejrcardoso93@gmail.com',
  'brazilianinaction@gmail.com',
  'brazilianinactionidiomas@gmail.com'
));

drop policy if exists "stories_ceo_update" on public.stories;
create policy "stories_ceo_update" on public.stories
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

drop policy if exists "stories_ceo_delete" on public.stories;
create policy "stories_ceo_delete" on public.stories
for delete to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) in (
  'andrejrcardoso93@gmail.com',
  'brazilianinaction@gmail.com',
  'brazilianinactionidiomas@gmail.com'
));

-- 4. Realtime: o mural e a moderação atualizam sozinhos.
do $$
begin
  alter publication supabase_realtime add table public.stories;
exception when duplicate_object then null;
end $$;
