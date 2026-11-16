import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import gsap from 'gsap';
import { length as turfLength, lineSliceAlong, lineString, along } from '@turf/turf';
import type { City } from '../../../types/actionStreet';
import { OPENFREEMAP_STYLES, canUseWebGL, hasBuildingExtrusion } from '../../../lib/actionStreet/maplibreConfig';

export type DiveStage = 'loading' | 'flying' | 'route' | 'landing' | 'failed';

interface Props {
  city: City;
  onStage: (stage: DiveStage) => void;
  onDiveComplete: () => void;
}

const SKY: Record<City['weatherPreset'], Record<string, string>> = {
  rainy: { 'sky-color': '#1e293b', 'horizon-color': '#64748b', 'fog-color': '#94a3b8' },
  golden_hour: { 'sky-color': '#7c3aed', 'horizon-color': '#fb923c', 'fog-color': '#fcd34d' },
  clear_day: { 'sky-color': '#38bdf8', 'horizon-color': '#e0f2fe', 'fog-color': '#ffffff' },
  cloudy: { 'sky-color': '#64748b', 'horizon-color': '#cbd5e1', 'fog-color': '#e2e8f0' },
  snowy: { 'sky-color': '#94a3b8', 'horizon-color': '#f1f5f9', 'fog-color': '#ffffff' },
};

const LOAD_TIMEOUT_MS = 15000;

export default function Map3DViewer({ city, onStage, onDiveComplete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onStage, onDiveComplete });

  useEffect(() => {
    callbacks.current = { onStage, onDiveComplete };
  }, [onStage, onDiveComplete]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const stage = (value: DiveStage) => callbacks.current.onStage(value);

    if (!canUseWebGL()) {
      stage('failed');
      return;
    }

    let cancelled = false;
    let routeTween: gsap.core.Tween | null = null;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container,
        style: OPENFREEMAP_STYLES.city,
        center: city.camera.center,
        zoom: 3.2,
        pitch: 0,
        bearing: 0,
        interactive: false,
        attributionControl: { compact: true },
        canvasContextAttributes: { antialias: true },
      });
    } catch {
      stage('failed');
      return;
    }

    stage('loading');
    const watchdog = window.setTimeout(() => {
      if (!cancelled) stage('failed');
    }, LOAD_TIMEOUT_MS);

    const finishDive = () => {
      if (!cancelled) callbacks.current.onDiveComplete();
    };

    // Espera os tiles do destino carregarem (com teto de tempo) para o voo nunca terminar num mapa vazio.
    const whenIdle = (then: () => void, timeoutMs: number) => {
      let done = false;
      const go = () => {
        if (done || cancelled) return;
        done = true;
        window.clearTimeout(timer);
        then();
      };
      const timer = window.setTimeout(go, timeoutMs);
      if (map.loaded() && !map.isMoving()) go();
      else map.once('idle', go);
    };

    const land = () => {
      if (cancelled) return;
      stage('landing');
      const spot = city.spots[0];
      map.flyTo({
        center: spot.coordinates,
        zoom: 18,
        pitch: 76,
        bearing: city.camera.bearing + 25,
        duration: 2600,
        essential: true,
      });
      map.once('moveend', () => whenIdle(finishDive, 4000));
    };

    const drawRoute = () => {
      if (cancelled) return;
      stage('route');
      const line = lineString(city.route3D.waypoints);
      const total = turfLength(line, { units: 'kilometers' });
      const source = map.getSource('route') as maplibregl.GeoJSONSource;
      const progress = { value: 0 };
      routeTween = gsap.to(progress, {
        value: 1,
        duration: 4,
        ease: 'power1.inOut',
        onUpdate: () => {
          if (progress.value < 0.005) return;
          source.setData(lineSliceAlong(line, 0, total * progress.value, { units: 'kilometers' }));
          const head = along(line, total * progress.value, { units: 'kilometers' }).geometry.coordinates as [number, number];
          map.jumpTo({ center: head, bearing: city.camera.bearing + progress.value * 25, pitch: city.camera.pitch });
        },
        onComplete: land,
      });
    };

    map.once('load', () => {
      if (cancelled) return;
      window.clearTimeout(watchdog);

      if (!hasBuildingExtrusion(map.getStyle())) {
        try {
          map.addLayer({
            id: 'building-3d',
            source: 'openmaptiles',
            'source-layer': 'building',
            type: 'fill-extrusion',
            minzoom: 14,
            paint: {
              'fill-extrusion-color': '#94a3b8',
              'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 12],
              'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
              'fill-extrusion-opacity': 0.8,
            },
          });
        } catch {
          // o estilo continua útil sem a camada extra
        }
      }

      try {
        map.setSky({ ...SKY[city.weatherPreset], 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.6, 'fog-ground-blend': 0.4 });
      } catch {
        // estilo/versão sem suporte a sky: segue sem atmosfera
      }

      map.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'route-glow',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#8b5cf6', 'line-width': 16, 'line-blur': 10, 'line-opacity': 0.8 },
      });
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#bfdbfe', 'line-width': 5 },
      });

      stage('flying');
      map.flyTo({
        center: city.camera.center,
        zoom: city.camera.zoom,
        pitch: city.camera.pitch,
        bearing: city.camera.bearing,
        duration: 5200,
        curve: 1.6,
        essential: true,
      });
      map.once('moveend', () => whenIdle(drawRoute, 8000));
    });

    return () => {
      cancelled = true;
      window.clearTimeout(watchdog);
      routeTween?.kill();
      map.remove();
    };
  }, [city]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
