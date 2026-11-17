import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ChevronDown, Map as MapIcon, MapPin } from 'lucide-react';
import type { City } from '../../../types/actionStreet';
import { OPENFREEMAP_STYLES, canUseWebGL } from '../../../lib/actionStreet/maplibreConfig';
import { MAPILLARY_ATTRIBUTION } from '../../../lib/actionStreet/mapillaryConfig';
import { spotDiscoveryId } from '../../../lib/actionStreet/discovery';
import { glass } from '../shared/glass';

interface Props {
  city: City;
  currentSpotId: string;
  discoveredSpotIds: Set<string>;
  unlockedRoutes: string[];
  imagePreviewUrl: string | null;
  onTravel: (spotId: string) => void;
}

export default function MiniMap3D({ city, currentSpotId, discoveredSpotIds, unlockedRoutes, imagePreviewUrl, onTravel }: Props) {
  const [expanded, setExpanded] = useState(() => window.innerWidth >= 768);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const travelRef = useRef(onTravel);
  const currentRef = useRef(currentSpotId);
  const discoveredRef = useRef(discoveredSpotIds);
  const availableSpots = city.spots.filter((spot) => !spot.requiresRoute || unlockedRoutes.includes(spot.requiresRoute));

  useEffect(() => {
    travelRef.current = onTravel;
    currentRef.current = currentSpotId;
    discoveredRef.current = discoveredSpotIds;
  }, [onTravel, currentSpotId, discoveredSpotIds]);

  useEffect(() => {
    const container = containerRef.current;
    if (!expanded || !container || !canUseWebGL()) return;

    const start = city.spots.find((spot) => spot.id === currentRef.current) ?? city.spots[0];
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container,
        style: OPENFREEMAP_STYLES.city,
        center: start.coordinates,
        zoom: 15.4,
        pitch: 58,
        bearing: city.camera.bearing,
        interactive: false,
        attributionControl: { compact: true },
      });
    } catch {
      return;
    }
    mapRef.current = map;

    map.once('load', () => {
      map.addSource('mini-route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: city.route3D.waypoints } },
      });
      map.addLayer({ id: 'mini-route-glow', type: 'line', source: 'mini-route', paint: { 'line-color': '#8b5cf6', 'line-width': 9, 'line-blur': 6, 'line-opacity': 0.8 } });
      map.addLayer({ id: 'mini-route-line', type: 'line', source: 'mini-route', paint: { 'line-color': '#bfdbfe', 'line-width': 3 } });
    });

    const markers = availableSpots.map((spot) => {
      const button = document.createElement('button');
      button.type = 'button';
      const discovered = discoveredRef.current.has(spotDiscoveryId(city.id, spot.id));
      button.title = `${spot.name}${discovered ? ' · descoberto' : ' · novo local'}`;
      button.setAttribute('aria-label', `${discovered ? 'Visitar' : 'Explorar'} ${spot.name}`);
      button.style.cssText = 'width:22px;height:22px;border-radius:9999px;border:2px solid #fff;cursor:pointer;backdrop-filter:blur(6px);transition:transform .2s;';
      button.style.borderStyle = discovered ? 'solid' : 'dashed';
      button.addEventListener('click', () => {
        if (spot.id !== currentRef.current) travelRef.current(spot.id);
      });
      markersRef.current.set(spot.id, button);
      return new maplibregl.Marker({ element: button }).setLngLat(spot.coordinates).addTo(map);
    });

    return () => {
      markers.forEach((marker) => marker.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, [expanded, city, unlockedRoutes]);

  useEffect(() => {
    markersRef.current.forEach((button, spotId) => {
      const active = spotId === currentSpotId;
      const discovered = discoveredSpotIds.has(spotDiscoveryId(city.id, spotId));
      button.style.background = active ? '#8b5cf6' : discovered ? 'rgba(16,185,129,0.8)' : 'rgba(59,130,246,0.35)';
      button.style.borderStyle = discovered ? 'solid' : 'dashed';
      button.style.transform = active ? 'scale(1.35)' : 'scale(1)';
      button.style.boxShadow = active ? '0 0 16px rgba(139,92,246,0.9)' : discovered ? '0 0 10px rgba(16,185,129,0.5)' : '0 2px 8px rgba(0,0,0,0.4)';
    });
    const spot = city.spots.find((item) => item.id === currentSpotId);
    if (spot) mapRef.current?.flyTo({ center: spot.coordinates, zoom: 15.8, pitch: 62, duration: 1800, essential: true });
  }, [currentSpotId, city, expanded, discoveredSpotIds, unlockedRoutes]);

  const currentSpotName = city.spots.find((spot) => spot.id === currentSpotId)?.name ?? city.city;

  return (
    <aside className={`absolute bottom-[5.25rem] right-4 z-20 w-[min(17rem,calc(100vw-2rem))] overflow-hidden text-white sm:bottom-6 sm:right-6 ${glass.panelOverImagery}`}>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-white/5"
      >
        <span className="flex items-center gap-2">
          <MapIcon className="h-4 w-4 text-blue-300" />
          <span className="text-sm font-black">Minimapa</span>
        </span>
        <ChevronDown className={`h-4 w-4 text-white/60 transition-transform ${expanded ? '' : '-rotate-180'}`} />
      </button>

      {expanded && (
        <div className="border-t border-white/10">
          {canUseWebGL() && <div ref={containerRef} className="h-40 w-full" />}
          <div className="flex items-center gap-2.5 border-t border-white/10 p-2.5">
            {imagePreviewUrl ? (
              <img
                src={imagePreviewUrl}
                alt={`Imagem real da rua perto de ${currentSpotName}`}
                className="h-12 w-16 shrink-0 rounded-lg border border-white/15 object-cover"
              />
            ) : (
              <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-slate-950/40 text-[9px] text-white/55">
                Mapillary
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-blue-200">
                {imagePreviewUrl ? 'Foto real · Mapillary' : 'Buscando foto Mapillary'}
              </p>
              <p className="truncate text-[11px] font-bold text-white/90">
                {currentSpotName}
              </p>
              {imagePreviewUrl && <p className="truncate text-[9px] text-white/55">{MAPILLARY_ATTRIBUTION}</p>}
            </div>
          </div>
          <ul className="flex flex-wrap gap-1.5 p-3">
            {availableSpots.map((spot) => {
              const active = spot.id === currentSpotId;
              return (
                <li key={spot.id}>
                  <button
                    type="button"
                    aria-current={active ? 'location' : undefined}
                    onClick={() => !active && onTravel(spot.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold transition ${glass.chip} ${active ? glass.chipActive : discoveredSpotIds.has(spotDiscoveryId(city.id, spot.id)) ? 'text-emerald-100 hover:bg-white/15' : 'text-white/75 hover:bg-white/15'}`}
                  >
                    <MapPin className="h-3 w-3" />
                    {spot.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </aside>
  );
}
