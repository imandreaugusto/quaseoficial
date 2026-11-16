import { streakMultiplier } from './streak';

export const PERFECT_MISSION_BONUS = 0.25;

export interface MissionPayout {
  base: number;
  perfectBonus: number;
  streakBonus: number;
  streakMultiplier: number;
  bonusesActive: boolean;
  total: number;
}

interface PayoutInput {
  base: number;
  allCorrect: boolean;
  streakCount: number;
  bonusesActive: boolean;
}

// Bônus somam (não multiplicam entre si) e ficam desligados enquanto o visto do estado está expirado.
export function missionPayout({ base, allCorrect, streakCount, bonusesActive }: PayoutInput): MissionPayout {
  const rounded = Math.round(base);
  if (!bonusesActive) {
    return { base: rounded, perfectBonus: 0, streakBonus: 0, streakMultiplier: 1, bonusesActive: false, total: rounded };
  }
  const multiplier = streakMultiplier(streakCount);
  const perfectBonus = allCorrect ? Math.round(rounded * PERFECT_MISSION_BONUS) : 0;
  const streakBonus = Math.round(rounded * (multiplier - 1));
  return { base: rounded, perfectBonus, streakBonus, streakMultiplier: multiplier, bonusesActive: true, total: rounded + perfectBonus + streakBonus };
}
