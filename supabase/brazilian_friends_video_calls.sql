create table if not exists public.brazilian_friends_call_invitations (
  id uuid primary key default gen_random_uuid(),
  room_name text not null check (
    room_name ~ '^brazilian-friends-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  inviter_id text not null references public.brazilian_friends_users(id) on delete cascade,
  invitee_id text not null references public.brazilian_friends_users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  unique (room_name, invitee_id),
  check (inviter_id <> invitee_id),
  check (expires_at > created_at)
);

create index if not exists brazilian_friends_call_invitations_inbox_idx
  on public.brazilian_friends_call_invitations (invitee_id, status, expires_at desc);

alter table public.brazilian_friends_call_invitations enable row level security;
revoke all on public.brazilian_friends_call_invitations from public, anon, authenticated;
grant select, insert, update, delete on public.brazilian_friends_call_invitations to service_role;
