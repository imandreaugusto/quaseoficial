import type { ActionStreetState, City } from '../../types/actionStreet';

export const VISA_VALIDITY_MS = 72 * 60 * 60 * 1000;
export const QUIZ_PASS_SCORE = 2;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface VisaStatus {
  hasStamp: boolean;
  expired: boolean;
  daysSince: number;
}

export function getVisaStatus(state: ActionStreetState, cityId: string, now = Date.now()): VisaStatus {
  const hasStamp = state.stamps.some((stamp) => stamp.cityId === cityId);
  const record = state.visas[cityId];
  if (!hasStamp || !record) return { hasStamp, expired: false, daysSince: 0 };

  const elapsed = Math.max(0, now - record.validAt);
  return { hasStamp, expired: elapsed >= VISA_VALIDITY_MS, daysSince: Math.floor(elapsed / DAY_MS) };
}

// Visitar renova o prazo só enquanto o visto ainda vale; depois de expirado, só o quiz renova.
export function recordVisit(state: ActionStreetState, cityId: string, now = Date.now()): ActionStreetState {
  if (!state.stamps.some((stamp) => stamp.cityId === cityId)) return state;
  const expired = getVisaStatus(state, cityId, now).expired;
  const previous = state.visas[cityId];
  return {
    ...state,
    visas: {
      ...state.visas,
      [cityId]: { lastVisitedAt: now, validAt: expired && previous ? previous.validAt : now },
    },
  };
}

export function renewVisa(state: ActionStreetState, cityId: string, now = Date.now()): ActionStreetState {
  return { ...state, visas: { ...state.visas, [cityId]: { lastVisitedAt: now, validAt: now } } };
}

export interface QuizQuestion {
  id: string;
  word: string;
  phonetic: string;
  options: string[];
  correctIndex: number;
  learned: boolean;
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

// Prioriza as palavras que o aluno realmente coletou no estado; completa com as demais se faltar.
export function buildRenewalQuiz(city: City, allCities: City[], learnedSouvenirIds: ReadonlySet<string>, random: () => number = Math.random): QuizQuestion[] {
  const learned = city.hotspots.filter((hotspot) => learnedSouvenirIds.has(`${city.id}:${hotspot.id}`));
  const rest = city.hotspots.filter((hotspot) => !learned.includes(hotspot));
  const picked = [...shuffle(learned, random), ...shuffle(rest, random)].slice(0, 3);

  return picked.map((hotspot) => {
    const distractorPool = Array.from(
      new Set(
        allCities
          .flatMap((other) => other.hotspots)
          .map((other) => other.translation)
          .filter((translation) => translation !== hotspot.translation)
      )
    );
    const options = shuffle([hotspot.translation, ...shuffle(distractorPool, random).slice(0, 2)], random);
    return {
      id: hotspot.id,
      word: hotspot.word,
      phonetic: hotspot.phonetic,
      options,
      correctIndex: options.indexOf(hotspot.translation),
      learned: learned.includes(hotspot),
    };
  });
}
