import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Coins, MessagesSquare, RotateCcw, Sparkles, Stamp as StampIcon, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { missionEngine, type MissionState } from '../../../lib/actionStreet/missionEngine';
import { persistenceManager } from '../../../lib/actionStreet/persistenceManager';
import { rewards } from '../../../lib/actionStreet/rewards';
import { routeAnimations } from '../../../lib/actionStreet/routeAnimations';
import { useActionStreet } from '../ActionStreetContext';
import ClickableText from '../shared/ClickableText';
import { glass } from '../shared/glass';

interface Props {
  cityId: string;
  onClose: () => void;
  onOpenPassport: (stampId: string) => void;
}

export default function MissionPanel({ cityId, onClose, onOpenPassport }: Props) {
  const { state, updateState, getCityData } = useActionStreet();
  const city = getCityData(cityId);
  const mission = city?.mission;
  const panelRef = useRef<HTMLDivElement>(null);
  const [missionState, setMissionState] = useState<MissionState>(() => missionEngine.initMission());
  const [selected, setSelected] = useState<number | null>(null);
  const [firstCompletion, setFirstCompletion] = useState(false);

  useEffect(() => {
    if (panelRef.current) routeAnimations.modalOpen(panelRef.current);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (!city || !mission) return null;

  const step = missionEngine.getCurrentStep(mission, missionState);
  const progress = missionEngine.getMissionProgress(mission, missionState);
  const done = missionEngine.isMissionComplete(missionState);
  const reward = rewards.calculateMissionReward(mission.rewardDollars, missionState.allCorrect);
  const stampId = city.stamp.id;

  const choose = (index: number) => {
    if (selected !== null || !step) return;
    setSelected(index);
    setMissionState((previous) => missionEngine.evaluateOption(step.options[index].isCorrect, previous));
  };

  const next = () => {
    const advanced = missionEngine.advanceStep(mission, missionState);
    setMissionState(advanced);
    setSelected(null);
    if (!advanced.completed) return;

    const isFirst = !state.completedMissions.includes(mission.id);
    setFirstCompletion(isFirst);
    if (!isFirst) return;

    updateState((previous) => {
      if (previous.completedMissions.includes(mission.id)) return previous;
      let updated = persistenceManager.updateBalance(previous, reward.total);
      updated = persistenceManager.completeMission(updated, mission.id);
      return persistenceManager.addStamp(updated, { ...city.stamp, cityId: city.id, earnedAt: Date.now() });
    });
    confetti({ particleCount: 110, spread: 75, origin: { y: 0.55 }, zIndex: 10000 });
  };

  const restart = () => {
    setMissionState(missionEngine.initMission());
    setSelected(null);
    setFirstCompletion(false);
  };

  return (
    <div className={`absolute inset-0 z-40 flex items-center justify-center p-4 ${glass.backdrop}`} onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Missão: ${mission.title}`}
        onClick={(event) => event.stopPropagation()}
        className={`relative w-full max-w-lg overflow-hidden p-6 text-white ${glass.panelOverImagery}`}
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-violet-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-12 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className={glass.label}>Missão · {mission.npcRole}</p>
            <h2 className="text-xl font-black leading-tight">{mission.title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar missão" className={glass.iconButton}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative mt-4" aria-label={`Progresso ${progress.current} de ${progress.total}`}>
          <div className="h-2 overflow-hidden rounded-full border border-white/15 bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-[width] duration-500" style={{ width: `${done ? 100 : ((progress.current - 1) / progress.total) * 100}%` }} />
          </div>
        </div>

        {done ? (
          <div className="relative mt-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-emerald-300/20 text-emerald-200">
              <Sparkles className="h-7 w-7" />
            </div>
            <h3 className="mt-3 text-2xl font-black">Missão completa!</h3>
            {firstCompletion ? (
              <>
                <p className="mt-2 inline-flex items-center gap-2 text-lg font-black text-amber-200">
                  <Coins className="h-5 w-5" />+{reward.total} Action Dollars
                </p>
                {reward.bonus > 0 && <p className="mt-1 text-xs font-bold text-emerald-300">Inclui +{reward.bonus} de bônus por acertar tudo</p>}
                <button type="button" onClick={() => onOpenPassport(stampId)} className={`mt-5 w-full ${glass.primaryButton}`}>
                  <StampIcon className="h-5 w-5" />
                  Carimbar meu passaporte
                </button>
              </>
            ) : (
              <p className="mt-2 text-sm text-white/70">Você já tinha concluído esta missão, então a recompensa não se repete. Continue praticando!</p>
            )}
            <button type="button" onClick={restart} className={`mt-3 w-full ${glass.secondaryButton}`}>
              <RotateCcw className="h-4 w-4" />
              Praticar de novo
            </button>
          </div>
        ) : (
          step && (
            <div className="relative mt-5">
              {progress.current === 1 && <p className="mb-3 text-sm text-white/70">{mission.description}</p>}

              <div className={`${glass.chip} !rounded-2xl px-4 py-3`}>
                <p className={`${glass.label} flex items-center gap-1.5`}>
                  <MessagesSquare className="h-3.5 w-3.5" /> {mission.npcRole}
                </p>
                <ClickableText text={step.npcLine} className="mt-1 text-base leading-relaxed" />
              </div>

              <ul className="mt-4 space-y-2">
                {step.options.map((option, index) => {
                  const isSelected = selected === index;
                  const revealed = selected !== null;
                  const tone = !revealed
                    ? 'border-white/20 bg-white/10 hover:border-blue-300/60 hover:bg-white/15'
                    : isSelected
                      ? option.isCorrect
                        ? 'border-emerald-300/70 bg-emerald-400/20'
                        : 'border-rose-300/70 bg-rose-400/20'
                      : option.isCorrect
                        ? 'border-emerald-300/40 bg-emerald-400/10'
                        : 'border-white/10 bg-white/5 opacity-60';
                  return (
                    <li key={option.text}>
                      <button type="button" disabled={revealed} onClick={() => choose(index)} className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left text-sm backdrop-blur-xl transition ${tone}`}>
                        <span className="flex-1 leading-relaxed">{option.text}</span>
                        {revealed && option.isCorrect && <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />}
                      </button>
                    </li>
                  );
                })}
              </ul>

              {selected !== null && (
                <div className="mt-4" role="status">
                  <p className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm leading-relaxed text-white/90 backdrop-blur-xl">{step.options[selected].feedback}</p>
                  <button type="button" onClick={next} className={`mt-3 w-full ${glass.primaryButton}`}>
                    {progress.current === progress.total ? 'Concluir missão' : 'Continuar'}
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}
