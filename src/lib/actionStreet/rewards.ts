export const rewards = {
  calculateHotspotReward(dollars: number, multiplier = 1): number {
    return Math.round(dollars * multiplier);
  },

  calculateMissionReward(
    missionDollars: number,
    allCorrect: boolean,
    multiplier = 1
  ): { base: number; bonus: number; total: number } {
    const base = Math.round(missionDollars * multiplier);
    const bonus = allCorrect ? Math.round(base * 0.25) : 0; // 25% bonus for perfect score

    return {
      base,
      bonus,
      total: base + bonus,
    };
  },

  calculateUnlockCost(cityId: string, unlockCost: number): number {
    // Possibilidade de desconto futuro por streaks, achievements, etc
    return unlockCost;
  },

  // Animação numérica de incremento
  animateRewardCounter(
    element: HTMLElement,
    from: number,
    to: number,
    duration = 0.5
  ): void {
    let current = from;
    const increment = (to - from) / (duration * 60); // 60 FPS

    const animate = () => {
      current += increment;
      if (current >= to) {
        current = to;
        element.textContent = String(to);
      } else {
        element.textContent = String(Math.floor(current));
        requestAnimationFrame(animate);
      }
    };

    animate();
  },
};
