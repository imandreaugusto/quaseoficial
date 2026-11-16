import { Lock, ArrowRight, DollarSign, Badge } from 'lucide-react';
import type { City } from '../../types/actionStreet';

interface Props {
  city: City;
  isUnlocked: boolean;
  onSelect: () => void;
}

export default function DestinationCard({ city, isUnlocked, onSelect }: Props) {
  const isDefault = city.unlockedByDefault;

  return (
    <button
      onClick={isUnlocked ? onSelect : undefined}
      disabled={!isUnlocked}
      className={`relative overflow-hidden rounded-xl transition-all duration-300 h-64 group ${
        isUnlocked
          ? 'hover:scale-105 hover:shadow-2xl cursor-pointer'
          : 'opacity-60 cursor-not-allowed'
      }`}
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0 bg-gradient-to-br opacity-70 group-hover:opacity-90 transition-opacity"
        style={{
          backgroundImage: `linear-gradient(135deg, ${city.stamp.color}22 0%, ${city.stamp.color}55 100%)`,
        }}
      />

      {/* Content */}
      <div className="relative h-full p-6 flex flex-col justify-between">
        {/* Top section */}
        <div>
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-2xl font-bold text-white">{city.stateName}</h3>
              <p className="text-sm text-white/70">{city.city}</p>
            </div>
            {isDefault && (
              <Badge className="bg-green-500 text-white text-xs">Desbloqueado</Badge>
            )}
          </div>
        </div>

        {/* Bottom section */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-white/60 mb-1">Nível</p>
            <p className="text-lg font-bold text-white capitalize">{city.region}</p>
          </div>

          {isUnlocked ? (
            <button
              className="bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-all group-hover:translate-x-1"
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <div className="text-right">
              <div className="flex items-center gap-1 text-orange-300 font-semibold">
                <DollarSign className="w-4 h-4" />
                {city.unlockCost}
              </div>
              <div className="flex items-center gap-1 text-white/60 text-xs mt-1">
                <Lock className="w-3 h-3" />
                Bloqueado
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Glassmorphism border */}
      <div
        className={`absolute inset-0 rounded-xl pointer-events-none border ${
          isUnlocked ? 'border-white/20' : 'border-white/10'
        }`}
      />
    </button>
  );
}
