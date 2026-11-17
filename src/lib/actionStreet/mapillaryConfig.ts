const GRAPH_URL = 'https://graph.mapillary.com/images';

export const MAPILLARY_ATTRIBUTION = 'Imagery © Mapillary contributors, CC BY-SA 4.0';

export interface MapillaryStreetImage {
  id: string;
  coordinates?: [number, number];
  thumbnailUrl: string | null;
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
}

const distanceSquared = (a: [number, number], b: [number, number]) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;

function toMapillaryStreetImage(image: GraphImage): MapillaryStreetImage {
  return {
    id: image.id,
    coordinates: image.computed_geometry?.coordinates ?? image.geometry?.coordinates,
    thumbnailUrl: image.thumb_2048_url ?? image.thumb_1024_url ?? null,
  };
}

async function queryImages(token: string, [lng, lat]: [number, number], radius: number, panoOnly: boolean) {
  const params = new URLSearchParams({
    access_token: token,
    fields: 'id,computed_geometry,geometry,thumb_1024_url,thumb_2048_url',
    bbox: [lng - radius, lat - radius, lng + radius, lat + radius].join(','),
    limit: '25',
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
    fields: 'id,computed_geometry,geometry,thumb_1024_url,thumb_2048_url',
  });
  const response = await fetch(`https://graph.mapillary.com/${encodeURIComponent(imageId)}?${params.toString()}`);
  if (!response.ok) throw new Error(`Mapillary respondeu ${response.status}`);
  return toMapillaryStreetImage((await response.json()) as GraphImage);
}

// Busca a imagem 360° mais próxima do ponto, ampliando a área e aceitando imagens não-panorâmicas só se necessário.
export async function findNearestImage(token: string, center: [number, number]): Promise<MapillaryStreetImage | null> {
  const searchRadii = [0.0015, 0.004, 0.015, 0.05, 0.1];

  for (const radius of searchRadii) {
    for (const panoOnly of [true, false]) {
      const images = await queryImages(token, center, radius, panoOnly);
      if (images.length === 0) continue;

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
      if (best) return toMapillaryStreetImage(best);
    }
  }
  return null;
}
