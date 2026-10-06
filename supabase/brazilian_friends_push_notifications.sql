create table if not exists public.brazilian_friends_push_subscriptions (
  endpoint text primary key,
  user_id text not null references public.brazilian_friends_users(id) on delete cascade,
  subscription jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists brazilian_friends_push_subscriptions_user_idx
  on public.brazilian_friends_push_subscriptions (user_id);

alter table public.brazilian_friends_push_subscriptions enable row level security;
revoke all on public.brazilian_friends_push_subscriptions from public, anon, authenticated;
grant select, insert, update, delete on public.brazilian_friends_push_subscriptions to service_role;
