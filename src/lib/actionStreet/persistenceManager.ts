import type { ActionStreetState, Souvenir, Stamp, StreakState, VisaRecord } from '../../types/actionStreet';
import actionStreetData from '../../data/actionStreetData.json';
import { emptyStreak, registerVisit } from './streak';
import { recordVisit, renewVisa } from './visa';

const STORAGE_KEY = 'ACTION_STREET_STATE';

export const defaultState: ActionStreetState = {
  currentCity: 'ny',
  balance: actionStreetData.initialBalance,
  unlockedCities: ['ny'],
  souvenirs: [],
  stamps: [],
  completedMissions: [],
  streak: emptyStreak(),
  visas: {},
};

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

function sanitizeStreak(raw: unknown): StreakState {
  const streak = raw as Partial<StreakState> | undefined;
  if (!streak || typeof streak !== 'object') return emptyStreak();
  return {
    count: isCount(streak.count) ? Math.floor(streak.count) : 0,
    best: isCount(streak.best) ? Math.floor(streak.best) : 0,
    lastDay: typeof streak.lastDay === 'string' ? streak.lastDay : null,
  };
}

function sanitizeVisas(raw: unknown, stamps: Stamp[], now: number): Record<string, VisaRecord> {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, Partial<VisaRecord>>) : {};
  const visas: Record<string, VisaRecord> = {};
  for (const [cityId, record] of Object.entries(source)) {
    if (record && isCount(record.validAt) && isCount(record.lastVisitedAt)) {
      visas[cityId] = { validAt: record.validAt, lastVisitedAt: record.lastVisitedAt };
    }
  }
  // Carimbos de antes do sistema de visto ganham carência a partir de agora, em vez de nascerem expirados.
  for (const stamp of stamps) {
    if (!visas[stamp.cityId]) visas[stamp.cityId] = { validAt: now, lastVisitedAt: now };
  }
  return visas;
}

export function sanitizeState(raw: Partial<ActionStreetState>, now = Date.now()): ActionStreetState {
  const stamps = asArray<Stamp>(raw.stamps);
  return {
    currentCity: typeof raw.currentCity === 'string' ? raw.currentCity : defaultState.currentCity,
    balance: typeof raw.balance === 'number' && Number.isFinite(raw.balance) ? Math.max(0, raw.balance) : defaultState.balance,
    unlockedCities: Array.from(new Set(['ny', ...asArray<string>(raw.unlockedCities)])),
    souvenirs: asArray<Souvenir>(raw.souvenirs),
    stamps,
    completedMissions: asArray<string>(raw.completedMissions),
    streak: sanitizeStreak(raw.streak),
    visas: sanitizeVisas(raw.visas, stamps, now),
  };
}

export const persistenceManager = {
  loadState(): ActionStreetState {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? sanitizeState(JSON.parse(stored)) : { ...defaultState, streak: emptyStreak(), visas: {} };
    } catch {
      return { ...defaultState, streak: emptyStreak(), visas: {} };
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
    return {
      ...state,
      stamps: [...state.stamps, stamp],
      visas: { ...state.visas, [stamp.cityId]: { lastVisitedAt: stamp.earnedAt, validAt: stamp.earnedAt } },
    };
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

  registerDailyVisit(state: ActionStreetState, now = new Date()): ActionStreetState {
    const streak = registerVisit(state.streak, now);
    return streak === state.streak ? state : { ...state, streak };
  },

  visitCity: recordVisit,
  renewVisa,
};
