import type { ActionStreetState, Souvenir, Stamp, StreakState, VisaRecord } from '../../types/actionStreet';
import actionStreetData from '../../data/actionStreetData.json';
import { emptyStreak, registerVisit } from './streak';
import { recordVisit, renewVisa } from './visa';
import { spotDiscoveryId } from './discovery';
import { readActionStreetSave, writeActionStreetSave } from './saveEnvelope';

const STORAGE_KEY = 'ACTION_STREET_STATE';
const ACCOUNT_STORAGE_PREFIX = `${STORAGE_KEY}_V2_`;
const TICKET_CAP = 3;
const MAX_JOURNAL_ENTRIES = 300;

export const defaultState: ActionStreetState = {
  currentCity: 'ny',
  balance: actionStreetData.initialBalance,
  unlockedCities: ['ny'],
  discoveredSpots: [],
  souvenirs: [],
  stamps: [],
  completedMissions: [],
  streak: emptyStreak(),
  visas: {},
  xp: 0,
  reputation: {},
  moods: {},
  inventory: [],
  learnedPhrases: [],
  unlockedRoutes: [],
  dialogueChoices: {},
  secretMission: { currentIndex: 0, status: 'idle', unlockAt: null, activeTimeMs: 0 },
  tickets: { available: TICKET_CAP, lastRefillAt: Date.now() },
  journal: [],
};

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const asStringArray = (value: unknown): string[] => Array.from(new Set(asArray<unknown>(value).filter((item): item is string => typeof item === 'string')));
const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const boundedInteger = (value: unknown, min: number, max: number, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.floor(value))) : fallback;

function accountStorageKey(userId: string): string {
  return `${ACCOUNT_STORAGE_PREFIX}${encodeURIComponent(userId)}`;
}

function sanitizeStringRecord(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
      .slice(0, MAX_JOURNAL_ENTRIES)
  );
}

function sanitizeReputation(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>)
      .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1]))
      .map(([cityId, reputation]) => [cityId, Math.min(10, Math.max(-10, Math.floor(reputation)))])
      .slice(0, 100)
  );
}

function sanitizeMoods(raw: unknown): ActionStreetState['moods'] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>)
      .filter((entry): entry is [string, ActionStreetState['moods'][string]] =>
        entry[1] === 'friendly' || entry[1] === 'annoyed' || entry[1] === 'impressed'
      )
      .slice(0, 100)
  );
}

function sanitizeJournal(raw: unknown) {
  return asArray<unknown>(raw)
    .flatMap((value) => {
      if (!value || typeof value !== 'object') return [];
      const event = value as Record<string, unknown>;
      if (
        typeof event.id !== 'string'
        || typeof event.cityId !== 'string'
        || typeof event.timestamp !== 'number'
        || !Number.isFinite(event.timestamp)
        || typeof event.label !== 'string'
        || !['arrival', 'collectible', 'phrase', 'dialogue', 'challenge', 'mission'].includes(String(event.type))
      ) return [];
      return [{
        id: event.id.slice(0, 120),
        cityId: event.cityId.slice(0, 80),
        type: event.type as ActionStreetState['journal'][number]['type'],
        timestamp: event.timestamp,
        label: event.label.slice(0, 160),
        ...(typeof event.detail === 'string' ? { detail: event.detail.slice(0, 240) } : {}),
      }];
    })
    .slice(-MAX_JOURNAL_ENTRIES);
}

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
  const rawTickets = raw.tickets as Partial<ActionStreetState['tickets']> | undefined;
  const rawSecretMission = raw.secretMission as Partial<ActionStreetState['secretMission']> | undefined;
  const secretUnlockAt = isCount(rawSecretMission?.unlockAt) ? rawSecretMission.unlockAt : null;
  const requestedSecretStatus = rawSecretMission?.status === 'pending_tomorrow' || rawSecretMission?.status === 'ready_to_verify'
    ? rawSecretMission.status
    : 'idle';
  const secretStatus = requestedSecretStatus === 'pending_tomorrow' && secretUnlockAt === null
    ? 'idle'
    : requestedSecretStatus;
  return {
    currentCity: typeof raw.currentCity === 'string' ? raw.currentCity : defaultState.currentCity,
    balance: typeof raw.balance === 'number' && Number.isFinite(raw.balance) ? Math.max(0, raw.balance) : defaultState.balance,
    unlockedCities: Array.from(new Set(['ny', ...asArray<string>(raw.unlockedCities)])),
    discoveredSpots: asStringArray(raw.discoveredSpots),
    souvenirs: asArray<Souvenir>(raw.souvenirs),
    stamps,
    completedMissions: asArray<string>(raw.completedMissions),
    streak: sanitizeStreak(raw.streak),
    visas: sanitizeVisas(raw.visas, stamps, now),
    xp: boundedInteger(raw.xp, 0, Number.MAX_SAFE_INTEGER, 0),
    reputation: sanitizeReputation(raw.reputation),
    moods: sanitizeMoods(raw.moods),
    inventory: asStringArray(raw.inventory).slice(0, 200),
    learnedPhrases: asStringArray(raw.learnedPhrases).slice(0, 500),
    unlockedRoutes: asStringArray(raw.unlockedRoutes).slice(0, 300),
    dialogueChoices: sanitizeStringRecord(raw.dialogueChoices),
    secretMission: {
      currentIndex: boundedInteger(rawSecretMission?.currentIndex, 0, 50, 0),
      status: secretStatus,
      unlockAt: secretStatus === 'idle' ? null : secretUnlockAt,
      activeTimeMs: boundedInteger(rawSecretMission?.activeTimeMs, 0, 120_000, 0),
    },
    tickets: {
      available: boundedInteger(rawTickets?.available, 0, TICKET_CAP, TICKET_CAP),
      lastRefillAt: isCount(rawTickets?.lastRefillAt) ? rawTickets.lastRefillAt : now,
    },
    journal: sanitizeJournal(raw.journal),
  };
}

export const persistenceManager = {
  loadState(userId?: string): ActionStreetState {
    const savedState = readActionStreetSave(userId)?.state;
    if (savedState) return sanitizeState(savedState);
    try {
      const stored = localStorage.getItem(userId ? accountStorageKey(userId) : STORAGE_KEY);
      if (!stored) return sanitizeState(defaultState);
      const state = sanitizeState(JSON.parse(stored));
      writeActionStreetSave({ state }, userId);
      return state;
    } catch (error) {
      console.warn('Não foi possível carregar o progresso local do Action Street.', error);
      return sanitizeState(defaultState);
    }
  },

  saveState(state: ActionStreetState, userId?: string): boolean {
    return writeActionStreetSave({ state }, userId);
  },

  hasAccountState(userId: string): boolean {
    if (readActionStreetSave(userId)?.state) return true;
    try {
      return localStorage.getItem(accountStorageKey(userId)) !== null;
    } catch (error) {
      console.warn('Não foi possível verificar o progresso local desta conta do Action Street.', error);
      return false;
    }
  },

  hasLegacyState(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) !== null;
    } catch (error) {
      console.warn('Não foi possível verificar um save antigo do Action Street.', error);
      return false;
    }
  },

  importLegacyState(userId: string): ActionStreetState | null {
    try {
      if (readActionStreetSave(userId)?.state || localStorage.getItem(accountStorageKey(userId)) !== null) return null;
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      const imported = sanitizeState(JSON.parse(stored));
      return writeActionStreetSave({ state: imported }, userId) ? imported : null;
    } catch (error) {
      console.warn('Não foi possível importar o save antigo do Action Street.', error);
      return null;
    }
  },

  clearState(): void {
    localStorage.removeItem(STORAGE_KEY);
  },

  addSouvenir(state: ActionStreetState, souvenir: Souvenir): ActionStreetState {
    if (state.souvenirs.some((item) => item.id === souvenir.id)) return state;
    return { ...state, souvenirs: [...state.souvenirs, souvenir] };
  },

  discoverSpot(state: ActionStreetState, cityId: string, spotId: string): ActionStreetState {
    const id = spotDiscoveryId(cityId, spotId);
    if (state.discoveredSpots.includes(id)) return state;
    return { ...state, discoveredSpots: [...state.discoveredSpots, id] };
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
