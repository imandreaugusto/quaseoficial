create table if not exists public.user_flashcard_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id text not null,
  due_date timestamptz not null,
  stability float8 not null default 0,
  difficulty float8 not null default 5,
  reps int4 not null default 0,
  lapses int4 not null default 0,
  state int2 not null default 0,
  constraint user_flashcard_progress_pkey primary key (user_id, card_id),
  constraint user_flashcard_progress_reps_nonnegative check (reps >= 0),
  constraint user_flashcard_progress_lapses_nonnegative check (lapses >= 0),
  constraint user_flashcard_progress_stability_nonnegative check (stability >= 0),
  constraint user_flashcard_progress_difficulty_range check (difficulty between 1 and 10),
  constraint user_flashcard_progress_state_range check (state between 0 and 3)
);

alter table public.user_flashcard_progress enable row level security;

drop policy if exists "Users can read their own flashcard progress" on public.user_flashcard_progress;
create policy "Users can read their own flashcard progress"
  on public.user_flashcard_progress
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own flashcard progress" on public.user_flashcard_progress;
create policy "Users can create their own flashcard progress"
  on public.user_flashcard_progress
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own flashcard progress" on public.user_flashcard_progress;
create policy "Users can update their own flashcard progress"
  on public.user_flashcard_progress
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own flashcard progress" on public.user_flashcard_progress;
create policy "Users can delete their own flashcard progress"
  on public.user_flashcard_progress
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.user_flashcard_progress to authenticated;
