import { ChevronLeft } from 'lucide-react';
import { useActionStreet } from '../ActionStreet';
import Map3DViewer from './Map3DViewer';

interface Props {
  cityId: string;
  onComplete: () => void;
  onBack: () => void;
}

export default function Map3DExplorer({ cityId, onComplete, onBack }: Props) {
  const { getCityData } = useActionStreet();
  const city = getCityData(cityId);

  if (!city) return null;

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-6 left-6 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
        aria-label="Go back"
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>

      {/* 3D Map */}
      <Map3DViewer city={city} onAnimationComplete={onComplete} />
    </div>
  );
}
