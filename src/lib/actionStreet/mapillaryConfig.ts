const GRAPH_URL = 'https://graph.mapillary.com/images';
const IMAGE_RADIUS_METERS = 50;
const MAX_BBOX_RADIUS_DEGREES = 0.004;

export const MAPILLARY_ATTRIBUTION = 'Imagery © Mapillary contributors, CC BY-SA 4.0';

export interface MapillaryStreetImage {
  id: string;
  coordinates?: [number, number];
  thumbnailUrl: string | null;
  isPano: boolean;
  width?: number;
  height?: number;
}

export const getMapillaryToken = (): string => {
  const token = (import.meta.env.VITE_MAPILLARY_ACCESS_TOKEN as string | undefined)?.trim() ?? '';
  const isPlaceholder = !token || token.startsWith('your-') || token.includes('here');
  return isPlaceholder ? '' : token;
};

export const isMapillaryAvailable = (): boolean => getMapillaryToken().length > 0;

interface GraphImage {
  id: string;
  computed_geometry?: { coordinates: [number, number] };
  geometry?: { coordinates: [number, number] };
  thumb_1024_url?: string;
  thumb_2048_url?: string;
  is_pano?: boolean;
  width?: number;
  height?: number;
}

const distanceSquared = (a: [number, number], b: [number, number]) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;

function hasUsablePanorama(image: GraphImage): boolean {
  return image.is_pano === true
    && typeof image.width === 'number'
    && Number.isFinite(image.width)
    && image.width > 0
    && typeof image.height === 'number'
    && Number.isFinite(image.height)
    && image.height > 0;
}

function closestImage(images: GraphImage[], center: [number, number]): GraphImage | null {
  let best: GraphImage | null = null;
  let bestDistance = Infinity;
  for (const image of images) {
    const position = image.computed_geometry?.coordinates ?? image.geometry?.coordinates;
    if (!position) continue;
    const distance = distanceSquared(position, center);
    if (distance < bestDistance) {
      best = image;
      bestDistance = distance;
    }
  }
  return best;
}

function toMapillaryStreetImage(image: GraphImage, isPanoFallback = false): MapillaryStreetImage {
  const width = typeof image.width === 'number' && Number.isFinite(image.width) && image.width > 0 ? image.width : undefined;
  const height = typeof image.height === 'number' && Number.isFinite(image.height) && image.height > 0 ? image.height : undefined;
  return {
    id: image.id,
    coordinates: image.computed_geometry?.coordinates ?? image.geometry?.coordinates,
    thumbnailUrl: image.thumb_2048_url ?? image.thumb_1024_url ?? null,
    isPano: image.is_pano ?? isPanoFallback,
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
  };
}

async function queryImagesNearPoint(token: string, [lng, lat]: [number, number]) {
  const params = new URLSearchParams({
    access_token: token,
    fields: 'id,is_pano,width,height,computed_geometry,geometry,thumb_1024_url,thumb_2048_url',
    lat: String(lat),
    lng: String(lng),
    radius: String(IMAGE_RADIUS_METERS),
    limit: '100',
  });
  const response = await fetch(`${GRAPH_URL}?${params.toString()}`);
  if (!response.ok) throw new Error(`Mapillary respondeu ${response.status}`);
  const body = (await response.json()) as { data?: GraphImage[] };
  return body.data ?? [];
}

async function queryImages(token: string, [lng, lat]: [number, number], radius: number, panoOnly: boolean) {
  const params = new URLSearchParams({
    access_token: token,
    fields: 'id,is_pano,width,height,computed_geometry,geometry,thumb_1024_url,thumb_2048_url',
    bbox: [lng - radius, lat - radius, lng + radius, lat + radius].join(','),
    limit: '100',
  });
  if (panoOnly) params.set('is_pano', 'true');

  const response = await fetch(`${GRAPH_URL}?${params.toString()}`);
  if (!response.ok) throw new Error(`Mapillary respondeu ${response.status}`);
  const body = (await response.json()) as { data?: GraphImage[] };
  return body.data ?? [];
}

export async function getMapillaryImageById(token: string, imageId: string): Promise<MapillaryStreetImage> {
  const params = new URLSearchParams({
    access_token: token,
    fields: 'id,is_pano,width,height,computed_geometry,geometry,thumb_1024_url,thumb_2048_url',
  });
  const response = await fetch(`https://graph.mapillary.com/${encodeURIComponent(imageId)}?${params.toString()}`);
  if (!response.ok) throw new Error(`Mapillary respondeu ${response.status}`);
  return toMapillaryStreetImage((await response.json()) as GraphImage);
}

// Prefere panoramas próximos e amplia a busca dentro dos limites da API do Mapillary.
export async function findNearestImage(
  token: string,
  center: [number, number],
  searchRadii = [0.0015, MAX_BBOX_RADIUS_DEGREES]
): Promise<MapillaryStreetImage | null> {
  if (searchRadii.some((radius) => !Number.isFinite(radius) || radius <= 0 || radius > MAX_BBOX_RADIUS_DEGREES)) {
    throw new RangeError(`Os raios de busca Mapillary por caixa devem ser maiores que zero e no máximo ${MAX_BBOX_RADIUS_DEGREES} grau.`);
  }

  const nearbyImages = await queryImagesNearPoint(token, center);
  const nearbyPanorama = closestImage(nearbyImages.filter(hasUsablePanorama), center);
  if (nearbyPanorama) return toMapillaryStreetImage(nearbyPanorama, true);

  for (const radius of searchRadii) {
    const panoramas = await queryImages(token, center, radius, true);
    const bestPanorama = closestImage(panoramas.filter(hasUsablePanorama), center);
    if (bestPanorama) return toMapillaryStreetImage(bestPanorama, true);
  }

  const nearbyImage = closestImage(nearbyImages, center);
  if (nearbyImage) return toMapillaryStreetImage(nearbyImage);

  for (const radius of searchRadii) {
    const images = await queryImages(token, center, radius, false);
    const best = closestImage(images, center);
    if (best) return toMapillaryStreetImage(best);
  }

  return null;
}
