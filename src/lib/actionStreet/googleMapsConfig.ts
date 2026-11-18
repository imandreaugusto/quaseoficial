import type { Coordinates } from './firstMissionIntro';

const GOOGLE_MAPS_EMBED_URL = 'https://www.google.com/maps/embed/v1/streetview';

export function getGoogleMapsApiKey(): string {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? '';
}

export function buildGoogleStreetViewEmbedUrl(apiKey: string, coordinates: Coordinates): string | null {
  const [longitude, latitude] = coordinates;
  if (
    !apiKey.trim()
    || !Number.isFinite(longitude)
    || !Number.isFinite(latitude)
    || latitude < -90
    || latitude > 90
    || longitude < -180
    || longitude > 180
  ) {
    return null;
  }

  const params = new URLSearchParams({
    key: apiKey.trim(),
    location: `${latitude},${longitude}`,
    language: 'pt-BR',
  });
  return `${GOOGLE_MAPS_EMBED_URL}?${params.toString()}`;
}

export function buildGoogleMapsStreetViewUrl(coordinates: Coordinates): string {
  const [longitude, latitude] = coordinates;
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${latitude},${longitude}`;
}
