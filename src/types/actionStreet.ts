export interface ActionStreetState {
  currentCity: string;
  balance: number; // Action Dollars
  unlockedCities: string[];
  souvenirs: Souvenir[];
  stamps: Stamp[];
  currentMission?: Mission;
  completedMissions: string[];
}

export interface Souvenir {
  id: string;
  icon: string; // Lucide icon name
  label: string;
  fromCity: string;
  collectedAt: number; // timestamp
}

export interface Stamp {
  id: string;
  title: string;
  subtitle: string;
  color: string;
  cityId: string;
  earnedAt: number;
}

export interface City {
  id: string;
  stateName: string;
  city: string;
  region: string;
  unlockedByDefault: boolean;
  unlockCost: number;
  weatherPreset: 'rainy' | 'golden_hour' | 'clear_day' | 'cloudy' | 'snowy';
  camera: {
    center: [number, number]; // [lng, lat]
    zoom: number;
    pitch: number;
    bearing: number;
  };
  route3D: {
    name: string;
    waypoints: [number, number][]; // [lng, lat] pairs
  };
  stamp: Stamp;
  touristGuide: {
    title: string;
    text: string;
  };
  hotspots: Hotspot[];
  mission: Mission;
}

export interface Hotspot {
  id: string;
  word: string;
  translation: string;
  phonetic: string;
  example: string;
  rewardDollars: number;
  souvenirIcon: string; // Lucide icon name
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

export interface TranslationContext {
  word: string;
  example: string;
  phonetic: string;
  translation: string;
  sourceCity?: string;
}
