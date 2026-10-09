-- Subscription state written by the trusted server webhook.
create table if not exists public.bia_subscription_profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  user_id text,
  status text not null default 'pending' check (status in ('pending', 'active', 'expired')),
  subscription_expires_at timestamptz,
  last_payment_id text,
  updated_at timestamptz not null default now()
);

alter table public.bia_subscription_profiles add column if not exists user_id text;

alter table public.bia_subscription_profiles enable row level security;

drop policy if exists "Read subscription status" on public.bia_subscription_profiles;
drop policy if exists "subscription_all_access" on public.bia_subscription_profiles;
drop policy if exists "subscription_select_own" on public.bia_subscription_profiles;
create policy "subscription_select_own"
  on public.bia_subscription_profiles for select
  to authenticated using (user_id = auth.uid()::text);

revoke all on public.bia_subscription_profiles from anon, authenticated;
grant select on public.bia_subscription_profiles to authenticated;

alter publication supabase_realtime add table public.bia_subscription_profiles;
