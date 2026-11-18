import { useEffect, useRef, useState } from 'react';
import { ExternalLink, MapPin } from 'lucide-react';
import type { Coordinates } from '../../lib/actionStreet/firstMissionIntro';
import {
  buildGoogleMapsStreetViewUrl,
  buildGoogleMapsViewEmbedUrl,
  buildGoogleStreetViewEmbedUrl,
  getGoogleMapsApiKey,
} from '../../lib/actionStreet/googleMapsConfig';

const STREET_VIEW_LOAD_TIMEOUT_MS = 8_000;

interface Props {
  coordinates: Coordinates;
  title: string;
  className?: string;
  onViewChange?: (view: 'street' | 'satellite') => void;
}

export default function GoogleStreetView({ coordinates, title, className = '', onViewChange }: Props) {
  const apiKey = getGoogleMapsApiKey();
  const embedUrl = buildGoogleStreetViewEmbedUrl(apiKey, coordinates);
  const mapUrl = buildGoogleMapsViewEmbedUrl(apiKey, coordinates);
  const streetViewUrl = buildGoogleMapsStreetViewUrl(coordinates);
  const [activeView, setActiveView] = useState<'street' | 'satellite'>('satellite');
  const [streetViewStatus, setStreetViewStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!embedUrl) {
      setActiveView('satellite');
      setStreetViewStatus('failed');
      return;
    }

    setActiveView('satellite');
    setStreetViewStatus('loading');
    timeoutRef.current = window.setTimeout(() => {
      setStreetViewStatus('failed');
      setActiveView('satellite');
      timeoutRef.current = null;
    }, STREET_VIEW_LOAD_TIMEOUT_MS);

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [embedUrl]);

  useEffect(() => {
    onViewChange?.(activeView);
  }, [activeView, onViewChange]);

  const handleStreetViewLoad = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setStreetViewStatus('ready');
    setActiveView('street');
  };

  return (
    <div className={`relative isolate overflow-hidden bg-slate-950 ${className}`}>
      {mapUrl && (
        <iframe
          title={`Mapa de satélite: ${title}`}
          src={mapUrl}
          loading="eager"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className={`absolute inset-0 h-full w-full border-0 transition-opacity duration-300 ${activeView === 'satellite' ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        />
      )}
      {embedUrl && (
        <iframe
          title={title}
          src={embedUrl}
          loading="eager"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={handleStreetViewLoad}
          className={`absolute inset-0 h-full w-full border-0 transition-opacity duration-300 ${activeView === 'street' ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        />
      )}
      {!mapUrl && !embedUrl && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[radial-gradient(ellipse_at_75%_35%,rgba(72,104,144,0.35),transparent_48%),linear-gradient(135deg,#102440,#071426_72%)] p-6 text-center text-white">
          <MapPin className="h-8 w-8 text-sky-200" aria-hidden="true" />
          <p className="max-w-sm text-sm font-semibold">
            Configure VITE_GOOGLE_MAPS_API_KEY com a Maps Embed API habilitada para mostrar o Street View aqui.
          </p>
        </div>
      )}
      {mapUrl && embedUrl && (
        <div role="group" aria-label="Tipo de visualização do mapa" className="absolute left-3 top-3 z-10 inline-flex rounded-full border border-white/20 bg-slate-950/85 p-1 text-xs font-bold text-white shadow-lg">
          <button
            type="button"
            aria-pressed={activeView === 'street'}
            disabled={streetViewStatus === 'failed'}
            onClick={() => setActiveView('street')}
            className={`rounded-full px-3 py-2 transition disabled:cursor-not-allowed disabled:opacity-50 ${activeView === 'street' ? 'bg-white/20' : 'hover:bg-white/10'}`}
          >
            Street View
          </button>
          <button
            type="button"
            aria-pressed={activeView === 'satellite'}
            onClick={() => setActiveView('satellite')}
            className={`rounded-full px-3 py-2 transition ${activeView === 'satellite' ? 'bg-white/20' : 'hover:bg-white/10'}`}
          >
            Satélite
          </button>
        </div>
      )}
      {streetViewStatus === 'failed' && mapUrl && (
        <p role="status" className="absolute bottom-3 left-3 z-10 max-w-[calc(100%-1.5rem)] rounded-xl border border-white/20 bg-slate-950/85 px-3 py-2 text-xs font-semibold text-white shadow-lg">
          Street View indisponível neste ponto. Exibindo o mapa de satélite da localização.
        </p>
      )}
      <a
        href={streetViewUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute right-3 top-14 z-10 inline-flex items-center gap-2 rounded-full border border-white/20 bg-slate-950/85 px-3 py-2 text-xs font-bold text-white shadow-lg transition hover:bg-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 sm:top-3"
      >
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        Abrir no Google Maps
      </a>
    </div>
  );
}
