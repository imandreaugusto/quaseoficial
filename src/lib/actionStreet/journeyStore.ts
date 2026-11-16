const KEY = 'ACTION_STREET_JOURNEY';

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
  load(): Journey | null {
    try {
      return parseJourney(localStorage.getItem(KEY));
    } catch {
      return null;
    }
  },

  patch(partial: Partial<Journey> & { cityId?: string }): void {
    try {
      const current = parseJourney(localStorage.getItem(KEY));
      const cityId = partial.cityId ?? current?.cityId;
      if (!cityId) return;
      const next: Journey = { view: 'lobby', ...current, ...partial, cityId, savedAt: Date.now() };
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // storage indisponível: a viagem continua, só não é retomada depois
    }
  },

  clearMission(): void {
    const current = journeyStore.load();
    if (!current) return;
    delete current.mission;
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...current, savedAt: Date.now() }));
    } catch {
      // ignorado
    }
  },

  clear(): void {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // ignorado
    }
  },
};
