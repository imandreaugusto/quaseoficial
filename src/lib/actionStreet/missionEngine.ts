import type { Mission, MissionStep } from '../types/actionStreet';

export interface MissionState {
  currentStep: number;
  completed: boolean;
  allCorrect: boolean;
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
