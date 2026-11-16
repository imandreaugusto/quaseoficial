import { MapPin, Lock, DollarSign, ChevronLeft } from 'lucide-react';
import type { City, ActionStreetState } from '../../types/actionStreet';
import DestinationCard from './DestinationCard';

interface Props {
  state: ActionStreetState;
  cities: City[];
  onSelectCity: (cityId: string) => void;
  onClose: () => void;
}

export default function LobbyEmbarque({ state, cities, onSelectCity, onClose }: Props) {
  return (
    <div className="w-full h-full overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-slate-900 via-slate-900 to-transparent px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <MapPin className="w-8 h-8 text-orange-500" />
            <h1 className="text-3xl font-bold text-white">Action Street</h1>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Balance Card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-4 w-fit">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            <span className="text-white font-semibold">
              {state.balance} Action Dollars
            </span>
          </div>
        </div>
      </div>

      {/* Content - Destinations Grid */}
      <div className="w-full h-full pt-32 px-6 pb-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8">Escolha um Destino</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {cities.map((city) => (
              <DestinationCard
                key={city.id}
                city={city}
                isUnlocked={state.unlockedCities.includes(city.id)}
                onSelect={() => onSelectCity(city.id)}
              />
            ))}
          </div>

          {/* Info Footer */}
          <div className="mt-12 text-center text-white/60 text-sm">
            <p>🌎 Explore as ruas do mundo • Colete souvenirs • Aprenda inglês na prática</p>
          </div>
        </div>
      </div>
    </div>
  );
}
