-- Run in the Supabase SQL Editor to enable private student feedback.
create table if not exists public.bia_student_feedback (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  student_name text not null,
  student_email text not null,
  answers jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new', 'reviewing', 'answered')),
  admin_reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bia_student_feedback_created_at
  on public.bia_student_feedback (created_at desc);
create index if not exists idx_bia_student_feedback_auth_user_id
  on public.bia_student_feedback (auth_user_id, created_at desc);

alter table public.bia_student_feedback enable row level security;

drop policy if exists "feedback_owner_or_ceo_read" on public.bia_student_feedback;
drop policy if exists "feedback_owner_insert" on public.bia_student_feedback;
drop policy if exists "feedback_ceo_update" on public.bia_student_feedback;

create policy "feedback_owner_or_ceo_read" on public.bia_student_feedback
for select to authenticated
using (
  auth_user_id = auth.uid()
  or lower(coalesce(auth.jwt() ->> 'email', '')) in (
    'andrejrcardoso93@gmail.com',
    'brazilianinaction@gmail.com',
    'brazilianinactionidiomas@gmail.com'
  )
);

create policy "feedback_owner_insert" on public.bia_student_feedback
for insert to authenticated
with check (
  auth_user_id = auth.uid()
  and lower(student_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

create policy "feedback_ceo_update" on public.bia_student_feedback
for update to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) in (
    'andrejrcardoso93@gmail.com',
    'brazilianinaction@gmail.com',
    'brazilianinactionidiomas@gmail.com'
  )
)
with check (
  lower(coalesce(auth.jwt() ->> 'email', '')) in (
    'andrejrcardoso93@gmail.com',
    'brazilianinaction@gmail.com',
    'brazilianinactionidiomas@gmail.com'
  )
);

revoke all on public.bia_student_feedback from anon, authenticated;
grant select, insert, update on public.bia_student_feedback to authenticated;

drop trigger if exists bia_student_feedback_updated_at on public.bia_student_feedback;
create trigger bia_student_feedback_updated_at
before update on public.bia_student_feedback
for each row execute function public.update_updated_at_column();
