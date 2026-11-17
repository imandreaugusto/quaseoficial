import { createContext, useContext } from 'react';
import type { ActionStreetState, City, SpeechRate } from '../../types/actionStreet';

export type ActionStreetActivityKind =
  | 'travel'
  | 'collectible'
  | 'correct-answer'
  | 'wrong-answer'
  | 'mission-complete'
  | 'photo'
  | 'dialogue'
  | 'challenge';

export interface ActionStreetActivity {
  id: number;
  kind: ActionStreetActivityKind;
  cityId: string;
  spotId?: string;
  elapsedMs?: number;
  at: number;
}

export interface ActionStreetProfile {
  userId: string;
  firstName: string;
  lastName: string;
  city: string;
  country: string;
}

export interface ActionStreetContextType {
  state: ActionStreetState;
  updateState: (updater: (previous: ActionStreetState) => ActionStreetState) => void;
  getCityData: (cityId: string) => City | undefined;
  allCities: City[];
  profile: ActionStreetProfile | null;
  activity: ActionStreetActivity | null;
  reportActivity: (kind: ActionStreetActivityKind, cityId: string, spotId?: string, elapsedMs?: number) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  speechRate: SpeechRate;
  setSpeechRate: (rate: SpeechRate) => void;
}

export const ActionStreetContext = createContext<ActionStreetContextType | undefined>(undefined);

export const useActionStreet = () => {
  const context = useContext(ActionStreetContext);
  if (!context) {
    throw new Error('useActionStreet must be used within ActionStreet');
  }
  return context;
};
