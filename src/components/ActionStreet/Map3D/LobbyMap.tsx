import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import gsap from 'gsap';
import { bearing as turfBearing, greatCircle } from '@turf/turf';
import type { City } from '../../../types/actionStreet';
import { OPENFREEMAP_STYLES, canUseWebGL } from '../../../lib/actionStreet/maplibreConfig';

interface Props {
  cities: City[];
  unlocked: string[];
  selectedId: string;
  origin: { name: string; coordinates: [number, number] };
  onSelect: (cityId: string) => void;
}

const PIN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
const LOCK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
const PLANE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>';

interface PinParts {
  root: HTMLDivElement;
  button: HTMLButtonElement;
  ring: HTMLSpanElement;
  icon: HTMLSpanElement;
}

function createPin(city: City, onClick: () => void): PinParts {
  const root = document.createElement('div');
  root.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;';

  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative;width:40px;height:40px;';

  const ring = document.createElement('span');
  ring.style.cssText = 'position:absolute;inset:0;border-radius:9999px;pointer-events:none;';
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', `Selecionar ${city.city}`);
  button.style.cssText =
    'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;border-radius:9999px;border:1px solid rgba(255,255,255,0.45);backdrop-filter:blur(10px);cursor:pointer;color:#fff;';
  const icon = document.createElement('span');
  icon.style.cssText = 'display:flex;';
  button.appendChild(icon);
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    onClick();
  });

  const label = document.createElement('span');
  label.textContent = city.stateName;
  label.style.cssText =
    'padding:2px 8px;border-radius:9999px;font:700 11px system-ui,sans-serif;color:#fff;background:rgba(2,6,23,0.55);border:1px solid rgba(255,255,255,0.2);backdrop-filter:blur(8px);white-space:nowrap;';

  wrap.append(ring, button);
  root.append(wrap, label);
  return { root, button, ring, icon };
}

// Cidades quase coladas no mapa (ex.: NY e NJ) viram um leque horizontal para os pinos não se sobreporem.
function fanOutOffsets(cities: City[]): Record<string, [number, number]> {
  const offsets: Record<string, [number, number]> = {};
  const placed = new Set<string>();
  for (const city of cities) {
    if (placed.has(city.id)) continue;
    const [lng, lat] = city.camera.center;
    const group = cities
      .filter((other) => Math.abs(other.camera.center[0] - lng) < 1.5 && Math.abs(other.camera.center[1] - lat) < 1.5)
      .sort((a, b) => a.camera.center[0] - b.camera.center[0]);
    group.forEach((member, index) => {
      placed.add(member.id);
      offsets[member.id] = [(index - (group.length - 1) / 2) * 88, 0];
    });
  }
  return offsets;
}

export default function LobbyMap({ cities, unlocked, selectedId, origin, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const pinsRef = useRef<Map<string, PinParts>>(new Map());
  const planeRef = useRef<HTMLDivElement | null>(null);
  const planeTween = useRef<gsap.core.Tween | null>(null);
  const onSelectRef = useRef(onSelect);
  const [mapReady, setMapReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!canUseWebGL()) {
      setFailed(true);
      return;
    }

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container,
        style: OPENFREEMAP_STYLES.night,
        center: [-75, 15],
        zoom: 2.2,
        pitch: 30,
        attributionControl: false,
        dragRotate: false,
      });
    } catch {
      setFailed(true);
      return;
    }
    mapRef.current = map;

    const bounds = new maplibregl.LngLatBounds(origin.coordinates, origin.coordinates);
    cities.forEach((city) => bounds.extend(city.camera.center));
    map.once('load', () => {
      const narrow = window.innerWidth < 640;
      map.fitBounds(bounds, {
        padding: { top: narrow ? 210 : 120, bottom: narrow ? 360 : 300, left: narrow ? 30 : 70, right: narrow ? 30 : 70 },
        maxZoom: 4.6,
        duration: 0,
      });

      map.addSource('arc', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'arc-glow',
        type: 'line',
        source: 'arc',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#8b5cf6', 'line-width': 9, 'line-blur': 7, 'line-opacity': 0.55 },
      });
      map.addLayer({
        id: 'arc-line',
        type: 'line',
        source: 'arc',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#93c5fd', 'line-width': 2.4 },
      });
      setMapReady(true);
    });

    const originEl = document.createElement('div');
    originEl.style.cssText =
      'padding:3px 10px;border-radius:9999px;font:700 11px system-ui,sans-serif;color:#fff;background:rgba(59,130,246,0.45);border:1px solid rgba(147,197,253,0.6);backdrop-filter:blur(8px);white-space:nowrap;';
    originEl.textContent = origin.name;
    const originMarker = new maplibregl.Marker({ element: originEl }).setLngLat(origin.coordinates).addTo(map);

    const pins = pinsRef.current;
    const offsets = fanOutOffsets(cities);
    const markers = cities.map((city) => {
      const pin = createPin(city, () => onSelectRef.current(city.id));
      pins.set(city.id, pin);
      return new maplibregl.Marker({ element: pin.root, anchor: 'bottom', offset: offsets[city.id] }).setLngLat(city.camera.center).addTo(map);
    });

    const planeEl = document.createElement('div');
    planeEl.style.cssText = 'color:#fff;filter:drop-shadow(0 0 8px rgba(147,197,253,0.9));pointer-events:none;';
    planeEl.innerHTML = PLANE_SVG;
    planeRef.current = planeEl;

    return () => {
      planeTween.current?.kill();
      pins.forEach((pin) => gsap.killTweensOf(pin.ring));
      pins.clear();
      originMarker.remove();
      markers.forEach((marker) => marker.remove());
      planeRef.current = null;
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [cities, origin]);

  useEffect(() => {
    pinsRef.current.forEach((pin, cityId) => {
      const isUnlocked = unlocked.includes(cityId);
      const isSelected = cityId === selectedId;
      pin.icon.innerHTML = isUnlocked ? PIN_SVG : LOCK_SVG;
      pin.button.style.background = isUnlocked ? 'rgba(59,130,246,0.55)' : 'rgba(15,23,42,0.6)';
      pin.button.style.boxShadow = isSelected ? '0 0 0 3px rgba(196,181,253,0.9), 0 0 24px rgba(139,92,246,0.8)' : '0 4px 14px rgba(0,0,0,0.4)';
      pin.ring.style.border = `2px solid ${isUnlocked ? 'rgba(147,197,253,0.9)' : 'rgba(148,163,184,0.5)'}`;
      gsap.killTweensOf(pin.ring);
      gsap.fromTo(pin.ring, { scale: 1, opacity: 0.8 }, { scale: isSelected ? 2.6 : 2, opacity: 0, duration: isSelected ? 1.4 : 2.2, repeat: -1, ease: 'power1.out' });
      gsap.to(pin.button, { scale: isSelected ? 1.18 : 1, duration: 0.25, ease: 'power2.out' });
    });
  }, [unlocked, selectedId, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const planeEl = planeRef.current;
    const target = cities.find((city) => city.id === selectedId);
    if (!mapReady || !map || !planeEl || !target) return;

    const arc = greatCircle(origin.coordinates, target.camera.center, { npoints: 140 });
    const coordinates = (arc.geometry.type === 'LineString' ? arc.geometry.coordinates : arc.geometry.coordinates.flat()) as [number, number][];
    (map.getSource('arc') as maplibregl.GeoJSONSource).setData(arc);

    planeTween.current?.kill();
    const plane = new maplibregl.Marker({ element: planeEl, rotationAlignment: 'map' }).setLngLat(coordinates[0]).addTo(map);
    const progress = { value: 0 };
    planeTween.current = gsap.to(progress, {
      value: coordinates.length - 1,
      duration: 7,
      ease: 'none',
      repeat: -1,
      repeatDelay: 0.8,
      onUpdate: () => {
        const index = Math.min(Math.floor(progress.value), coordinates.length - 2);
        const from = coordinates[index];
        const to = coordinates[index + 1];
        plane.setLngLat(from);
        plane.setRotation(turfBearing(from, to) - 45);
      },
    });

    return () => {
      planeTween.current?.kill();
      plane.remove();
    };
  }, [mapReady, selectedId, cities, origin]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" />
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950">
          <p className="max-w-xs text-center text-sm text-white/60">O mapa 3D precisa de WebGL. Você ainda pode escolher o destino abaixo.</p>
        </div>
      )}
    </div>
  );
}
