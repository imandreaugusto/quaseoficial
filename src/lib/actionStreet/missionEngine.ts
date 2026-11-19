import type { Mission, MissionStep } from '../../types/actionStreet';

export interface MissionState {
  currentStep: number;
  completed: boolean;
  allCorrect: boolean;
}

export function shuffleMissionOptions<T extends { isCorrect: boolean }>(
  options: T[],
  seed: string
): T[] {
  const shuffled = [...options];
  let value = 0;
  for (let index = 0; index < seed.length; index += 1) {
    value = (value * 31 + seed.charCodeAt(index)) >>> 0;
  }
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    value = (value * 1664525 + 1013904223) >>> 0;
    const target = value % (index + 1);
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

export const missionEngine = {
  initMission(): MissionState {
    return {
      currentStep: 0,
      completed: false,
      allCorrect: true,
    };
  },

  getCurrentStep(mission: Mission, state: MissionState): MissionStep | null {
    if (state.currentStep >= mission.steps.length) {
      return null;
    }
    return mission.steps[state.currentStep];
  },

  evaluateOption(
    isCorrect: boolean,
    state: MissionState
  ): MissionState {
    return {
      ...state,
      allCorrect: state.allCorrect && isCorrect,
    };
  },

  advanceStep(mission: Mission, state: MissionState): MissionState {
    const nextStep = state.currentStep + 1;
    const completed = nextStep >= mission.steps.length;

    return {
      ...state,
      currentStep: nextStep,
      completed,
    };
  },

  isMissionComplete(state: MissionState): boolean {
    return state.completed;
  },

  getMissionProgress(mission: Mission, state: MissionState): {
    current: number;
    total: number;
    percentage: number;
  } {
    const total = mission.steps.length;
    const current = Math.min(state.currentStep + 1, total);
    const percentage = Math.round((current / total) * 100);

    return { current, total, percentage };
  },
};
