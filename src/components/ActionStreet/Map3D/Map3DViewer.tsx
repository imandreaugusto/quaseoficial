import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import gsap from 'gsap';
import type { City } from '../../../types/actionStreet';

interface Props {
  city: City;
  onAnimationComplete?: () => void;
}

export default function Map3DViewer({ city, onAnimationComplete }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Criar mapa com estilo OpenFreeMap
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: city.camera.center as [number, number],
      zoom: city.camera.zoom,
      pitch: 0,
      bearing: 0,
      antialias: true,
    });

    map.current.on('load', () => {
      // Adicionar camada de prédios 3D
      if (map.current?.getSource('openmaptiles')) {
        // Já existe fonte
        if (!map.current.getLayer('building-3d')) {
          map.current.addLayer(
            {
              id: 'building-3d',
              source: 'openmaptiles',
              'source-layer': 'building',
              type: 'fill-extrusion',
              minzoom: 15,
              paint: {
                'fill-extrusion-color': '#aaa',
                'fill-extrusion-height': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  15,
                  0,
                  15.05,
                  ['get', 'height'],
                ],
                'fill-extrusion-base': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  15,
                  0,
                  15.05,
                  ['get', 'min_height'],
                ],
                'fill-extrusion-opacity': 0.6,
              },
            },
            'water'
          );
        }
      }

      // Animar câmera para posição final
      animateCamera();
    });

    return () => {
      map.current?.remove();
    };
  }, [city]);

  const animateCamera = () => {
    if (!map.current) return;

    // Animar para posição 3D com GSAP
    const startCamera = {
      center: map.current.getCenter(),
      zoom: map.current.getZoom(),
      pitch: 0,
      bearing: 0,
    };

    const endCamera = {
      center: city.camera.center,
      zoom: city.camera.zoom,
      pitch: city.camera.pitch,
      bearing: city.camera.bearing,
    };

    gsap.to(startCamera, {
      zoom: endCamera.zoom,
      pitch: endCamera.pitch,
      bearing: endCamera.bearing,
      duration: 3,
      ease: 'power2.inOut',
      onUpdate: () => {
        if (map.current) {
          map.current.setPitch(startCamera.pitch);
          map.current.setBearing(startCamera.bearing);
          map.current.setZoom(startCamera.zoom);
        }
      },
      onComplete: () => {
        onAnimationComplete?.();
      },
    });

    // Animar o movimento do centro separadamente
    map.current.flyTo({
      center: endCamera.center,
      zoom: endCamera.zoom,
      pitch: endCamera.pitch,
      bearing: endCamera.bearing,
      duration: 3000,
      easing: (t) => {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      },
    });
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Overlay com info */}
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
        <div className="bg-black/40 backdrop-blur-sm px-6 py-4 rounded-lg text-center">
          <h2 className="text-2xl font-bold text-white mb-2">{city.city}</h2>
          <p className="text-white/70 text-sm">{city.touristGuide.title}</p>
        </div>
      </div>

      {/* Atribuição CC BY-SA 4.0 */}
      <div className="absolute bottom-4 right-4 text-[10px] text-white/50 bg-black/30 px-2 py-1 rounded">
        © OpenFreeMap • Map data © OpenStreetMap
      </div>
    </div>
  );
}
