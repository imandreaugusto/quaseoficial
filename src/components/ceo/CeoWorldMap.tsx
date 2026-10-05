import React, { useLayoutEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import { COUNTRY_COORDS, LAND_ROWS, MAP_LAT_BOTTOM, MAP_LAT_TOP, MAP_STEP, normalizeCountryName } from './ceoMapData';

export interface MapCountry {
  name: string;
  count: number;
}

const WIDTH = 720;
const HEIGHT = 268;
const project = (lat: number, lon: number) => ({
  x: ((lon + 180) / 360) * WIDTH,
  y: ((MAP_LAT_TOP - lat) / (MAP_LAT_TOP - MAP_LAT_BOTTOM)) * HEIGHT
});

const BUBBLE_COLORS = ['#38bdf8', '#a78bfa', '#f472b6', '#34d399', '#fbbf24'];

export const CeoWorldMap: React.FC<{ countries: MapCountry[] }> = ({ countries }) => {
  const rootRef = useRef<SVGSVGElement | null>(null);

  const dots = useMemo(() => {
    const result: Array<{ x: number; y: number }> = [];
    LAND_ROWS.forEach(([lat, ranges]) => {
      ranges.forEach(([from, to]) => {
        for (let lon = Math.ceil(from / MAP_STEP) * MAP_STEP; lon <= to; lon += MAP_STEP) result.push(project(lat, lon));
      });
    });
    return result;
  }, []);

  const bubbles = useMemo(() => {
    const max = Math.max(1, ...countries.map((country) => country.count));
    return countries
      .map((country, index) => {
        const coords = COUNTRY_COORDS[normalizeCountryName(country.name)];
        if (!coords) return null;
        const { x, y } = project(coords[0], coords[1]);
        return { ...country, x, y, r: 5 + Math.sqrt(country.count / max) * 11, color: BUBBLE_COLORS[index % BUBBLE_COLORS.length] };
      })
      .filter((bubble): bubble is NonNullable<typeof bubble> => bubble !== null);
  }, [countries]);

  useLayoutEffect(() => {
    const svg = rootRef.current;
    if (!svg || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const context = gsap.context(() => {
      gsap.from('.map-dot', { opacity: 0, duration: 0.5, stagger: { amount: 1.4, from: 'center' }, ease: 'power1.out' });
      gsap.from('.map-bubble', { scale: 0, transformOrigin: '50% 50%', duration: 0.9, delay: 0.7, stagger: 0.12, ease: 'elastic.out(1, 0.5)' });
      gsap.to('.map-pulse', { scale: 1.9, opacity: 0, transformOrigin: '50% 50%', duration: 2.2, repeat: -1, stagger: 0.4, ease: 'sine.out' });
    }, svg);
    return () => context.revert();
  }, [dots, bubbles]);

  return (
    <svg ref={rootRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-full w-full" role="img" aria-label="Mapa-múndi com a localização dos assinantes">
      <g fill="rgba(255,255,255,0.6)">
        {dots.map((dot, index) => (
          <circle key={index} className="map-dot" cx={dot.x} cy={dot.y} r={1.7} />
        ))}
      </g>
      {bubbles.map((bubble) => (
        <g key={bubble.name}>
          <circle className="map-pulse" cx={bubble.x} cy={bubble.y} r={bubble.r} fill="none" stroke={bubble.color} strokeWidth={1.5} />
          <circle className="map-bubble" cx={bubble.x} cy={bubble.y} r={bubble.r} fill={bubble.color} fillOpacity={0.75} stroke="white" strokeOpacity={0.7} strokeWidth={1}>
            <title>{`${bubble.name}: ${bubble.count}`}</title>
          </circle>
        </g>
      ))}
    </svg>
  );
};
