begin;

alter table public.brazilian_friends_messages
  alter column expires_at set default (now() + interval '5 days');

update public.brazilian_friends_messages
set expires_at = created_at + interval '5 days'
where expires_at is null;

alter table public.brazilian_friends_messages
  alter column expires_at set not null;

commit;