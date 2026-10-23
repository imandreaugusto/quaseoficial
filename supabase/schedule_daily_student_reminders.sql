create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'bia-daily-student-reminders',
  '0 9 * * *',
  $job$
    select net.http_post(
      url := 'https://brazilian-in-action-i036.onrender.com/api/cron/daily-student-reminders',
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
