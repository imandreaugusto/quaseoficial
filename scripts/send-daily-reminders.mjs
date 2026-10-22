const apiUrl = process.env.API_PUBLIC_URL;
const cronSecret = process.env.DAILY_REMINDER_CRON_SECRET;

if (!apiUrl || !cronSecret) {
  throw new Error('API_PUBLIC_URL and DAILY_REMINDER_CRON_SECRET must be configured for the daily reminder job.');
}

const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/cron/daily-student-reminders`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${cronSecret}` }
});

const result = await response.json().catch(() => ({}));
if (!response.ok) {
  throw new Error(result.error || `Daily reminder endpoint failed (${response.status}).`);
}

console.log(JSON.stringify(result));
