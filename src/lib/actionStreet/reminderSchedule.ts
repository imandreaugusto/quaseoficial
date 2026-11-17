const REMINDER_HOURS = new Set(['06', '12', '20']);

export function getActionStreetReminderSlot(now: Date, timeZone: string): string | null {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? '';
  const year = part('year');
  const month = part('month');
  const day = part('day');
  const hour = part('hour');
  const minute = Number(part('minute'));

  if (!year || !month || !day || !REMINDER_HOURS.has(hour) || minute >= 15) return null;
  return `${year}-${month}-${day}-${hour}`;
}
