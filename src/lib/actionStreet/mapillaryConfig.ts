const GRAPH_URL = 'https://graph.mapillary.com/images';

export const MAPILLARY_ATTRIBUTION = 'Imagery © Mapillary contributors, CC BY-SA 4.0';

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
}

const distanceSquared = (a: [number, number], b: [number, number]) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;

async function queryImages(token: string, [lng, lat]: [number, number], radius: number, panoOnly: boolean) {
  const params = new URLSearchParams({
    access_token: token,
    fields: 'id,computed_geometry,geometry',
    bbox: [lng - radius, lat - radius, lng + radius, lat + radius].join(','),
    limit: '25',
  });
  if (panoOnly) params.set('is_pano', 'true');

  const response = await fetch(`${GRAPH_URL}?${params.toString()}`);
  if (!response.ok) throw new Error(`Mapillary respondeu ${response.status}`);
  const body = (await response.json()) as { data?: GraphImage[] };
  return body.data ?? [];
}

// Busca a imagem 360° mais próxima do ponto, ampliando a área e aceitando imagens não-panorâmicas só se necessário.
export async function findNearestImageId(token: string, center: [number, number]): Promise<string | null> {
  const attempts: Array<[number, boolean]> = [
    [0.0015, true],
    [0.004, true],
    [0.004, false],
  ];

  for (const [radius, panoOnly] of attempts) {
    const images = await queryImages(token, center, radius, panoOnly);
    if (images.length === 0) continue;

    let best = images[0];
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
    return best.id;
  }
  return null;
}
