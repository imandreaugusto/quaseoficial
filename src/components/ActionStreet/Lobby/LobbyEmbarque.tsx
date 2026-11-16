import { useState } from 'react';
import { ArrowLeft, Backpack, BookOpen, Coins, Lock, MapPin, Plane, Sparkles } from 'lucide-react';
import gsap from 'gsap';
import actionStreetData from '../../../data/actionStreetData.json';
import { journeyStore, type CameraSnapshot } from '../../../lib/actionStreet/journeyStore';
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

interface Props {
  onBoard: (cityId: string, spotId?: string) => void;
  onClose: () => void;
  initialCamera?: CameraSnapshot;
  resume?: { cityName: string; onContinue: () => void; onDismiss: () => void };
}

const origin = {
  name: actionStreetData.originHub.name,
  coordinates: actionStreetData.originHub.coordinates as [number, number],
};

export default function LobbyEmbarque({ onBoard, onClose, initialCamera, resume }: Props) {
  const { state, updateState, allCities } = useActionStreet();
  const [selectedId, setSelectedId] = useState(() => (state.unlockedCities.includes(state.currentCity) ? state.currentCity : 'ny'));
  const [confirmUnlock, setConfirmUnlock] = useState(false);
  const [passportTab, setPassportTab] = useState<PassportTab | null>(null);
  const [passportHighlight, setPassportHighlight] = useState<PassportHighlight | undefined>();
  const [renewingCityId, setRenewingCityId] = useState<string | null>(null);

  const selected = allCities.find((city) => city.id === selectedId) ?? allCities[0];
  const isUnlocked = state.unlockedCities.includes(selected.id);
  const missing = Math.max(0, selected.unlockCost - state.balance);
  const completed = state.completedMissions.includes(selected.mission.id);
  const visa = getVisaStatus(state, selected.id);

  const select = (cityId: string) => {
    setSelectedId(cityId);
    setConfirmUnlock(false);
  };

  const unlock = () => {
    if (!confirmUnlock) {
      setConfirmUnlock(true);
      return;
    }
    updateState((previous) => persistenceManager.unlockCity(previous, selected.id, selected.unlockCost));
    setConfirmUnlock(false);
    gsap.fromTo('[data-boarding-card]', { scale: 0.97 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
  };

  return (
    <div className="absolute inset-0 text-white">
      <LobbyMap
        cities={allCities}
        unlocked={state.unlockedCities}
        selectedId={selected.id}
        origin={origin}
        onSelect={select}
        initialCamera={initialCamera}
        onCameraChange={(camera) => journeyStore.patch({ lobbyCamera: camera })}
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
          <button type="button" onClick={() => setPassportTab('stamps')} aria-label="Abrir passaporte" className={glass.iconButton}>
            <BookOpen className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => setPassportTab('backpack')} aria-label="Abrir coleção e descobertas" className={glass.iconButton}>
            <Backpack className="h-5 w-5" />
          </button>
        </div>
      </header>

      <section className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-3 p-4 sm:p-6">
        {resume && <ResumeBanner cityName={resume.cityName} onContinue={resume.onContinue} onDismiss={resume.onDismiss} />}

        <div className="flex max-w-full flex-nowrap gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Destinos">
          {allCities.map((city) => {
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

        <article data-boarding-card className={`relative overflow-hidden p-5 sm:p-6 ${glass.panel}`}>
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet-500/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />

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
                <button type="button" onClick={() => onBoard(selected.id)} className={glass.primaryButton}>
                  <Plane className="h-5 w-5" />
                  Embarcar para {selected.stateName}
                </button>
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
            </div>
          </div>
        </article>

        <p className="text-right text-[10px] text-white/55">
          Mapa ©{' '}
          <a href="https://openfreemap.org" target="_blank" rel="noreferrer" className="underline hover:text-white">OpenFreeMap</a>{' '}
          ©{' '}
          <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer" className="underline hover:text-white">OpenMapTiles</a>{' '}
          · dados ©{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline hover:text-white">OpenStreetMap</a>
        </p>
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
