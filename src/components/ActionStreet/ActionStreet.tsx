import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ActionStreetState, City } from '../../types/actionStreet';
import { journeyStore } from '../../lib/actionStreet/journeyStore';
import { persistenceManager } from '../../lib/actionStreet/persistenceManager';
import actionStreetData from '../../data/actionStreetData.json';
import { ActionStreetContext, type ActionStreetContextType } from './ActionStreetContext';
import LobbyEmbarque from './Lobby/LobbyEmbarque';
import StreetViewer360, { type StreetResume } from './StreetViewer360/StreetViewer360';
import Map3DExplorer from './Map3D/Map3DExplorer';

interface Props {
  onClose?: () => void;
}

type ViewType = 'lobby' | 'map3d' | 'street360';

const cities = (actionStreetData as unknown as { states: City[] }).states;

export default function ActionStreet({ onClose }: Props) {
  const [state, setState] = useState<ActionStreetState>(() => persistenceManager.loadState());
  const [savedJourney] = useState(() => journeyStore.load());
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [view, setView] = useState<ViewType>('lobby');
  const [selectedCity, setSelectedCity] = useState<string>('ny');
  const [streetResume, setStreetResume] = useState<StreetResume | null>(null);

  useEffect(() => {
    persistenceManager.saveState(state);
  }, [state]);

  useEffect(() => {
    setState((previous) => persistenceManager.registerDailyVisit(previous));
  }, []);

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

  const resumableCity =
    savedJourney && savedJourney.view !== 'lobby' && !bannerDismissed && state.unlockedCities.includes(savedJourney.cityId)
      ? cities.find((city) => city.id === savedJourney.cityId)
      : undefined;

  const goTo = (nextView: ViewType, cityId?: string) => {
    if (cityId) setSelectedCity(cityId);
    setView(nextView);
    journeyStore.patch({ view: nextView, ...(cityId ? { cityId } : {}) });
  };

  const continueJourney = () => {
    if (!savedJourney || !resumableCity) return;
    setStreetResume({ spotId: savedJourney.spotId, imageId: savedJourney.imageId, openMission: savedJourney.mission?.open === true });
    setBannerDismissed(true);
    goTo('street360', resumableCity.id);
  };

  const dismissJourney = () => {
    setBannerDismissed(true);
    journeyStore.patch({ view: 'lobby' });
  };

  // Portal no body: os wrappers de página do App animam transform, o que prenderia o "fixed" ao wrapper.
  return createPortal(
    <ActionStreetContext.Provider value={contextValue}>
      <div className="fixed inset-0 z-30 overflow-hidden bg-slate-950">
        {view === 'lobby' && (
          <LobbyEmbarque
            onBoard={(cityId) => {
              setStreetResume(null);
              goTo('map3d', cityId);
            }}
            onClose={() => onClose?.()}
            initialCamera={savedJourney?.lobbyCamera}
            resume={resumableCity ? { cityName: resumableCity.city, onContinue: continueJourney, onDismiss: dismissJourney } : undefined}
          />
        )}

        {view === 'map3d' && (
          <Map3DExplorer key={selectedCity} cityId={selectedCity} onComplete={() => goTo('street360')} onBack={() => goTo('lobby')} />
        )}

        {view === 'street360' && (
          <StreetViewer360 key={selectedCity} cityId={selectedCity} resume={streetResume ?? undefined} onBack={() => goTo('lobby')} />
        )}
      </div>
    </ActionStreetContext.Provider>,
    document.body
  );
}
