import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ImageOff, Sparkles } from 'lucide-react';
import 'mapillary-js/dist/mapillary.css';
import type { Viewer as MapillaryViewer } from 'mapillary-js';
import type { City, Hotspot, Spot } from '../../../types/actionStreet';
import { findNearestImage, getMapillaryImageById, getMapillaryToken, type MapillaryStreetImage } from '../../../lib/actionStreet/mapillaryConfig';
import { routeAnimations } from '../../../lib/actionStreet/routeAnimations';
import { glass } from '../shared/glass';

type ViewerStatus = 'loading' | 'ready' | 'error';

interface Props {
  city: City;
  spot: Spot;
  hotspots: Hotspot[];
  collectedIds: Set<string>;
  onHotspot: (hotspotId: string) => void;
  initialImageId?: string;
  onImageChange?: (imageId: string, previewUrl: string | null) => void;
}

const PIN_POSITIONS = [
  { left: '22%', top: '54%' },
  { left: '52%', top: '46%' },
  { left: '77%', top: '56%' },
];

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const hasUsablePanorama = (image: MapillaryStreetImage) =>
  image.isPano
  && typeof image.width === 'number'
  && Number.isFinite(image.width)
  && image.width > 0
  && typeof image.height === 'number'
  && Number.isFinite(image.height)
  && image.height > 0;
const hasValidViewerDimensions = (image: { width: number; height: number }) =>
  Number.isFinite(image.width) && image.width > 0 && Number.isFinite(image.height) && image.height > 0;

const STREET_BACKDROPS: Array<[RegExp, string]> = [
  [/new york|brooklyn/i, '/backgrounds/times-square-ny-1920.jpg'],
  [/boston/i, '/backgrounds/boston-ma-1920.jpg'],
  [/chicago/i, '/backgrounds/chicago-il-lakefront-1920.jpg'],
  [/charleston/i, '/backgrounds/charleston-sc-1920.jpg'],
  [/miami/i, '/backgrounds/miami-fl-1920.jpg'],
  [/seattle/i, '/backgrounds/seattle-wa-1920.jpg'],
  [/philadelphia/i, '/backgrounds/philadelphia-pa-1920.jpg'],
  [/washington/i, '/backgrounds/washington-dc-1920.jpg'],
  [/niagara/i, '/backgrounds/niagara-falls-ny-1920.jpg'],
  [/portland/i, '/backgrounds/portland-me-1920.jpg'],
];

function StreetBackdrop({ city, imageUrl, notice }: { city: City; imageUrl: string | null; notice: string }) {
  const image = STREET_BACKDROPS.find(([pattern]) => pattern.test(city.city))?.[1]
    ?? '/backgrounds/manhattan-ny-1920.jpg';

  return (
    <div
      className="absolute inset-0 bg-cover bg-center"
      style={{ backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.25), rgba(2, 6, 23, 0.4)), url("${imageUrl ?? image}"), url("${image}")` }}
    >
      {!imageUrl && (
        <div className={`absolute left-4 top-[12.75rem] max-w-[min(20rem,calc(100vw-2rem))] sm:left-6 ${glass.panelOverImagery} !rounded-2xl flex items-start gap-2.5 px-4 py-2.5 text-xs text-white/85`}>
          <ImageOff className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
          <span>{notice}</span>
        </div>
      )}
      <p className="sr-only" role="status">{notice}</p>
    </div>
  );
}

function MapillaryLayer({
  spot,
  token,
  initialImageId,
  onStatus,
  onImageChange,
}: {
  spot: Spot;
  token: string;
  initialImageId?: string;
  onStatus: (status: ViewerStatus, message?: string) => void;
  onImageChange?: (imageId: string, previewUrl: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageChangeRef = useRef(onImageChange);
  const statusRef = useRef(onStatus);
  const spotRef = useRef(spot);
  const initialImageIdRef = useRef(initialImageId);
  const viewerRef = useRef<MapillaryViewer | null>(null);
  const currentImageId = useRef('');
  const activeSpotId = useRef<string | null>(null);
  const moveSequence = useRef(0);
  const thumbnailSequence = useRef(0);
  const imageReadyTimeout = useRef<number | undefined>(undefined);

  imageChangeRef.current = onImageChange;
  statusRef.current = onStatus;
  spotRef.current = spot;
  initialImageIdRef.current = initialImageId;

  const resolveImage = useCallback(async (targetSpot: Spot, preferredImageId?: string) => {
    const savedImageId = targetSpot.imageId ?? preferredImageId;
    let image: MapillaryStreetImage | null = null;
    if (savedImageId) {
      try {
        image = await getMapillaryImageById(token, savedImageId);
      } catch {
        console.warn('A imagem Mapillary salva não está disponível; buscando a mais próxima.');
      }
    }
    if (image && hasUsablePanorama(image)) return image;
    return findNearestImage(token, targetSpot.coordinates);
  }, [token]);

  const clearImageTimeout = () => {
    if (imageReadyTimeout.current !== undefined) window.clearTimeout(imageReadyTimeout.current);
    imageReadyTimeout.current = undefined;
  };

  const startImageTimeout = () => {
    clearImageTimeout();
    imageReadyTimeout.current = window.setTimeout(() => {
      statusRef.current('error', 'O Mapillary não concluiu o carregamento 360º. A foto real mais próxima continua exibida.');
    }, 15_000);
  };

  const moveToSpot = useCallback((targetSpot: Spot, preferredImageId?: string) => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    activeSpotId.current = targetSpot.id;
    const sequence = ++moveSequence.current;
    statusRef.current('loading');
    startImageTimeout();

    void resolveImage(targetSpot, preferredImageId)
      .then(async (image) => {
        if (sequence !== moveSequence.current) return;
        if (!image) throw new Error('Nenhuma imagem do Mapillary foi encontrada perto deste local.');
        currentImageId.current = image.id;
        imageChangeRef.current?.(image.id, image.thumbnailUrl);
        if (!hasUsablePanorama(image)) {
          clearImageTimeout();
          statusRef.current('error', 'Não há uma foto panorâmica compatível neste ponto. A foto real mais próxima continua exibida.');
          return;
        }
        await viewer.moveTo(image.id);
        if (sequence !== moveSequence.current) return;
        const loadedImage = await viewer.getImage();
        if (loadedImage.id !== image.id || !hasValidViewerDimensions(loadedImage)) {
          throw new Error('O Mapillary não carregou dimensões válidas para esta imagem 360º.');
        }
        clearImageTimeout();
        statusRef.current('ready');
      })
      .catch((reason: unknown) => {
        if (sequence !== moveSequence.current) return;
        clearImageTimeout();
        const message = reason instanceof Error ? reason.message : 'Falha inesperada ao carregar o Mapillary.';
        statusRef.current('error', message);
      });
  }, [resolveImage]);
  const moveToSpotRef = useRef(moveToSpot);
  moveToSpotRef.current = moveToSpot;

  useEffect(() => {
    let cancelled = false;
    let initialImageValidated = false;
    statusRef.current('loading');

    (async () => {
      try {
        const requestedSpot = spotRef.current;
        const image = await resolveImage(requestedSpot, initialImageIdRef.current);
        if (!image) throw new Error('Nenhuma imagem do Mapillary foi encontrada perto deste local.');
        imageChangeRef.current?.(image.id, image.thumbnailUrl);
        if (!hasUsablePanorama(image)) {
          statusRef.current('error', 'Não há uma foto panorâmica compatível neste ponto. A foto real mais próxima continua exibida.');
          return;
        }
        const { Viewer } = await import('mapillary-js');
        if (cancelled || !containerRef.current) return;
        currentImageId.current = image.id;
        const created = new Viewer({
          accessToken: token,
          container: containerRef.current,
          imageId: image.id,
          component: { cover: false, sequence: true, direction: true, keyboard: true },
        });
        viewerRef.current = created;
        activeSpotId.current = requestedSpot.id;
        startImageTimeout();
        created.on('image', (event) => {
          if (cancelled || currentImageId.current === event.image.id) return;
          currentImageId.current = event.image.id;
          const sequence = ++thumbnailSequence.current;
          imageChangeRef.current?.(event.image.id, null);
          void getMapillaryImageById(token, event.image.id)
            .then((nextImage) => {
              if (!cancelled && sequence === thumbnailSequence.current && currentImageId.current === nextImage.id) {
                imageChangeRef.current?.(nextImage.id, nextImage.thumbnailUrl);
                clearImageTimeout();
                if (hasUsablePanorama(nextImage)) {
                  if (initialImageValidated) statusRef.current('ready');
                } else {
                  statusRef.current('error', 'O Mapillary chegou a uma imagem sem metadados 360º válidos. A foto real continua exibida.');
                }
              }
            })
            .catch((reason: unknown) => {
              console.error('Não foi possível carregar a miniatura Mapillary desta imagem.', reason);
              if (!cancelled && sequence === thumbnailSequence.current) {
                clearImageTimeout();
                statusRef.current('error', 'Não foi possível confirmar os metadados 360º. A foto real mais próxima continua exibida.');
              }
            });
        });
        created.on('load', () => {
          if (cancelled) return;
          void created.getImage()
            .then((loadedImage) => {
              if (cancelled || loadedImage.id !== currentImageId.current) return;
              clearImageTimeout();
              if (hasValidViewerDimensions(loadedImage)) {
                initialImageValidated = true;
                statusRef.current('ready');
              } else {
                statusRef.current('error', 'O Mapillary não forneceu dimensões válidas para a imagem 360º. A foto real continua exibida.');
              }
            })
            .catch((reason: unknown) => {
              console.error('Não foi possível validar a imagem carregada pelo Mapillary.', reason);
              if (!cancelled) {
                clearImageTimeout();
                statusRef.current('error', 'Não foi possível validar a imagem 360º. A foto real continua exibida.');
              }
            });
        });
        if (spotRef.current.id !== requestedSpot.id) {
          moveToSpotRef.current(spotRef.current, initialImageIdRef.current);
        }
      } catch (reason) {
        if (!cancelled) {
          const message = reason instanceof Error ? reason.message : 'Falha inesperada ao carregar o Mapillary.';
          statusRef.current('error', message);
        }
      }
    })();

    return () => {
      cancelled = true;
      moveSequence.current += 1;
      thumbnailSequence.current += 1;
      clearImageTimeout();
      viewerRef.current?.remove();
      viewerRef.current = null;
      activeSpotId.current = null;
    };
  }, [token, resolveImage]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    if (activeSpotId.current === spot.id) return;
    moveToSpotRef.current(spot, initialImageId);
  }, [spot.id, initialImageId]);

  return <div ref={containerRef} className="absolute inset-0 bg-slate-950" />;
}

function HotspotPin({ hotspot, position, collected, onClick }: { hotspot: Hotspot; position: { left: string; top: string }; collected: boolean; onClick: () => void }) {
  const ringRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const ring = ringRef.current;
    if (!ring || collected || prefersReducedMotion()) return;
    const tween = routeAnimations.hotspotPulse(ring);
    return () => {
      tween.kill();
    };
  }, [collected]);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${hotspot.word}${collected ? ' (coletado)' : ''}`}
      className="group absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 focus:outline-none"
      style={position}
    >
      <span className="relative flex h-11 w-11 items-center justify-center">
        {!collected && <span ref={ringRef} className="pointer-events-none absolute inset-0 rounded-full border-2 border-blue-200/80" />}
        <span
          className={`relative flex h-11 w-11 items-center justify-center rounded-full border text-white shadow-lg backdrop-blur-xl transition group-hover:scale-110 group-focus-visible:ring-2 group-focus-visible:ring-blue-200 ${
            collected ? 'border-emerald-300/60 bg-emerald-400/30' : 'border-white/45 bg-blue-500/50 shadow-violet-500/30'
          }`}
        >
          {collected ? <Check className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
        </span>
      </span>
      <span className="whitespace-nowrap rounded-full border border-white/20 bg-slate-950/60 px-2.5 py-0.5 text-[11px] font-bold text-white backdrop-blur-xl">{hotspot.word}</span>
    </button>
  );
}

export default function StreetScene({ city, spot, hotspots, collectedIds, onHotspot, initialImageId, onImageChange }: Props) {
  const token = getMapillaryToken();
  const [status, setStatus] = useState<ViewerStatus>(token ? 'loading' : 'error');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [viewerError, setViewerError] = useState('');
  const handleStatus = useCallback((nextStatus: ViewerStatus, message?: string) => {
    setStatus(nextStatus);
    setViewerError(nextStatus === 'error' ? message ?? 'Não foi possível carregar as imagens reais do Mapillary.' : '');
  }, []);
  const handleImageChange = useCallback((imageId: string, imageUrl: string | null) => {
    if (imageUrl) setPreviewUrl(imageUrl);
    onImageChange?.(imageId, imageUrl);
  }, [onImageChange]);

  const usingMapillary = Boolean(token) && status !== 'error';
  const notice = previewUrl
    ? status === 'loading'
      ? 'Carregando a visão 360º. A foto real do local continua visível.'
      : viewerError || 'A visão 360º está indisponível; a foto real do Mapillary continua visível.'
    : token
      ? status === 'loading'
        ? 'Buscando uma foto real do Mapillary para este local...'
        : viewerError || 'Sem cobertura próxima do Mapillary. Foto de referência da cidade exibida.'
      : 'Configure o acesso ao Mapillary para carregar ruas reais. Foto de referência da cidade exibida.';

  return (
    <div className="absolute inset-0">
      {usingMapillary && <MapillaryLayer spot={spot} token={token} initialImageId={initialImageId} onStatus={handleStatus} onImageChange={handleImageChange} />}
      {!usingMapillary || status === 'loading' ? <StreetBackdrop city={city} imageUrl={previewUrl} notice={notice} /> : null}

      {(status === 'ready' || !token || status === 'error') &&
        hotspots.map((hotspot, index) => (
          <HotspotPin
            key={hotspot.id}
            hotspot={hotspot}
            position={PIN_POSITIONS[index % PIN_POSITIONS.length]}
            collected={collectedIds.has(`${city.id}:${hotspot.id}`)}
            onClick={() => onHotspot(hotspot.id)}
          />
        ))}

    </div>
  );
}
