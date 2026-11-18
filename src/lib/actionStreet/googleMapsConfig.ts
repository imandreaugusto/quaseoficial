import type { Coordinates } from './firstMissionIntro';

const GOOGLE_MAPS_EMBED_URL = 'https://www.google.com/maps/embed/v1/streetview';
const GOOGLE_MAPS_VIEW_EMBED_URL = 'https://www.google.com/maps/embed/v1/view';

export function getGoogleMapsApiKey(): string {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? '';
}

export function buildGoogleStreetViewEmbedUrl(apiKey: string, coordinates: Coordinates): string | null {
  if (!isValidEmbedInput(apiKey, coordinates)) return null;

  const [longitude, latitude] = coordinates;
  const params = new URLSearchParams({
    key: apiKey.trim(),
    location: `${latitude},${longitude}`,
    language: 'pt-BR',
  });
  return `${GOOGLE_MAPS_EMBED_URL}?${params.toString()}`;
}

export function buildGoogleMapsViewEmbedUrl(apiKey: string, coordinates: Coordinates): string | null {
  if (!isValidEmbedInput(apiKey, coordinates)) return null;

  const [longitude, latitude] = coordinates;
  const params = new URLSearchParams({
    key: apiKey.trim(),
    center: `${latitude},${longitude}`,
    zoom: '16',
    maptype: 'satellite',
    language: 'pt-BR',
  });
  return `${GOOGLE_MAPS_VIEW_EMBED_URL}?${params.toString()}`;
}

export function buildGoogleMapsFallbackEmbedUrl(coordinates: Coordinates): string | null {
  if (!isValidCoordinates(coordinates)) return null;

  const [longitude, latitude] = coordinates;
  const params = new URLSearchParams({
    q: `${latitude},${longitude}`,
    t: 'k',
    z: '16',
    output: 'embed',
    hl: 'pt-BR',
  });
  return `https://maps.google.com/maps?${params.toString()}`;
}

export function buildGoogleMapsStreetViewUrl(coordinates: Coordinates): string {
  const [longitude, latitude] = coordinates;
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${latitude},${longitude}`;
}

function isValidEmbedInput(apiKey: string, [longitude, latitude]: Coordinates): boolean {
  return Boolean(apiKey.trim() && isValidCoordinates([longitude, latitude]));
}

function isValidCoordinates([longitude, latitude]: Coordinates): boolean {
  return Boolean(
    Number.isFinite(longitude)
    && Number.isFinite(latitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180
  );
}
