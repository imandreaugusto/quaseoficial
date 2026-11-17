import { useEffect, useRef, useState } from 'react';
import { Clock3, Eye, EyeOff, Sparkles, Volume2, X } from 'lucide-react';
import { applyChallengeResult, CHALLENGE_REWARD_DOLLARS, CHALLENGE_REWARD_XP, type LocalChallenge, type LocalChallengeOption } from '../../../lib/actionStreet/challengeEngine';
import { useActionStreet } from '../ActionStreetContext';
import { glass } from '../shared/glass';

const CHALLENGE_DURATION_MS = 8_000;

interface Props {
  cityId: string;
  spotId: string;
  challenge: LocalChallenge;
  onClose: () => void;
}

interface Result {
  option: LocalChallengeOption | null;
  expired: boolean;
}

export default function StreetChallengeModal({ cityId, spotId, challenge, onClose }: Props) {
  const { state, updateState, reportActivity } = useActionStreet();
  const isListening = challenge.kind === 'listening' && Boolean(challenge.audioText);
  const [remaining, setRemaining] = useState(CHALLENGE_DURATION_MS);
  const [result, setResult] = useState<Result | null>(null);
  const [listeningStarted, setListeningStarted] = useState(!isListening);
  const [phrasePlaying, setPhrasePlaying] = useState(false);
  const [transcriptVisible, setTranscriptVisible] = useState(false);
  const [audioUnavailable, setAudioUnavailable] = useState(false);
  const startedAt = useRef<number | null>(isListening ? null : Date.now());
  const finished = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (startedAt.current === null || finished.current) return;
      const next = Math.max(0, CHALLENGE_DURATION_MS - (Date.now() - startedAt.current));
      setRemaining(next);
      if (next === 0 && !finished.current) {
        finished.current = true;
        updateState((previous) => applyChallengeResult(previous, cityId, challenge, null));
        setResult({ option: null, expired: true });
        reportActivity('challenge', cityId, spotId);
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [challenge, cityId, reportActivity, spotId, updateState]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const answer = (option: LocalChallengeOption) => {
    if (!listeningStarted || finished.current || remaining <= 0 || startedAt.current === null || Date.now() - startedAt.current >= CHALLENGE_DURATION_MS) return;
    finished.current = true;
    updateState((previous) => applyChallengeResult(previous, cityId, challenge, option));
    setResult({ option, expired: false });
    reportActivity('challenge', cityId, spotId);
  };

  const startListeningChallenge = () => {
    if (!isListening || phrasePlaying || !challenge.audioText) return;
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      setAudioUnavailable(true);
      setTranscriptVisible(true);
      if (startedAt.current === null) {
        startedAt.current = Date.now();
        setListeningStarted(true);
      }
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(challenge.audioText);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      const beginTimer = () => {
        setPhrasePlaying(false);
        if (startedAt.current === null) {
          startedAt.current = Date.now();
          setListeningStarted(true);
        }
      };
      utterance.onend = beginTimer;
      utterance.onerror = (event) => {
        console.warn('O navegador não conseguiu reproduzir a frase do desafio.', event.error);
        setAudioUnavailable(true);
        setTranscriptVisible(true);
        beginTimer();
      };
      setPhrasePlaying(true);
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.warn('O navegador não conseguiu iniciar a voz do desafio.', error);
      setAudioUnavailable(true);
      setTranscriptVisible(true);
      if (startedAt.current === null) {
        startedAt.current = Date.now();
        setListeningStarted(true);
      }
    }
  };

  const correct = result?.option?.correct === true;
  const remainingSeconds = Math.ceil(remaining / 1000);

  return (
    <div className={`absolute inset-0 z-[60] flex items-center justify-center p-4 ${glass.backdrop}`} onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`Street conversation with ${challenge.character}`}
        onClick={(event) => event.stopPropagation()}
        className={`relative max-h-[92dvh] w-full max-w-lg overflow-y-auto p-5 text-white sm:p-6 ${glass.panelOverImagery}`}
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-amber-400/20 blur-3xl" />
        <header className="relative flex items-start justify-between gap-4">
          <div>
            <p className={glass.label}>Bonus street challenge</p>
            <h2 className="text-xl font-black">{challenge.character}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close challenge" className={glass.iconButton}>
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="relative mt-5 flex items-center gap-2 text-sm font-bold text-amber-100" role="timer" aria-label={`${remainingSeconds} seconds remaining`}>
          <Clock3 className="h-4 w-4" />
          <span>{result ? 'Challenge finished' : `${remainingSeconds}s`}</span>
        </div>
        <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-rose-400 transition-[width]" style={{ width: `${(remaining / CHALLENGE_DURATION_MS) * 100}%` }} />
        </div>

        <div className={`relative mt-4 rounded-2xl px-4 py-3 ${glass.chip}`}>
          <p className="text-sm leading-relaxed">{challenge.line}</p>
        </div>

        {!result ? (
          <div className="relative mt-4 space-y-3">
            {isListening && (
              <div className={`rounded-2xl p-3 ${glass.chip}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={startListeningChallenge} disabled={phrasePlaying || audioUnavailable} className={`${glass.secondaryButton} !min-h-10 !px-3 !py-2 !text-xs disabled:opacity-50`}>
                    <Volume2 className="h-4 w-4" /> {phrasePlaying ? 'Speaking...' : listeningStarted ? 'Replay phrase' : 'Play phrase'}
                  </button>
                  <button type="button" onClick={() => setTranscriptVisible((visible) => !visible)} aria-expanded={transcriptVisible} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-white/75 transition hover:bg-white/10 hover:text-white">
                    {transcriptVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {transcriptVisible ? 'Hide transcript' : 'Show transcript'}
                  </button>
                </div>
                <p className={`mt-2 text-sm leading-relaxed text-white/75 ${transcriptVisible ? '' : 'sr-only'}`}>{challenge.audioText}</p>
                {audioUnavailable && <p className="mt-2 text-xs text-amber-100" role="status">A voz não está disponível. Use a frase exibida para continuar.</p>}
              </div>
            )}
            {listeningStarted ? challenge.options.map((option) => (
              <button
                key={option.text}
                type="button"
                onClick={() => answer(option)}
                className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-left text-sm leading-relaxed transition hover:border-blue-200/50 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
              >
                {option.text}
              </button>
            )) : <p className="text-center text-xs text-white/55">Play the phrase to start your 8-second challenge.</p>}
          </div>
        ) : (
          <div className={`relative mt-4 rounded-2xl border px-4 py-4 ${correct ? 'border-emerald-300/35 bg-emerald-400/10' : 'border-amber-300/30 bg-amber-400/10'}`} role="status">
            <p className="font-bold">{result.expired ? 'Time to pause and try another time.' : result.option?.response}</p>
            <p className="mt-2 text-sm leading-relaxed text-white/75">{challenge.tip}</p>
            {correct && (
              <p className="mt-3 flex flex-wrap items-center gap-2 text-sm font-black text-amber-200">
                <Sparkles className="h-4 w-4" /> +{CHALLENGE_REWARD_DOLLARS} Action Dollars · +{CHALLENGE_REWARD_XP} XP
              </p>
            )}
          </div>
        )}

        <button type="button" onClick={onClose} disabled={!result} className={`relative mt-5 w-full ${result ? glass.primaryButton : glass.secondaryButton + ' opacity-45'}`}>
          {result ? 'Back to the street' : 'Choose your answer'}
        </button>
      </section>
    </div>
  );
}
