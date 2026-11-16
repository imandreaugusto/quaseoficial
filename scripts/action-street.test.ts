import assert from 'node:assert/strict';
import test from 'node:test';
import actionStreetData from '../src/data/actionStreetData.json';
import { missionPayout } from '../src/lib/actionStreet/economy';
import { parseJourney } from '../src/lib/actionStreet/journeyStore';
import { sanitizeState } from '../src/lib/actionStreet/persistenceManager';
import { dayKey, emptyStreak, registerVisit, streakMultiplier } from '../src/lib/actionStreet/streak';
import { VISA_VALIDITY_MS, buildRenewalQuiz, getVisaStatus, recordVisit, renewVisa } from '../src/lib/actionStreet/visa';
import type { ActionStreetState, City } from '../src/types/actionStreet';

const cities = (actionStreetData as unknown as { states: City[] }).states;
const ny = cities[0];
const HOUR = 60 * 60 * 1000;

function baseState(overrides: Partial<ActionStreetState> = {}): ActionStreetState {
  return sanitizeState({ balance: 150, ...overrides }, 1_000);
}

function stateWithNyStamp(validAt: number): ActionStreetState {
  return baseState({
    stamps: [{ id: 'stamp-nyc', title: 'THE BIG APPLE', subtitle: 'New York, NY', color: '#F59E0B', cityId: 'ny', earnedAt: validAt }],
    visas: { ny: { validAt, lastVisitedAt: validAt } },
  });
}

function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

test('streak starts at 1, ignores repeats on the same day and grows on consecutive days', () => {
  let streak = registerVisit(emptyStreak(), new Date(2026, 10, 16, 12));
  assert.equal(streak.count, 1);

  const sameDay = registerVisit(streak, new Date(2026, 10, 16, 23, 59));
  assert.equal(sameDay, streak);

  streak = registerVisit(streak, new Date(2026, 10, 17, 8));
  streak = registerVisit(streak, new Date(2026, 10, 18, 22));
  assert.equal(streak.count, 3);
  assert.equal(streak.best, 3);
});

test('streak resets after a skipped day but remembers the best run', () => {
  let streak = emptyStreak();
  for (const day of [14, 15, 16]) streak = registerVisit(streak, new Date(2026, 10, day, 10));
  streak = registerVisit(streak, new Date(2026, 10, 19, 10));

  assert.equal(streak.count, 1);
  assert.equal(streak.best, 3);
});

test('streak counts across month boundaries', () => {
  const first = registerVisit(emptyStreak(), new Date(2026, 1, 28, 20));
  const second = registerVisit(first, new Date(2026, 2, 1, 7));
  assert.equal(second.count, 2);
  assert.equal(dayKey(new Date(2026, 2, 1)), '2026-03-01');
});

test('streak multiplier thresholds', () => {
  assert.deepEqual([0, 1, 2, 6, 7, 30].map(streakMultiplier), [1, 1, 1.5, 1.5, 2, 2]);
});

test('visa is valid just under 72h and expired at 72h', () => {
  const state = stateWithNyStamp(0);
  assert.equal(getVisaStatus(state, 'ny', VISA_VALIDITY_MS - 1).expired, false);
  const expired = getVisaStatus(state, 'ny', VISA_VALIDITY_MS);
  assert.equal(expired.expired, true);
  assert.equal(expired.daysSince, 3);
});

test('a state without a stamp never expires', () => {
  assert.equal(getVisaStatus(baseState(), 'ny', 10 * VISA_VALIDITY_MS).expired, false);
});

test('visiting refreshes a valid visa but cannot revive an expired one', () => {
  const valid = recordVisit(stateWithNyStamp(0), 'ny', 40 * HOUR);
  assert.equal(valid.visas.ny.validAt, 40 * HOUR);

  const expiredBefore = stateWithNyStamp(0);
  const visited = recordVisit(expiredBefore, 'ny', 80 * HOUR);
  assert.equal(visited.visas.ny.validAt, 0);
  assert.equal(visited.visas.ny.lastVisitedAt, 80 * HOUR);
  assert.equal(getVisaStatus(visited, 'ny', 80 * HOUR).expired, true);
});

test('renewing an expired visa restores it', () => {
  const renewed = renewVisa(stateWithNyStamp(0), 'ny', 100 * HOUR);
  assert.equal(getVisaStatus(renewed, 'ny', 100 * HOUR + 1).expired, false);
});

test('saved state from before streaks and visas is migrated with a grace period', () => {
  const migrated = sanitizeState(
    { balance: 305, stamps: [{ id: 'stamp-nyc', title: 'T', subtitle: 'S', color: '#fff', cityId: 'ny', earnedAt: 5 }] } as Partial<ActionStreetState>,
    9_999
  );
  assert.equal(migrated.balance, 305);
  assert.deepEqual(migrated.streak, { count: 0, best: 0, lastDay: null });
  assert.equal(migrated.visas.ny.validAt, 9_999);
  assert.equal(getVisaStatus(migrated, 'ny', 9_999 + HOUR).expired, false);
});

test('corrupted saved state falls back to safe defaults', () => {
  const state = sanitizeState({ balance: Number.NaN, streak: 'x', visas: [], souvenirs: 'no' } as unknown as Partial<ActionStreetState>);
  assert.equal(state.balance, 150);
  assert.equal(state.streak.count, 0);
  assert.deepEqual(state.souvenirs, []);
  assert.ok(state.unlockedCities.includes('ny'));
});

test('renewal quiz asks 3 valid questions and prefers words the student learned', () => {
  const learned = new Set(['ny:ny-hs-3']);
  const quiz = buildRenewalQuiz(ny, cities, learned, seededRandom(7));

  assert.equal(quiz.length, 3);
  assert.equal(quiz[0].word, 'Hot Dog Cart');
  assert.equal(quiz[0].learned, true);
  assert.equal(quiz.filter((question) => question.learned).length, 1);
  for (const question of quiz) {
    assert.equal(question.options.length, 3);
    assert.equal(new Set(question.options).size, 3);
    const hotspot = ny.hotspots.find((item) => item.id === question.id)!;
    assert.equal(question.options[question.correctIndex], hotspot.translation);
  }
});

test('mission payout adds bonuses together and drops them when the visa is expired', () => {
  const full = missionPayout({ base: 100, allCorrect: true, streakCount: 3, bonusesActive: true });
  assert.deepEqual(
    { perfect: full.perfectBonus, streak: full.streakBonus, total: full.total },
    { perfect: 25, streak: 50, total: 175 }
  );

  const expired = missionPayout({ base: 100, allCorrect: true, streakCount: 9, bonusesActive: false });
  assert.equal(expired.total, 100);
  assert.equal(expired.bonusesActive, false);

  assert.equal(missionPayout({ base: 100, allCorrect: false, streakCount: 1, bonusesActive: true }).total, 100);
});

test('journey parsing rejects garbage and keeps only valid camera data', () => {
  assert.equal(parseJourney(null), null);
  assert.equal(parseJourney('not json'), null);
  assert.equal(parseJourney(JSON.stringify({ view: 'nope', cityId: 'ny' })), null);

  const journey = parseJourney(
    JSON.stringify({
      view: 'street360',
      cityId: 'ny',
      spotId: 'central-park',
      lobbyCamera: { center: [1, 2], zoom: 3, pitch: 4, bearing: 5 },
      mission: { missionId: 'ny-mission-1', step: 1, allCorrect: false, open: true },
      savedAt: 10,
    })
  );
  assert.equal(journey?.spotId, 'central-park');
  assert.deepEqual(journey?.lobbyCamera?.center, [1, 2]);
  assert.deepEqual(journey?.mission, { missionId: 'ny-mission-1', step: 1, allCorrect: false, open: true });

  const badCamera = parseJourney(JSON.stringify({ view: 'lobby', cityId: 'ny', lobbyCamera: { center: ['x'], zoom: 1 } }));
  assert.equal(badCamera?.lobbyCamera, undefined);
});
