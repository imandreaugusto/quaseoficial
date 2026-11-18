import { useState } from 'react';
import { ChevronDown, Map as MapIcon, MapPin } from 'lucide-react';
import type { City } from '../../../types/actionStreet';
import { spotDiscoveryId } from '../../../lib/actionStreet/discovery';
import {
  buildGoogleMapsFallbackEmbedUrl,
  buildGoogleMapsViewEmbedUrl,
  getGoogleMapsApiKey,
} from '../../../lib/actionStreet/googleMapsConfig';
import { glass } from '../shared/glass';

interface Props {
  city: City;
  currentSpotId: string;
  discoveredSpotIds: Set<string>;
  unlockedRoutes: string[];
  onTravel: (spotId: string) => void;
}

export default function MiniMapGoogle({ city, currentSpotId, discoveredSpotIds, unlockedRoutes, onTravel }: Props) {
  const [expanded, setExpanded] = useState(false);
  const availableSpots = city.spots.filter((spot) => !spot.requiresRoute || unlockedRoutes.includes(spot.requiresRoute));
  const currentSpot = city.spots.find((spot) => spot.id === currentSpotId);
  const mapUrl = currentSpot
    ? buildGoogleMapsViewEmbedUrl(getGoogleMapsApiKey(), currentSpot.coordinates)
      ?? buildGoogleMapsFallbackEmbedUrl(currentSpot.coordinates)
    : null;

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

      {expanded && mapUrl && (
        <iframe
          title={`Google Maps interativo: ${currentSpot?.name ?? city.city}`}
          src={mapUrl}
          loading="eager"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="h-48 w-full border-0 sm:h-56"
        />
      )}
      <div className="flex items-center gap-2.5 border-t border-white/10 p-2.5">
        <MapPin className="h-5 w-5 shrink-0 text-sky-200" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-wider text-blue-200">
            Mapa interativo · Google Maps
          </p>
          <p className="truncate text-[11px] font-bold text-white/90">
            {currentSpot?.name ?? city.city}
          </p>
        </div>
      </div>
      {expanded && (
        <div>
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
