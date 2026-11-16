import type { StreakState } from '../../types/actionStreet';

export const emptyStreak = (): StreakState => ({ count: 0, best: 0, lastDay: null });

export const dayKey = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

export function registerVisit(streak: StreakState, now: Date): StreakState {
  const today = dayKey(now);
  if (streak.lastDay === today) return streak;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const count = streak.lastDay === dayKey(yesterday) ? streak.count + 1 : 1;
  return { count, best: Math.max(streak.best, count), lastDay: today };
}

export function streakMultiplier(count: number): number {
  if (count >= 7) return 2;
  if (count >= 2) return 1.5;
  return 1;
}
