create table if not exists public.bia_game_scores (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  game_id text not null,
  display_name text not null,
  points integer not null check (points between 1 and 110),
  week_start date not null,
  created_at timestamptz not null default now(),
  constraint bia_game_scores_session_unique unique (auth_user_id, session_id)
);

create index if not exists bia_game_scores_week_points_idx
  on public.bia_game_scores (week_start, points desc);

alter table public.bia_game_scores enable row level security;

alter table public.bia_game_scores drop constraint if exists bia_game_scores_game_id_check;
alter table public.bia_game_scores add constraint bia_game_scores_game_id_check
  check (game_id in (
    'crossword', 'hex-words', 'word-search', 'memory', 'picture-match', 'audio-quiz',
    'sentence-scramble', 'visual-vocabulary', 'idiom-blocks', 'flashcards', 'context-quest',
    'word-rush', 'yes-no-speed', 'custom-quiz', 'hangman'
  ));

revoke all on public.bia_game_scores from anon, authenticated;
grant all on public.bia_game_scores to service_role;

create or replace function public.bia_get_weekly_game_leaderboard(p_week_start date, p_auth_user_id uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  with latest_names as (
    select distinct on (auth_user_id) auth_user_id, display_name
    from public.bia_game_scores
    where week_start = p_week_start
    order by auth_user_id, created_at desc
  ),
  totals as (
    select auth_user_id, sum(points)::integer as points, max(created_at) as last_played
    from public.bia_game_scores
    where week_start = p_week_start
    group by auth_user_id
  ),
  ranked as (
    select totals.auth_user_id, latest_names.display_name, totals.points,
      row_number() over (order by totals.points desc, totals.last_played asc, totals.auth_user_id) as rank
    from totals
    join latest_names using (auth_user_id)
  )
  select jsonb_build_object(
    'entries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', ranked.display_name,
        'points', ranked.points,
        'rank', ranked.rank,
        'isCurrentUser', ranked.auth_user_id = p_auth_user_id
      ) order by ranked.rank)
      from ranked
      where ranked.rank <= 10
    ), '[]'::jsonb),
    'currentUser', (
      select jsonb_build_object(
        'rank', player.rank,
        'points', player.points,
        'pointsToTopTen', greatest(0, coalesce((select points from ranked where rank = 10), 0) - player.points + 1)
      )
      from ranked as player
      where player.auth_user_id = p_auth_user_id
    )
  );
$$;

revoke all on function public.bia_get_weekly_game_leaderboard(date, uuid) from public, anon, authenticated;
grant execute on function public.bia_get_weekly_game_leaderboard(date, uuid) to service_role;