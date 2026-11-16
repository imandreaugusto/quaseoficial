import { createContext, useContext } from 'react';
import type { ActionStreetState, City, SpeechRate } from '../../types/actionStreet';

export interface ActionStreetContextType {
  state: ActionStreetState;
  updateState: (updater: (previous: ActionStreetState) => ActionStreetState) => void;
  getCityData: (cityId: string) => City | undefined;
  allCities: City[];
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
