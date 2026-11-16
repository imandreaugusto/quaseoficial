import type { ActionStreetState, Souvenir, Stamp } from '../../types/actionStreet';
import actionStreetData from '../../data/actionStreetData.json';

const STORAGE_KEY = 'ACTION_STREET_STATE';

export const defaultState: ActionStreetState = {
  currentCity: 'ny',
  balance: actionStreetData.initialBalance,
  unlockedCities: ['ny'],
  souvenirs: [],
  stamps: [],
  completedMissions: [],
};

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const sanitize = (raw: Partial<ActionStreetState>): ActionStreetState => ({
  currentCity: typeof raw.currentCity === 'string' ? raw.currentCity : defaultState.currentCity,
  balance: typeof raw.balance === 'number' && Number.isFinite(raw.balance) ? Math.max(0, raw.balance) : defaultState.balance,
  unlockedCities: Array.from(new Set(['ny', ...asArray<string>(raw.unlockedCities)])),
  souvenirs: asArray<Souvenir>(raw.souvenirs),
  stamps: asArray<Stamp>(raw.stamps),
  completedMissions: asArray<string>(raw.completedMissions),
});

export const persistenceManager = {
  loadState(): ActionStreetState {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? sanitize(JSON.parse(stored)) : { ...defaultState };
    } catch {
      return { ...defaultState };
    }
  },

  saveState(state: ActionStreetState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage cheio/indisponível: o progresso da sessão continua em memória
    }
  },

  clearState(): void {
    localStorage.removeItem(STORAGE_KEY);
  },

  addSouvenir(state: ActionStreetState, souvenir: Souvenir): ActionStreetState {
    if (state.souvenirs.some((item) => item.id === souvenir.id)) return state;
    return { ...state, souvenirs: [...state.souvenirs, souvenir] };
  },

  addStamp(state: ActionStreetState, stamp: Stamp): ActionStreetState {
    if (state.stamps.some((item) => item.id === stamp.id)) return state;
    return { ...state, stamps: [...state.stamps, stamp] };
  },

  updateBalance(state: ActionStreetState, amount: number): ActionStreetState {
    return { ...state, balance: Math.max(0, state.balance + amount) };
  },

  unlockCity(state: ActionStreetState, cityId: string, cost: number): ActionStreetState {
    if (state.unlockedCities.includes(cityId) || state.balance < cost) return state;
    return {
      ...state,
      balance: state.balance - cost,
      unlockedCities: [...state.unlockedCities, cityId],
    };
  },

  completeMission(state: ActionStreetState, missionId: string): ActionStreetState {
    return { ...state, completedMissions: Array.from(new Set([...state.completedMissions, missionId])) };
  },
};
