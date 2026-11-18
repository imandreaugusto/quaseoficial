import { readActionStreetSave, writeActionStreetSave } from './saveEnvelope';

const LEGACY_KEY = 'ACTION_STREET_JOURNEY';
const ACCOUNT_KEY_PREFIX = `${LEGACY_KEY}_V2_`;

const storageKey = (userId?: string) =>
  userId ? `${ACCOUNT_KEY_PREFIX}${encodeURIComponent(userId)}` : LEGACY_KEY;

export type JourneyView = 'lobby' | 'map3d' | 'street360';

export interface CameraSnapshot {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface MissionProgress {
  missionId: string;
  step: number;
  allCorrect: boolean;
  open: boolean;
}

export interface Journey {
  view: JourneyView;
  cityId: string;
  spotId?: string;
  imageId?: string;
  lobbyCamera?: CameraSnapshot;
  mission?: MissionProgress;
  savedAt: number;
}

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const isCamera = (value: unknown): value is CameraSnapshot => {
  const camera = value as CameraSnapshot | undefined;
  return (
    Boolean(camera) &&
    Array.isArray(camera!.center) &&
    camera!.center.length === 2 &&
    camera!.center.every(isFiniteNumber) &&
    isFiniteNumber(camera!.zoom) &&
    isFiniteNumber(camera!.pitch) &&
    isFiniteNumber(camera!.bearing)
  );
};

export function parseJourney(raw: string | null): Journey | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<Journey>;
    if (!value || typeof value.cityId !== 'string' || !['lobby', 'map3d', 'street360'].includes(value.view as string)) return null;
    const mission = value.mission;
    return {
      view: value.view as JourneyView,
      cityId: value.cityId,
      spotId: typeof value.spotId === 'string' ? value.spotId : undefined,
      imageId: typeof value.imageId === 'string' ? value.imageId : undefined,
      lobbyCamera: isCamera(value.lobbyCamera) ? value.lobbyCamera : undefined,
      mission:
        mission && typeof mission.missionId === 'string' && isFiniteNumber(mission.step)
          ? { missionId: mission.missionId, step: mission.step, allCorrect: mission.allCorrect !== false, open: mission.open === true }
          : undefined,
      savedAt: isFiniteNumber(value.savedAt) ? value.savedAt : 0,
    };
  } catch {
    return null;
  }
}

// Gravado direto no localStorage (fora do estado do React) para o auto-save não re-renderizar a tela.
export const journeyStore = {
  load(userId?: string): Journey | null {
    const savedJourney = readActionStreetSave(userId)?.journey;
    if (savedJourney) return parseJourney(JSON.stringify(savedJourney));
    try {
      const raw = localStorage.getItem(storageKey(userId));
      const journey = parseJourney(raw);
      if (journey) writeActionStreetSave({ journey }, userId);
      return journey;
    } catch (error) {
      console.warn('Não foi possível carregar a jornada local do Action Street.', error);
      return null;
    }
  },

  patch(partial: Partial<Journey> & { cityId?: string }, userId?: string): boolean {
    try {
      const savedJourney = readActionStreetSave(userId)?.journey;
      const current = savedJourney
        ? parseJourney(JSON.stringify(savedJourney))
        : parseJourney(localStorage.getItem(storageKey(userId)));
      const cityId = partial.cityId ?? current?.cityId;
      if (!cityId) return false;
      const next: Journey = { view: 'lobby', ...current, ...partial, cityId, savedAt: Date.now() };
      return writeActionStreetSave({ journey: next }, userId);
    } catch (error) {
      console.warn('Não foi possível salvar a jornada local do Action Street.', error);
      return false;
    }
  },

  clearMission(userId?: string): void {
    const current = journeyStore.load(userId);
    if (!current) return;
    delete current.mission;
    writeActionStreetSave({ journey: { ...current, savedAt: Date.now() } }, userId);
  },

  hasLegacyJourney(): boolean {
    try {
      return localStorage.getItem(LEGACY_KEY) !== null;
    } catch (error) {
      console.warn('Não foi possível verificar uma jornada antiga do Action Street.', error);
      return false;
    }
  },

  importLegacyJourney(userId: string): Journey | null {
    try {
      if (readActionStreetSave(userId)?.journey || localStorage.getItem(storageKey(userId)) !== null) return null;
      const legacy = parseJourney(localStorage.getItem(LEGACY_KEY));
      if (!legacy) return null;
      return writeActionStreetSave({ journey: legacy }, userId) ? legacy : null;
    } catch (error) {
      console.warn('Não foi possível importar a jornada antiga do Action Street.', error);
      return null;
    }
  },

  clear(userId?: string): void {
    try {
      localStorage.removeItem(storageKey(userId));
      writeActionStreetSave({ journey: null }, userId);
    } catch (error) {
      console.warn('Não foi possível limpar a jornada local do Action Street.', error);
    }
  },
};
