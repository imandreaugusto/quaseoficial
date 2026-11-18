export const MAX_VISIBLE_LOCKED_DESTINATIONS = 4;

export function getVisibleDestinationIds(
  cities: readonly { id: string }[],
  unlockedCityIds: readonly string[],
  selectedCityId: string,
  showAllLocked: boolean,
): string[] {
  const unlocked = new Set(unlockedCityIds);
  const lockedCities = cities.filter((city) => !unlocked.has(city.id));
  let visibleLocked = showAllLocked
    ? lockedCities
    : lockedCities.slice(0, MAX_VISIBLE_LOCKED_DESTINATIONS);

  if (!showAllLocked && lockedCities.some((city) => city.id === selectedCityId)
    && !visibleLocked.some((city) => city.id === selectedCityId)) {
    visibleLocked = [...visibleLocked.slice(0, MAX_VISIBLE_LOCKED_DESTINATIONS - 1), { id: selectedCityId }];
  }

  const visible = new Set([...unlockedCityIds, ...visibleLocked.map((city) => city.id)]);
  return cities.filter((city) => visible.has(city.id)).map((city) => city.id);
}
