import { useEffect, useState } from 'react';
import { ChevronLeft, MapPin, Backpack, BookOpen, Menu } from 'lucide-react';
import type { ActionStreetState } from '../../types/actionStreet';
import { useActionStreet } from '../ActionStreet';
import HUDTop from './HUDTop';
import HUDBottom from './HUDBottom';
import VocabularyCardComponent from '../VocabularyCard/VocabularyCard';
import MissionPanel from './MissionPanel';

interface Props {
  cityId: string;
  state: ActionStreetState;
  updateState: (newState: ActionStreetState) => void;
  onBack: () => void;
}

export default function StreetViewer360({ cityId, state, updateState, onBack }: Props) {
  const { getCityData } = useActionStreet();
  const [showMission, setShowMission] = useState(false);
  const [showBackpack, setShowBackpack] = useState(false);
  const [showBookOpen, setShowBookOpen] = useState(false);
  const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null);

  const city = getCityData(cityId);

  if (!city) return null;

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* 360° Viewer Placeholder */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center text-white/60">
          <div className="text-6xl mb-4">360°</div>
          <p>{city.city} Street View (Mapillary)</p>
        </div>
      </div>

      {/* HUD - Top Bar */}
      <HUDTop
        cityName={city.city}
        balance={state.balance}
        onBack={onBack}
        onPassport={() => setShowBookOpen(true)}
        onBackpack={() => setShowBackpack(true)}
      />

      {/* HUD - Tourist Guide (Bottom - Recolhível) */}
      <HUDBottom
        title={city.touristGuide.title}
        text={city.touristGuide.text}
      />

      {/* Hotspots Overlay - Buttons */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="relative w-full h-full">
          {city.hotspots.map((hotspot, idx) => (
            <button
              key={hotspot.id}
              onClick={() => setSelectedHotspot(hotspot.id)}
              className={`absolute pointer-events-auto w-12 h-12 rounded-full bg-orange-500/80 hover:bg-orange-500 border-2 border-white shadow-lg transition-all transform hover:scale-110 active:scale-95 flex items-center justify-center text-white font-bold ${
                idx === 0 ? 'top-1/4 left-1/3' : idx === 1 ? 'top-1/3 right-1/4' : 'bottom-1/3 right-1/3'
              }`}
              aria-label={hotspot.word}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Mission Button - Corner */}
      <button
        onClick={() => setShowMission(true)}
        className="absolute bottom-8 right-8 z-20 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
      >
        <Menu className="w-5 h-5" />
        Missão
      </button>

      {/* Vocabulary Card Modal */}
      {selectedHotspot && (
        <VocabularyCardComponent
          hotspotId={selectedHotspot}
          cityId={cityId}
          state={state}
          updateState={updateState}
          onClose={() => setSelectedHotspot(null)}
        />
      )}

      {/* Mission Panel */}
      {showMission && (
        <MissionPanel
          mission={city.mission}
          state={state}
          updateState={updateState}
          onClose={() => setShowMission(false)}
          cityId={cityId}
        />
      )}

      {/* Backpack Modal Placeholder */}
      {showBackpack && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900/95 backdrop-blur-md border border-white/20 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Backpack className="w-6 h-6" />
                Mochila
              </h2>
              <button
                onClick={() => setShowBackpack(false)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="text-white/60">
              {state.souvenirs.length === 0 ? (
                <p>Colete souvenirs dos hotspots!</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {state.souvenirs.map(souvenir => (
                    <div key={souvenir.id} className="bg-white/10 p-2 rounded text-center text-sm">
                      {souvenir.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BookOpen Modal Placeholder */}
      {showBookOpen && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900/95 backdrop-blur-md border border-white/20 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <BookOpen className="w-6 h-6" />
                Passaporte Digital
              </h2>
              <button
                onClick={() => setShowBookOpen(false)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="text-white/60">
              <p className="mb-4">Carimbos Conquistados:</p>
              <div className="grid grid-cols-2 gap-3">
                {state.stamps.length === 0 ? (
                  <p className="text-sm">Complete missões para ganhar carimbos!</p>
                ) : (
                  state.stamps.map(stamp => (
                    <div
                      key={stamp.id}
                      className="p-3 rounded text-center text-white text-sm font-semibold border-2"
                      style={{ borderColor: stamp.color, backgroundColor: `${stamp.color}20` }}
                    >
                      {stamp.title}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
