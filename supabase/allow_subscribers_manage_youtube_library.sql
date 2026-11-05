begin;

drop policy if exists "shared_content_subscriber_youtube_insert" on public.bia_shared_content;
drop policy if exists "shared_content_subscriber_youtube_update" on public.bia_shared_content;

create policy "shared_content_subscriber_youtube_insert" on public.bia_shared_content
  for insert to authenticated
  with check (content_key = 'youtube_library' and public.has_active_bia_subscription());

create policy "shared_content_subscriber_youtube_update" on public.bia_shared_content
  for update to authenticated
  using (content_key = 'youtube_library' and public.has_active_bia_subscription())
  with check (content_key = 'youtube_library' and public.has_active_bia_subscription());

commit;
