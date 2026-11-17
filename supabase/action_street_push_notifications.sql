-- Apply in Supabase after configuring Web Push keys and the existing daily-reminder Vault secret.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create table if not exists public.action_street_push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription jsonb not null,
  timezone text not null,
  last_sent_slot text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists action_street_push_subscriptions_user_idx
  on public.action_street_push_subscriptions (user_id);

alter table public.action_street_push_subscriptions enable row level security;
revoke all on public.action_street_push_subscriptions from public, anon, authenticated;
grant select, insert, update, delete on public.action_street_push_subscriptions to service_role;

select cron.unschedule(jobid)
from cron.job
where jobname = 'bia-action-street-push-reminders';

select cron.schedule(
  'bia-action-street-push-reminders',
  '*/15 * * * *',
  $job$
    select net.http_post(
      url := 'https://brazilian-in-action-i036.onrender.com/api/cron/action-street-push-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'bia_daily_reminder_cron_secret'
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    );
  $job$
);
