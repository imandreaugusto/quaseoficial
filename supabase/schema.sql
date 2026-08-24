-- Brazilian in Action production schema
-- Import this file in Supabase SQL Editor.

create table if not exists profiles (
  id text primary key,
  email text not null unique,
  full_name text,
  role text not null default 'student' check (role in ('student', 'admin')),
  status text not null default 'pending' check (status in ('pending', 'active', 'expired', 'trial')),
  data_expiracao timestamptz,
  permissions jsonb not null default '{
    "friends": true,
    "readclub": true,
    "board": true,
    "quiz": true,
    "biacompare": true,
    "conversation": true,
    "tradutor": true,
    "youtube": true,
    "practice": true,
    "stories": true
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles add column if not exists full_name text;
alter table profiles add column if not exists role text not null default 'student';
alter table profiles add column if not exists status text not null default 'pending';
alter table profiles add column if not exists data_expiracao timestamptz;
alter table profiles add column if not exists permissions jsonb not null default '{
  "friends": true,
  "readclub": true,
  "board": true,
  "quiz": true,
  "biacompare": true,
  "conversation": true,
  "tradutor": true,
  "youtube": true,
  "practice": true,
  "stories": true
}'::jsonb;
alter table profiles add column if not exists email_verified boolean default false;
alter table profiles add column if not exists ip_country text;
alter table profiles add column if not exists ip_region text;
alter table profiles add column if not exists ip_city text;
alter table profiles add column if not exists cupom_usado text;
alter table profiles add column if not exists created_at timestamptz not null default now();
alter table profiles add column if not exists updated_at timestamptz not null default now();

-- ensure any legacy table keeps the intended constraints safely
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_role_check'
  ) then
    alter table profiles add constraint profiles_role_check check (role in ('student', 'admin'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_status_check'
  ) then
    alter table profiles add constraint profiles_status_check check (status in ('pending', 'active', 'expired', 'trial'));
  end if;
end $$;

create table if not exists stories (
  id text primary key,
  student_id text,
  student_name text,
  title text not null,
  category text not null default 'challenge',
  prompt_used text,
  video_url text,
  thumbnail_url text,
  created_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'featured')),
  likes_count integer not null default 0,
  instagram_handle text
);

create table if not exists bia_subscription_profiles (
  email text primary key,
  status text not null default 'pending' check (status in ('pending', 'active', 'expired', 'trial')),
  subscription_expires_at timestamptz,
  last_payment_id text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_email on profiles (email);
create index if not exists idx_stories_created_at on stories (created_at desc);
create index if not exists idx_stories_status on stories (status);
create index if not exists idx_subscription_email on bia_subscription_profiles (email);

alter table profiles enable row level security;
alter table stories enable row level security;
alter table bia_subscription_profiles enable row level security;

drop policy if exists "profiles_all_access" on profiles;
create policy "profiles_all_access" on profiles
for all
using (true)
with check (true);

drop policy if exists "stories_all_access" on stories;
create policy "stories_all_access" on stories
for all
using (true)
with check (true);

drop policy if exists "subscription_all_access" on bia_subscription_profiles;
create policy "subscription_all_access" on bia_subscription_profiles
for all
using (true)
with check (true);

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on profiles;
create trigger profiles_updated_at
before update on profiles
for each row
execute function update_updated_at_column();

drop trigger if exists subscriptions_updated_at on bia_subscription_profiles;
create trigger subscriptions_updated_at
before update on bia_subscription_profiles
for each row
execute function update_updated_at_column();
