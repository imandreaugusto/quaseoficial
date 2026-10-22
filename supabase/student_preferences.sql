alter table public.bia_student_progress
  add column if not exists preferences jsonb not null default '{}'::jsonb;
