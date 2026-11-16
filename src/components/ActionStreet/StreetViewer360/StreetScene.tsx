import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ImageOff, Sparkles } from 'lucide-react';
import gsap from 'gsap';
import 'mapillary-js/dist/mapillary.css';
import type { City, Hotspot, Spot } from '../../../types/actionStreet';
import { MAPILLARY_ATTRIBUTION, findNearestImageId, getMapillaryToken } from '../../../lib/actionStreet/mapillaryConfig';
import { routeAnimations } from '../../../lib/actionStreet/routeAnimations';
import { glass } from '../shared/glass';

type ViewerStatus = 'loading' | 'ready' | 'error';

interface Props {
  city: City;
  spot: Spot;
  hotspots: Hotspot[];
  collectedIds: Set<string>;
  onHotspot: (hotspotId: string) => void;
}

const PIN_POSITIONS = [
  { left: '22%', top: '54%' },
  { left: '52%', top: '46%' },
  { left: '77%', top: '56%' },
];

const SKIES: Record<City['weatherPreset'], string> = {
  rainy: 'linear-gradient(to bottom, #0b1020 0%, #1b2540 55%, #2d3856 100%)',
  golden_hour: 'linear-gradient(to bottom, #1e1b4b 0%, #7c3aed 45%, #fb923c 100%)',
  clear_day: 'linear-gradient(to bottom, #0ea5e9 0%, #38bdf8 55%, #bae6fd 100%)',
  cloudy: 'linear-gradient(to bottom, #334155 0%, #64748b 60%, #94a3b8 100%)',
  snowy: 'linear-gradient(to bottom, #64748b 0%, #94a3b8 60%, #e2e8f0 100%)',
};

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

interface Building {
  x: number;
  w: number;
  h: number;
  windows: Array<[number, number]>;
}

function buildSkyline(seed: number, minHeight: number, maxHeight: number, withWindows: boolean): Building[] {
  let state = seed;
  const random = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
  const buildings: Building[] = [];
  let x = -20;
  while (x < 1620) {
    const w = 42 + random() * 70;
    const h = minHeight + random() * (maxHeight - minHeight);
    const windows: Array<[number, number]> = [];
    if (withWindows) {
      for (let wx = 8; wx < w - 10; wx += 14) {
        for (let wy = 14; wy < h - 10; wy += 18) {
          if (random() < 0.28) windows.push([wx, wy]);
        }
      }
    }
    buildings.push({ x, w, h, windows });
    x += w + random() * 8;
  }
  return buildings;
}

function FallbackScene({ weather, notice }: { weather: City['weatherPreset']; notice: string }) {
  const rainRef = useRef<HTMLDivElement>(null);
  const back = useMemo(() => buildSkyline(7, 160, 380, false), []);
  const front = useMemo(() => buildSkyline(21, 120, 300, true), []);

  useEffect(() => {
    const rain = rainRef.current;
    if (!rain || weather !== 'rainy' || prefersReducedMotion()) return;
    const tween = gsap.to(rain, { backgroundPosition: '-220px 640px', duration: 0.9, repeat: -1, ease: 'none' });
    return () => {
      tween.kill();
    };
  }, [weather]);

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: SKIES[weather] }}>
      <div className="absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-fuchsia-500/25 blur-3xl" />
      <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-blue-500/25 blur-3xl" />
      <div className="absolute left-1/3 top-1/2 h-60 w-60 rounded-full bg-amber-400/15 blur-3xl" />

      <svg className="absolute inset-x-0 bottom-0 h-[72%] w-full" viewBox="0 0 1600 600" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <g fill="#0f172a" opacity="0.45">
          {back.map((b, index) => (
            <rect key={index} x={b.x} y={600 - b.h - 40} width={b.w} height={b.h + 40} />
          ))}
        </g>
        <g>
          {front.map((b, index) => (
            <g key={index} transform={`translate(${b.x} ${600 - b.h})`}>
              <rect width={b.w} height={b.h} fill="#020617" opacity="0.9" />
              {b.windows.map(([wx, wy]) => (
                <rect key={`${wx}-${wy}`} x={wx} y={wy} width="5" height="8" fill="#fde68a" opacity="0.75" />
              ))}
            </g>
          ))}
        </g>
      </svg>

      <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/80 via-slate-950/50 to-transparent" />
      <div className="absolute inset-x-0 bottom-[12%] h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      {weather === 'rainy' && (
        <div
          ref={rainRef}
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage: 'repeating-linear-gradient(105deg, transparent 0 16px, rgba(186,214,255,0.35) 16px 17px)',
            backgroundSize: '220px 220px',
          }}
        />
      )}

      <div className={`absolute left-4 top-[12.75rem] max-w-[min(20rem,calc(100vw-2rem))] sm:left-6 ${glass.panelOverImagery} !rounded-2xl flex items-start gap-2.5 px-4 py-2.5 text-xs text-white/85`}>
        <ImageOff className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
        <span>{notice}</span>
      </div>
    </div>
  );
}

function MapillaryLayer({ spot, token, onStatus }: { spot: Spot; token: string; onStatus: (status: ViewerStatus) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let viewer: { remove: () => void } | null = null;
    onStatus('loading');

    (async () => {
      try {
        const imageId = spot.imageId ?? (await findNearestImageId(token, spot.coordinates));
        if (!imageId) throw new Error('Nenhuma imagem 360º encontrada perto deste ponto.');
        const { Viewer } = await import('mapillary-js');
        if (cancelled || !containerRef.current) return;
        viewer = new Viewer({ accessToken: token, container: containerRef.current, imageId, component: { cover: false } });
        onStatus('ready');
      } catch {
        if (!cancelled) onStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      viewer?.remove();
    };
  }, [spot, token, onStatus]);

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

export default function StreetScene({ city, spot, hotspots, collectedIds, onHotspot }: Props) {
  const token = getMapillaryToken();
  const [status, setStatus] = useState<ViewerStatus>(token ? 'loading' : 'error');

  const usingMapillary = Boolean(token) && status !== 'error';
  const notice = token
    ? 'Não encontramos imagens 360º neste ponto. Mostrando uma cena ilustrada.'
    : 'Cena ilustrada. Para ruas reais em 360º, adicione VITE_MAPILLARY_ACCESS_TOKEN no .env.';

  return (
    <div className="absolute inset-0">
      {token && <MapillaryLayer spot={spot} token={token} onStatus={setStatus} />}
      {!usingMapillary && <FallbackScene weather={city.weatherPreset} notice={notice} />}

      {status === 'loading' && token && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/50">
          <span className={`${glass.panelOverImagery} !rounded-full px-5 py-2.5 text-sm font-bold text-white`}>Carregando a rua em 360º...</span>
        </div>
      )}

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

      {usingMapillary && status === 'ready' && (
        <p className="pointer-events-none absolute bottom-1.5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-950/60 px-3 py-0.5 text-[10px] text-white/80 backdrop-blur">{MAPILLARY_ATTRIBUTION}</p>
      )}
    </div>
  );
}
