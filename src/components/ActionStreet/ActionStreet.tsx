import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ActionStreetState, City } from '../../types/actionStreet';
import { persistenceManager } from '../../lib/actionStreet/persistenceManager';
import actionStreetData from '../../data/actionStreetData.json';
import { ActionStreetContext, type ActionStreetContextType } from './ActionStreetContext';
import LobbyEmbarque from './Lobby/LobbyEmbarque';
import StreetViewer360 from './StreetViewer360/StreetViewer360';
import Map3DExplorer from './Map3D/Map3DExplorer';

interface Props {
  onClose?: () => void;
}

type ViewType = 'lobby' | 'map3d' | 'street360';

const cities = (actionStreetData as unknown as { states: City[] }).states;

export default function ActionStreet({ onClose }: Props) {
  const [state, setState] = useState<ActionStreetState>(() => persistenceManager.loadState());
  const [view, setView] = useState<ViewType>('lobby');
  const [selectedCity, setSelectedCity] = useState<string>('ny');

  useEffect(() => {
    persistenceManager.saveState(state);
  }, [state]);

  const updateState = useCallback(
    (updater: (previous: ActionStreetState) => ActionStreetState) => setState(updater),
    []
  );

  const contextValue = useMemo<ActionStreetContextType>(
    () => ({
      state,
      updateState,
      getCityData: (cityId: string) => cities.find((city) => city.id === cityId),
      allCities: cities,
    }),
    [state, updateState]
  );

  // Portal no body: os wrappers de página do App animam transform, o que prenderia o "fixed" ao wrapper.
  return createPortal(
    <ActionStreetContext.Provider value={contextValue}>
      <div className="fixed inset-0 z-30 overflow-hidden bg-slate-950">
        {view === 'lobby' && (
          <LobbyEmbarque
            onBoard={(cityId) => {
              setSelectedCity(cityId);
              setView('map3d');
            }}
            onClose={() => onClose?.()}
          />
        )}

        {view === 'map3d' && (
          <Map3DExplorer
            key={selectedCity}
            cityId={selectedCity}
            onComplete={() => setView('street360')}
            onBack={() => setView('lobby')}
          />
        )}

        {view === 'street360' && (
          <StreetViewer360 key={selectedCity} cityId={selectedCity} onBack={() => setView('lobby')} />
        )}
      </div>
    </ActionStreetContext.Provider>,
    document.body
  );
}
