import { useEffect, useRef, useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import gsap from 'gsap';
import type { City, Hotspot, Spot } from '../../../types/actionStreet';
import { routeAnimations } from '../../../lib/actionStreet/routeAnimations';
import GoogleStreetView from '../GoogleStreetView';
import { glass } from '../shared/glass';

interface Props {
  city: City;
  spot: Spot;
  hotspots: Hotspot[];
  collectedIds: Set<string>;
  onHotspot: (hotspotId: string) => void;
  paused: boolean;
}

const PIN_POSITIONS = [
  { left: '22%', top: '54%' },
  { left: '52%', top: '46%' },
  { left: '77%', top: '56%' },
];

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function HotspotPin({ hotspot, position, collected, onClick }: { hotspot: Hotspot; position: { left: string; top: string }; collected: boolean; onClick: () => void }) {
  const ringRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const ring = ringRef.current;
    if (!ring || collected || prefersReducedMotion()) return;
    const context = gsap.context(() => {
      routeAnimations.hotspotPulse(ring);
    }, ring);
    return () => context.revert();
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
          className={`relative flex h-11 w-11 items-center justify-center rounded-full border text-white shadow-lg transition group-hover:scale-110 group-focus-visible:ring-2 group-focus-visible:ring-blue-200 ${
            collected ? 'border-emerald-300/60 bg-emerald-400/30' : 'border-white/45 bg-blue-500/50 shadow-violet-500/30'
          }`}
        >
          {collected ? <Check className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
        </span>
      </span>
      <span className="whitespace-nowrap rounded-full border border-white/20 bg-slate-950/85 px-2.5 py-0.5 text-[11px] font-bold text-white">{hotspot.word}</span>
    </button>
  );
}

export default function StreetScene({ city, spot, hotspots, collectedIds, onHotspot, paused }: Props) {
  const [viewMode, setViewMode] = useState<'street' | 'satellite'>('satellite');

  return (
    <div className={`absolute inset-0 ${paused ? 'pointer-events-none' : ''}`}>
      <GoogleStreetView
        coordinates={spot.coordinates}
        title={`Google Street View: ${spot.name}, ${city.city}`}
        className="absolute inset-0"
        onViewChange={setViewMode}
      />
      <p className={`absolute left-4 top-[12.75rem] z-10 max-w-[min(20rem,calc(100vw-2rem))] px-4 py-2.5 text-xs text-white/90 sm:left-6 ${glass.panelOverImagery}`}>
        Google Maps · {viewMode === 'street' ? 'Street View' : 'Satélite'} · {spot.name}, {city.city}
      </p>
      {hotspots.map((hotspot, index) => (
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
