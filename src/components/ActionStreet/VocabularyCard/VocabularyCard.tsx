import { useEffect, useState } from 'react';
import { Volume2, X } from 'lucide-react';
import gsap from 'gsap';
import type { ActionStreetState, Hotspot, Souvenir } from '../../types/actionStreet';
import { routeAnimations } from '../../lib/actionStreet/routeAnimations';
import { rewards } from '../../lib/actionStreet/rewards';
import { persistenceManager } from '../../lib/actionStreet/persistenceManager';

interface Props {
  hotspotId: string;
  cityId: string;
  state: ActionStreetState;
  updateState: (newState: ActionStreetState) => void;
  onClose: () => void;
}

export default function VocabularyCard({
  hotspotId,
  cityId,
  state,
  updateState,
  onClose,
}: Props) {
  const [cardRef, setCardRef] = useState<HTMLDivElement | null>(null);
  const [isCollected, setIsCollected] = useState(false);

  // Mock hotspot data - em produção, viria do actionStreetData
  const mockHotspot: Hotspot = {
    id: hotspotId,
    word: 'Fire Hydrant',
    translation: 'Hidrante de incêndio',
    phonetic: '/ˈfaɪər ˌhaɪdrənt/',
    example: 'You cannot park your car in front of a red fire hydrant in New York.',
    rewardDollars: 30,
    souvenirIcon: 'Flame',
  };

  useEffect(() => {
    if (cardRef) {
      routeAnimations.modalOpen(cardRef);
    }
  }, [cardRef]);

  const handlePlayAudio = () => {
    // Web Speech API - usar speechSynthesis do navegador
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(mockHotspot.word);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleCollect = () => {
    if (isCollected) return;

    // Atualizar estado
    const newSouvenir: Souvenir = {
      id: `${cityId}-${hotspotId}`,
      icon: mockHotspot.souvenirIcon,
      label: mockHotspot.word,
      fromCity: cityId,
      collectedAt: Date.now(),
    };

    const rewardAmount = rewards.calculateHotspotReward(mockHotspot.rewardDollars);
    let updatedState = persistenceManager.addSouvenir(state, newSouvenir);
    updatedState = persistenceManager.updateBalance(updatedState, rewardAmount);

    updateState(updatedState);
    setIsCollected(true);

    // Animar fechamento
    setTimeout(() => {
      if (cardRef) {
        routeAnimations.modalClose(cardRef, onClose);
      }
    }, 1000);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        ref={setCardRef}
        onClick={(e) => e.stopPropagation()}
        className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-md border border-white/20 rounded-2xl p-8 max-w-md w-full shadow-2xl"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-white/60" />
        </button>

        {/* Main content */}
        <div className="text-center">
          {/* Word + Icon */}
          <div className="mb-6">
            <div className="text-5xl mb-3">🏷️</div>
            <h2 className="text-3xl font-bold text-white mb-2">{mockHotspot.word}</h2>
            <p className="text-sm text-white/60 font-mono">{mockHotspot.phonetic}</p>
          </div>

          {/* Translation */}
          <div className="mb-6 p-4 bg-white/10 rounded-lg border border-white/20">
            <p className="text-xs text-white/60 uppercase tracking-widest mb-2">Tradução</p>
            <p className="text-lg font-semibold text-white">{mockHotspot.translation}</p>
          </div>

          {/* Audio button */}
          <button
            onClick={handlePlayAudio}
            className="w-full mb-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
          >
            <Volume2 className="w-5 h-5" />
            Pronúncia
          </button>

          {/* Example */}
          <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
            <p className="text-xs text-white/60 uppercase tracking-widest mb-2">Exemplo</p>
            <p className="text-sm text-white italic">{mockHotspot.example}</p>
          </div>

          {/* Reward badge */}
          <div className="mb-6 p-3 bg-green-500/20 rounded-lg border border-green-500/50">
            <p className="text-xs text-green-300 uppercase tracking-widest mb-1">Recompensa</p>
            <p className="text-2xl font-bold text-green-300">+{mockHotspot.rewardDollars} 💰</p>
          </div>

          {/* Collect button */}
          <button
            onClick={handleCollect}
            disabled={isCollected}
            className={`w-full py-3 font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              isCollected
                ? 'bg-white/10 text-white/60 cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white hover:scale-105 active:scale-95'
            }`}
          >
            {isCollected ? (
              <>✓ Coletado!</>
            ) : (
              <>
                🎁 Coletar Souvenir
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
