import { useEffect, useState, ReactNode, createContext, useContext } from 'react';
import type { ActionStreetState, City } from '../../types/actionStreet';
import { persistenceManager } from '../../lib/actionStreet/persistenceManager';
import actionStreetData from '../../data/actionStreetData.json';
import LobbyEmbarque from './Lobby/LobbyEmbarque';
import StreetViewer360 from './StreetViewer360/StreetViewer360';
import Map3DExplorer from './Map3D/Map3DExplorer';

export interface ActionStreetContextType {
  state: ActionStreetState;
  updateState: (newState: ActionStreetState) => void;
  getCityData: (cityId: string) => City | undefined;
  allCities: City[];
}

export const ActionStreetContext = createContext<ActionStreetContextType | undefined>(undefined);

export const useActionStreet = () => {
  const context = useContext(ActionStreetContext);
  if (!context) {
    throw new Error('useActionStreet must be used within ActionStreetProvider');
  }
  return context;
};

interface Props {
  onClose?: () => void;
}

type ViewType = 'lobby' | 'map3d' | 'street360';

export default function ActionStreet({ onClose }: Props) {
  const [state, setState] = useState<ActionStreetState>(() => persistenceManager.loadState());
  const [view, setView] = useState<ViewType>('lobby');
  const [selectedCity, setSelectedCity] = useState<string>('ny');

  const cities: City[] = (actionStreetData as any).states;

  // Salvar estado quando mudar
  useEffect(() => {
    persistenceManager.saveState(state);
  }, [state]);

  const handleSelectCity = (cityId: string) => {
    setSelectedCity(cityId);
    setView('map3d');
  };

  const handleMap3DComplete = () => {
    setView('street360');
  };

  const handleBack = () => {
    setView('lobby');
  };

  const handleCloseModule = () => {
    onClose?.();
  };

  const contextValue: ActionStreetContextType = {
    state,
    updateState: setState,
    getCityData: (cityId: string) => cities.find(c => c.id === cityId),
    allCities: cities,
  };

  return (
    <ActionStreetContext.Provider value={contextValue}>
      <div className="w-full h-full bg-gradient-to-b from-slate-900 to-slate-800">
        {view === 'lobby' && (
          <LobbyEmbarque
            state={state}
            cities={cities}
            onSelectCity={handleSelectCity}
            onClose={handleCloseModule}
          />
        )}

        {view === 'map3d' && (
          <Map3DExplorer
            cityId={selectedCity}
            onComplete={handleMap3DComplete}
            onBack={handleBack}
          />
        )}

        {view === 'street360' && (
          <StreetViewer360
            cityId={selectedCity}
            state={state}
            updateState={setState}
            onBack={handleBack}
          />
        )}
      </div>
    </ActionStreetContext.Provider>
  );
}
