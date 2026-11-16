import type { ActionStreetState, Souvenir, Stamp } from '../types/actionStreet';

const STORAGE_KEY = 'ACTION_STREET_STATE';

export const defaultState: ActionStreetState = {
  currentCity: 'ny',
  balance: 150,
  unlockedCities: ['ny'],
  souvenirs: [],
  stamps: [],
  completedMissions: [],
};

export const persistenceManager = {
  loadState(): ActionStreetState {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : { ...defaultState };
    } catch {
      return { ...defaultState };
    }
  },

  saveState(state: ActionStreetState): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },

  clearState(): void {
    localStorage.removeItem(STORAGE_KEY);
  },

  addSouvenir(state: ActionStreetState, souvenir: Souvenir): ActionStreetState {
    return {
      ...state,
      souvenirs: [...state.souvenirs, souvenir],
    };
  },

  addStamp(state: ActionStreetState, stamp: Stamp): ActionStreetState {
    return {
      ...state,
      stamps: [...state.stamps, stamp],
    };
  },

  updateBalance(state: ActionStreetState, amount: number): ActionStreetState {
    return {
      ...state,
      balance: Math.max(0, state.balance + amount),
    };
  },

  unlockCity(state: ActionStreetState, cityId: string): ActionStreetState {
    return {
      ...state,
      unlockedCities: Array.from(new Set([...state.unlockedCities, cityId])),
    };
  },

  completeMission(state: ActionStreetState, missionId: string): ActionStreetState {
    return {
      ...state,
      completedMissions: Array.from(new Set([...state.completedMissions, missionId])),
    };
  },
};
