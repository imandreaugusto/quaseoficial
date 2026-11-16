export interface StreakState {
  count: number;
  best: number;
  lastDay: string | null;
}

export interface VisaRecord {
  lastVisitedAt: number;
  validAt: number;
}

export interface ActionStreetState {
  currentCity: string;
  balance: number;
  unlockedCities: string[];
  discoveredSpots: string[];
  souvenirs: Souvenir[];
  stamps: Stamp[];
  completedMissions: string[];
  streak: StreakState;
  visas: Record<string, VisaRecord>;
}

export type SpeechRate = 1 | 0.7;

export interface ActionStreetResponseEvaluation {
  isValid: boolean;
  relevance: number;
  clarity: number;
  feedback: string;
}

export interface Souvenir {
  id: string;
  icon: string;
  label: string;
  fromCity: string;
  collectedAt: number;
}

export interface Stamp {
  id: string;
  title: string;
  subtitle: string;
  color: string;
  cityId: string;
  earnedAt: number;
}

export type CityStamp = Omit<Stamp, 'cityId' | 'earnedAt'>;

export interface Spot {
  id: string;
  name: string;
  coordinates: [number, number];
  imageId?: string;
  guide?: { title: string; text: string };
}

export interface City {
  id: string;
  stateName: string;
  city: string;
  region: string;
  unlockedByDefault: boolean;
  unlockCost: number;
  weatherPreset: 'rainy' | 'golden_hour' | 'clear_day' | 'night' | 'cloudy' | 'snowy';
  camera: { center: [number, number]; zoom: number; pitch: number; bearing: number };
  route3D: { name: string; waypoints: [number, number][] };
  spots: Spot[];
  stamp: CityStamp;
  touristGuide: { title: string; text: string };
  hotspots: Hotspot[];
  mission: Mission;
}

export interface Hotspot {
  id: string;
  spotId: string;
  word: string;
  translation: string;
  phonetic: string;
  example: string;
  rewardDollars: number;
  souvenirIcon: string;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  rewardDollars: number;
  npcRole: string;
  steps: MissionStep[];
}

export interface MissionStep {
  npcLine: string;
  options: MissionOption[];
}

export interface MissionOption {
  text: string;
  isCorrect: boolean;
  feedback: string;
}
