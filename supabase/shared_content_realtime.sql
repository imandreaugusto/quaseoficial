do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bia_shared_content'
  ) then
    alter publication supabase_realtime add table public.bia_shared_content;
  end if;
end
$$;
