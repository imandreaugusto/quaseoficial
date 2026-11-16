import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, RotateCcw, ShieldCheck, Volume2, X } from 'lucide-react';
import gsap from 'gsap';
import { persistenceManager } from '../../../lib/actionStreet/persistenceManager';
import { QUIZ_PASS_SCORE, buildRenewalQuiz } from '../../../lib/actionStreet/visa';
import { useActionStreet } from '../ActionStreetContext';
import { glass } from '../shared/glass';
import SpeechRateControl from '../shared/SpeechRateControl';

interface Props {
  cityId: string;
  onClose: () => void;
  onRenewed: (stampId: string) => void;
}

function speak(text: string, rate: number) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = rate;
  window.speechSynthesis.speak(utterance);
}

export default function VisaRenewalQuiz({ cityId, onClose, onRenewed }: Props) {
  const { state, updateState, getCityData, allCities, speechRate, setSpeechRate } = useActionStreet();
  const city = getCityData(cityId);
  const [attempt, setAttempt] = useState(0);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const learnedIds = useMemo(() => new Set(state.souvenirs.map((item) => item.id)), [state.souvenirs]);
  const questions = useMemo(() => (city ? buildRenewalQuiz(city, allCities, learnedIds) : []), [city, allCities, learnedIds, attempt]);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const tween = gsap.fromTo(card, { opacity: 0, y: 24, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'back.out(1.4)' });
    return () => {
      tween.kill();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.speechSynthesis?.cancel();
    };
  }, [onClose]);

  if (!city || questions.length === 0) return null;

  const finished = index >= questions.length;
  const passed = score >= QUIZ_PASS_SCORE;
  const question = questions[index];

  const choose = (optionIndex: number) => {
    if (picked !== null || !question) return;
    setPicked(optionIndex);
    if (optionIndex === question.correctIndex) setScore((value) => value + 1);
  };

  const next = () => {
    setPicked(null);
    setIndex((value) => value + 1);
  };

  const retry = () => {
    setAttempt((value) => value + 1);
    setIndex(0);
    setPicked(null);
    setScore(0);
  };

  const renew = () => {
    updateState((previous) => persistenceManager.renewVisa(previous, cityId));
    onRenewed(city.stamp.id);
  };

  return (
    <div className={`absolute inset-0 z-[60] flex items-center justify-center p-4 ${glass.backdrop}`} onClick={onClose}>
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Renovar visto: ${city.stateName}`}
        onClick={(event) => event.stopPropagation()}
        className={`relative w-full max-w-md overflow-hidden p-6 text-white ${glass.panelOverImagery}`}
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className={glass.label}>Revisão rápida · {city.stateName}</p>
            <h2 className="text-xl font-black">Renovar Visto</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className={glass.iconButton}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {!finished ? (
          <div className="relative mt-5">
            <p className="text-xs font-bold text-white/60">
              Pergunta {index + 1} de {questions.length}
            </p>
            <div className={`mt-2 flex items-center justify-between gap-3 ${glass.chip} !rounded-2xl px-4 py-3`}>
              <div className="min-w-0">
                <p className={glass.label}>O que significa?</p>
                <p className="text-lg font-black">{question.word}</p>
                <p className="font-mono text-xs text-blue-200">{question.phonetic}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button type="button" onClick={() => speak(question.word, speechRate)} aria-label={`Ouvir ${question.word}`} className={glass.iconButton}>
                  <Volume2 className="h-4 w-4" />
                </button>
                <SpeechRateControl rate={speechRate} onChange={setSpeechRate} />
              </div>
            </div>

            <ul className="mt-3 space-y-2">
              {question.options.map((option, optionIndex) => {
                const revealed = picked !== null;
                const isCorrect = optionIndex === question.correctIndex;
                const tone = !revealed
                  ? 'border-white/20 bg-white/10 hover:border-blue-300/60 hover:bg-white/15'
                  : picked === optionIndex
                    ? isCorrect
                      ? 'border-emerald-300/70 bg-emerald-400/20'
                      : 'border-rose-300/70 bg-rose-400/20'
                    : isCorrect
                      ? 'border-emerald-300/40 bg-emerald-400/10'
                      : 'border-white/10 bg-white/5 opacity-60';
                return (
                  <li key={option}>
                    <button type="button" disabled={revealed} onClick={() => choose(optionIndex)} className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm backdrop-blur-xl transition ${tone}`}>
                      <span className="flex-1">{option}</span>
                      {revealed && isCorrect && <Check className="h-4 w-4 shrink-0 text-emerald-300" />}
                    </button>
                  </li>
                );
              })}
            </ul>

            {picked !== null && (
              <button type="button" onClick={next} className={`mt-4 w-full ${glass.primaryButton}`}>
                {index === questions.length - 1 ? 'Ver resultado' : 'Continuar'}
              </button>
            )}
          </div>
        ) : (
          <div className="relative mt-6 text-center" role="status">
            <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/20 ${passed ? 'bg-emerald-300/20 text-emerald-200' : 'bg-amber-300/20 text-amber-200'}`}>
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h3 className="mt-3 text-2xl font-black">
              {score} de {questions.length} certas
            </h3>
            <p className="mt-1 text-sm text-white/70">
              {passed ? 'Visto aprovado! Seu carimbo volta a brilhar e os bônus de moedas estão ativos de novo.' : `Você precisa de pelo menos ${QUIZ_PASS_SCORE} acertos. Tente de novo com novas perguntas.`}
            </p>
            {passed ? (
              <button type="button" onClick={renew} className={`mt-5 w-full ${glass.primaryButton}`}>
                <ShieldCheck className="h-5 w-5" />
                Renovar meu visto
              </button>
            ) : (
              <button type="button" onClick={retry} className={`mt-5 w-full ${glass.secondaryButton}`}>
                <RotateCcw className="h-4 w-4" />
                Tentar de novo
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
