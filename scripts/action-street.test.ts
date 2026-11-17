import assert from 'node:assert/strict';
import test from 'node:test';
import { actionStreetCities } from '../src/data/actionStreetCities';
import { missionPayout } from '../src/lib/actionStreet/economy';
import { getDiscoveredSpotIds } from '../src/lib/actionStreet/discovery';
import { parseJourney } from '../src/lib/actionStreet/journeyStore';
import { persistenceManager, sanitizeState } from '../src/lib/actionStreet/persistenceManager';
import { buildActionStreetResponseEvaluation } from '../src/lib/actionStreet/responseEvaluation';
import { dayKey, emptyStreak, registerVisit, streakMultiplier } from '../src/lib/actionStreet/streak';
import { VISA_VALIDITY_MS, buildRenewalQuiz, getVisaStatus, recordVisit, renewVisa } from '../src/lib/actionStreet/visa';
import { findNearestImage, getMapillaryImageById } from '../src/lib/actionStreet/mapillaryConfig';
import { getActionStreetReminderSlot } from '../src/lib/actionStreet/reminderSchedule';
import type { ActionStreetState } from '../src/types/actionStreet';

const cities = actionStreetCities;
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

test('spot discoveries are idempotent and existing souvenirs count as discoveries', () => {
  const initial = baseState();
  const discovered = persistenceManager.discoverSpot(initial, 'ny', 'times-square');
  assert.deepEqual(discovered.discoveredSpots, ['ny:times-square']);
  assert.equal(persistenceManager.discoverSpot(discovered, 'ny', 'times-square'), discovered);

  const legacyState = baseState({
    souvenirs: [{ id: 'ny:ny-hs-1', icon: 'Flame', label: 'Fire Hydrant', fromCity: 'New York', collectedAt: 1 }],
  });
  const discoveredIds = getDiscoveredSpotIds(cities, legacyState.discoveredSpots, legacyState.souvenirs);
  assert.ok(discoveredIds.has('ny:times-square'));
});

test('discovery state migrates safely from older and malformed saves', () => {
  const migrated = sanitizeState({ discoveredSpots: ['ny:times-square', 'ny:times-square', 12] as unknown as string[] });
  assert.deepEqual(migrated.discoveredSpots, ['ny:times-square']);
  assert.deepEqual(sanitizeState({}).discoveredSpots, []);
});

test('Jev response evaluation accepts clear relevant paraphrases and guides unclear answers', () => {
  const accepted = buildActionStreetResponseEvaluation(0.82, 0.74);
  assert.equal(accepted.isValid, true);
  assert.match(accepted.feedback, /Boa resposta/);

  const unclear = buildActionStreetResponseEvaluation(0.9, 0.59);
  assert.equal(unclear.isValid, false);
  assert.match(unclear.feedback, /ajuste a frase/);

  assert.throws(() => buildActionStreetResponseEvaluation(Number.NaN, 0.8), /invalid relevance confidence/);
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

test('street image lookup expands the search and chooses the nearest real image', async () => {
  const originalFetch = globalThis.fetch;
  const requests: URL[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    requests.push(url);
    const radius = Number(url.searchParams.get('bbox')?.split(',')[2]) - (-73.9857);
    const images = radius >= 0.015
      ? [
          { id: 'farther-image', computed_geometry: { coordinates: [-73.98, 40.75] }, thumb_1024_url: 'https://images.example/farther.jpg' },
          { id: 'nearest-image', computed_geometry: { coordinates: [-73.985, 40.7485] }, thumb_2048_url: 'https://images.example/nearest.jpg' },
        ]
      : [];
    return new Response(JSON.stringify({ data: images }), { status: 200 });
  };

  try {
    assert.deepEqual(await findNearestImage('token', [-73.9857, 40.7484]), {
      id: 'nearest-image',
      coordinates: [-73.985, 40.7485],
      thumbnailUrl: 'https://images.example/nearest.jpg',
    });
    assert.equal(requests.length, 5);
    assert.equal(requests[4].searchParams.get('is_pano'), 'true');
    assert.match(requests[4].searchParams.get('fields') ?? '', /thumb_2048_url/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('street image lookup returns null only after checking the expanded area', async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return new Response(JSON.stringify({ data: [] }), { status: 200 });
  };

  try {
    assert.equal(await findNearestImage('token', [-73.9857, 40.7484]), null);
    assert.equal(fetchCalls, 10);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('street image lookup by id returns the same image thumbnail and location', async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl: URL | null = null;
  globalThis.fetch = async (input) => {
    requestUrl = new URL(String(input));
    return new Response(JSON.stringify({
      id: 'current-image',
      computed_geometry: { coordinates: [-73.985, 40.7485] },
      thumb_2048_url: 'https://images.example/current.jpg',
    }), { status: 200 });
  };

  try {
    assert.deepEqual(await getMapillaryImageById('token', 'current-image'), {
      id: 'current-image',
      coordinates: [-73.985, 40.7485],
      thumbnailUrl: 'https://images.example/current.jpg',
    });
    assert.equal(requestUrl?.pathname, '/current-image');
    assert.equal(requestUrl?.searchParams.get('access_token'), 'token');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Action Street reminder slots follow the subscriber local timezone', () => {
  assert.equal(getActionStreetReminderSlot(new Date('2026-11-17T09:05:00Z'), 'America/Sao_Paulo'), '2026-11-17-06');
  assert.equal(getActionStreetReminderSlot(new Date('2026-11-17T15:10:00Z'), 'America/Sao_Paulo'), '2026-11-17-12');
  assert.equal(getActionStreetReminderSlot(new Date('2026-11-17T23:10:00Z'), 'America/Sao_Paulo'), '2026-11-17-20');
  assert.equal(getActionStreetReminderSlot(new Date('2026-11-17T11:05:00Z'), 'America/New_York'), '2026-11-17-06');
});

test('Action Street reminder slots ignore other hours and the rest of each hour', () => {
  assert.equal(getActionStreetReminderSlot(new Date('2026-11-17T10:05:00Z'), 'America/Sao_Paulo'), null);
  assert.equal(getActionStreetReminderSlot(new Date('2026-11-17T09:16:00Z'), 'America/Sao_Paulo'), null);
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

test('all three state packages are adapted for the Action Street experience', () => {
  assert.equal(cities.length, 30);
  assert.equal(new Set(cities.map((city) => city.id)).size, 30);
  assert.deepEqual(cities.slice(0, 4).map((city) => city.id), ['ny', 'nj', 'tx', 'fl']);
  assert.deepEqual(cities.slice(-10).map((city) => city.id), ['nc', 'va', 'oh', 'md', 'ak', 'nm', 'sc', 'mo', 'ky', 'wi']);

  for (const [index, city] of cities.entries()) {
    assert.ok(city.spots.length > 0, `${city.id} should expose explorable spots`);
    if (index >= 4) assert.equal(city.spots.length, 3, `${city.id} should expose three explorable spots`);
    assert.equal(city.hotspots.length, 3, `${city.id} should expose three vocabulary rewards`);
    for (const hotspot of city.hotspots) {
      assert.ok(city.spots.some((spot) => spot.id === hotspot.spotId), `${city.id}/${hotspot.id} should point to a spot`);
      assert.ok(hotspot.souvenirIcon);
    }
    assert.ok(city.stamp.subtitle);
    assert.ok(city.mission.steps.length > 0);
  }
});
