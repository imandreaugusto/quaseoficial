import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { SpeechRate } from '../../types/actionStreet';
import type { UserProfile } from '../../types';
import { journeyStore } from '../../lib/actionStreet/journeyStore';
import { persistenceManager } from '../../lib/actionStreet/persistenceManager';
import { actionStreetCities } from '../../data/actionStreetCities';
import { useActionStreetStore } from './useActionStreetStore';
import { hasLegacySaveToImport, importLegacySave, recordLegacySaveDecision } from '../../lib/actionStreet/legacySave';
import { refreshChallengeTickets } from '../../lib/actionStreet/progression';
import { ActionStreetContext, type ActionStreetActivity, type ActionStreetActivityKind, type ActionStreetContextType } from './ActionStreetContext';
import LobbyEmbarque from './Lobby/LobbyEmbarque';
import StreetViewer360, { type StreetResume } from './StreetViewer360/StreetViewer360';
import Map3DExplorer from './Map3D/Map3DExplorer';
import ActionStreetInfo from './ActionStreetInfo';
import { glass } from './shared/glass';
import VisaOnboardingModal from './VisaOnboardingModal';

interface Props {
  onClose?: () => void;
  currentUser: Pick<
    UserProfile,
    'id' | 'auth_user_id' | 'full_name' | 'first_name' | 'last_name' | 'profile_city' | 'profile_country' | 'ip_city' | 'ip_country' | 'photo_url'
  > | null;
}

type ViewType = 'lobby' | 'map3d' | 'street360';

const cities = actionStreetCities;

export default function ActionStreet({ onClose, currentUser }: Props) {
  const fullNameParts = currentUser?.full_name?.trim().split(/\s+/).filter(Boolean) ?? [];
  const profile = currentUser
    ? {
        userId: currentUser.auth_user_id || currentUser.id,
        firstName: currentUser.first_name?.trim() || fullNameParts[0] || '',
        lastName: currentUser.last_name?.trim() || fullNameParts.slice(1).join(' '),
        city: currentUser.profile_city?.trim() || '',
        country: currentUser.profile_country?.trim() || '',
        ipCity: currentUser.ip_city?.trim() || '',
        ipCountry: currentUser.ip_country?.trim() || '',
        photoUrl: currentUser.photo_url?.trim() || undefined,
      }
    : null;
  const userId = profile?.userId;
  const {
    state,
    updateState,
    savedJourney,
    setSavedJourney,
    saveError,
    visaOnboardingUserId,
    hasCompletedOnboarding,
    completeVisaOnboarding,
  } = useActionStreetStore(userId);
  const savedStreetJourney = visaOnboardingUserId === userId
    && hasCompletedOnboarding
    && savedJourney?.view === 'street360'
    && state.unlockedCities.includes(savedJourney.cityId)
    && cities.some((city) => city.id === savedJourney.cityId)
    ? savedJourney
    : null;
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [speechRate, setSpeechRate] = useState<SpeechRate>(1);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [view, setView] = useState<ViewType>(() => savedStreetJourney ? 'street360' : 'lobby');
  const [selectedCity, setSelectedCity] = useState<string>(() => savedStreetJourney?.cityId ?? 'ny');
  const [streetResume, setStreetResume] = useState<StreetResume | null>(() => savedStreetJourney
    ? { spotId: savedStreetJourney.spotId, openMission: savedStreetJourney.mission?.open === true }
    : null);
  const [visaOnboardingOpen, setVisaOnboardingOpen] = useState(() => Boolean(userId && !hasCompletedOnboarding));
  const [visaArrivalPrepared, setVisaArrivalPrepared] = useState(false);
  const [visaArrivalTransitioning, setVisaArrivalTransitioning] = useState(false);
  const [showLegacyImport, setShowLegacyImport] = useState(() => Boolean(userId && hasLegacySaveToImport(userId)));
  const [legacyImportNotice, setLegacyImportNotice] = useState('');
  const [activity, setActivity] = useState<ActionStreetActivity | null>(null);
  const activitySequence = useRef(0);
  const restoredUserId = useRef(userId);

  useEffect(() => {
    if (showLegacyImport) return;
    updateState((previous) => persistenceManager.registerDailyVisit(previous));
  }, [showLegacyImport, updateState]);

  useEffect(() => {
    if (!userId) return;
    setShowLegacyImport(hasLegacySaveToImport(userId));
  }, [userId]);

  useEffect(() => {
    if (!userId || visaOnboardingUserId !== userId) return;
    if (!hasCompletedOnboarding) setVisaOnboardingOpen(true);
    else setVisaOnboardingOpen(false);
  }, [userId, visaOnboardingUserId]);

  useEffect(() => {
    if (!userId || visaOnboardingUserId !== userId || restoredUserId.current === userId) return;
    restoredUserId.current = userId;
    if (
      !hasCompletedOnboarding
      || savedJourney?.view !== 'street360'
      || !state.unlockedCities.includes(savedJourney.cityId)
      || !cities.some((city) => city.id === savedJourney.cityId)
    ) return;
    setSelectedCity(savedJourney.cityId);
    setStreetResume({ spotId: savedJourney.spotId, openMission: savedJourney.mission?.open === true });
    setView('street360');
  }, [userId, visaOnboardingUserId]);

  useEffect(() => {
    if (showLegacyImport) return;
    updateState((previous) => {
      const tickets = refreshChallengeTickets(previous.tickets);
      return tickets.available === previous.tickets.available && tickets.lastRefillAt === previous.tickets.lastRefillAt
        ? previous
        : { ...previous, tickets };
    });
  }, [showLegacyImport, updateState]);
  const reportActivity = useCallback((kind: ActionStreetActivityKind, cityId: string, spotId?: string, elapsedMs?: number) => {
    activitySequence.current += 1;
    setActivity({ id: activitySequence.current, kind, cityId, spotId, elapsedMs, at: Date.now() });
  }, []);

  const contextValue = useMemo<ActionStreetContextType>(
    () => ({
      state,
      updateState,
      getCityData: (cityId: string) => cities.find((city) => city.id === cityId),
      allCities: cities,
      profile,
      activity,
      reportActivity,
      soundEnabled,
      setSoundEnabled,
      speechRate,
      setSpeechRate,
      saveError,
    }),
    [state, updateState, profile?.userId, profile?.firstName, profile?.lastName, profile?.city, profile?.country, profile?.ipCity, profile?.ipCountry, activity, reportActivity, soundEnabled, speechRate, saveError]
  );

  const resumableCity =
    savedJourney && savedJourney.view !== 'lobby' && !bannerDismissed && state.unlockedCities.includes(savedJourney.cityId)
      ? cities.find((city) => city.id === savedJourney.cityId)
      : undefined;

  const goTo = (nextView: ViewType, cityId?: string) => {
    if (cityId) setSelectedCity(cityId);
    setView(nextView);
    journeyStore.patch({ view: nextView, ...(cityId ? { cityId } : {}) }, userId);
  };

  const continueJourney = () => {
    if (!savedJourney || !resumableCity) return;
    setStreetResume({ spotId: savedJourney.spotId, openMission: savedJourney.mission?.open === true });
    setBannerDismissed(true);
    goTo('street360', resumableCity.id);
  };

  const dismissJourney = () => {
    setBannerDismissed(true);
    journeyStore.patch({ view: 'lobby' }, userId);
  };

  const chooseLegacyImport = (shouldImport: boolean) => {
    if (!userId) return;
    if (shouldImport) {
      const imported = importLegacySave(userId);
    if (imported.state) updateState(() => imported.state!);
      if (imported.journey) setSavedJourney(imported.journey);
      setLegacyImportNotice(imported.state || imported.journey
        ? 'Progresso antigo copiado para esta conta. O save original continua neste navegador.'
        : 'Não foi possível importar o save antigo. Seu progresso novo continuará separado.');
      if (!imported.state && !imported.journey) {
        setShowLegacyImport(false);
        return;
      }
      recordLegacySaveDecision(userId, 'imported');
    } else {
      recordLegacySaveDecision(userId, 'skipped');
      setLegacyImportNotice('Vamos começar com um save separado. O progresso antigo foi preservado neste navegador.');
    }
    setShowLegacyImport(false);
  };

  const boardCity = (cityId: string, spotId?: string) => {
    setStreetResume(spotId ? { spotId } : null);
    goTo('map3d', cityId);
  };

  const exploreSpot = (cityId: string, spotId: string) => {
    setStreetResume({ spotId });
    goTo('street360', cityId);
  };

  const saveVisaOnboarding = useCallback((record: Parameters<typeof completeVisaOnboarding>[0]): boolean => {
    if (!journeyStore.patch({ view: 'street360', cityId: 'ny', spotId: 'jfk-airport' }, userId)) return false;
    if (!completeVisaOnboarding(record)) return false;
    setStreetResume({ spotId: 'jfk-airport' });
    setSelectedCity('ny');
    setVisaArrivalPrepared(true);
    return true;
  }, [completeVisaOnboarding, userId]);

  // Portal no body: os wrappers de página do App animam transform, o que prenderia o "fixed" ao wrapper.
  return createPortal(
    <ActionStreetContext.Provider value={contextValue}>
      <div className="fixed inset-0 z-30 overflow-hidden bg-slate-950">
        <ActionStreetInfo />
        {saveError && (
          <div role="alert" className="absolute left-1/2 top-2 z-[100] w-[min(34rem,calc(100%-1rem))] -translate-x-1/2 rounded-xl border border-rose-300/50 bg-slate-950/95 px-4 py-3 text-center text-xs font-semibold text-rose-100 shadow-xl">
            {saveError}
          </div>
        )}
        {view === 'lobby' && showLegacyImport && profile && (
          <div className={`absolute inset-0 z-[80] flex items-center justify-center p-4 ${glass.backdrop}`}>
            <section role="dialog" aria-modal="true" aria-labelledby="legacy-save-title" className={`w-full max-w-lg p-6 text-white ${glass.modal}`}>
              <p className={glass.label}>Action Street · save antigo</p>
              <h2 id="legacy-save-title" className="mt-1 text-xl font-black">Encontramos um progresso anterior neste navegador</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/75">
                Você pode copiar esse progresso para esta conta ou começar um save individual. A cópia original não será apagada; saves novos ficam separados por conta neste navegador e não são sincronizados entre dispositivos.
              </p>
              {legacyImportNotice && <p className="mt-3 text-xs text-sky-100" role="status">{legacyImportNotice}</p>}
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => chooseLegacyImport(true)} className={glass.primaryButton}>Importar uma cópia</button>
                <button type="button" onClick={() => chooseLegacyImport(false)} className={glass.secondaryButton}>Começar save individual</button>
              </div>
            </section>
          </div>
        )}
        {view === 'lobby' && (
          <LobbyEmbarque
            onBoard={boardCity}
            onWalk={(cityId) => {
              const saved = userId ? journeyStore.load(userId) : null;
              setStreetResume(saved?.cityId === cityId && saved.spotId
                ? { spotId: saved.spotId, openMission: saved.mission?.open === true }
                : null);
              goTo('street360', cityId);
            }}
            onClose={() => onClose?.()}
            initialCamera={savedJourney?.lobbyCamera}
            resume={resumableCity ? { cityName: resumableCity.city, onContinue: continueJourney, onDismiss: dismissJourney } : undefined}
            legacyImportNotice={legacyImportNotice}
          />
        )}

        {view === 'map3d' && (
          <Map3DExplorer
            key={selectedCity}
            cityId={selectedCity}
            onComplete={() => goTo('street360')}
            onBack={() => goTo('lobby')}
          />
        )}

        {(view === 'street360' || visaArrivalPrepared) && (
          <div className={`absolute inset-0 transition-opacity duration-700 ${view === 'street360' || visaArrivalTransitioning ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}>
          <StreetViewer360
            cityId={selectedCity}
            resume={streetResume ?? undefined}
            onBack={() => goTo('lobby')}
            onExploreSpot={exploreSpot}
          />
          </div>
        )}

        {view === 'lobby'
          && !showLegacyImport
          && profile
          && visaOnboardingUserId === userId
          && (visaOnboardingOpen || !hasCompletedOnboarding) && (
          <VisaOnboardingModal
            profile={profile}
            onSave={saveVisaOnboarding}
            onBeginArrival={() => setVisaArrivalTransitioning(true)}
            onComplete={() => {
              setVisaOnboardingOpen(false);
              setVisaArrivalPrepared(false);
              setStreetResume({ spotId: 'jfk-airport' });
              setSelectedCity('ny');
              setView('street360');
              journeyStore.patch({ view: 'street360', cityId: 'ny', spotId: 'jfk-airport' }, userId);
            }}
          />
        )}
      </div>
    </ActionStreetContext.Provider>,
    document.body
  );
}
