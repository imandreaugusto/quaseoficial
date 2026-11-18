import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Instagram, MapPin, Plane, Share2 } from 'lucide-react';
import gsap from 'gsap';
import type { City } from '../../types/actionStreet';
import {
  NEW_YORK_AIRPORT,
  findNearestAirport,
  findProfileCityAirport,
  getCurrentCoordinates,
  type IntroAirport,
} from '../../lib/actionStreet/firstMissionIntro';
import { createTravelPassArtwork, downloadTravelPassArtwork } from '../../lib/actionStreet/travelPassShare';
import GoogleStreetView from './GoogleStreetView';
import type { ActionStreetProfile } from './ActionStreetContext';
import { glass } from './shared/glass';

type Phase = 'cover' | 'details' | 'location' | 'origin' | 'new-york';

interface Props {
  profile: ActionStreetProfile;
  destination: City;
  onStart: () => void;
}

interface AirportScene {
  airport: IntroAirport | null;
  note: string;
}

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function AirportSceneCard({ scene, heading }: { scene: AirportScene; heading: string }) {
  return (
    <div className="relative isolate min-h-56 overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-sky-950 via-indigo-950 to-slate-950 sm:min-h-72">
      {scene.airport && (
        <GoogleStreetView
          coordinates={scene.airport.coordinates}
          title={`Google Street View: ${scene.airport.name}`}
          className="absolute inset-0"
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-slate-950/20" />
      {!scene.airport && (
        <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <div className="rounded-full border border-white/15 bg-slate-950/85 p-7 text-sky-100/80">
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
      </div>
    </div>
  );
}

export default function FirstMissionIntro({ profile, destination, onStart }: Props) {
  const [phase, setPhase] = useState<Phase>('cover');
  const [busy, setBusy] = useState(false);
  const [originScene, setOriginScene] = useState<AirportScene | null>(null);
  const [newYorkScene, setNewYorkScene] = useState<AirportScene | null>(null);
  const [notice, setNotice] = useState('');
  const [travelPassFile, setTravelPassFile] = useState<File | null>(null);
  const [travelPassError, setTravelPassError] = useState('');
  const [travelPassNotice, setTravelPassNotice] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [shareBusy, setShareBusy] = useState(false);
  const [profilePhotoFailed, setProfilePhotoFailed] = useState(false);
  const passRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const flipTweenRef = useRef<gsap.core.Tween | null>(null);
  const flipContextRef = useRef<gsap.Context | null>(null);
  const openFirstName = profile.firstName || 'Viajante';
  const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Viajante';
  const profileOrigin = [profile.city, profile.country].filter(Boolean).join(', ') || 'Origem a definir';
  const destinationLabel = `${destination.city}, USA`;

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
    const context = gsap.context(() => {
      gsap.fromTo(dialog, { opacity: 0, y: 22, scale: 0.97 }, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.55,
        ease: 'power3.out',
        clearProps: 'transform',
      });
    }, dialog);
    return () => {
      context.revert();
      flipContextRef.current?.revert();
      flipContextRef.current = null;
      flipTweenRef.current?.kill();
      restoreFocus();
    };
  }, []);

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>('[data-intro-focus]:not([disabled])')?.focus();
  }, [phase]);

  useEffect(() => {
    if (phase !== 'details') return;
    let active = true;
    setTravelPassFile(null);
    setTravelPassError('');
    setTravelPassNotice('');
    void createTravelPassArtwork({
      displayName,
      origin: profileOrigin,
      destination: destinationLabel,
      photoUrl: profile.photoUrl,
    })
      .then(({ file, photoUnavailable }) => {
        if (!active) return;
        setTravelPassFile(file);
        if (photoUnavailable) {
          setTravelPassNotice('A foto do perfil não está disponível agora; a imagem foi preparada com suas iniciais.');
        }
      })
      .catch((error: unknown) => {
        console.error('Não foi possível preparar a imagem compartilhável do Travel Pass.', error);
        if (active) setTravelPassError('Não foi possível preparar a imagem do Travel Pass neste navegador.');
      });
    return () => {
      active = false;
    };
  }, [phase, displayName, profileOrigin, destinationLabel, profile.photoUrl]);

  const openPass = () => {
    const cover = coverRef.current;
    if (phase !== 'cover' || flipTweenRef.current?.isActive()) return;
    if (reducedMotion() || !cover) {
      if (cover) gsap.set(cover, { autoAlpha: 0, rotationY: -165 });
      setPhase('details');
      return;
    }
    flipContextRef.current?.revert();
    flipContextRef.current = gsap.context(() => {
      flipTweenRef.current = gsap.to(cover, {
        rotationY: -165,
        duration: 1.05,
        ease: 'power2.inOut',
        onComplete: () => {
          gsap.set(cover, { autoAlpha: 0 });
          flipTweenRef.current = null;
          setPhase('details');
        },
      });
    }, passRef);
  };

  const loadAirportScene = (airport: IntroAirport | null, sourceNote: string): AirportScene => ({
    airport,
    note: airport
      ? sourceNote
      : `${sourceNote} Não encontramos um aeroporto próximo nesta região; você ainda pode continuar a viagem.`,
  });

  const loadCityAirport = async (city: string, country: string, sourceNote: string) => {
    try {
      const airport = await findProfileCityAirport({ city, country });
      return loadAirportScene(
        airport,
        airport ? `${sourceNote} · ${city}${country ? `, ${country}` : ''}` : sourceNote
      );
    } catch (error) {
      console.error('Não foi possível localizar um aeroporto perto da cidade escolhida.', error);
      return {
        airport: null,
        note: `${sourceNote} Não conseguimos localizar um aeroporto; você pode escolher outra origem.`,
      };
    }
  };

  const useProfileCity = async () => {
    if (!profile.city.trim()) {
      setNotice('Ainda não há cidade cadastrada no perfil. Você pode escolher a cidade aproximada da conta, autorizar a localização atual ou usar o aeroporto de referência.');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      const scene = await loadCityAirport(profile.city, profile.country, 'Origem baseada na cidade cadastrada no perfil.');
      if (!scene.airport) {
        setNotice('Não encontramos um aeroporto para a cidade do perfil. Você pode tentar a cidade aproximada, a localização atual ou o aeroporto de referência.');
        return;
      }
      setOriginScene(scene);
      setPhase('origin');
    } finally {
      setBusy(false);
    }
  };

  const useApproximateCity = async () => {
    const city = profile.ipCity?.trim() ?? '';
    const country = profile.ipCountry?.trim() ?? '';
    if (!city) {
      setNotice('Não há uma cidade aproximada disponível para esta conta. Você pode cadastrar uma cidade no perfil ou autorizar a localização atual.');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      const scene = await loadCityAirport(city, country, 'Origem baseada na cidade aproximada da conta (estimativa por IP).');
      if (!scene.airport) {
        setNotice('Não encontramos um aeroporto para a cidade aproximada. Você pode tentar a localização atual ou usar o aeroporto de referência.');
        return;
      }
      setOriginScene(scene);
      setPhase('origin');
    } finally {
      setBusy(false);
    }
  };

  const useCurrentLocation = async () => {
    setBusy(true);
    setNotice('');
    try {
      const coordinates = await getCurrentCoordinates();
      const airport = await findNearestAirport(coordinates);
      if (!airport) {
        setNotice('Não encontramos um aeroporto próximo da localização autorizada. Exibiremos um aeroporto de referência sem apresentá-lo como sua origem local.');
        setOriginScene(loadAirportScene(NEW_YORK_AIRPORT, 'Aeroporto de referência em Nova York; a origem local não pôde ser identificada.'));
      } else {
        setOriginScene(loadAirportScene(airport, 'Aeroporto mais próximo da localização que você autorizou.'));
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'A localização não foi disponibilizada.';
      setNotice(`${reason} Exibiremos um aeroporto de referência em Nova York; ele não representa sua origem local.`);
      setOriginScene(loadAirportScene(NEW_YORK_AIRPORT, 'Aeroporto de referência em Nova York; a localização não foi disponibilizada.'));
    } finally {
      setBusy(false);
      setPhase('origin');
    }
  };

  const useReferenceAirport = async () => {
    setBusy(true);
    setNotice('');
    try {
      setOriginScene(loadAirportScene(NEW_YORK_AIRPORT, 'Aeroporto de referência em Nova York; a origem local não foi identificada.'));
    } finally {
      setBusy(false);
      setPhase('origin');
    }
  };

  const prepareJourney = () => {
    setNotice('');
    if (profile.city.trim()) {
      void useProfileCity();
      return;
    }
    setNotice('Sua cidade ainda não está no perfil. Escolha uma cidade aproximada, autorize a localização ou use um aeroporto de referência.');
    setPhase('location');
  };

  const shareTravelPass = async (destination: 'general' | 'instagram') => {
    if (!travelPassFile) return;
    setShareBusy(true);
    setTravelPassError('');
    setShareMessage('');
    try {
      if (
        typeof navigator.share === 'function'
        && typeof navigator.canShare === 'function'
        && navigator.canShare({ files: [travelPassFile] })
      ) {
        await navigator.share({
          files: [travelPassFile],
          title: destination === 'instagram' ? 'Postar no Instagram Stories' : 'Meu Action Street Travel Pass',
          text: destination === 'instagram'
            ? 'Escolha Instagram Stories no menu de compartilhamento. A publicação será confirmada no Instagram.'
            : `Minha primeira viagem no Action Street: ${displayName} · ${destinationLabel}`,
        });
        setShareMessage(destination === 'instagram'
          ? 'Compartilhamento enviado. Confirme a publicação nos Stories dentro do Instagram.'
          : 'Compartilhamento concluído. O app escolhido pedirá confirmação antes de publicar.');
      } else {
        downloadTravelPassArtwork(travelPassFile);
        setShareMessage(destination === 'instagram'
          ? 'Imagem baixada. Abra o Instagram, crie um Story e selecione o Travel Pass. Este navegador não abre o editor de Stories diretamente.'
          : 'Imagem baixada. Escolha um app para compartilhar o Travel Pass.');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setShareMessage('Compartilhamento cancelado.');
      } else {
        console.error('Não foi possível compartilhar o Travel Pass.', error);
        setTravelPassError('Não foi possível abrir o compartilhamento. Tente baixar a imagem.');
      }
    } finally {
      setShareBusy(false);
    }
  };

  const boardForNewYork = async () => {
    setBusy(true);
    setNotice('');
    try {
      setNewYorkScene(loadAirportScene(NEW_YORK_AIRPORT, 'Aeroporto internacional de Nova York.'));
    } finally {
      setBusy(false);
      setPhase('new-york');
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#080b12] p-3 sm:p-6">
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
        className={`relative my-auto w-full max-w-2xl overflow-hidden p-4 text-white sm:p-7 ${glass.modal}`}
      >
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className={glass.label}>Action Street · sua primeira missão</p>
            <h2 id="first-mission-intro-title" className="mt-1 text-xl font-black sm:text-2xl">
              {phase === 'cover' || phase === 'details' ? `Bem-vindo, ${openFirstName}!` : 'Sua viagem começa agora'}
            </h2>
          </div>
        </div>

        {(phase === 'cover' || phase === 'details') && (
          <div className="relative mx-auto mt-5 w-full max-w-2xl" style={{ perspective: '1500px' }}>
            <div
              ref={passRef}
              className="relative min-h-[20rem] overflow-hidden rounded-[1.35rem] border-[0.55rem] border-[#172944] bg-[#172944] shadow-[0_24px_70px_rgba(0,0,0,0.65)] sm:min-h-[23rem]"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div
                className="absolute inset-0 grid grid-cols-[0.38fr_0.62fr] overflow-hidden rounded-lg border border-[#d7cba9] bg-[#f0e8d5] text-slate-800"
                aria-hidden={phase !== 'details'}
              >
                <div className="relative flex flex-col justify-between border-r border-[#b8aa89] bg-[linear-gradient(145deg,#f8f2e3,#e7dcc1)] p-3 sm:p-5">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] sm:text-[11px]">Brazilian in Action</p>
                    <p className="mt-1 text-[8px] font-black uppercase tracking-[0.19em] text-slate-600 sm:text-[10px]">Action Street</p>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-[#b79c5a] text-[#8b7642] sm:h-24 sm:w-24" aria-hidden="true">
                      <div className="absolute inset-2 rounded-full border border-[#b79c5a]/70" />
                      <svg viewBox="0 0 42 30" role="img" aria-label="Bandeira do Brasil" className="h-9 w-12 sm:h-12 sm:w-16">
                        <rect width="42" height="30" fill="#009b3a" />
                        <path d="M21 3 38 15 21 27 4 15Z" fill="#ffdf00" />
                        <circle cx="21" cy="15" r="6.5" fill="#002776" />
                      </svg>
                    </div>
                    <p className="mt-3 text-[10px] font-black uppercase tracking-[0.17em] sm:text-xs">First Journey</p>
                    <p className="mt-1 text-[8px] font-medium text-slate-600 sm:text-[10px]">Explore · Learn · Collect</p>
                  </div>
                  <div className="border-t border-[#b8aa89] pt-2 text-[7px] font-bold uppercase tracking-[0.13em] text-slate-600 sm:text-[9px]">Your travel story starts here</div>
                </div>

                <div className="relative flex min-w-0 flex-col justify-between p-3 sm:p-5">
                  <div className="flex items-center justify-between gap-2 border-b border-[#b8aa89] pb-2">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-600 sm:text-[10px]">Brazilian in Action</p>
                      <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.16em] sm:text-xs">Action Street Travel Pass</p>
                    </div>
                    <Plane className="h-4 w-4 shrink-0 text-slate-600 sm:h-5 sm:w-5" aria-hidden="true" />
                  </div>
                  <div className="grid min-w-0 grid-cols-[0.78fr_1.22fr] items-center gap-2 py-2 sm:gap-4">
                    <div className="aspect-[0.76] overflow-hidden border border-[#a99c7e] bg-[#d8d0bd] shadow-inner">
                      {profile.photoUrl && !profilePhotoFailed ? (
                        <img
                          src={profile.photoUrl}
                          alt={`Foto de perfil de ${displayName}`}
                          className="h-full w-full object-cover"
                          onError={() => setProfilePhotoFailed(true)}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(145deg,#d9d2c3,#bcb39e)] text-2xl font-bold text-slate-600 sm:text-4xl">
                          {displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 space-y-3">
                      <div>
                        <p className="text-[7px] font-bold uppercase tracking-[0.13em] text-slate-500 sm:text-[9px]">Traveler</p>
                        <p className="break-words text-xs font-black uppercase leading-tight sm:text-base">{displayName}</p>
                      </div>
                      <div>
                        <p className="text-[7px] font-bold uppercase tracking-[0.13em] text-slate-500 sm:text-[9px]">From</p>
                        <p className="break-words text-[9px] font-semibold leading-tight sm:text-xs">{profileOrigin}</p>
                      </div>
                      <div>
                        <p className="text-[7px] font-bold uppercase tracking-[0.13em] text-slate-500 sm:text-[9px]">First destination</p>
                        <p className="break-words text-[9px] font-semibold leading-tight sm:text-xs">{destinationLabel}</p>
                      </div>
                    </div>
                  </div>
                  <p className="border-t border-[#b8aa89] pt-2 text-[7px] font-bold uppercase tracking-[0.13em] text-slate-600 sm:text-[9px]">A journey to learn English through real places</p>
                </div>
              </div>

              {phase === 'cover' && (
                <div
                  ref={coverRef}
                  className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-lg border border-[#d7b76b]/75 bg-[radial-gradient(ellipse_at_75%_35%,rgba(72,104,144,0.5),transparent_48%),linear-gradient(135deg,#102440,#071426_72%)] p-5 sm:p-8"
                  style={{ transformOrigin: 'left center', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                >
                  <div className="absolute inset-3 rounded-md border border-[#d7b76b]/45" aria-hidden="true" />
                  <div className="relative flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.23em] text-white sm:text-sm">Brazilian in Action</p>
                      <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.28em] text-[#e2c47a] sm:text-xs">Action Street</p>
                    </div>
                  </div>
                  <div className="relative text-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/65">Learning journey</p>
                    <h3 className="mt-3 text-3xl font-black uppercase tracking-[0.12em] text-[#f0d58b] sm:text-4xl">Travel Passport</h3>
                    <p className="mt-2 text-xs font-bold uppercase tracking-[0.3em] text-white/75">A new city. A new story.</p>
                  </div>
                  <button type="button" onClick={openPass} tabIndex={phase === 'cover' ? 0 : -1} disabled={phase !== 'cover'} data-intro-focus className={`${glass.primaryButton} relative mx-auto w-full sm:w-auto`} aria-label="Abrir seu Action Street Travel Pass">
                    Abrir meu Travel Pass <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {phase === 'details' && (
          <div className="relative mt-5 flex flex-col gap-3">
            <p className="text-sm text-white/75">Prepare-se para sair da sua cidade, conhecer um aeroporto de Nova York e chegar à sua primeira missão.</p>
            <p className="text-xs text-white/55">Vamos tentar usar a cidade do seu perfil para localizar o aeroporto; a localização do dispositivo só será consultada se você autorizar.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => void shareTravelPass('general')} disabled={!travelPassFile || shareBusy} className={`${glass.secondaryButton} disabled:cursor-wait disabled:opacity-50`}>
                <Share2 className="h-4 w-4" /> {shareBusy ? 'Preparando…' : 'Compartilhar'}
              </button>
              <button type="button" onClick={() => void shareTravelPass('instagram')} disabled={!travelPassFile || shareBusy} className={`${glass.secondaryButton} disabled:cursor-wait disabled:opacity-50`}>
                <Instagram className="h-4 w-4" /> Postar no Instagram Stories
              </button>
            </div>
            {travelPassError && <p className="text-xs text-rose-200" role="alert">{travelPassError}</p>}
            {travelPassNotice && <p className="text-xs text-amber-100" role="status">{travelPassNotice}</p>}
            {shareMessage && <p className="text-xs text-sky-100" role="status">{shareMessage}</p>}
            <button type="button" onClick={prepareJourney} disabled={busy} data-intro-focus className={glass.primaryButton}>
              {busy ? 'Procurando o aeroporto…' : 'Preparar minha viagem'} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {phase === 'location' && (
          <div className="relative mt-5 space-y-4">
            <p className="text-sm leading-relaxed text-white/75">
              Escolha a cidade cadastrada no perfil, uma estimativa aproximada da conta ou autorize o navegador a buscar sua localização atual. A localização precisa só será consultada se você autorizar.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => void useCurrentLocation()} disabled={busy} data-intro-focus className={glass.primaryButton}>
                <MapPin className="h-4 w-4" /> Usar localização atual
              </button>
              <button type="button" onClick={() => void useProfileCity()} disabled={busy} className={`${glass.secondaryButton} disabled:cursor-wait disabled:opacity-50`}>
                Usar cidade do meu perfil
              </button>
              {profile.ipCity?.trim() && (
                <button type="button" onClick={() => void useApproximateCity()} disabled={busy} className={`${glass.secondaryButton} disabled:cursor-wait disabled:opacity-50`}>
                  Usar cidade aproximada · {profile.ipCity}
                </button>
              )}
            </div>
            <button type="button" onClick={() => void useReferenceAirport()} disabled={busy} className={`${glass.chip} w-full px-4 py-2.5 text-xs font-bold text-white/75 transition hover:bg-white/10 disabled:opacity-45`}>
              Continuar com aeroporto de referência em Nova York
            </button>
            {busy && <p className="text-sm text-sky-100" role="status" aria-live="polite">Procurando o aeroporto mais próximo…</p>}
            {notice && <p className="text-xs text-white/70" role="status" aria-live="polite">{notice}</p>}
            <p className="text-[10px] leading-relaxed text-white/45">
              A estimativa por IP pode estar incorreta. A busca do aeroporto usa OpenStreetMap; a visualização de rua usa Google Maps.
            </p>
          </div>
        )}

        {phase === 'origin' && originScene && (
          <div className="relative mt-5 space-y-4">
            <AirportSceneCard scene={originScene} heading={profileOrigin} />
            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => void boardForNewYork()} disabled={busy} data-intro-focus className={glass.primaryButton}>
                {busy ? 'Preparando Nova York…' : 'Embarcar para Nova York'} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            {notice && <p className="text-xs text-white/70" role="status" aria-live="polite">{notice}</p>}
          </div>
        )}

        {phase === 'new-york' && newYorkScene && (
          <div className="relative mt-5 space-y-4">
            <AirportSceneCard scene={newYorkScene} heading="JFK · New York" />
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
