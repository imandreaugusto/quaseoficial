import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, MessagesSquare } from 'lucide-react';
import gsap from 'gsap';
import { journeyStore } from '../../../lib/actionStreet/journeyStore';
import { persistenceManager } from '../../../lib/actionStreet/persistenceManager';
import { getVisaStatus } from '../../../lib/actionStreet/visa';
import { useActionStreet } from '../ActionStreetContext';
import PassportModal, { type PassportTab } from '../Modals/PassportModal';
import { glass } from '../shared/glass';
import VocabularyCard from '../VocabularyCard/VocabularyCard';
import HUDBottom from './HUDBottom';
import HUDTop from './HUDTop';
import MiniMap3D from './MiniMap3D';
import MissionPanel from './MissionPanel';
import StreetScene from './StreetScene';

export interface StreetResume {
  spotId?: string;
  imageId?: string;
  openMission?: boolean;
}

interface Props {
  cityId: string;
  onBack: () => void;
  resume?: StreetResume;
}

interface PassportState {
  tab: PassportTab;
  highlight?: { stampId: string; kind: 'earn' | 'renew' };
}

export default function StreetViewer360({ cityId, onBack, resume }: Props) {
  const { state, updateState, getCityData } = useActionStreet();
  const city = getCityData(cityId);
  const [spotId, setSpotId] = useState(() => city?.spots.find((spot) => spot.id === resume?.spotId)?.id ?? city?.spots[0]?.id ?? '');
  const [hotspotId, setHotspotId] = useState<string | null>(null);
  const [showMission, setShowMission] = useState(() => resume?.openMission === true);
  const [passport, setPassport] = useState<PassportState | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const traveling = useRef(false);

  useEffect(() => {
    const tween = gsap.fromTo(rootRef.current, { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1, duration: 0.9, ease: 'power2.out', clearProps: 'transform' });
    return () => {
      tween.kill();
    };
  }, []);

  useEffect(() => {
    updateState((previous) => persistenceManager.visitCity(previous, cityId));
  }, [cityId, updateState]);

  useEffect(() => {
    if (spotId) journeyStore.patch({ view: 'street360', cityId, spotId, imageId: spotId === resume?.spotId ? resume.imageId : undefined });
  }, [cityId, spotId, resume]);

  const collectedIds = useMemo(() => new Set(state.souvenirs.map((item) => item.id)), [state.souvenirs]);

  if (!city) return null;
  const spot = city.spots.find((item) => item.id === spotId) ?? city.spots[0];
  const hotspots = city.hotspots.filter((item) => item.spotId === spot.id);
  const guide = spot.guide ?? city.touristGuide;
  const missionDone = state.completedMissions.includes(city.mission.id);
  const visaExpired = getVisaStatus(state, city.id).expired;
  const anyVisaExpired = state.stamps.some((stamp) => getVisaStatus(state, stamp.cityId).expired);

  const travel = (nextSpotId: string) => {
    if (traveling.current || nextSpotId === spot.id) return;
    traveling.current = true;
    gsap.to(sceneRef.current, {
      opacity: 0,
      duration: 0.4,
      onComplete: () => {
        setSpotId(nextSpotId);
        gsap.to(sceneRef.current, {
          opacity: 1,
          duration: 0.7,
          onComplete: () => {
            traveling.current = false;
          },
        });
      },
    });
  };

  return (
    <div ref={rootRef} className="absolute inset-0 bg-slate-950 text-white">
      <div ref={sceneRef} className="absolute inset-0">
        <StreetScene
          key={spot.id}
          city={city}
          spot={spot}
          hotspots={hotspots}
          collectedIds={collectedIds}
          onHotspot={setHotspotId}
          initialImageId={spot.id === resume?.spotId ? resume.imageId : undefined}
          onImageChange={(imageId) => journeyStore.patch({ imageId })}
        />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-slate-950/70 to-transparent" />

      <HUDTop
        cityName={city.city}
        spotName={spot.name}
        balance={state.balance}
        streak={state.streak.count}
        visaAlert={anyVisaExpired}
        onBack={onBack}
        onPassport={() => setPassport({ tab: 'stamps' })}
        onBackpack={() => setPassport({ tab: 'backpack' })}
      />

      <button
        type="button"
        onClick={() => setShowMission(true)}
        className={`absolute left-4 top-[8.25rem] z-20 flex max-w-[min(20rem,calc(100vw-2rem))] items-center gap-3 px-4 py-3 text-left transition hover:bg-white/10 sm:left-6 ${glass.panelOverImagery} !rounded-2xl`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-violet-500/40">
          {missionDone ? <Check className="h-4 w-4" /> : <MessagesSquare className="h-4 w-4" />}
        </span>
        <span className="min-w-0">
          <span className={`block ${glass.label}`}>{missionDone ? 'Missão concluída · praticar' : 'Missão disponível'}</span>
          <span className="block truncate text-sm font-black">{city.mission.title}</span>
          {visaExpired && <span className="block text-[11px] font-bold text-amber-300">Visto expirado · bônus desligados</span>}
        </span>
      </button>

      <HUDBottom key={spot.id} title={guide.title} text={guide.text} />
      <MiniMap3D city={city} currentSpotId={spot.id} onTravel={travel} />

      {hotspotId && <VocabularyCard cityId={city.id} hotspotId={hotspotId} onClose={() => setHotspotId(null)} />}
      {showMission && (
        <MissionPanel
          cityId={city.id}
          onClose={() => setShowMission(false)}
          onOpenPassport={(stampId) => {
            setShowMission(false);
            setPassport({ tab: 'stamps', highlight: { stampId, kind: 'earn' } });
          }}
        />
      )}
      {passport && <PassportModal initialTab={passport.tab} highlight={passport.highlight} onClose={() => setPassport(null)} />}
    </div>
  );
}
