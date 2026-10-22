alter table public.bia_student_progress
  add column if not exists preferences jsonb not null default '{}'::jsonb;

create table if not exists public.brazilian_daily_reminder_runs (
  reminder_date date primary key,
  message text not null,
  recipient_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.brazilian_daily_reminder_runs enable row level security;
revoke all on public.brazilian_daily_reminder_runs from public, anon, authenticated;
grant select, insert, update on public.brazilian_daily_reminder_runs to service_role;
