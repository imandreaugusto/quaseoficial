create table if not exists public.ceo_announcements (
  id smallint primary key default 1 check (id = 1),
  message text not null default '' check (char_length(message) <= 1000),
  is_active boolean not null default false,
  revision integer not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now(),
  updated_by text not null
);

alter table public.ceo_announcements enable row level security;
revoke all on public.ceo_announcements from anon, authenticated;
grant select, insert, update on public.ceo_announcements to service_role;