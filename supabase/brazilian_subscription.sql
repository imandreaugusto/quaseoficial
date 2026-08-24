-- Subscription state written by the trusted server webhook.
create table if not exists public.bia_subscription_profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  status text not null default 'pending' check (status in ('pending', 'active', 'expired')),
  subscription_expires_at timestamptz,
  last_payment_id text,
  updated_at timestamptz not null default now()
);

alter table public.bia_subscription_profiles enable row level security;

-- The current app authenticates users with Firebase, not Supabase Auth. This read
-- policy is the temporary compatibility bridge; configure Supabase third-party
-- Firebase JWTs and replace it with an auth.uid()/email-bound policy before production.
drop policy if exists "Read subscription status" on public.bia_subscription_profiles;
create policy "Read subscription status"
  on public.bia_subscription_profiles for select
  using (true);

alter publication supabase_realtime add table public.bia_subscription_profiles;
