import assert from 'node:assert/strict';
import test from 'node:test';
import { actionStreetCities } from '../src/data/actionStreetCities';
import { applyChallengeResult, CHALLENGE_REWARD_DOLLARS, CHALLENGE_REWARD_XP, chooseLocalChallenge } from '../src/lib/actionStreet/challengeEngine';
import { applyDialogueChoice, getAvailableDialogueChoices, getDialogueForSpot, presentDialogue, type LocalDialogue } from '../src/lib/actionStreet/dialogueEngine';
import { missionPayout } from '../src/lib/actionStreet/economy';
import { getDiscoveredSpotIds } from '../src/lib/actionStreet/discovery';
import { journeyStore, parseJourney } from '../src/lib/actionStreet/journeyStore';
import { persistenceManager, sanitizeState } from '../src/lib/actionStreet/persistenceManager';
import { getTouristLevelProgress, refreshChallengeTickets, spendChallengeTicket } from '../src/lib/actionStreet/progression';
import { dayKey, emptyStreak, registerVisit, streakMultiplier } from '../src/lib/actionStreet/streak';
import { VISA_VALIDITY_MS, buildRenewalQuiz, getVisaStatus, recordVisit, renewVisa } from '../src/lib/actionStreet/visa';
import {
  buildGoogleMapsFallbackEmbedUrl,
  buildGoogleMapsStreetViewUrl,
  buildGoogleMapsViewEmbedUrl,
  buildGoogleStreetViewEmbedUrl,
} from '../src/lib/actionStreet/googleMapsConfig';
import { getVisibleDestinationIds } from '../src/lib/actionStreet/destinationVisibility';
import { lookupDictionary } from '../src/lib/translator';
import {
  hasCompletedVisaOnboarding,
  loadVisaOnboardingRecord,
  matchesDs160Answer,
  saveVisaOnboardingRecord,
  visaOnboardingCompletedKey,
  visaOnboardingStorageKey,
} from '../src/lib/actionStreet/visaOnboarding';
import actionStreetData from '../src/data/actionStreetData.json';
import visaInterviewData from '../src/data/visaInterviewData.json';
import { getActionStreetReminderSlot } from '../src/lib/actionStreet/reminderSchedule';
import { hasLegacySaveToImport, importLegacySave, recordLegacySaveDecision } from '../src/lib/actionStreet/legacySave';
import { getSecretMissionOptions, loadSecretMissions, PAGER_TRIGGER_DELAY_MS, PAGER_UNLOCK_DELAY_MS, SECRET_MISSION_COUNT } from '../src/lib/actionStreet/secretPager';
import {
  findNearestAirport,
  findProfileCityAirport,
  firstMissionIntroStorageKey,
  getCurrentCoordinates,
  hasSeenFirstMissionIntro,
  markFirstMissionIntroSeen,
  shouldShowFirstMissionIntro,
} from '../src/lib/actionStreet/firstMissionIntro';
import type { ActionStreetState } from '../src/types/actionStreet';
import nyDialoguesRaw from '../src/data/actionStreetDialogues.ny.json';
const nyDialogues = nyDialoguesRaw as LocalDialogue[];

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

function withFakeLocalStorage<T>(run: (storage: Map<string, string>) => T): T {
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  });
  try {
    return run(storage);
  } finally {
    if (originalDescriptor) Object.defineProperty(globalThis, 'localStorage', originalDescriptor);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
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

test('challenge tickets refill one at a time every six hours and cannot be overspent', () => {
  const firstSpend = spendChallengeTicket(baseState({ tickets: { available: 3, lastRefillAt: 100 } }), 100);
  assert.equal(firstSpend?.tickets.available, 2);
  assert.equal(refreshChallengeTickets(firstSpend!.tickets, 100 + 6 * HOUR - 1).available, 2);
  assert.deepEqual(refreshChallengeTickets(firstSpend!.tickets, 100 + 6 * HOUR), {
    available: 3,
    lastRefillAt: 100 + 6 * HOUR,
  });
  assert.equal(
    spendChallengeTicket(baseState({ tickets: { available: 0, lastRefillAt: 100 + 6 * HOUR } }), 100 + 6 * HOUR),
    null
  );
});

test('local street dialogues apply costs, inventory, phrases, routes, reputation and journal entries', () => {
  const musician = getDialogueForSpot(baseState({ balance: 20 }), 'ny', 'times-square', nyDialogues);
  assert.ok(musician);
  const tipChoice = getAvailableDialogueChoices(musician, baseState({ balance: 20 })).find((choice) => choice.id === 'compliment-and-tip');
  assert.ok(tipChoice);
  const tipped = applyDialogueChoice(baseState({ balance: 20 }), musician, tipChoice);
  assert.equal(tipped.balance, 10);
  assert.equal(tipped.xp, 25);
  assert.equal(tipped.reputation.ny, 2);
  assert.equal(tipped.moods[musician.id], 'impressed');
  assert.ok(tipped.learnedPhrases.includes('keep-the-change'));
  assert.ok(tipped.unlockedRoutes.includes('central-park-after-dark'));
  assert.ok(tipped.journal.some((entry) => entry.type === 'phrase'));
  assert.ok(tipped.journal.some((entry) => entry.type === 'dialogue'));
  assert.throws(() => applyDialogueChoice(tipped, musician, tipChoice), /já foi concluída/);

  const parkDialogue = getDialogueForSpot(
    baseState({ inventory: ['subway-map'] }),
    'ny',
    'central-park',
    nyDialogues
  );
  assert.ok(parkDialogue);
  const shareMap = getAvailableDialogueChoices(parkDialogue, baseState({ inventory: ['subway-map'] }))
    .find((choice) => choice.id === 'share-subway-map');
  assert.ok(shareMap);
  const shared = applyDialogueChoice(baseState({ inventory: ['subway-map'] }), parkDialogue, shareMap);
  assert.ok(!shared.inventory.includes('subway-map'));
  assert.ok(shared.inventory.includes('broadway-ticket'));
});

test('dialogue text selects variants and resolves player, item and city placeholders', () => {
  const dialogue = {
    id: 'template-test',
    cityId: 'ny',
    spotId: 'times-square',
    character: 'Local vendor',
    line: ['Hi {{playerName}}, welcome to {{city}}.', 'Hey there!'],
    choices: [{
      id: 'tip',
      text: 'Need help, {{playerName}}?',
      feedback: ['Enjoy {{lastItem}} in {{city}}!', 'Have a great trip!'],
      journalLabel: 'Talked to the vendor.',
    }],
  };
  const presented = presentDialogue(dialogue, {
    playerName: 'Alex',
    lastItem: 'subway map',
    city: 'New York',
  }, () => 0);

  assert.equal(presented.line, 'Hi Alex, welcome to New York.');
  assert.equal(presented.choices[0].text, 'Need help, Alex?');
  assert.equal(presented.choices[0].feedback, 'Enjoy subway map in New York!');
});

test('save migration keeps only supported character moods', () => {
  assert.deepEqual(sanitizeState({
    moods: { friendlyNpc: 'friendly', annoyedNpc: 'annoyed', invalidNpc: 'sleepy' },
  } as unknown as Partial<ActionStreetState>).moods, {
    friendlyNpc: 'friendly',
    annoyedNpc: 'annoyed',
  });

  test('secret pager loads 50 unique local missions and offers four shuffled passphrase choices', async () => {
    const missions = await loadSecretMissions();
    assert.equal(PAGER_TRIGGER_DELAY_MS, 120_000);
    assert.equal(PAGER_UNLOCK_DELAY_MS, 86_400_000);
    assert.equal(missions.length, SECRET_MISSION_COUNT);
    assert.equal(new Set(missions.map((mission) => mission.id)).size, SECRET_MISSION_COUNT);

    const mission = missions[0];
    const options = getSecretMissionOptions(mission, seededRandom(42));
    assert.equal(options.length, 4);
    assert.equal(new Set(options).size, 4);
    assert.ok(options.includes(mission.secretPhrase));
    assert.deepEqual(sanitizeState({
      secretMission: { currentIndex: 2, status: 'pending_tomorrow', unlockAt: 123_000, activeTimeMs: 90_000 },
    } as Partial<ActionStreetState>).secretMission, {
      currentIndex: 2,
      status: 'pending_tomorrow',
      unlockAt: 123_000,
      activeTimeMs: 90_000,
    });
    assert.equal(sanitizeState({
      secretMission: { status: 'pending_tomorrow', unlockAt: null },
    } as Partial<ActionStreetState>).secretMission.status, 'idle');
  });
});

test('street challenges reward correct answers, keep retries free and advance traveler levels locally', () => {
  const challenge = chooseLocalChallenge();
  const correct = challenge.options.find((option) => option.correct)!;
  const initial = baseState({ balance: 50 });
  const rewarded = applyChallengeResult(initial, 'ny', challenge, correct, 1_000);
  assert.equal(rewarded.balance, 50 + CHALLENGE_REWARD_DOLLARS);
  assert.equal(rewarded.xp, CHALLENGE_REWARD_XP);
  assert.equal(rewarded.reputation.ny, 1);
  assert.equal(rewarded.journal[0].detail, `${challenge.id}:success`);

  const timeout = applyChallengeResult(initial, 'ny', challenge, null, 2_000);
  assert.equal(timeout.balance, initial.balance);
  assert.equal(timeout.xp, 0);
  assert.equal(timeout.journal[0].detail, `${challenge.id}:timeout`);

  assert.equal(getTouristLevelProgress(100).current.level, 2);
  assert.equal(getTouristLevelProgress(200).progress, 0.5);
});

test('Action Street saves and journeys stay isolated per account in this browser', () => {
  withFakeLocalStorage((storage) => {
    persistenceManager.saveState(baseState({ balance: 91 }), 'account-one');
    persistenceManager.saveState(baseState({ balance: 37 }), 'account-two');
    journeyStore.patch({ view: 'street360', cityId: 'ny', spotId: 'times-square' }, 'account-one');
    journeyStore.patch({ view: 'street360', cityId: 'ny', spotId: 'central-park' }, 'account-two');

    assert.equal(persistenceManager.loadState('account-one').balance, 91);
    assert.equal(persistenceManager.loadState('account-two').balance, 37);
    assert.equal(journeyStore.load('account-one')?.spotId, 'times-square');
    assert.equal(journeyStore.load('account-two')?.spotId, 'central-park');
    assert.equal(persistenceManager.hasLegacyState(), false);
    assert.equal(JSON.parse(storage.get('action_street_save_v1_account-one') ?? 'null').state.balance, 91);
    assert.equal(JSON.parse(storage.get('action_street_save_v1_account-two') ?? 'null').state.balance, 37);
  });
});

test('Action Street migrates existing account state and journey into the versioned save without deleting originals', () => {
  withFakeLocalStorage((storage) => {
    const state = { balance: 84, inventory: ['subway-map'], unlockedCities: ['ny'] };
    const journey = {
      view: 'street360',
      cityId: 'ny',
      spotId: 'central-park',
      savedAt: 12,
    };
    storage.set('ACTION_STREET_STATE_V2_account-migration', JSON.stringify(state));
    storage.set('ACTION_STREET_JOURNEY_V2_account-migration', JSON.stringify(journey));

    assert.equal(persistenceManager.loadState('account-migration').balance, 84);
    assert.equal(journeyStore.load('account-migration')?.spotId, 'central-park');
    assert.ok(storage.has('ACTION_STREET_STATE_V2_account-migration'));
    assert.ok(storage.has('ACTION_STREET_JOURNEY_V2_account-migration'));
    const migrated = JSON.parse(storage.get('action_street_save_v1_account-migration') ?? 'null');
    assert.equal(migrated.state.balance, 84);
    assert.equal(migrated.journey.spotId, 'central-park');
  });
});

test('legacy save import copies state and journey without deleting their original keys', () => {
  withFakeLocalStorage((storage) => {
    const oldState = { balance: 73, stamps: [], completedMissions: [], unlockedCities: ['ny'] };
    const oldJourney = JSON.stringify({ view: 'street360', cityId: 'ny', spotId: 'central-park', savedAt: 12 });
    storage.set('ACTION_STREET_STATE', JSON.stringify(oldState));
    storage.set('ACTION_STREET_JOURNEY', oldJourney);

    assert.equal(hasLegacySaveToImport('new-account'), true);
    const imported = importLegacySave('new-account');
    assert.equal(imported.state?.balance, 73);
    assert.equal(imported.journey?.spotId, 'central-park');
    assert.ok(storage.has('ACTION_STREET_STATE'));
    assert.equal(storage.get('ACTION_STREET_JOURNEY'), oldJourney);
    recordLegacySaveDecision('new-account', 'imported');
    assert.equal(hasLegacySaveToImport('new-account'), false);
  });
});

test('Google Street View embed uses the Google Maps key and latitude-longitude order', () => {
  const url = new URL(buildGoogleStreetViewEmbedUrl(' maps-key ', [-73.9857, 40.7484]) ?? '');
  assert.equal(url.origin, 'https://www.google.com');
  assert.equal(url.pathname, '/maps/embed/v1/streetview');
  assert.equal(url.searchParams.get('key'), 'maps-key');
  assert.equal(url.searchParams.get('location'), '40.7484,-73.9857');
  assert.equal(url.searchParams.get('language'), 'pt-BR');
});

test('Google Street View embed falls back cleanly when its key or coordinates are invalid', () => {
  assert.equal(buildGoogleStreetViewEmbedUrl('', [-73.9857, 40.7484]), null);
  assert.equal(buildGoogleStreetViewEmbedUrl('maps-key', [-73.9857, 95]), null);
});

test('Google Maps satellite embed follows the selected coordinates', () => {
  const url = new URL(buildGoogleMapsViewEmbedUrl(' maps-key ', [-73.973, 40.7749]) ?? '');
  assert.equal(url.origin, 'https://www.google.com');
  assert.equal(url.pathname, '/maps/embed/v1/view');
  assert.equal(url.searchParams.get('key'), 'maps-key');
  assert.equal(url.searchParams.get('center'), '40.7749,-73.973');
  assert.equal(url.searchParams.get('maptype'), 'satellite');
  assert.equal(url.searchParams.get('language'), 'pt-BR');
});

test('Google Maps satellite embed rejects missing keys and invalid coordinates', () => {
  assert.equal(buildGoogleMapsViewEmbedUrl('', [-73.973, 40.7749]), null);
  assert.equal(buildGoogleMapsViewEmbedUrl('maps-key', [-73.973, 91]), null);
});

test('Google Maps satellite fallback stays embedded when no API key is configured', () => {
  const url = new URL(buildGoogleMapsFallbackEmbedUrl([-73.9857, 40.7484]) ?? '');
  assert.equal(url.origin, 'https://maps.google.com');
  assert.equal(url.searchParams.get('q'), '40.7484,-73.9857');
  assert.equal(url.searchParams.get('t'), 'k');
  assert.equal(url.searchParams.get('output'), 'embed');
  assert.equal(buildGoogleMapsFallbackEmbedUrl([Number.NaN, 40.7484]), null);
});

test('New York arrival and mission point to their corresponding map locations', () => {
  const newYork = actionStreetData.states.find((city) => city.id === 'ny');
  assert.ok(newYork);
  const arrivalSpot = newYork.spots.find((spot) => spot.id === newYork.arrivalSpotId);
  const missionSpot = newYork.spots.find((spot) => spot.id === newYork.mission.locationSpotId);
  assert.equal(arrivalSpot?.id, 'jfk-airport');
  assert.deepEqual(arrivalSpot?.coordinates, [-73.7826336, 40.6447978]);
  assert.equal(missionSpot?.id, 'times-square');
});

test('lobby limits locked destinations to four until the rest are revealed', () => {
  const cities = Array.from({ length: 8 }, (_, index) => ({ id: `city-${index}` }));
  const visible = getVisibleDestinationIds(cities, ['city-0', 'city-1'], 'city-7', false);
  const allVisible = getVisibleDestinationIds(cities, ['city-0', 'city-1'], 'city-1', true);
  assert.deepEqual(visible, ['city-0', 'city-1', 'city-2', 'city-3', 'city-4', 'city-7']);
  assert.equal(allVisible.length, cities.length);
});

test('visa onboarding stores completion and passport stamps per account locally', () => {
  const previousWindow = globalThis.window;
  const stored = new Map<string, string>();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => stored.get(key) ?? null,
        setItem: (key: string, value: string) => stored.set(key, value),
      },
    },
  });
  try {
    const record = {
      hasCompletedOnboarding: true as const,
      purpose: 'tourism' as const,
      intendedStay: '2-weeks' as const,
      destination: 'new-york-city' as const,
      visaApprovedAt: 1_000,
      admittedAt: 2_000,
    };
    assert.notEqual(visaOnboardingStorageKey('auth-user-1'), visaOnboardingStorageKey('auth-user-2'));
    assert.equal(hasCompletedVisaOnboarding('auth-user-1'), false);
    assert.equal(saveVisaOnboardingRecord('auth-user-1', record), true);
    assert.equal(stored.get(visaOnboardingCompletedKey('auth-user-1')), 'true');
    assert.equal(hasCompletedVisaOnboarding('auth-user-1'), true);
    assert.deepEqual(loadVisaOnboardingRecord('auth-user-1'), record);
    assert.equal(hasCompletedVisaOnboarding('auth-user-2'), false);
    stored.set(visaOnboardingStorageKey('auth-user-2'), JSON.stringify({ ...record, hasCompletedOnboarding: false }));
    stored.set(visaOnboardingCompletedKey('auth-user-2'), 'true');
    assert.equal(hasCompletedVisaOnboarding('auth-user-2'), false);
    assert.equal(loadVisaOnboardingRecord('auth-user-2'), null);
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, 'window', { configurable: true, value: previousWindow });
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

test('visa onboarding interview data includes the DS-160 checks and JFK question', () => {
  assert.equal(visaInterviewData.ds160.purposeOptions.length, 2);
  assert.equal(visaInterviewData.ds160.stayOptions.length, 3);
  assert.equal(visaInterviewData.consularInterview.questions.length, 3);
  assert.ok(visaInterviewData.consularInterview.questions.every((question) => question.options.length > 1));
  assert.ok(visaInterviewData.airportImmigration.options.some((option) => option.correct));
});

test('visa interview prompts have local translations for each clickable word', () => {
  const prompts = [
    ...visaInterviewData.consularInterview.questions.map((question) => question.prompt.replace(/\{\{[^}]+\}\}/g, '')),
    visaInterviewData.airportImmigration.prompt,
  ];
  const words = new Set(
    prompts.flatMap((prompt) => prompt.split(/\s+/).map((token) => token.toLowerCase().replace(/[^a-z']/g, ''))).filter(Boolean)
  );
  for (const word of words) {
    assert.ok(visaInterviewData.wordTranslations[word] || lookupDictionary(word), `Missing local translation for "${word}"`);
  }
});

test('consular purpose and stay responses must match the DS-160 selections', () => {
  const answers = { purpose: 'tourism' as const, intendedStay: '2-weeks' as const };
  assert.equal(matchesDs160Answer('purpose', 'tourism', answers), true);
  assert.equal(matchesDs160Answer('purpose', 'business', answers), false);
  assert.equal(matchesDs160Answer('stayDuration', '2-weeks', answers), true);
  assert.equal(matchesDs160Answer('stayDuration', '10-days', answers), false);
  assert.equal(matchesDs160Answer('unknown', 'tourism', answers), false);
});

test('Google Maps Street View link opens the selected coordinates without an embed key', () => {
  const url = new URL(buildGoogleMapsStreetViewUrl([-73.9857, 40.7484]));
  assert.equal(url.origin, 'https://www.google.com');
  assert.equal(url.searchParams.get('api'), '1');
  assert.equal(url.searchParams.get('map_action'), 'pano');
  assert.equal(url.searchParams.get('viewpoint'), '40.7484,-73.9857');
});

test('first-mission intro completion is stored per user without putting profile data in the key', () => {
  const stored = new Map<string, string>();
  const previousWindow = globalThis.window;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => stored.get(key) ?? null,
        setItem: (key: string, value: string) => stored.set(key, value),
      },
    },
  });

  try {
    const aliceKey = firstMissionIntroStorageKey('auth-user-1');
    const bobKey = firstMissionIntroStorageKey('auth-user-2');
    assert.notEqual(aliceKey, bobKey);
    assert.equal(aliceKey.includes('@'), false);
    assert.equal(hasSeenFirstMissionIntro('auth-user-1'), false);
    assert.equal(shouldShowFirstMissionIntro('auth-user-1', 'ny'), true);
    assert.equal(shouldShowFirstMissionIntro('auth-user-1', 'boston'), false);
    assert.equal(shouldShowFirstMissionIntro(null, 'ny'), false);
    markFirstMissionIntroSeen('auth-user-1');
    assert.equal(hasSeenFirstMissionIntro('auth-user-1'), true);
    assert.equal(shouldShowFirstMissionIntro('auth-user-1', 'ny'), false);
    assert.equal(hasSeenFirstMissionIntro('auth-user-2'), false);
  } finally {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: previousWindow,
    });
  }
});

test('nearest airport lookup chooses the closest named OpenStreetMap airport', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    elements: [
      { center: { lat: 10.1, lon: 10.1 }, tags: { name: 'Airport Far', iata: 'FAR' } },
      { lat: 10.01, lon: 10.01, tags: { name: 'Airport Near', iata: 'NEA' } },
    ],
  }), { status: 200 });

  try {
    assert.deepEqual(await findNearestAirport([10, 10]), {
      name: 'Airport Near',
      coordinates: [10.01, 10.01],
      iataCode: 'NEA',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('profile-city airport lookup geocodes only the supplied city and country', async () => {
  const originalFetch = globalThis.fetch;
  const requests: URL[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    requests.push(url);
    if (url.hostname === 'nominatim.openstreetmap.org') {
      return new Response(JSON.stringify([{ lat: '-8.05', lon: '-34.9' }]), { status: 200 });
    }
    return new Response(JSON.stringify({
      elements: [{ lat: -8.13, lon: -34.92, tags: { name: 'Aeroporto do Recife', iata: 'REC' } }],
    }), { status: 200 });
  };

  try {
    assert.deepEqual(await findProfileCityAirport({ city: 'Recife', country: 'Brasil' }), {
      name: 'Aeroporto do Recife',
      coordinates: [-34.92, -8.13],
      iataCode: 'REC',
    });
    assert.equal(requests.length, 2);
    assert.equal(requests[0].searchParams.get('q'), 'Recife, Brasil');
    assert.equal(requests[1].hostname, 'overpass-api.de');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('device location is read only after the caller requests it and permission errors are surfaced', async () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      geolocation: {
        getCurrentPosition: (success: (position: GeolocationPosition) => void) => {
          success({ coords: { longitude: -46.6, latitude: -23.5 } } as GeolocationPosition);
        },
      },
    },
  });

  try {
    assert.deepEqual(await getCurrentCoordinates(), [-46.6, -23.5]);
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        geolocation: {
          getCurrentPosition: (_success: unknown, error: (reason: GeolocationPositionError) => void) => {
            error({ message: 'Permissão negada' } as GeolocationPositionError);
          },
        },
      },
    });
    await assert.rejects(getCurrentCoordinates(), /Permissão negada/);
  } finally {
    if (originalDescriptor) Object.defineProperty(globalThis, 'navigator', originalDescriptor);
    else Reflect.deleteProperty(globalThis, 'navigator');
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
