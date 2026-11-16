import type { City, Souvenir } from '../../types/actionStreet';

export const spotDiscoveryId = (cityId: string, spotId: string) => `${cityId}:${spotId}`;

export function getDiscoveredSpotIds(cities: City[], discoveredSpots: string[], souvenirs: Souvenir[]) {
  const discovered = new Set(discoveredSpots);
  const collected = new Set(souvenirs.map((souvenir) => souvenir.id));
  for (const city of cities) {
    for (const hotspot of city.hotspots) {
      if (collected.has(`${city.id}:${hotspot.id}`)) {
        discovered.add(spotDiscoveryId(city.id, hotspot.spotId));
      }
    }
  }
  return discovered;
}
