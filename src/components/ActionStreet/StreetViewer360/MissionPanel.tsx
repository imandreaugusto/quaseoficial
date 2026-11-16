import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Coins, Loader2, MessagesSquare, RotateCcw, Sparkles, Stamp as StampIcon, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { missionPayout } from '../../../lib/actionStreet/economy';
import { journeyStore } from '../../../lib/actionStreet/journeyStore';
import { missionEngine, type MissionState } from '../../../lib/actionStreet/missionEngine';
import { persistenceManager } from '../../../lib/actionStreet/persistenceManager';
import { routeAnimations } from '../../../lib/actionStreet/routeAnimations';
import { getVisaStatus } from '../../../lib/actionStreet/visa';
import { useActionStreet } from '../ActionStreetContext';
import ClickableText from '../shared/ClickableText';
import { glass } from '../shared/glass';
import SpeechRateControl from '../shared/SpeechRateControl';
import type { ActionStreetResponseEvaluation } from '../../../types/actionStreet';

const MAX_FREE_RESPONSE_LENGTH = 500;

function isResponseEvaluation(value: unknown): value is ActionStreetResponseEvaluation {
  if (!value || typeof value !== 'object') return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result.isValid === 'boolean' &&
    typeof result.relevance === 'number' &&
    Number.isFinite(result.relevance) &&
    result.relevance >= 0 &&
    result.relevance <= 1 &&
    typeof result.clarity === 'number' &&
    Number.isFinite(result.clarity) &&
    result.clarity >= 0 &&
    result.clarity <= 1 &&
    typeof result.feedback === 'string'
  );
}

function getApiError(value: unknown) {
  if (value && typeof value === 'object' && 'error' in value && typeof value.error === 'string') return value.error;
  return 'Não foi possível avaliar sua resposta agora.';
}

interface Props {
  cityId: string;
  onClose: () => void;
  onOpenPassport: (stampId: string) => void;
}

export default function MissionPanel({ cityId, onClose, onOpenPassport }: Props) {
  const { state, updateState, getCityData, speechRate, setSpeechRate } = useActionStreet();
  const city = getCityData(cityId);
  const mission = city?.mission;
  const panelRef = useRef<HTMLDivElement>(null);
  const [missionState, setMissionState] = useState<MissionState>(() => {
    const saved = journeyStore.load()?.mission;
    if (mission && saved && saved.missionId === mission.id && saved.step > 0 && saved.step < mission.steps.length) {
      return { currentStep: saved.step, completed: false, allCorrect: saved.allCorrect };
    }
    return missionEngine.initMission();
  });
  const [selected, setSelected] = useState<number | null>(null);
  const [answerMode, setAnswerMode] = useState<'choice' | 'free'>('choice');
  const [freeResponse, setFreeResponse] = useState('');
  const [freeEvaluation, setFreeEvaluation] = useState<ActionStreetResponseEvaluation | null>(null);
  const [evaluatingResponse, setEvaluatingResponse] = useState(false);
  const [responseError, setResponseError] = useState('');
  const [firstCompletion, setFirstCompletion] = useState(false);
  const progressRef = useRef({ step: missionState.currentStep, allCorrect: missionState.allCorrect });
  const finishedRef = useRef(false);
  const mountedRef = useRef(true);
  const evaluationControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (panelRef.current) routeAnimations.modalOpen(panelRef.current);
  }, []);

  // Auto-save do passo da missão: ao fechar (por qualquer caminho) o aluno volta exatamente de onde parou.
  useEffect(() => {
    const missionId = mission?.id;
    if (!missionId) return;
    journeyStore.patch({ mission: { missionId, ...progressRef.current, open: true } });
    return () => {
      if (!finishedRef.current) journeyStore.patch({ mission: { missionId, ...progressRef.current, open: false } });
    };
  }, [mission?.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      evaluationControllerRef.current?.abort();
    };
  }, []);

  if (!city || !mission) return null;

  const step = missionEngine.getCurrentStep(mission, missionState);
  const progress = missionEngine.getMissionProgress(mission, missionState);
  const done = missionEngine.isMissionComplete(missionState);
  const visa = getVisaStatus(state, city.id);
  const payout = missionPayout({ base: mission.rewardDollars, allCorrect: missionState.allCorrect, streakCount: state.streak.count, bonusesActive: !visa.expired });
  const stampId = city.stamp.id;

  const choose = (index: number) => {
    if (selected !== null || !step) return;
    setSelected(index);
    setResponseError('');
    setMissionState((previous) => missionEngine.evaluateOption(step.options[index].isCorrect, previous));
  };

  const evaluateFreeResponse = async () => {
    const response = freeResponse.trim();
    if (!step || evaluatingResponse) return;
    if (response.length < 2) {
      setResponseError('Escreva uma resposta curta antes de pedir a avaliação.');
      return;
    }

    setEvaluatingResponse(true);
    setResponseError('');
    setFreeEvaluation(null);
    const controller = new AbortController();
    evaluationControllerRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 30_000);
    try {
      const apiResponse = await fetch('/api/action-street/evaluate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missionId: mission.id,
          stepIndex: missionState.currentStep,
          response,
        }),
        signal: controller.signal,
      });
      const payload: unknown = await apiResponse.json();
      if (!mountedRef.current) return;
      if (!apiResponse.ok) throw new Error(getApiError(payload));
      if (!isResponseEvaluation(payload)) throw new Error('O Jev retornou uma avaliação inválida. Tente novamente.');

      setFreeEvaluation(payload);
      setMissionState((previous) => missionEngine.evaluateOption(payload.isValid, previous));
    } catch (reason) {
      if (!mountedRef.current) return;
      setResponseError(
        reason instanceof Error && reason.name === 'AbortError'
          ? 'A avaliação demorou demais. Tente novamente ou escolha uma sugestão.'
          : reason instanceof TypeError
            ? 'Não foi possível conectar ao Jev. Verifique a conexão ou escolha uma sugestão.'
          : reason instanceof Error
            ? reason.message
            : 'Não foi possível avaliar sua resposta agora.'
      );
    } finally {
      window.clearTimeout(timeout);
      if (evaluationControllerRef.current === controller) evaluationControllerRef.current = null;
      if (mountedRef.current) setEvaluatingResponse(false);
    }
  };

  const next = () => {
    const advanced = missionEngine.advanceStep(mission, missionState);
    setMissionState(advanced);
    setSelected(null);
    setFreeResponse('');
    setFreeEvaluation(null);
    setResponseError('');
    progressRef.current = { step: advanced.currentStep, allCorrect: advanced.allCorrect };
    if (!advanced.completed) {
      journeyStore.patch({ mission: { missionId: mission.id, ...progressRef.current, open: true } });
      return;
    }

    finishedRef.current = true;
    journeyStore.clearMission();
    const isFirst = !state.completedMissions.includes(mission.id);
    setFirstCompletion(isFirst);
    if (!isFirst) return;

    updateState((previous) => {
      if (previous.completedMissions.includes(mission.id)) return previous;
      let updated = persistenceManager.updateBalance(previous, payout.total);
      updated = persistenceManager.completeMission(updated, mission.id);
      return persistenceManager.addStamp(updated, { ...city.stamp, cityId: city.id, earnedAt: Date.now() });
    });
    confetti({ particleCount: 110, spread: 75, origin: { y: 0.55 }, zIndex: 10000 });
  };

  const restart = () => {
    setMissionState(missionEngine.initMission());
    setSelected(null);
    setAnswerMode('choice');
    setFreeResponse('');
    setFreeEvaluation(null);
    setResponseError('');
    setFirstCompletion(false);
    finishedRef.current = false;
    progressRef.current = { step: 0, allCorrect: true };
    journeyStore.patch({ mission: { missionId: mission.id, ...progressRef.current, open: true } });
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
                  <Coins className="h-5 w-5" />+{payout.total} Action Dollars
                </p>
                <ul className="mt-1 space-y-0.5 text-xs font-bold text-white/70" aria-label="Detalhe da recompensa">
                  <li>Missão: +{payout.base}</li>
                  {payout.perfectBonus > 0 && <li className="text-emerald-300">Bônus por acertar tudo: +{payout.perfectBonus}</li>}
                  {payout.streakBonus > 0 && <li className="text-orange-300">Ofensiva de viagem (x{payout.streakMultiplier}): +{payout.streakBonus}</li>}
                  {!payout.bonusesActive && <li className="text-amber-300">Bônus desligados: seu visto de {city.stateName} estava expirado</li>}
                </ul>
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
                <ClickableText text={step.npcLine} speechRate={speechRate} className="mt-1 text-base leading-relaxed" />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className={glass.label}>Pronúncia</span>
                  <SpeechRateControl rate={speechRate} onChange={setSpeechRate} />
                </div>
              </div>

              <div className={`mt-4 grid grid-cols-2 gap-1 p-1 ${glass.chip}`} role="group" aria-label="Modo de resposta">
                <button
                  type="button"
                  aria-pressed={answerMode === 'choice'}
                  disabled={evaluatingResponse || selected !== null || freeEvaluation?.isValid === true}
                  onClick={() => {
                    setAnswerMode('choice');
                    setFreeEvaluation(null);
                    setResponseError('');
                  }}
                  className={`rounded-full px-3 py-2 text-xs font-bold transition ${answerMode === 'choice' ? 'bg-blue-400/25 text-white' : 'text-white/60 hover:text-white'}`}
                >
                  Escolher resposta
                </button>
                <button
                  type="button"
                  aria-pressed={answerMode === 'free'}
                  disabled={evaluatingResponse || selected !== null || freeEvaluation?.isValid === true}
                  onClick={() => {
                    setAnswerMode('free');
                    setResponseError('');
                  }}
                  className={`rounded-full px-3 py-2 text-xs font-bold transition ${answerMode === 'free' ? 'bg-violet-400/25 text-white' : 'text-white/60 hover:text-white'}`}
                >
                  Responder livremente
                </button>
              </div>

              {answerMode === 'choice' ? (
                <ul className="mt-3 space-y-2">
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
              ) : (
                <div className="mt-3">
                  <label htmlFor="action-street-free-response" className="mb-1.5 block text-xs font-bold text-white/75">Sua resposta em inglês</label>
                  <textarea
                    id="action-street-free-response"
                    value={freeResponse}
                    onChange={(event) => {
                      setFreeResponse(event.target.value);
                      setFreeEvaluation(null);
                      setResponseError('');
                    }}
                    maxLength={MAX_FREE_RESPONSE_LENGTH}
                    disabled={evaluatingResponse || freeEvaluation?.isValid === true}
                    rows={3}
                    placeholder="Escreva como você responderia ao personagem..."
                    className="w-full resize-y rounded-2xl border border-white/20 bg-slate-950/45 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-blue-300/60 focus:outline-none focus:ring-2 focus:ring-blue-300/20 disabled:opacity-70"
                  />
                  <p className="mt-1 text-right text-[10px] text-white/45">{freeResponse.length}/{MAX_FREE_RESPONSE_LENGTH}</p>
                  <button type="button" onClick={() => void evaluateFreeResponse()} disabled={evaluatingResponse || freeEvaluation?.isValid === true} className={`mt-2 w-full ${glass.primaryButton}`}>
                    {evaluatingResponse ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {evaluatingResponse ? 'Jev está avaliando...' : freeEvaluation ? 'Tentar outra resposta com Jev' : 'Avaliar com Jev'}
                  </button>
                  {freeEvaluation && (
                    <div className={`mt-3 rounded-2xl border px-4 py-3 text-sm ${freeEvaluation.isValid ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100' : 'border-amber-300/30 bg-amber-400/10 text-amber-100'}`} role="status">
                      <p>{freeEvaluation.feedback}</p>
                      {freeEvaluation.isValid && (
                        <button type="button" onClick={next} className={`mt-3 w-full ${glass.secondaryButton}`}>
                          {progress.current === progress.total ? 'Concluir missão' : 'Continuar'}
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                  {responseError && <p role="alert" className="mt-3 rounded-xl border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{responseError}</p>}
                </div>
              )}

              {answerMode === 'choice' && selected !== null && (
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
