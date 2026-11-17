import type { ActionStreetState, ChallengeTickets, TravelJournalEntry, TravelJournalEventType } from '../../types/actionStreet';

export const MAX_CHALLENGE_TICKETS = 3;
export const CHALLENGE_TICKET_REFILL_MS = 6 * 60 * 60 * 1000;
const MAX_JOURNAL_ENTRIES = 300;

export const TOURIST_LEVELS = [
  { level: 1, title: 'Lost Tourist', minXp: 0 },
  { level: 2, title: 'Subway Navigator', minXp: 100 },
  { level: 3, title: 'Street Smart', minXp: 300 },
  { level: 4, title: 'Honorary Local', minXp: 600 },
] as const;

export function getTouristLevel(xp: number) {
  return TOURIST_LEVELS.reduce((current, level) => xp >= level.minXp ? level : current, TOURIST_LEVELS[0]);
}

export function getTouristLevelProgress(xp: number) {
  const current = getTouristLevel(xp);
  const next = TOURIST_LEVELS.find((level) => level.level === current.level + 1);
  if (!next) return { current, next: null, progress: 1 };
  return {
    current,
    next,
    progress: Math.max(0, Math.min(1, (xp - current.minXp) / (next.minXp - current.minXp))),
  };
}

export function refreshChallengeTickets(tickets: ChallengeTickets, now = Date.now()): ChallengeTickets {
  const available = Math.max(0, Math.min(MAX_CHALLENGE_TICKETS, Math.floor(tickets.available)));
  if (available === MAX_CHALLENGE_TICKETS || now < tickets.lastRefillAt) {
    return { available, lastRefillAt: now };
  }

  const recovered = Math.floor((now - tickets.lastRefillAt) / CHALLENGE_TICKET_REFILL_MS);
  if (recovered <= 0) return { available, lastRefillAt: tickets.lastRefillAt };
  const nextAvailable = Math.min(MAX_CHALLENGE_TICKETS, available + recovered);
  return {
    available: nextAvailable,
    lastRefillAt: nextAvailable === MAX_CHALLENGE_TICKETS
      ? now
      : tickets.lastRefillAt + recovered * CHALLENGE_TICKET_REFILL_MS,
  };
}

export function spendChallengeTicket(state: ActionStreetState, now = Date.now()): ActionStreetState | null {
  const tickets = refreshChallengeTickets(state.tickets, now);
  if (tickets.available <= 0) return null;
  return { ...state, tickets: { ...tickets, available: tickets.available - 1 } };
}

export function awardXp(state: ActionStreetState, amount: number): ActionStreetState {
  if (!Number.isFinite(amount) || amount <= 0) return state;
  return { ...state, xp: Math.min(Number.MAX_SAFE_INTEGER, state.xp + Math.floor(amount)) };
}

export function adjustReputation(state: ActionStreetState, cityId: string, amount: number): ActionStreetState {
  if (!Number.isFinite(amount) || amount === 0) return state;
  const current = state.reputation[cityId] ?? 0;
  const next = Math.max(-10, Math.min(10, current + Math.floor(amount)));
  return { ...state, reputation: { ...state.reputation, [cityId]: next } };
}

export function addInventoryItem(state: ActionStreetState, itemId: string): ActionStreetState {
  return state.inventory.includes(itemId)
    ? state
    : { ...state, inventory: [...state.inventory, itemId].slice(-200) };
}

export function removeInventoryItem(state: ActionStreetState, itemId: string): ActionStreetState {
  return { ...state, inventory: state.inventory.filter((item) => item !== itemId) };
}

export function learnPhrase(state: ActionStreetState, phraseId: string): ActionStreetState {
  return state.learnedPhrases.includes(phraseId)
    ? state
    : { ...state, learnedPhrases: [...state.learnedPhrases, phraseId].slice(-500) };
}

export function unlockRoute(state: ActionStreetState, routeId: string): ActionStreetState {
  return state.unlockedRoutes.includes(routeId)
    ? state
    : { ...state, unlockedRoutes: [...state.unlockedRoutes, routeId].slice(-300) };
}

export function createJournalEntry(
  cityId: string,
  type: TravelJournalEventType,
  label: string,
  detail?: string,
  now = Date.now()
): TravelJournalEntry {
  const unique = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return { id: `${now}-${unique}`, cityId, type, timestamp: now, label, ...(detail ? { detail } : {}) };
}

export function appendJournalEntry(state: ActionStreetState, entry: TravelJournalEntry): ActionStreetState {
  return { ...state, journal: [...state.journal, entry].slice(-MAX_JOURNAL_ENTRIES) };
}
