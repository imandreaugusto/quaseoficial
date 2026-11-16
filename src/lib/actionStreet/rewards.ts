export const PERFECT_MISSION_BONUS = 0.25;

export const rewards = {
  calculateMissionReward(missionDollars: number, allCorrect: boolean): { base: number; bonus: number; total: number } {
    const base = Math.round(missionDollars);
    const bonus = allCorrect ? Math.round(base * PERFECT_MISSION_BONUS) : 0;
    return { base, bonus, total: base + bonus };
  },
};
