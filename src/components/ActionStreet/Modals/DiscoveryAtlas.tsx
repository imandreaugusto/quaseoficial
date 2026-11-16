import { Check, Compass, Gift, Lock, MapPin, Sparkles } from 'lucide-react';
import type { City } from '../../../types/actionStreet';
import { getDiscoveredSpotIds, spotDiscoveryId } from '../../../lib/actionStreet/discovery';
import { useActionStreet } from '../ActionStreetContext';
import { glass } from '../shared/glass';
import { getSouvenirIcon } from '../shared/souvenirIcons';

interface Props {
  onExploreSpot: (cityId: string, spotId: string) => void;
}

function ProgressBar({ label, current, total, color }: { label: string; current: number; total: number; color: string }) {
  const value = total === 0 ? 0 : Math.round((current / total) * 100);
  return (
    <div>
      <div className="mb-1 flex justify-between gap-2 text-[10px] font-bold text-white/65">
        <span>{label}</span>
        <span>{current}/{total}</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={current}
        className="h-1.5 overflow-hidden rounded-full bg-white/10"
      >
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function CityDiscoveryCard({
  city,
  unlocked,
  discoveredIds,
  collectedIds,
  onExploreSpot,
}: {
  city: City;
  unlocked: boolean;
  discoveredIds: Set<string>;
  collectedIds: Set<string>;
  onExploreSpot: Props['onExploreSpot'];
}) {
  const discoveredCount = city.spots.filter((spot) => discoveredIds.has(spotDiscoveryId(city.id, spot.id))).length;
  const collectedCount = city.hotspots.filter((hotspot) => collectedIds.has(`${city.id}:${hotspot.id}`)).length;

  return (
    <article className={`rounded-2xl border p-4 ${unlocked ? 'border-white/15 bg-white/[0.05]' : 'border-white/10 bg-black/10 opacity-75'}`}>
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-black text-white">{city.city}</h3>
          <p className="text-[11px] text-white/55">{city.stateName}</p>
        </div>
        {!unlocked && <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase text-white/45"><Lock className="h-3 w-3" /> Bloqueada</span>}
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <ProgressBar label="Locais descobertos" current={discoveredCount} total={city.spots.length} color="bg-gradient-to-r from-blue-400 to-cyan-300" />
        <ProgressBar label="Souvenirs coletados" current={collectedCount} total={city.hotspots.length} color="bg-gradient-to-r from-amber-400 to-orange-300" />
      </div>

      <ul className="mt-4 space-y-2">
        {city.spots.map((spot, index) => {
          const discovered = discoveredIds.has(spotDiscoveryId(city.id, spot.id));
          const hotspots = city.hotspots.filter((hotspot) => hotspot.spotId === spot.id);
          const collectedHere = hotspots.filter((hotspot) => collectedIds.has(`${city.id}:${hotspot.id}`)).length;
          return (
            <li key={spot.id} className="rounded-xl border border-white/10 bg-slate-950/25 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${discovered ? 'bg-emerald-400/15 text-emerald-200' : 'bg-white/5 text-white/40'}`}>
                    {discovered ? <Check className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-white">{discovered ? spot.name : unlocked ? `Local ${index + 1} · não descoberto` : 'Local oculto'}</p>
                    <p className="text-[10px] text-white/50">
                      {discovered ? `${collectedHere}/${hotspots.length} souvenirs · ${hotspots.length - collectedHere} para coletar` : unlocked ? 'Explore para revelar palavras e souvenirs' : 'Desbloqueie a cidade para explorar'}
                    </p>
                  </div>
                </div>
                {unlocked && (
                  <button
                    type="button"
                    onClick={() => onExploreSpot(city.id, spot.id)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-1.5 text-[10px] font-bold text-white/80 transition hover:bg-white/15 hover:text-white"
                  >
                    {discovered ? <MapPin className="h-3 w-3" /> : <Compass className="h-3 w-3" />}
                    {discovered ? 'Visitar' : 'Explorar'}
                  </button>
                )}
              </div>

              {discovered && hotspots.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5 pl-10">
                  {hotspots.map((hotspot) => {
                    const collected = collectedIds.has(`${city.id}:${hotspot.id}`);
                    const SouvenirIcon = getSouvenirIcon(hotspot.souvenirIcon);
                    return (
                      <li
                        key={hotspot.id}
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] ${collected ? 'border-amber-300/30 bg-amber-300/10 text-amber-100' : 'border-blue-300/20 bg-blue-300/5 text-blue-100/80'}`}
                      >
                        {collected ? <Gift className="h-3 w-3" /> : <SouvenirIcon className="h-3 w-3" />}
                        {hotspot.word}
                        {collected && <Check className="h-3 w-3 text-emerald-300" />}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </article>
  );
}

export default function DiscoveryAtlas({ onExploreSpot }: Props) {
  const { state, allCities } = useActionStreet();
  const discoveredIds = getDiscoveredSpotIds(allCities, state.discoveredSpots, state.souvenirs);
  const collectedIds = new Set(state.souvenirs.map((souvenir) => souvenir.id));
  const totalSpots = allCities.reduce((total, city) => total + city.spots.length, 0);
  const totalSouvenirs = allCities.reduce((total, city) => total + city.hotspots.length, 0);
  const discoveredCount = allCities.reduce(
    (total, city) => total + city.spots.filter((spot) => discoveredIds.has(spotDiscoveryId(city.id, spot.id))).length,
    0
  );
  const collectedCount = allCities.reduce(
    (total, city) => total + city.hotspots.filter((hotspot) => collectedIds.has(`${city.id}:${hotspot.id}`)).length,
    0
  );

  return (
    <section className="relative space-y-4" aria-label="Atlas de coleção e descobertas">
      <div className={`grid grid-cols-2 gap-3 p-4 ${glass.chip} !rounded-2xl`}>
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-200/80"><Compass className="h-3.5 w-3.5" /> Atlas explorado</p>
          <p className="mt-1 text-xl font-black text-white">{discoveredCount}<span className="ml-1 text-xs font-semibold text-white/45">/ {totalSpots}</span></p>
          <ProgressBar label="Locais descobertos" current={discoveredCount} total={totalSpots} color="bg-gradient-to-r from-blue-400 to-cyan-300" />
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-200/80"><Sparkles className="h-3.5 w-3.5" /> Coleção completa</p>
          <p className="mt-1 text-xl font-black text-white">{collectedCount}<span className="ml-1 text-xs font-semibold text-white/45">/ {totalSouvenirs}</span></p>
          <ProgressBar label="Souvenirs coletados" current={collectedCount} total={totalSouvenirs} color="bg-gradient-to-r from-amber-400 to-orange-300" />
        </div>
      </div>

      <p className={glass.label}>Explore os locais para revelar palavras. Colete-as para completar cada conjunto.</p>
      <div className="space-y-3">
        {allCities.map((city) => (
          <CityDiscoveryCard
            key={city.id}
            city={city}
            unlocked={state.unlockedCities.includes(city.id)}
            discoveredIds={discoveredIds}
            collectedIds={collectedIds}
            onExploreSpot={onExploreSpot}
          />
        ))}
      </div>
    </section>
  );
}
