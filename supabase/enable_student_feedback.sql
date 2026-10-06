-- Run in the Supabase SQL Editor to enable private student feedback.
create table if not exists public.bia_student_feedback (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  student_name text not null,
  student_email text not null,
  answers jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new', 'reviewing', 'answered')),
  admin_reply text,
  student_reply_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bia_student_feedback
  add column if not exists student_reply_seen_at timestamptz;

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

create or replace function public.mark_my_feedback_replies_seen(p_feedback_ids uuid[])
returns setof uuid
language sql
security definer
set search_path = public
as $$
  update public.bia_student_feedback
  set student_reply_seen_at = now()
  where id = any(coalesce(p_feedback_ids, '{}'::uuid[]))
    and auth_user_id = auth.uid()
    and nullif(trim(admin_reply), '') is not null
    and student_reply_seen_at is null
  returning id;
$$;

revoke all on function public.mark_my_feedback_replies_seen(uuid[]) from public, anon;
grant execute on function public.mark_my_feedback_replies_seen(uuid[]) to authenticated;

create or replace function public.reset_feedback_reply_seen_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.admin_reply is distinct from old.admin_reply
    and nullif(trim(new.admin_reply), '') is not null then
    new.student_reply_seen_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists bia_student_feedback_reset_reply_seen_at on public.bia_student_feedback;
create trigger bia_student_feedback_reset_reply_seen_at
before update on public.bia_student_feedback
for each row execute function public.reset_feedback_reply_seen_at();
