import { useEffect, useState } from 'react';
import { X, Send } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { ActionStreetState, Mission } from '../../types/actionStreet';
import { missionEngine, type MissionState } from '../../lib/actionStreet/missionEngine';
import { routeAnimations } from '../../lib/actionStreet/routeAnimations';
import { rewards } from '../../lib/actionStreet/rewards';
import { persistenceManager } from '../../lib/actionStreet/persistenceManager';

interface Props {
  mission: Mission;
  state: ActionStreetState;
  updateState: (newState: ActionStreetState) => void;
  onClose: () => void;
  cityId: string;
}

export default function MissionPanel({
  mission,
  state,
  updateState,
  onClose,
  cityId,
}: Props) {
  const [missionState, setMissionState] = useState<MissionState>(() =>
    missionEngine.initMission()
  );
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [panelRef, setPanelRef] = useState<HTMLDivElement | null>(null);

  const currentStep = missionEngine.getCurrentStep(mission, missionState);
  const progress = missionEngine.getMissionProgress(mission, missionState);

  useEffect(() => {
    if (panelRef) {
      routeAnimations.modalOpen(panelRef);
    }
  }, [panelRef]);

  const handleSelectOption = (optionIndex: number) => {
    if (selectedOption !== null) return;

    const option = currentStep?.options[optionIndex];
    if (!option) return;

    setSelectedOption(optionIndex);
    setShowFeedback(true);

    // Avaliar opção
    let newMissionState = missionEngine.evaluateOption(option.isCorrect, missionState);

    // Avançar para próximo passo
    setTimeout(() => {
      newMissionState = missionEngine.advanceStep(mission, newMissionState);
      setMissionState(newMissionState);
      setSelectedOption(null);
      setShowFeedback(false);

      // Verificar conclusão
      if (missionEngine.isMissionComplete(newMissionState)) {
        handleMissionComplete(newMissionState);
      }
    }, 2000);
  };

  const handleMissionComplete = (finalState: MissionState) => {
    // Calcular recompensas
    const rewardInfo = rewards.calculateMissionReward(
      mission.rewardDollars,
      finalState.allCorrect
    );

    // Atualizar estado
    let newState = persistenceManager.updateBalance(state, rewardInfo.total);
    newState = persistenceManager.completeMission(newState, mission.id);

    // Adicionar stamp
    const stamp = {
      id: `stamp-${cityId}-${Date.now()}`,
      title: `Missão: ${mission.title}`,
      subtitle: cityId.toUpperCase(),
      color: '#F59E0B',
      cityId,
      earnedAt: Date.now(),
    };
    newState = persistenceManager.addStamp(newState, stamp);

    updateState(newState);

    // Efeitos
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.5 },
    });

    // Animar fechamento com delay
    setTimeout(() => {
      if (panelRef) {
        routeAnimations.modalClose(panelRef, onClose);
      }
    }, 1500);
  };

  if (!currentStep && !missionEngine.isMissionComplete(missionState)) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        ref={setPanelRef}
        onClick={(e) => e.stopPropagation()}
        className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-md border border-white/20 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{mission.title}</h2>
            <p className="text-sm text-white/60 mt-1">{mission.npcRole}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center justify-between text-xs text-white/60 mb-2">
            <span>Progresso</span>
            <span>
              {progress.current}/{progress.total}
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-pink-500 transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>

        {/* Mission complete state */}
        {missionEngine.isMissionComplete(missionState) ? (
          <div className="px-6 py-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-white mb-2">Missão Completa!</h3>
            <p className="text-white/70 mb-6">Você conquistou essa missão com sucesso!</p>
            <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-300 mb-2">Recompensa Total:</p>
              <p className="text-3xl font-bold text-green-300">
                +{rewards.calculateMissionReward(mission.rewardDollars, missionState.allCorrect).total}
                💰
              </p>
            </div>
            {missionState.allCorrect && (
              <div className="text-yellow-300 text-sm font-semibold mb-4">
                ⭐ Perfeição! Bonus +25%
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Chat content */}
            <div className="px-6 py-6 min-h-40">
              {/* NPC message */}
              <div className="mb-6 p-4 bg-white/10 border border-white/20 rounded-lg">
                <p className="text-sm font-semibold text-white/60 mb-2">
                  {mission.npcRole}:
                </p>
                <p className="text-white text-base leading-relaxed">
                  {currentStep?.npcLine}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {currentStep?.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    disabled={selectedOption !== null}
                    className={`w-full text-left p-3 rounded-lg transition-all border ${
                      selectedOption === idx
                        ? option.isCorrect
                          ? 'bg-green-500/30 border-green-500/70'
                          : 'bg-red-500/30 border-red-500/70'
                        : 'bg-white/10 border-white/20 hover:bg-white/20 hover:border-white/40'
                    } ${selectedOption !== null && selectedOption !== idx ? 'opacity-50' : ''}`}
                  >
                    <p className="text-white text-sm leading-relaxed">{option.text}</p>
                  </button>
                ))}
              </div>

              {/* Feedback */}
              {showFeedback && selectedOption !== null && (
                <div className="mt-4 p-3 rounded-lg bg-white/10 border border-white/20">
                  <p className="text-xs text-white/60 uppercase tracking-widest mb-2">
                    Feedback:
                  </p>
                  <p className="text-sm text-white">
                    {currentStep?.options[selectedOption].feedback}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
