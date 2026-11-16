import { ChevronLeft, DollarSign, Backpack, BookOpen } from 'lucide-react';

interface Props {
  cityName: string;
  balance: number;
  onBack: () => void;
  onPassport: () => void;
  onBackpack: () => void;
}

export default function HUDTop({
  cityName,
  balance,
  onBack,
  onPassport,
  onBackpack,
}: Props) {
  return (
    <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Back button + City name */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <h2 className="text-lg font-bold text-white">{cityName}</h2>
        </div>

        {/* Right: Balance + Buttons */}
        <div className="flex items-center gap-4">
          {/* Balance Display */}
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg px-4 py-2">
            <DollarSign className="w-4 h-4 text-green-400" />
            <span className="text-white font-semibold">{balance}</span>
          </div>

          {/* Buttons */}
          <button
            onClick={onPassport}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Open passport"
          >
            <BookOpen className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={onBackpack}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Open backpack"
          >
            <Backpack className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
