-- Brazilian Space: aditivo e isolado dos esquemas dos aplicativos atuais.
-- Aplicacao:
--   space_users: identidade publica e apelidos
--   space_posts / space_comments: feed e respostas com verificacao JEV
--   space_mentions: destinatarios e controle idempotente de recompensa
--   space_badges_acquired: historico permanente de emblemas
--   season_points: pontos, XP e moedas particionados por primeiro dia do mes
--   space_reward_settings: valores configuraveis pelo CEO
--   space_season_awards: historico de top 3 e titulo temporario do mes seguinte
-- As escritas sao feitas pelas rotas autenticadas do servidor usando service role.

create table if not exists public.space_users (
  auth_user_id text primary key,
  handle text not null unique,
  display_name text not null,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.space_sync_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_base text;
  v_suffix text;
begin
  if new.auth_user_id is null then
    return new;
  end if;

  v_name := coalesce(nullif(trim(new.full_name), ''), nullif(trim(new.first_name), ''), 'Aluno Space');
  v_base := trim(both '-' from regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'));
  if v_base = '' then
    v_base := 'aluno';
  end if;
  v_suffix := left(regexp_replace(new.auth_user_id, '[^a-zA-Z0-9]', '', 'g'), 6);

  insert into public.space_users (auth_user_id, handle, display_name, photo_url)
  values (new.auth_user_id, left(v_base, 22) || '-' || lower(v_suffix), v_name, new.photo_url)
  on conflict (auth_user_id) do update
    set display_name = excluded.display_name,
        photo_url = excluded.photo_url,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_sync_space_user on public.profiles;
create trigger profiles_sync_space_user
after insert or update of auth_user_id, full_name, first_name, photo_url
on public.profiles
for each row execute function public.space_sync_profile();

insert into public.space_users (auth_user_id, handle, display_name, photo_url)
select
  p.auth_user_id,
  left(trim(both '-' from regexp_replace(lower(coalesce(nullif(trim(p.full_name), ''), nullif(trim(p.first_name), ''), 'aluno')), '[^a-z0-9]+', '-', 'g')), 22)
    || '-' || lower(left(regexp_replace(p.auth_user_id, '[^a-zA-Z0-9]', '', 'g'), 6)),
  coalesce(nullif(trim(p.full_name), ''), nullif(trim(p.first_name), ''), 'Aluno Space'),
  p.photo_url
from public.profiles p
where p.auth_user_id is not null
on conflict (auth_user_id) do update
set display_name = excluded.display_name, photo_url = excluded.photo_url, updated_at = now();

create table if not exists public.space_posts (
  id uuid primary key default gen_random_uuid(),
  author_id text not null references public.space_users(auth_user_id),
  body text not null check (char_length(body) between 8 and 2000),
  jev_valid boolean not null default false,
  jev_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.space_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.space_posts(id) on delete cascade,
  author_id text not null references public.space_users(auth_user_id),
  body text not null check (char_length(body) between 8 and 1200),
  jev_valid boolean not null default false,
  jev_reason text,
  parent_comment_id uuid references public.space_comments(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.space_comments
  add column if not exists parent_comment_id uuid references public.space_comments(id) on delete cascade;

create table if not exists public.space_reactions (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('post', 'comment')),
  target_id uuid not null,
  user_id text not null references public.space_users(auth_user_id) on delete cascade,
  emoji text not null check (emoji in ('👍', '❤️', '😂', '👏', '💡')),
  created_at timestamptz not null default now(),
  constraint space_reactions_once unique (target_type, target_id, user_id, emoji)
);

create table if not exists public.space_push_subscriptions (
  endpoint text primary key,
  user_id text not null references public.space_users(auth_user_id) on delete cascade,
  subscription jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_space_push_subscriptions_user on public.space_push_subscriptions (user_id);

create table if not exists public.space_mentions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.space_posts(id) on delete cascade,
  mentioned_by text not null references public.space_users(auth_user_id),
  mentioned_user_id text not null references public.space_users(auth_user_id),
  response_comment_id uuid references public.space_comments(id) on delete set null,
  rewarded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint space_mentions_not_self check (mentioned_by <> mentioned_user_id),
  constraint space_mentions_once unique (post_id, mentioned_by, mentioned_user_id)
);

create table if not exists public.space_badges_acquired (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.space_users(auth_user_id),
  badge_key text not null check (badge_key in ('break_the_ice')),
  post_id uuid references public.space_posts(id) on delete set null,
  acquired_at timestamptz not null default now(),
  constraint space_badges_user_key unique (user_id, badge_key)
);

create table if not exists public.season_points (
  user_id text not null references public.space_users(auth_user_id),
  season_key date not null,
  help_points integer not null default 0 check (help_points >= 0),
  xp integer not null default 0 check (xp >= 0),
  coins integer not null default 0 check (coins >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, season_key)
);

create table if not exists public.space_reward_settings (
  singleton boolean primary key default true check (singleton),
  mention_reply_points integer not null default 10 check (mention_reply_points between 0 and 10000),
  mention_reply_xp integer not null default 15 check (mention_reply_xp between 0 and 10000),
  mention_reply_coins integer not null default 5 check (mention_reply_coins between 0 and 10000),
  updated_at timestamptz not null default now()
);

insert into public.space_reward_settings (singleton) values (true)
on conflict (singleton) do nothing;

create table if not exists public.space_season_awards (
  season_key date not null,
  source_season_key date not null,
  place smallint not null check (place between 1 and 3),
  helper_user_id text not null references public.space_users(auth_user_id),
  help_points integer not null,
  awarded_at timestamptz not null default now(),
  primary key (season_key, place)
);

create index if not exists idx_space_posts_created_at on public.space_posts (created_at desc);
create index if not exists idx_space_posts_author_created_at on public.space_posts (author_id, created_at desc);
create index if not exists idx_space_comments_post_created_at on public.space_comments (post_id, created_at);
create index if not exists idx_space_reactions_target on public.space_reactions (target_type, target_id);
create index if not exists idx_space_mentions_recipient on public.space_mentions (mentioned_user_id, post_id) where rewarded_at is null;
create index if not exists idx_season_points_rank on public.season_points (season_key, help_points desc, xp desc);
create index if not exists idx_space_awards_user on public.space_season_awards (helper_user_id, season_key desc);

create or replace function public.space_create_post(
  p_author_id text,
  p_body text,
  p_jev_valid boolean,
  p_jev_reason text,
  p_mentions text[] default array[]::text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post public.space_posts;
  v_requested integer;
  v_found integer;
  v_handles text[];
begin
  if char_length(trim(p_body)) < 8 or char_length(p_body) > 2000 then
    raise exception 'Post deve ter entre 8 e 2000 caracteres.';
  end if;
  select coalesce(array_agg(distinct lower(trim(handle))), array[]::text[])
  into v_handles
  from (
    select unnest(coalesce(p_mentions, array[]::text[])) as handle
    union all
    select captures[1] as handle
    from regexp_matches(p_body, '@([a-zA-Z0-9_-]{2,30})', 'g') as matches(captures)
  ) requested
  where trim(handle) <> '';
  select cardinality(v_handles) into v_requested;
  select count(distinct lower(trim(u.handle))) into v_found
  from public.space_users u
  where lower(u.handle) = any(v_handles);
  if v_requested <> v_found then
    raise exception 'Uma ou mais mencoes nao correspondem a alunos cadastrados.';
  end if;
  if exists (
    select 1 from public.space_users u
    where u.auth_user_id = p_author_id
      and lower(u.handle) = any(v_handles)
  ) then
    raise exception 'Nao e permitido mencionar a propria conta.';
  end if;

  insert into public.space_posts (author_id, body, jev_valid, jev_reason)
  values (p_author_id, trim(p_body), coalesce(p_jev_valid, false), left(p_jev_reason, 500))
  returning * into v_post;

  insert into public.space_mentions (post_id, mentioned_by, mentioned_user_id)
  select v_post.id, p_author_id, u.auth_user_id
  from public.space_users u
  where lower(u.handle) = any(v_handles)
  on conflict (post_id, mentioned_by, mentioned_user_id) do nothing;

  if coalesce(p_jev_valid, false) then
    insert into public.space_badges_acquired (user_id, badge_key, post_id)
    values (p_author_id, 'break_the_ice', v_post.id)
    on conflict (user_id, badge_key) do nothing;
  end if;
  return to_jsonb(v_post);
end;
$$;

drop function if exists public.space_create_comment_and_reward(text, uuid, text, boolean, text);

create or replace function public.space_create_comment_and_reward(
  p_author_id text,
  p_post_id uuid,
  p_body text,
  p_jev_valid boolean,
  p_jev_reason text,
  p_parent_comment_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comment public.space_comments;
  v_settings public.space_reward_settings;
  v_recipients integer := 0;
  v_season date := date_trunc('month', now() at time zone 'UTC')::date;
begin
  if char_length(trim(p_body)) < 8 or char_length(p_body) > 1200 then
    raise exception 'Resposta deve ter entre 8 e 1200 caracteres.';
  end if;
  if not exists (select 1 from public.space_posts where id = p_post_id) then
    raise exception 'Publicacao nao encontrada.';
  end if;
  if p_parent_comment_id is not null and not exists (
    select 1 from public.space_comments
    where id = p_parent_comment_id and post_id = p_post_id
  ) then
    raise exception 'Comentario nao encontrado nesta publicacao.';
  end if;

  insert into public.space_comments (post_id, author_id, body, jev_valid, jev_reason, parent_comment_id)
  values (p_post_id, p_author_id, trim(p_body), coalesce(p_jev_valid, false), left(p_jev_reason, 500), p_parent_comment_id)
  returning * into v_comment;
  select * into v_settings from public.space_reward_settings where singleton = true;

  if coalesce(p_jev_valid, false) then
    with eligible as (
      update public.space_mentions
      set rewarded_at = now(), response_comment_id = v_comment.id
      where post_id = p_post_id
        and mentioned_user_id = p_author_id
        and rewarded_at is null
      returning mentioned_by
    ), recipients as (
      select p_author_id as user_id where exists (select 1 from eligible)
      union
      select mentioned_by as user_id from eligible
    )
    insert into public.season_points (user_id, season_key, help_points, xp, coins, updated_at)
    select user_id, v_season, v_settings.mention_reply_points, v_settings.mention_reply_xp,
      v_settings.mention_reply_coins, now()
    from recipients
    on conflict (user_id, season_key) do update
      set help_points = public.season_points.help_points + excluded.help_points,
          xp = public.season_points.xp + excluded.xp,
          coins = public.season_points.coins + excluded.coins,
          updated_at = now();
    get diagnostics v_recipients = row_count;
  end if;

  return jsonb_build_object(
    'comment', to_jsonb(v_comment),
    'recipients', v_recipients,
    'points', case when v_recipients > 0 then v_settings.mention_reply_points else 0 end,
    'xp', case when v_recipients > 0 then v_settings.mention_reply_xp else 0 end,
    'coins', case when v_recipients > 0 then v_settings.mention_reply_coins else 0 end
  );
end;
$$;

create or replace function public.space_toggle_reaction(
  p_user_id text,
  p_target_type text,
  p_target_id uuid,
  p_emoji text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted uuid;
begin
  if p_target_type not in ('post', 'comment') or p_emoji not in ('👍', '❤️', '😂', '👏', '💡') then
    raise exception 'Reacao invalida.';
  end if;
  if (p_target_type = 'post' and not exists (select 1 from public.space_posts where id = p_target_id))
    or (p_target_type = 'comment' and not exists (select 1 from public.space_comments where id = p_target_id)) then
    raise exception 'Conteudo nao encontrado.';
  end if;

  delete from public.space_reactions
  where target_type = p_target_type and target_id = p_target_id
    and user_id = p_user_id and emoji = p_emoji
  returning id into v_deleted;

  if v_deleted is not null then
    return false;
  end if;

  insert into public.space_reactions (target_type, target_id, user_id, emoji)
  values (p_target_type, p_target_id, p_user_id, p_emoji)
  on conflict (target_type, target_id, user_id, emoji) do nothing;
  return found;
end;
$$;

create or replace function public.space_award_previous_season()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source date := (date_trunc('month', now() at time zone 'UTC') - interval '1 month')::date;
  v_target date := date_trunc('month', now() at time zone 'UTC')::date;
begin
  delete from public.space_season_awards where season_key = v_target;

  with ranked as (
    select user_id, help_points,
      row_number() over (order by help_points desc, xp desc, updated_at asc, user_id asc) as place
    from public.season_points
    where season_key = v_source and help_points > 0
  )
  insert into public.space_season_awards (season_key, source_season_key, place, helper_user_id, help_points)
  select v_target, v_source, place::smallint, user_id, help_points
  from ranked where place <= 3
  on conflict (season_key, place) do update
    set source_season_key = excluded.source_season_key,
        helper_user_id = excluded.helper_user_id,
        help_points = excluded.help_points,
        awarded_at = now();
end;
$$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'space_users', 'space_posts', 'space_comments', 'space_reactions',
    'space_push_subscriptions', 'space_mentions',
    'space_badges_acquired', 'season_points', 'space_reward_settings', 'space_season_awards'
  ] loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('revoke all on public.%I from anon, authenticated', v_table);
    execute format('grant all on public.%I to service_role', v_table);
  end loop;
end;
$$;

revoke all on function public.space_create_post(text, text, boolean, text, text[]) from public, anon, authenticated;
revoke all on function public.space_create_comment_and_reward(text, uuid, text, boolean, text, uuid) from public, anon, authenticated;
revoke all on function public.space_toggle_reaction(text, text, uuid, text) from public, anon, authenticated;
revoke all on function public.space_award_previous_season() from public, anon, authenticated;
grant execute on function public.space_create_post(text, text, boolean, text, text[]) to service_role;
grant execute on function public.space_create_comment_and_reward(text, uuid, text, boolean, text, uuid) to service_role;
grant execute on function public.space_toggle_reaction(text, text, uuid, text) to service_role;
grant execute on function public.space_award_previous_season() to service_role;

notify pgrst, 'reload schema';
