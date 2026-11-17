import { useEffect, useRef, useState } from 'react';
import { ArrowRight, MapPin, Plane, Sparkles } from 'lucide-react';
import gsap from 'gsap';
import type { City } from '../../types/actionStreet';
import {
  FIRST_MISSION_MAPILLARY_RADII,
  NEW_YORK_AIRPORT,
  findNearestAirport,
  findProfileCityAirport,
  getCurrentCoordinates,
  type IntroAirport,
} from '../../lib/actionStreet/firstMissionIntro';
import { findNearestImage, getMapillaryToken, MAPILLARY_ATTRIBUTION, type MapillaryStreetImage } from '../../lib/actionStreet/mapillaryConfig';
import type { ActionStreetProfile } from './ActionStreetContext';
import { glass } from './shared/glass';

type Phase = 'cover' | 'details' | 'location' | 'origin' | 'new-york';

interface Props {
  profile: ActionStreetProfile;
  destination: City;
  onSkip: () => void;
  onStart: () => void;
}

interface AirportScene {
  airport: IntroAirport | null;
  image: MapillaryStreetImage | null;
  note: string;
}

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function distanceKm(from: [number, number], to: [number, number]): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latDelta = radians(to[1] - from[1]);
  const lonDelta = radians(to[0] - from[0]);
  const a = Math.sin(latDelta / 2) ** 2
    + Math.cos(radians(from[1])) * Math.cos(radians(to[1])) * Math.sin(lonDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function imageCaption(image: MapillaryStreetImage | null, airport: IntroAirport | null): string {
  if (!image?.coordinates || !airport) return MAPILLARY_ATTRIBUTION;
  const distance = distanceKm(airport.coordinates, image.coordinates);
  return distance < 0.3
    ? `Foto Mapillary próxima de ${airport.name}`
    : `Foto Mapillary a cerca de ${distance.toFixed(1)} km de ${airport.name}`;
}

function AirportSceneCard({ scene, heading, onImageError }: { scene: AirportScene; heading: string; onImageError: () => void }) {
  return (
    <div className="relative isolate min-h-56 overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-sky-950 via-indigo-950 to-slate-950 sm:min-h-72">
      {scene.image?.thumbnailUrl && (
        <img
          src={scene.image.thumbnailUrl}
          alt={`Imagem real do Mapillary próxima de ${scene.airport?.name ?? heading}`}
          className="absolute inset-0 h-full w-full object-cover"
          onError={onImageError}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-slate-950/20" />
      {!scene.image?.thumbnailUrl && (
        <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <div className="rounded-full border border-white/15 bg-white/10 p-7 text-sky-100/80 backdrop-blur">
            <Plane className="h-10 w-10" />
          </div>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-200">Action Street · embarque</p>
        <h3 className="mt-1 text-xl font-black sm:text-2xl">{scene.airport?.name ?? heading}</h3>
        <p className="mt-1 text-xs text-white/75">{scene.note}</p>
        <p className="mt-2 text-[10px] text-white/55">
          Dados do aeroporto © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline hover:text-white">OpenStreetMap contributors</a>
        </p>
        {scene.image?.thumbnailUrl && (
          <p className="mt-2 text-[10px] text-white/65">{imageCaption(scene.image, scene.airport)} · {MAPILLARY_ATTRIBUTION}</p>
        )}
      </div>
    </div>
  );
}

export default function FirstMissionIntro({ profile, destination, onSkip, onStart }: Props) {
  const [phase, setPhase] = useState<Phase>('cover');
  const [busy, setBusy] = useState(false);
  const [originScene, setOriginScene] = useState<AirportScene | null>(null);
  const [newYorkScene, setNewYorkScene] = useState<AirportScene | null>(null);
  const [notice, setNotice] = useState('');
  const passRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const flipTweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const restoreFocus = () => {
      if (previousFocus?.isConnected) previousFocus.focus();
    };
    if (reducedMotion()) {
      return restoreFocus;
    }
    const entrance = gsap.fromTo(dialog, { opacity: 0, y: 22, scale: 0.97 }, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.55,
      ease: 'power3.out',
      clearProps: 'transform',
    });
    return () => {
      entrance.kill();
      flipTweenRef.current?.kill();
      restoreFocus();
    };
  }, []);

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>('[data-intro-focus]')?.focus();
  }, [phase]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onSkip();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [busy, onSkip]);

  const openPass = () => {
    if (phase !== 'cover' || flipTweenRef.current?.isActive()) return;
    if (reducedMotion() || !passRef.current) {
      setPhase('details');
      return;
    }
    flipTweenRef.current = gsap.to(passRef.current, {
      rotationY: 180,
      duration: 0.8,
      ease: 'power2.inOut',
      onComplete: () => {
        flipTweenRef.current = null;
        setPhase('details');
      },
    });
  };

  const loadAirportScene = async (airport: IntroAirport | null, sourceNote: string): Promise<AirportScene> => {
    if (!airport) {
      return {
        airport: null,
        image: null,
        note: `${sourceNote} Não encontramos um aeroporto próximo nesta região; você ainda pode continuar a viagem.`,
      };
    }

    try {
      const token = getMapillaryToken();
      if (!token) {
        return {
          airport,
          image: null,
          note: 'O acesso ao Mapillary não está disponível agora. A viagem continua sem foto do aeroporto.',
        };
      }
      const image = await findNearestImage(token, airport.coordinates, FIRST_MISSION_MAPILLARY_RADII);
      return {
        airport,
        image,
        note: image
          ? sourceNote || 'Imagem real disponível perto do aeroporto.'
          : 'Sem foto Mapillary próxima deste aeroporto; esta etapa não mostrará uma imagem como se fosse dele.',
      };
    } catch (error) {
      console.error('Não foi possível carregar a foto Mapillary da introdução do Action Street.', error);
      return {
        airport,
        image: null,
        note: 'Não foi possível carregar uma foto Mapillary agora. Você ainda pode continuar a viagem.',
      };
    }
  };

  const loadProfileAirport = async (sourceNote: string) => {
    try {
      const airport = await findProfileCityAirport({ city: profile.city, country: profile.country });
      return await loadAirportScene(
        airport,
        airport ? `${sourceNote} · ${profile.city}${profile.country ? `, ${profile.country}` : ''}` : sourceNote
      );
    } catch (error) {
      console.error('Não foi possível localizar um aeroporto perto da cidade do perfil.', error);
      return {
        airport: null,
        image: null,
        note: `${sourceNote} Não conseguimos localizar um aeroporto; você pode seguir para Nova York.`,
      };
    }
  };

  const useProfileCity = async () => {
    setBusy(true);
    setNotice('');
    try {
      setOriginScene(await loadProfileAirport('Origem baseada na cidade cadastrada no perfil.'));
    } finally {
      setBusy(false);
      setPhase('origin');
    }
  };

  const useCurrentLocation = async () => {
    setBusy(true);
    setNotice('');
    try {
      const coordinates = await getCurrentCoordinates();
      const airport = await findNearestAirport(coordinates);
      if (!airport) {
        setNotice('Não encontramos um aeroporto próximo da localização autorizada. Vamos usar a cidade do seu perfil.');
        setOriginScene(await loadProfileAirport('Origem baseada na cidade cadastrada no perfil.'));
      } else {
        setOriginScene(await loadAirportScene(airport, 'Aeroporto mais próximo da localização que você autorizou.'));
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'A localização não foi disponibilizada.';
      setNotice(`${reason} Vamos usar a cidade cadastrada no perfil.`);
      setOriginScene(await loadProfileAirport('Localização atual indisponível; usando a cidade do perfil.'));
    } finally {
      setBusy(false);
      setPhase('origin');
    }
  };

  const boardForNewYork = async () => {
    setBusy(true);
    setNotice('');
    try {
      setNewYorkScene(await loadAirportScene(NEW_YORK_AIRPORT, 'Aeroporto internacional de Nova York.'));
    } finally {
      setBusy(false);
      setPhase('new-york');
    }
  };

  const openFirstName = profile.firstName || 'Viajante';
  const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Viajante';
  const profileOrigin = [profile.city, profile.country].filter(Boolean).join(', ') || 'Origem a definir';

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/75 p-3 backdrop-blur-md sm:p-6">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="first-mission-intro-title"
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return;
          const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
          )).filter((element) => !element.closest('[aria-hidden="true"]'));
          if (focusable.length === 0) {
            event.preventDefault();
            return;
          }
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey && (document.activeElement === first || !event.currentTarget.contains(document.activeElement))) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && (document.activeElement === last || !event.currentTarget.contains(document.activeElement))) {
            event.preventDefault();
            first.focus();
          }
        }}
        className={`relative my-auto w-full max-w-2xl overflow-hidden p-4 text-white sm:p-7 ${glass.panelOverImagery}`}
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-sky-400/15 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className={glass.label}>Action Street · sua primeira missão</p>
            <h2 id="first-mission-intro-title" className="mt-1 text-xl font-black sm:text-2xl">
              {phase === 'cover' || phase === 'details' ? `Bem-vindo, ${openFirstName}!` : 'Sua viagem começa agora'}
            </h2>
          </div>
          <button type="button" onClick={onSkip} className={`${glass.chip} shrink-0 px-3 py-2 text-xs font-bold text-white/80`} disabled={busy}>
            Pular introdução
          </button>
        </div>

        {(phase === 'cover' || phase === 'details') && (
          <div className="relative mt-5" style={{ perspective: '1200px' }}>
            <div
              ref={passRef}
              className="relative min-h-64 rounded-3xl border border-amber-100/25 bg-gradient-to-br from-slate-800 via-indigo-950 to-slate-950 p-5 shadow-2xl shadow-black/40 sm:min-h-72 sm:p-7"
              style={{ transformStyle: 'preserve-3d', transform: phase === 'details' ? 'rotateY(180deg)' : undefined }}
            >
              <div className="absolute inset-0 flex flex-col justify-between rounded-3xl p-5 sm:p-7" style={{ backfaceVisibility: 'hidden' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.28em] text-sky-200">Action Street</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200">Travel Pass · edição de aventura</p>
                  </div>
                  <Sparkles className="h-6 w-6 text-amber-200" />
                </div>
                <div>
                  <p className="text-2xl font-black tracking-wide sm:text-3xl">FIRST JOURNEY</p>
                  <p className="mt-2 text-sm text-white/70">Seu passaporte de aprendizado está pronto para abrir.</p>
                  <p className="mt-4 inline-flex rounded-full border border-amber-100/40 bg-amber-200/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-100">
                    Fictício · não é documento oficial
                  </p>
                </div>
                <button type="button" onClick={openPass} tabIndex={phase === 'cover' ? 0 : -1} disabled={phase !== 'cover'} data-intro-focus className={`${glass.primaryButton} w-full sm:w-auto`} aria-label="Abrir seu Action Street Travel Pass">
                  Abrir meu Travel Pass <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div
                className="absolute inset-0 flex flex-col justify-between rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-indigo-950 to-sky-950 p-5 sm:p-7"
                style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
                aria-hidden={phase !== 'details'}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-200">Action Street Travel Pass</p>
                  <span className="rounded-full border border-amber-100/40 bg-amber-200/10 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-amber-100">
                    Fictício · não oficial
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">Viajante</p>
                  <p className="mt-1 break-words text-2xl font-black sm:text-3xl">{displayName}</p>
                  <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/15 pt-4">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-white/50">Embarque</p>
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-bold"><MapPin className="h-3.5 w-3.5 text-sky-300" />{profileOrigin}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-white/50">Destino</p>
                      <p className="mt-1 text-sm font-bold">{destination.city}, USA</p>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] leading-relaxed text-white/55">Cartão de experiência do Action Street. Não serve como identificação, viagem ou documento oficial.</p>
              </div>
            </div>
          </div>
        )}

        {phase === 'details' && (
          <div className="relative mt-5 flex flex-col gap-3">
            <p className="text-sm text-white/75">Prepare-se para sair da sua cidade, conhecer um aeroporto de Nova York e chegar à sua primeira missão.</p>
            <button type="button" onClick={() => setPhase('location')} data-intro-focus className={glass.primaryButton}>
              Preparar minha viagem <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {phase === 'location' && (
          <div className="relative mt-5 space-y-4">
            <p className="text-sm leading-relaxed text-white/75">
              Para encontrar o aeroporto mais próximo, você pode autorizar o navegador a enviar sua localização atual ao OpenStreetMap para esta busca. Ela não será salva no seu perfil nem no aplicativo; serviços externos podem tratar registros técnicos conforme suas próprias políticas.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => void useCurrentLocation()} disabled={busy} data-intro-focus className={glass.primaryButton}>
                <MapPin className="h-4 w-4" /> Usar localização atual
              </button>
              <button type="button" onClick={() => void useProfileCity()} disabled={busy} className={glass.secondaryButton}>
                Usar cidade do meu perfil
              </button>
            </div>
            {busy && <p className="text-sm text-sky-100" role="status" aria-live="polite">Procurando o aeroporto mais próximo…</p>}
            {notice && <p className="text-xs text-white/70" role="status" aria-live="polite">{notice}</p>}
            <p className="text-[10px] leading-relaxed text-white/45">A localização da cidade é consultada no OpenStreetMap; imagens, quando disponíveis, vêm do Mapillary.</p>
          </div>
        )}

        {phase === 'origin' && originScene && (
          <div className="relative mt-5 space-y-4">
            <AirportSceneCard
              scene={originScene}
              heading={profileOrigin}
              onImageError={() => setOriginScene((current) => current ? {
                ...current,
                image: null,
                note: 'A imagem não pôde ser exibida. Você ainda pode continuar a viagem.',
              } : current)}
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => void boardForNewYork()} disabled={busy} data-intro-focus className={glass.primaryButton}>
                {busy ? 'Procurando imagem de Nova York…' : 'Embarcar para Nova York'} <ArrowRight className="h-4 w-4" />
              </button>
              <button type="button" onClick={onSkip} disabled={busy} className={glass.secondaryButton}>Pular para a missão</button>
            </div>
            {notice && <p className="text-xs text-white/70" role="status" aria-live="polite">{notice}</p>}
          </div>
        )}

        {phase === 'new-york' && newYorkScene && (
          <div className="relative mt-5 space-y-4">
            <AirportSceneCard
              scene={newYorkScene}
              heading="JFK · New York"
              onImageError={() => setNewYorkScene((current) => current ? {
                ...current,
                image: null,
                note: 'A imagem não pôde ser exibida. Continue para a chegada à cidade.',
              } : current)}
            />
            <p className="text-sm text-white/75">Agora vamos sobrevoar Nova York e chegar a {destination.spots[0]?.name ?? destination.city}.</p>
            <button type="button" onClick={onStart} data-intro-focus className={glass.primaryButton}>
              Iniciar minha primeira missão <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
