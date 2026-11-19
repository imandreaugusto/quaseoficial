import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Backpack, BookOpen, Coins, Lock, MapPin, Plane, Sparkles } from 'lucide-react';
import gsap from 'gsap';
import actionStreetData from '../../../data/actionStreetData.json';
import { journeyStore, type CameraSnapshot } from '../../../lib/actionStreet/journeyStore';
import { getVisibleDestinationIds, MAX_VISIBLE_LOCKED_DESTINATIONS } from '../../../lib/actionStreet/destinationVisibility';
import { persistenceManager } from '../../../lib/actionStreet/persistenceManager';
import { getVisaStatus } from '../../../lib/actionStreet/visa';
import { useActionStreet } from '../ActionStreetContext';
import LobbyMap from '../Map3D/LobbyMap';
import PassportModal, { type PassportHighlight, type PassportTab } from '../Modals/PassportModal';
import VisaNotice from '../Modals/VisaNotice';
import VisaRenewalQuiz from '../Modals/VisaRenewalQuiz';
import { glass } from '../shared/glass';
import StreakChip from '../shared/StreakChip';
import ResumeBanner from './ResumeBanner';
import ActionStreetPushReminders from '../ActionStreetPushReminders';

interface Props {
  onBoard: (cityId: string, spotId?: string) => void;
  onWalk: (cityId: string) => void;
  onClose: () => void;
  initialCamera?: CameraSnapshot;
  resume?: { cityName: string; missionStep?: { current: number; total: number }; onContinue: () => void; onDismiss: () => void };
  legacyImportNotice?: string;
}

const origin = {
  name: actionStreetData.originHub.name,
  coordinates: actionStreetData.originHub.coordinates as [number, number],
};

export default function LobbyEmbarque({ onBoard, onWalk, onClose, initialCamera, resume, legacyImportNotice }: Props) {
  const { state, updateState, allCities, profile } = useActionStreet();
  const [selectedId, setSelectedId] = useState(() => (state.unlockedCities.includes(state.currentCity) ? state.currentCity : 'ny'));
  const [confirmUnlock, setConfirmUnlock] = useState(false);
  const [passportTab, setPassportTab] = useState<PassportTab | null>(null);
  const [passportHighlight, setPassportHighlight] = useState<PassportHighlight | undefined>();
  const [renewingCityId, setRenewingCityId] = useState<string | null>(null);
  const [showAllLockedCities, setShowAllLockedCities] = useState(false);
  const boardingCardRef = useRef<HTMLElement>(null);
  const boardingContext = useRef<gsap.Context | null>(null);
  const lockedCitiesTimer = useRef<number | null>(null);

  const selected = allCities.find((city) => city.id === selectedId) ?? allCities[0];
  const isUnlocked = state.unlockedCities.includes(selected.id);
  const missing = Math.max(0, selected.unlockCost - state.balance);
  const completed = state.completedMissions.includes(selected.mission.id);
  const visa = getVisaStatus(state, selected.id);
  const lockedCities = allCities.filter((city) => !state.unlockedCities.includes(city.id));
  const visibleCityIds = useMemo(
    () => getVisibleDestinationIds(allCities, state.unlockedCities, selected.id, showAllLockedCities),
    [allCities, state.unlockedCities, selected.id, showAllLockedCities]
  );

  useEffect(() => () => {
    boardingContext.current?.revert();
    if (lockedCitiesTimer.current !== null) window.clearTimeout(lockedCitiesTimer.current);
  }, []);

  const select = (cityId: string) => {
    setSelectedId(cityId);
    setConfirmUnlock(false);
  };

  const revealLockedCities = () => {
    setShowAllLockedCities(true);
    if (lockedCitiesTimer.current !== null) window.clearTimeout(lockedCitiesTimer.current);
    lockedCitiesTimer.current = window.setTimeout(() => {
      setShowAllLockedCities(false);
      lockedCitiesTimer.current = null;
    }, 10_000);
  };

  const unlock = () => {
    if (!confirmUnlock) {
      setConfirmUnlock(true);
      return;
    }
    updateState((previous) => persistenceManager.unlockCity(previous, selected.id, selected.unlockCost));
    setConfirmUnlock(false);
    const card = boardingCardRef.current;
    if (card) {
      boardingContext.current?.revert();
      boardingContext.current = gsap.context(() => {
        gsap.fromTo(card, { scale: 0.97 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
      }, card);
    }
  };

  return (
    <div className="absolute inset-0 text-white">
      <LobbyMap
        cities={allCities}
        unlocked={state.unlockedCities}
        visibleCityIds={visibleCityIds}
        selectedId={selected.id}
        origin={origin}
        onSelect={select}
        initialCamera={initialCamera}
        onCameraChange={(camera) => journeyStore.patch({ lobbyCamera: camera }, profile?.userId)}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-slate-950/80 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-slate-950/85 to-transparent" />

      <header className="absolute inset-x-0 top-[4.25rem] z-10 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onClose} aria-label="Sair do Action Street" className={glass.iconButton}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className={glass.label}>Brazilian in Action</p>
            <h1 className="flex items-center gap-2 text-2xl font-black leading-tight">
              <MapPin className="h-6 w-6 text-blue-300" />
              Action Street
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className={`${glass.chip} flex items-center gap-2 px-4 py-2`} aria-label={`Saldo: ${state.balance} Action Dollars`}>
            <Coins className="h-4 w-4 text-amber-300" />
            <span className="text-sm font-black tabular-nums">{state.balance}</span>
            <span className={`${glass.label} hidden sm:inline`}>Action Dollars</span>
          </div>
          <StreakChip count={state.streak.count} />
          <button
            type="button"
            onClick={() => setPassportTab('stamps')}
            aria-label="Rever Visto/Passaporte"
            title="Rever Visto/Passaporte"
            className={glass.iconButton}
          >
            <BookOpen className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => setPassportTab('backpack')} aria-label="Abrir coleção e descobertas" className={glass.iconButton}>
            <Backpack className="h-5 w-5" />
          </button>
        </div>
      </header>

      {legacyImportNotice && (
        <p role="status" aria-live="polite" className={`absolute left-4 right-4 top-[8.25rem] z-10 mx-auto max-w-xl p-3 text-xs text-sky-50 sm:left-1/2 sm:right-auto sm:w-[min(34rem,calc(100vw-2rem))] sm:-translate-x-1/2 ${glass.panelOverImagery}`}>
          {legacyImportNotice}
        </p>
      )}

      <section className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-3 p-4 sm:p-6">
        {resume && <ResumeBanner cityName={resume.cityName} missionStep={resume.missionStep} onContinue={resume.onContinue} onDismiss={resume.onDismiss} />}

        <div className="space-y-1">
          <div className="flex max-w-full flex-nowrap gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Destinos">
            {allCities.filter((city) => visibleCityIds.includes(city.id)).map((city) => {
              const open = state.unlockedCities.includes(city.id);
              return (
                <button
                  key={city.id}
                  type="button"
                  role="tab"
                  aria-selected={city.id === selected.id}
                  onClick={() => select(city.id)}
                  className={`inline-flex shrink-0 items-center gap-2 px-4 py-2 text-xs font-bold transition ${glass.chip} ${
                    city.id === selected.id ? glass.chipActive : 'text-white/75 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  {open ? <MapPin className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  {city.stateName}
                  {!open && <span className="text-amber-300">{city.unlockCost}</span>}
                </button>
              );
            })}
          </div>
          {lockedCities.length > MAX_VISIBLE_LOCKED_DESTINATIONS && (
            <button
              type="button"
              onClick={revealLockedCities}
              disabled={showAllLockedCities}
              className="rounded-full border border-white/15 bg-slate-950/70 px-3 py-1.5 text-xs font-bold text-white/80 transition hover:bg-white/10 disabled:cursor-default disabled:text-white/55"
            >
              {showAllLockedCities
                ? 'Todos os locais bloqueados estão visíveis por 10 segundos'
                : `Ver os outros ${lockedCities.length - MAX_VISIBLE_LOCKED_DESTINATIONS} locais bloqueados`}
            </button>
          )}
        </div>

        <article ref={boardingCardRef} data-boarding-card className={`relative overflow-hidden p-5 sm:p-6 ${glass.panel}`}>

          <div className="relative grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
            <div className="min-w-0">
              <div className="flex items-center gap-3 text-sm font-bold text-white/70">
                <span>{origin.name.split(',')[0]}</span>
                <Plane className="h-4 w-4 text-blue-300" />
                <span className="text-white">{selected.city}</span>
              </div>
              <h2 className="mt-1 text-2xl font-black sm:text-3xl">{selected.stateName}</h2>
              <p className="mt-1 max-w-xl text-sm text-white/70">
                {isUnlocked
                  ? `${selected.touristGuide.title} · ${selected.hotspots.length} palavras para coletar · missão "${selected.mission.title}"`
                  : 'Destino bloqueado. Junte Action Dollars explorando outros lugares e fazendo missões.'}
              </p>
              {completed && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                  <Sparkles className="h-3.5 w-3.5" /> Missão concluída · carimbo conquistado
                </p>
              )}
              {visa.expired && (
                <div className="mt-3 max-w-xl">
                  <VisaNotice stateName={selected.stateName} days={visa.daysSince} onRenew={() => setRenewingCityId(selected.id)} />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 md:min-w-64">
              {isUnlocked ? (
                <>
                  <button type="button" onClick={() => onBoard(selected.id)} className={glass.primaryButton}>
                    <Plane className="h-5 w-5" />
                    Embarcar para {selected.stateName}
                  </button>
                  <button type="button" onClick={() => onWalk(selected.id)} className={glass.secondaryButton}>
                    <MapPin className="h-5 w-5" />
                    Walk the Streets
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={unlock} disabled={missing > 0} className={glass.primaryButton}>
                    <Lock className="h-5 w-5" />
                    {confirmUnlock ? `Confirmar · −${selected.unlockCost}` : `Desbloquear por ${selected.unlockCost}`}
                  </button>
                  {missing > 0 ? (
                    <p className="text-center text-xs font-semibold text-amber-200">Faltam {missing} Action Dollars</p>
                  ) : (
                    confirmUnlock && (
                      <button type="button" onClick={() => setConfirmUnlock(false)} className={`${glass.secondaryButton} py-2 text-xs`}>
                        Cancelar
                      </button>
                    )
                  )}
                </>
              )}
              <ActionStreetPushReminders />
            </div>
          </div>
        </article>

      </section>

      {passportTab && (
        <PassportModal
          initialTab={passportTab}
          highlight={passportHighlight}
          onClose={() => {
            setPassportTab(null);
            setPassportHighlight(undefined);
          }}
          onExploreSpot={(cityId, spotId) => {
            setPassportTab(null);
            setPassportHighlight(undefined);
            onBoard(cityId, spotId);
          }}
        />
      )}
      {renewingCityId && (
        <div className="absolute inset-0 z-50">
          <VisaRenewalQuiz
            cityId={renewingCityId}
            onClose={() => setRenewingCityId(null)}
            onRenewed={(stampId) => {
              setRenewingCityId(null);
              setPassportHighlight({ stampId, kind: 'renew' });
              setPassportTab('stamps');
            }}
          />
        </div>
      )}
    </div>
  );
}
