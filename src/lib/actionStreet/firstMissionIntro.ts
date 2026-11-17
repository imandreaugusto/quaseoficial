export type Coordinates = [longitude: number, latitude: number];

export interface IntroAirport {
  name: string;
  coordinates: Coordinates;
  iataCode?: string;
}

export interface IntroProfileLocation {
  city?: string | null;
  country?: string | null;
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const AIRPORT_SEARCH_RADIUS_METERS = 50_000;

let lastNominatimRequestAt = 0;
// Serialize requests to respect Nominatim's public one-request-per-second limit.
let nominatimQueue: Promise<void> = Promise.resolve();

export const NEW_YORK_AIRPORT: IntroAirport = {
  name: 'John F. Kennedy International Airport',
  iataCode: 'JFK',
  coordinates: [-73.7781, 40.6413],
};

export const FIRST_MISSION_MAPILLARY_RADII = [0.0015, 0.004];

export const firstMissionIntroStorageKey = (userId: string) =>
  `action_street_first_mission_intro_v1_${encodeURIComponent(userId)}`;

export function hasSeenFirstMissionIntro(userId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(firstMissionIntroStorageKey(userId)) === 'done';
  } catch (error) {
    console.warn('Não foi possível consultar a introdução do Action Street salva neste navegador.', error);
    return false;
  }
}

export function shouldShowFirstMissionIntro(userId: string | null | undefined, cityId: string): boolean {
  if (cityId !== 'ny' || !userId) return false;
  return !hasSeenFirstMissionIntro(userId);
}

export function markFirstMissionIntroSeen(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(firstMissionIntroStorageKey(userId), 'done');
  } catch (error) {
    console.warn('Não foi possível salvar a conclusão da introdução do Action Street neste navegador.', error);
  }
}

export function getCurrentCoordinates(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Este navegador não oferece localização.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve([coords.longitude, coords.latitude]),
      (error) => reject(new Error(error.message || 'Não foi possível acessar a localização.')),
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 12_000 }
    );
  });
}

async function fetchJson<T>(url: string, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      referrerPolicy: 'origin',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`O serviço de mapas respondeu ${response.status}.`);
    return await response.json() as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function geocodeProfileCity(location: IntroProfileLocation): Promise<Coordinates> {
  const city = location.city?.trim();
  if (!city) throw new Error('Seu perfil não tem uma cidade de origem cadastrada.');

  const query = [city, location.country?.trim()].filter(Boolean).join(', ');
  const params = new URLSearchParams({ q: query, format: 'jsonv2', limit: '1' });
  let release!: () => void;
  const previousRequest = nominatimQueue;
  nominatimQueue = new Promise((resolve) => {
    release = resolve;
  });
  await previousRequest;
  let places: Array<{ lat?: string; lon?: string }>;
  try {
    const wait = Math.max(0, 1_000 - (Date.now() - lastNominatimRequestAt));
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastNominatimRequestAt = Date.now();
    places = await fetchJson<Array<{ lat?: string; lon?: string }>>(
      `${NOMINATIM_URL}?${params.toString()}`,
      10_000
    );
  } finally {
    release();
  }
  const latitude = Number(places[0]?.lat);
  const longitude = Number(places[0]?.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Não foi possível localizar a cidade cadastrada no perfil.');
  }
  return [longitude, latitude];
}

function haversineDistanceKm(a: Coordinates, b: Coordinates): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(b[1] - a[1]);
  const longitudeDelta = radians(b[0] - a[0]);
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(a[1])) * Math.cos(radians(b[1])) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

interface OverpassElement {
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
}

export async function findNearestAirport(center: Coordinates): Promise<IntroAirport | null> {
  const [longitude, latitude] = center;
  const query = `[out:json][timeout:15];(nwr["aeroway"~"^(aerodrome|airport|international_airport)$"]["name"](around:${AIRPORT_SEARCH_RADIUS_METERS},${latitude},${longitude}););out center tags;`;
  const url = `${OVERPASS_URL}?data=${encodeURIComponent(query)}`;
  const result = await fetchJson<{ elements?: OverpassElement[] }>(url, 20_000);
  const airports = (result.elements ?? []).flatMap((element) => {
    const point = element.center ?? element;
    const lat = point.lat;
    const lon = point.lon;
    const tags = element.tags ?? {};
    if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    const name = tags['name:en'] || tags.name || tags.iata || tags.ref;
    if (!name) return [];
    const airportCoordinates: Coordinates = [lon, lat];
    return [{
      airport: {
        name,
        coordinates: airportCoordinates,
        iataCode: tags.iata,
      },
      distance: haversineDistanceKm(center, airportCoordinates),
    }];
  });
  airports.sort((a, b) => a.distance - b.distance);
  return airports[0]?.airport ?? null;
}

export async function findProfileCityAirport(location: IntroProfileLocation): Promise<IntroAirport | null> {
  return findNearestAirport(await geocodeProfileCity(location));
}
