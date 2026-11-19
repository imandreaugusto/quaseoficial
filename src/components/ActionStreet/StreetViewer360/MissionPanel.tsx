import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Coins, MessagesSquare, RotateCcw, Sparkles, Stamp as StampIcon, X } from 'lucide-react';
import gsap from 'gsap';
import { missionPayout } from '../../../lib/actionStreet/economy';
import { journeyStore } from '../../../lib/actionStreet/journeyStore';
import { missionEngine, shuffleMissionOptions, type MissionState } from '../../../lib/actionStreet/missionEngine';
import { persistenceManager } from '../../../lib/actionStreet/persistenceManager';
import { getVisaStatus } from '../../../lib/actionStreet/visa';
import { appendJournalEntry, awardXp, createJournalEntry } from '../../../lib/actionStreet/progression';
import { useActionStreet } from '../ActionStreetContext';
import ClickableText from '../shared/ClickableText';
import { glass } from '../shared/glass';
import SpeechRateControl from '../shared/SpeechRateControl';
import { getActionDollarNote } from '../ActionDollarNotes';

interface Props {
  cityId: string;
  onClose: () => void;
  onOpenPassport: (stampId: string) => void;
  onLocationChange: (spotId: string) => void;
}

export default function MissionPanel({ cityId, onClose, onOpenPassport, onLocationChange }: Props) {
  const { state, updateState, getCityData, speechRate, setSpeechRate, profile, reportActivity } = useActionStreet();
  const city = getCityData(cityId);
  const mission = city?.mission;
  const locationChangeRef = useRef(onLocationChange);
  locationChangeRef.current = onLocationChange;
  const panelRef = useRef<HTMLDivElement>(null);
  const [missionState, setMissionState] = useState<MissionState>(() => {
    const saved = journeyStore.load(profile?.userId)?.mission;
    if (mission && saved && saved.missionId === mission.id && saved.step > 0 && saved.step < mission.steps.length) {
      return { currentStep: saved.step, completed: false, allCorrect: saved.allCorrect };
    }
    return missionEngine.initMission();
  });
  const [selected, setSelected] = useState<number | null>(null);
  const [firstCompletion, setFirstCompletion] = useState(false);
  const progressRef = useRef({ step: missionState.currentStep, allCorrect: missionState.allCorrect });
  const stepStartedAt = useRef(Date.now());
  const finishedRef = useRef(false);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const context = gsap.context(() => {
      gsap.fromTo(panel, { opacity: 0, y: 20, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.26, ease: 'power2.out' });
    }, panel);
    return () => context.revert();
  }, []);

  useEffect(() => {
    if (!firstCompletion || !panelRef.current) return;
    const panel = panelRef.current;
    const context = gsap.context(() => {
      gsap.fromTo(panel, { x: -5 }, { x: 0, duration: 0.22, ease: 'power2.out' });
    }, panel);
    return () => context.revert();
  }, [firstCompletion]);

  // Auto-save do passo da missão: ao fechar (por qualquer caminho) o aluno volta exatamente de onde parou.
  useEffect(() => {
    const missionId = mission?.id;
    if (!missionId) return;
    journeyStore.patch({ mission: { missionId, ...progressRef.current, open: true } }, profile?.userId);
    return () => {
      if (!finishedRef.current) journeyStore.patch({ mission: { missionId, ...progressRef.current, open: false } }, profile?.userId);
    };
  }, [mission?.id, profile?.userId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!city || !mission) return;
    const step = missionEngine.getCurrentStep(mission, missionState);
    const locationSpotId = step?.locationSpotId ?? mission.locationSpotId;
    if (locationSpotId && city.spots.some((spot) => spot.id === locationSpotId)) {
      locationChangeRef.current(locationSpotId);
    }
  }, [city, mission, missionState.currentStep, missionState.completed]);

  if (!city || !mission) return null;

  const step = missionEngine.getCurrentStep(mission, missionState);
  const orderedOptions = step
    ? shuffleMissionOptions(step.options, `${mission.id}:${missionState.currentStep}`)
    : [];
  const progress = missionEngine.getMissionProgress(mission, missionState);
  const done = missionEngine.isMissionComplete(missionState);
  const visa = getVisaStatus(state, city.id);
  const payout = missionPayout({ base: mission.rewardDollars, allCorrect: missionState.allCorrect, streakCount: state.streak.count, bonusesActive: !visa.expired });
  const stampId = city.stamp.id;

  const choose = (index: number) => {
    if (selected !== null || !step) return;
    setSelected(index);
    const correct = step.options[index].isCorrect;
    setMissionState((previous) => missionEngine.evaluateOption(correct, previous));
    reportActivity(correct ? 'correct-answer' : 'wrong-answer', cityId, undefined, Date.now() - stepStartedAt.current);
  };

  const next = () => {
    const advanced = missionEngine.advanceStep(mission, missionState);
    setMissionState(advanced);
    setSelected(null);
    progressRef.current = { step: advanced.currentStep, allCorrect: advanced.allCorrect };
    if (!advanced.completed) {
      stepStartedAt.current = Date.now();
      journeyStore.patch({ mission: { missionId: mission.id, ...progressRef.current, open: true } }, profile?.userId);
      return;
    }

    finishedRef.current = true;
    journeyStore.clearMission(profile?.userId);
    const isFirst = !state.completedMissions.includes(mission.id);
    setFirstCompletion(isFirst);
    if (!isFirst) return;

    updateState((previous) => {
      if (previous.completedMissions.includes(mission.id)) return previous;
      let updated = persistenceManager.updateBalance(previous, payout.total);
      updated = persistenceManager.completeMission(updated, mission.id);
      updated = persistenceManager.addStamp(updated, { ...city.stamp, cityId: city.id, earnedAt: Date.now() });
      updated = awardXp(updated, 50);
      return appendJournalEntry(
        updated,
        createJournalEntry(city.id, 'mission', `Completed "${mission.title}".`, `+${payout.total} Action Dollars · +50 XP`)
      );
    });
    reportActivity('mission-complete', city.id);
  };

  const restart = () => {
    setMissionState(missionEngine.initMission());
    setSelected(null);
    setFirstCompletion(false);
    finishedRef.current = false;
    progressRef.current = { step: 0, allCorrect: true };
    stepStartedAt.current = Date.now();
    journeyStore.patch({ mission: { missionId: mission.id, ...progressRef.current, open: true } }, profile?.userId);
  };

  return (
    <div className={`absolute inset-0 z-40 flex items-center justify-center p-4 ${glass.backdrop}`} onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Missão: ${mission.title}`}
        onClick={(event) => event.stopPropagation()}
        className={`relative w-full max-w-lg overflow-hidden p-6 text-white ${glass.modal}`}
      >
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
          <p className="mb-1 text-right text-xs font-bold text-white/75">
            Etapa {done ? progress.total : progress.current} de {progress.total}
          </p>
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
                <img
                  src={getActionDollarNote(cityId).image}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="mx-auto mt-4 aspect-[1.55] w-48 rounded-lg object-cover shadow-xl"
                />
                <p className="mt-2 inline-flex items-center gap-2 text-lg font-black text-amber-200">
                  <Coins className="h-5 w-5" />+{payout.total} Action Dollars
                </p>
                <ul className="mt-1 space-y-0.5 text-xs font-bold text-white/70" aria-label="Detalhe da recompensa">
                  <li>Missão: +{payout.base}</li>
                  {payout.perfectBonus > 0 && <li className="text-emerald-300">Bônus por acertar tudo: +{payout.perfectBonus}</li>}
                  {payout.streakBonus > 0 && <li className="text-orange-300">Ofensiva de viagem (x{payout.streakMultiplier}): +{payout.streakBonus}</li>}
                  {!payout.bonusesActive && <li className="text-amber-300">Bônus desligados: seu visto de {city.stateName} estava expirado</li>}
                </ul>
                <p className="mt-3 text-sm text-white/75">
                  Próximo passo: carimbe seu passaporte. Depois, feche o passaporte para voltar à rua.
                </p>
                <button type="button" onClick={() => onOpenPassport(stampId)} className={`mt-5 w-full ${glass.primaryButton}`}>
                  <StampIcon className="h-5 w-5" />
                  Carimbar meu passaporte
                </button>
              </>
            ) : (
              <p className="mt-2 text-sm text-white/70">Você já concluiu esta missão e recebeu a recompensa. Feche este painel para voltar à rua ou pratique novamente.</p>
            )}
            {!firstCompletion && (
              <button type="button" onClick={onClose} className={`mt-3 w-full ${glass.secondaryButton}`}>
                Voltar à rua
              </button>
            )}
            <button type="button" onClick={restart} className={`mt-3 w-full ${glass.secondaryButton}`}>
              <RotateCcw className="h-4 w-4" />
              Praticar de novo
            </button>
          </div>
        ) : (
          step && (
            <div className="relative mt-5">
              <p className={`${glass.chip} mb-3 !rounded-2xl px-4 py-3 text-sm leading-relaxed text-white/90`}>
                Leia a fala em inglês, escolha a resposta mais natural e confira a explicação em português. Depois, toque em <strong>Continuar</strong>.
              </p>
              {progress.current === 1 && <p className="mb-3 text-sm text-white/70">{mission.description}</p>}

              <div className={`${glass.chip} !rounded-2xl px-4 py-3`}>
                <p className={`${glass.label} flex items-center gap-1.5`}>
                  <MessagesSquare className="h-3.5 w-3.5" /> {mission.npcRole}
                </p>
                <ClickableText text={step.npcLine} speechRate={speechRate} className="mt-1 text-base leading-relaxed" />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className={glass.label}>Pronúncia</span>
                  <SpeechRateControl rate={speechRate} onChange={setSpeechRate} />
                </div>
              </div>

              <p className="mt-4 text-xs text-white/55">A correção e o feedback são locais; nenhuma resposta é enviada para uma IA.</p>
              <ul className="mt-3 space-y-2">
                {orderedOptions.map((option) => {
                  const index = step.options.indexOf(option);
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
                      <button type="button" disabled={revealed} onClick={() => choose(index)} className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition ${tone}`}>
                        <span className="flex-1 leading-relaxed">{option.text}</span>
                        {revealed && option.isCorrect && <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />}
                      </button>
                    </li>
                  );
                })}
              </ul>

              {selected !== null && (
                <div className="mt-4" role="status">
                  <p className={`mb-2 text-xs font-black uppercase tracking-wider ${step.options[selected].isCorrect ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {step.options[selected].isCorrect ? 'Resposta correta' : 'Resposta para revisar'}
                  </p>
                  <p className="rounded-2xl border border-white/15 bg-slate-950/85 px-4 py-3 text-sm leading-relaxed text-white/90">{step.options[selected].feedback}</p>
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
