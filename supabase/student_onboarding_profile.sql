-- Persistent student profile details collected after a subscription is activated.
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists profile_state text;
alter table public.profiles add column if not exists profile_city text;
alter table public.profiles add column if not exists profile_country text;

alter table public.brazilian_friends_users add column if not exists first_name text;
alter table public.brazilian_friends_users add column if not exists last_name text;
alter table public.brazilian_friends_users add column if not exists profile_state text;
alter table public.brazilian_friends_users add column if not exists profile_city text;
alter table public.brazilian_friends_users add column if not exists profile_country text;

create or replace function public.save_bia_student_profile(
  p_auth_user_id text,
  p_first_name text,
  p_last_name text,
  p_profile_state text,
  p_profile_city text,
  p_profile_country text,
  p_photo_url text
)
returns setof public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_profile public.profiles%rowtype;
begin
  update public.profiles
  set first_name = nullif(trim(p_first_name), ''),
      last_name = nullif(trim(p_last_name), ''),
      full_name = concat_ws(' ', nullif(trim(p_first_name), ''), nullif(trim(p_last_name), '')),
      profile_state = nullif(trim(p_profile_state), ''),
      profile_city = nullif(trim(p_profile_city), ''),
      profile_country = nullif(trim(p_profile_country), ''),
      photo_url = coalesce(nullif(trim(p_photo_url), ''), photo_url),
      updated_at = now()
  where auth_user_id = p_auth_user_id
  returning * into saved_profile;

  if not found then
    raise exception 'Authenticated student profile not found';
  end if;

  insert into public.brazilian_friends_users (
    id, email, full_name, photo_url, first_name, last_name,
    profile_state, profile_city, profile_country, updated_at
  ) values (
    saved_profile.auth_user_id, saved_profile.email, saved_profile.full_name, saved_profile.photo_url,
    saved_profile.first_name, saved_profile.last_name, saved_profile.profile_state,
    saved_profile.profile_city, saved_profile.profile_country, now()
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name,
      photo_url = coalesce(excluded.photo_url, brazilian_friends_users.photo_url),
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      profile_state = excluded.profile_state,
      profile_city = excluded.profile_city,
      profile_country = excluded.profile_country,
      updated_at = now();

  return next saved_profile;
end;
$$;

revoke all on function public.save_bia_student_profile(text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.save_bia_student_profile(text, text, text, text, text, text, text)
  to service_role;
