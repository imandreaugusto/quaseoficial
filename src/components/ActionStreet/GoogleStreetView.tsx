import { ExternalLink, MapPin } from 'lucide-react';
import type { Coordinates } from '../../lib/actionStreet/firstMissionIntro';
import { buildGoogleMapsStreetViewUrl, buildGoogleStreetViewEmbedUrl, getGoogleMapsApiKey } from '../../lib/actionStreet/googleMapsConfig';

interface Props {
  coordinates: Coordinates;
  title: string;
  className?: string;
}

export default function GoogleStreetView({ coordinates, title, className = '' }: Props) {
  const embedUrl = buildGoogleStreetViewEmbedUrl(getGoogleMapsApiKey(), coordinates);
  const streetViewUrl = buildGoogleMapsStreetViewUrl(coordinates);

  return (
    <div className={`relative isolate overflow-hidden bg-slate-950 ${className}`}>
      {embedUrl ? (
        <iframe
          title={title}
          src={embedUrl}
          loading="lazy"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[radial-gradient(ellipse_at_75%_35%,rgba(72,104,144,0.35),transparent_48%),linear-gradient(135deg,#102440,#071426_72%)] p-6 text-center text-white">
          <MapPin className="h-8 w-8 text-sky-200" aria-hidden="true" />
          <p className="max-w-sm text-sm font-semibold">
            Configure VITE_GOOGLE_MAPS_API_KEY com a Maps Embed API habilitada para mostrar o Street View aqui.
          </p>
        </div>
      )}
      <a
        href={streetViewUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute right-3 top-3 z-10 inline-flex items-center gap-2 rounded-full border border-white/20 bg-slate-950/85 px-3 py-2 text-xs font-bold text-white shadow-lg transition hover:bg-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
      >
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        Abrir no Google Maps
      </a>
    </div>
  );
}
