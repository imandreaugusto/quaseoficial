import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, MessagesSquare } from 'lucide-react';
import gsap from 'gsap';
import { journeyStore } from '../../../lib/actionStreet/journeyStore';
import { persistenceManager } from '../../../lib/actionStreet/persistenceManager';
import { getDiscoveredSpotIds } from '../../../lib/actionStreet/discovery';
import { getVisaStatus } from '../../../lib/actionStreet/visa';
import { chooseLocalChallenge, type LocalChallenge } from '../../../lib/actionStreet/challengeEngine';
import { appendJournalEntry, createJournalEntry, spendChallengeTicket } from '../../../lib/actionStreet/progression';
import { useActionStreet } from '../ActionStreetContext';
import PassportModal, { type PassportTab } from '../Modals/PassportModal';
import { glass } from '../shared/glass';
import PolaroidCamera from '../PolaroidCamera';
import VocabularyCard from '../VocabularyCard/VocabularyCard';
import HUDBottom from './HUDBottom';
import HUDTop from './HUDTop';
import MiniMap3D from './MiniMap3D';
import MissionPanel from './MissionPanel';
import StreetChallengeModal from './StreetChallengeModal';
import StreetScene from './StreetScene';
import TravelCompanion from './TravelCompanion';

export interface StreetResume {
  spotId?: string;
  imageId?: string;
  openMission?: boolean;
}

interface Props {
  cityId: string;
  onBack: () => void;
  onExploreSpot: (cityId: string, spotId: string) => void;
  resume?: StreetResume;
}

interface PassportState {
  tab: PassportTab;
  highlight?: { stampId: string; kind: 'earn' | 'renew' };
}

export default function StreetViewer360({ cityId, onBack, onExploreSpot, resume }: Props) {
  const { state, updateState, getCityData, allCities, profile, reportActivity } = useActionStreet();
  const city = getCityData(cityId);
  const [spotId, setSpotId] = useState(() =>
    city?.spots.find((spot) => spot.id === resume?.spotId && (!spot.requiresRoute || state.unlockedRoutes.includes(spot.requiresRoute)))?.id
    ?? city?.spots.find((spot) => !spot.requiresRoute || state.unlockedRoutes.includes(spot.requiresRoute))?.id
    ?? city?.spots[0]?.id
    ?? ''
  );
  const [hotspotId, setHotspotId] = useState<string | null>(null);
  const [showMission, setShowMission] = useState(() => resume?.openMission === true);
  const [showCamera, setShowCamera] = useState(false);
  const [passport, setPassport] = useState<PassportState | null>(null);
  const [challenge, setChallenge] = useState<LocalChallenge | null>(null);
  const [streetPreviewUrl, setStreetPreviewUrl] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const traveling = useRef(false);
  const arrivalRecorded = useRef<string | null>(null);

  useEffect(() => {
    const tween = gsap.fromTo(rootRef.current, { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1, duration: 0.9, ease: 'power2.out', clearProps: 'transform' });
    return () => {
      tween.kill();
    };
  }, []);

  useEffect(() => {
    if (!city || arrivalRecorded.current === cityId) return;
    arrivalRecorded.current = cityId;
    updateState((previous) => appendJournalEntry(
      persistenceManager.visitCity(previous, cityId),
      createJournalEntry(cityId, 'arrival', `Arrived in ${city.city}.`)
    ));
  }, [cityId, city, updateState]);

  useEffect(() => {
    if (spotId) {
      updateState((previous) => persistenceManager.discoverSpot(previous, cityId, spotId));
    }
  }, [cityId, spotId, updateState]);

  useEffect(() => {
    if (spotId) journeyStore.patch({ view: 'street360', cityId, spotId, imageId: spotId === resume?.spotId ? resume.imageId : undefined }, profile?.userId);
  }, [cityId, spotId, resume, profile?.userId]);

  const collectedIds = useMemo(() => new Set(state.souvenirs.map((item) => item.id)), [state.souvenirs]);
  const discoveredSpotIds = useMemo(
    () => getDiscoveredSpotIds(allCities, state.discoveredSpots, state.souvenirs),
    [allCities, state.discoveredSpots, state.souvenirs]
  );

  if (!city) return null;
  const spot = city.spots.find((item) => item.id === spotId) ?? city.spots[0];
  const hotspots = city.hotspots.filter((item) => item.spotId === spot.id);
  const guide = spot.guide ?? city.touristGuide;
  const missionDone = state.completedMissions.includes(city.mission.id);
  const visaExpired = getVisaStatus(state, city.id).expired;
  const anyVisaExpired = state.stamps.some((stamp) => getVisaStatus(state, stamp.cityId).expired);

  const travel = (nextSpotId: string) => {
    if (traveling.current || nextSpotId === spot.id) return;
    const destination = city.spots.find((item) => item.id === nextSpotId);
    if (!destination || (destination.requiresRoute && !state.unlockedRoutes.includes(destination.requiresRoute))) return;
    traveling.current = true;
    gsap.to(sceneRef.current, {
      opacity: 0,
      duration: 0.4,
      onComplete: () => {
        setSpotId(nextSpotId);
        updateState((previous) => appendJournalEntry(
          previous,
          createJournalEntry(cityId, 'arrival', `Visited ${destination.name}.`)
        ));
        reportActivity('travel', cityId, nextSpotId);
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

  const exploreSpot = (targetCityId: string, targetSpotId: string) => {
    setPassport(null);
    if (targetCityId === city.id) {
      travel(targetSpotId);
      return;
    }
    onExploreSpot(targetCityId, targetSpotId);
  };

  const startChallenge = () => {
    const updated = spendChallengeTicket(state);
    if (!updated) return;
    updateState(() => updated);
    const previousChallengeId = [...state.journal].reverse().find((entry) => entry.type === 'challenge')?.detail?.split(':')[0];
    setChallenge(chooseLocalChallenge(previousChallengeId));
  };

  return (
    <div ref={rootRef} className="absolute inset-0 bg-slate-950 text-white">
      <div ref={sceneRef} className="absolute inset-0">
        <StreetScene
          city={city}
          spot={spot}
          hotspots={hotspots}
          collectedIds={collectedIds}
          onHotspot={setHotspotId}
          initialImageId={spot.id === resume?.spotId ? resume.imageId : undefined}
          onImageChange={(imageId, previewUrl) => {
            journeyStore.patch({ imageId }, profile?.userId);
            if (previewUrl) setStreetPreviewUrl(previewUrl);
          }}
        />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-slate-950/70 to-transparent" />

      <HUDTop
        cityName={city.city}
        spotName={spot.name}
        balance={state.balance}
        streak={state.streak.count}
        visaAlert={anyVisaExpired}
        weatherPreset={city.weatherPreset}
        onBack={onBack}
        onOpenCamera={() => setShowCamera(true)}
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
          <span className={`block ${glass.label}`}>{missionDone ? 'Missão opcional · praticar' : 'Missão opcional · disponível'}</span>
          <span className="block truncate text-sm font-black">{city.mission.title}</span>
          {visaExpired && <span className="block text-[11px] font-bold text-amber-300">Visto expirado · bônus desligados</span>}
        </span>
      </button>

      <HUDBottom title={guide.title} text={guide.text} />
      <MiniMap3D
        city={city}
        currentSpotId={spot.id}
        discoveredSpotIds={discoveredSpotIds}
        unlockedRoutes={state.unlockedRoutes}
        imagePreviewUrl={streetPreviewUrl}
        onTravel={travel}
      />
      <TravelCompanion
        cityId={city.id}
        spotId={spot.id}
        paused={Boolean(hotspotId || showMission || showCamera || passport || challenge)}
        onStartChallenge={startChallenge}
      />

      {hotspotId && <VocabularyCard cityId={city.id} hotspotId={hotspotId} onClose={() => setHotspotId(null)} />}
      {showCamera && <PolaroidCamera cityId={city.id} cityName={city.city} spotName={spot.name} onClose={() => setShowCamera(false)} />}
      {challenge && (
        <StreetChallengeModal
          cityId={city.id}
          spotId={spot.id}
          challenge={challenge}
          onClose={() => setChallenge(null)}
        />
      )}
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
      {passport && (
        <PassportModal
          initialTab={passport.tab}
          highlight={passport.highlight}
          onClose={() => setPassport(null)}
          onExploreSpot={exploreSpot}
        />
      )}
    </div>
  );
}
