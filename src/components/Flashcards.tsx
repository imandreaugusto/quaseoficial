import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { AudioLines, BookOpen, Clock3, Mic, RotateCcw, Volume2 } from 'lucide-react';
import { MASTER_DECK, type MasterCard } from '../data/masterDeck';
import { UserProgressService, type CardProgress, type ReviewRating } from '../lib/UserProgressService';
import './Flashcards.css';

interface FlashcardsProps {
  userId: string;
}

interface RecognitionAlternative {
  transcript: string;
}

interface RecognitionResult {
  0: RecognitionAlternative;
  isFinal: boolean;
}

interface RecognitionEvent extends Event {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}

interface RecognitionErrorEvent extends Event {
  error?: string;
}

interface RecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  processLocally?: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface RecognitionConstructor {
  new (): RecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  }
}

const FLOW_SECONDS = 120;
const ratings: Array<{ value: ReviewRating; label: string; className: string }> = [
  { value: 1, label: 'De novo', className: 'again' },
  { value: 2, label: 'Difícil', className: 'hard' },
  { value: 3, label: 'Bom', className: 'good' },
  { value: 4, label: 'Fácil', className: 'easy' },
];

const normalizeWord = (word: string) => word.toLocaleLowerCase('en-US').replace(/[^a-z0-9']/g, '');
const getAvailableCardIds = (
  progress: Record<string, CardProgress>,
  criticalOnly: boolean,
) => MASTER_DECK
  .filter((card) => criticalOnly
    ? (progress[card.card_id]?.lapses || 0) >= 3
    : !progress[card.card_id] || Date.parse(progress[card.card_id].due_date) <= Date.now())
  .map((card) => card.card_id);

export default function Flashcards({ userId }: FlashcardsProps) {
  const service = useMemo(() => new UserProgressService(userId), [userId]);
  const [progress, setProgress] = useState<Record<string, CardProgress>>(service.getSnapshot());
  const [dailyCount, setDailyCount] = useState(service.getReviewedToday());
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [remainingIds, setRemainingIds] = useState(() => getAvailableCardIds(service.getSnapshot(), false));
  const [isFlipped, setIsFlipped] = useState(false);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [reviewed, setReviewed] = useState(0);
  const [notice, setNotice] = useState('');
  const [flowSeconds, setFlowSeconds] = useState<number | null>(null);
  const [flowFinished, setFlowFinished] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [pronunciation, setPronunciation] = useState({ correct: 0, total: 0 });
  const [pronunciationAttempts, setPronunciationAttempts] = useState({ correct: 0, total: 0 });
  const [syncError, setSyncError] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);
  const flowLineRef = useRef<HTMLDivElement>(null);
  const orbsRef = useRef<HTMLDivElement[]>([]);
  const waveRefs = useRef<HTMLSpanElement[]>([]);
  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const pronunciationRef = useRef({ correct: 0, total: 0 });
  const pronunciationRecordedRef = useRef(false);
  const criticalOnlyRef = useRef(false);

  const criticalCount = useMemo(
    () => Object.values(progress).filter((entry) => entry.lapses >= 3).length,
    [progress],
  );
  const availableCards = useMemo(
    () => MASTER_DECK.filter((card) => !criticalOnly || (progress[card.card_id]?.lapses || 0) >= 3),
    [criticalOnly, progress],
  );
  const currentCard = availableCards.find((card) => card.card_id === remainingIds[0]);
  const nextCards = remainingIds.slice(1, 3)
    .map((id) => availableCards.find((card) => card.card_id === id))
    .filter((card): card is MasterCard => Boolean(card));
  const dueCount = useMemo(
    () => MASTER_DECK.filter((card) =>
      !progress[card.card_id] || Date.parse(progress[card.card_id].due_date) <= Date.now(),
    ).length,
    [progress],
  );
  const progressPercent = Math.min(100, Math.round((dailyCount / 10) * 100));
  const expectedWords = useMemo(() => currentCard?.front.split(/\s+/) || [], [currentCard]);

  useEffect(() => {
    if (brandRef.current) {
      gsap.fromTo(brandRef.current, { autoAlpha: 0, scale: 0.92, y: -5 }, {
        autoAlpha: 1, scale: 1, y: 0, duration: 0.75, ease: 'power2.out',
      });
    }
    const timelines = orbsRef.current.map((orb, index) => gsap.to(orb, {
      x: index % 2 ? 42 : -35,
      y: index === 1 ? -30 : 36,
      scale: 1.12,
      duration: 12 + index * 3,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    }));
    return () => timelines.forEach((timeline) => timeline.kill());
  }, []);

  useEffect(() => {
    let active = true;
    void service.loadRemote().then((loaded) => {
      if (!active) return;
      setProgress({ ...loaded });
      setDailyCount(service.getReviewedToday());
      setRemainingIds(getAvailableCardIds(loaded, criticalOnlyRef.current));
    }).catch(() => {
      if (active) setNotice('Não foi possível carregar o progresso da nuvem. O cache local continua disponível.');
    });
    return () => { active = false; };
  }, [service]);

  useEffect(() => {
    if (!cardRef.current) return;
    gsap.to(cardRef.current, {
      rotateY: isFlipped ? 180 : 0,
      duration: 0.72,
      ease: 'back.out(1.2)',
      overwrite: 'auto',
    });
  }, [isFlipped, currentCard?.card_id]);

  useEffect(() => {
    const currentColor = combo >= 10
      ? '#d9c78e'
      : combo >= 5
        ? '#c9bd98'
        : combo >= 3
          ? '#8bdce6'
          : 'rgba(255,255,255,0.2)';
    if (cardRef.current) {
      if (combo > 0) {
        gsap.fromTo(cardRef.current, { scale: 1 }, {
          scale: 1.012,
          duration: 0.34,
          repeat: 1,
          yoyo: true,
          ease: 'sine.inOut',
          overwrite: 'auto',
        });
      }
      gsap.to(cardRef.current, {
        borderColor: currentColor,
        boxShadow: combo >= 3
          ? `0 28px 90px rgba(0,0,0,.33), 0 0 24px ${combo >= 10 ? 'rgba(217,199,142,.17)' : combo >= 5 ? 'rgba(201,189,152,.12)' : 'rgba(139,220,230,.15)'}, inset 0 1px 0 rgba(255,255,255,.18)`
          : '0 28px 90px rgba(0,0,0,.33), inset 0 1px 0 rgba(255,255,255,.18)',
        duration: 0.7,
        ease: 'power2.out',
      });
    }
  }, [combo]);

  useEffect(() => {
    const animations = speaking ? waveRefs.current.map((bar, index) => gsap.to(bar, {
      scaleY: 0.28 + ((index % 2) * 0.4),
      duration: 0.28 + index * 0.06,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: index * 0.04,
    })) : [];
    if (!speaking) gsap.to(waveRefs.current, { scaleY: 0.35, duration: 0.2, overwrite: 'auto' });
    return () => animations.forEach((animation) => animation.kill());
  }, [speaking]);

  useEffect(() => {
    if (flowSeconds === null) return;
    if (flowLineRef.current) {
      gsap.to(flowLineRef.current, {
        scaleX: flowSeconds / FLOW_SECONDS,
        duration: 0.9,
        ease: 'none',
      });
    }
    if (flowSeconds <= 0) {
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
      setFlowSeconds(null);
      setFlowFinished(true);
      return;
    }
    const timerId = window.setTimeout(() => setFlowSeconds((seconds) => seconds === null ? null : seconds - 1), 1000);
    return () => window.clearTimeout(timerId);
  }, [flowSeconds]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && currentCard && !event.repeat && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault();
        flipCard();
      }
      if (isFlipped && ['1', '2', '3', '4'].includes(event.key)) {
        const rating = Number(event.key) as ReviewRating;
        handleReview(rating);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  useEffect(() => () => {
    window.speechSynthesis?.cancel();
    recognitionRef.current?.stop();
  }, []);

  const speak = useCallback((card: MasterCard, rate = 1) => {
    if (!('speechSynthesis' in window)) {
      setNotice('A leitura de áudio não está disponível neste navegador.');
      return;
    }
    const englishVoice = window.speechSynthesis.getVoices().find(
      (voice) => voice.localService && voice.lang.toLowerCase().startsWith('en'),
    );
    if (!englishVoice) {
      setNotice('Não há uma voz em inglês instalada localmente. Instale uma voz no sistema operacional para usar o áudio sem conexão externa.');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(card.front);
    utterance.lang = 'en-US';
    utterance.voice = englishVoice;
    utterance.rate = rate;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => {
      setSpeaking(false);
      setNotice('Não foi possível reproduzir o áudio neste momento.');
    };
    window.speechSynthesis.speak(utterance);
  }, []);

  const flipCard = useCallback(() => {
    if (!currentCard) return;
    setIsFlipped((flipped) => {
      const nextFlipped = !flipped;
      if (nextFlipped) speak(currentCard);
      else {
        setSpokenText('');
        setPronunciation({ correct: 0, total: 0 });
      }
      return nextFlipped;
    });
  }, [currentCard, speak]);

  const handleReview = useCallback((rating: ReviewRating) => {
    if (!currentCard) return;
    recognitionRef.current?.stop();
    setListening(false);
    const { progress: updated, sync } = service.review(currentCard.card_id, rating);
    setProgress((previous) => ({ ...previous, [currentCard.card_id]: updated }));
    setDailyCount(service.getReviewedToday());
    setReviewed((count) => count + 1);
    if (rating === 1) setCombo(0);
    else setCombo((count) => {
      const nextCombo = count + 1;
      setBestCombo((best) => Math.max(best, nextCombo));
      return nextCombo;
    });
    setIsFlipped(false);
    setSpokenText('');
    setPronunciation({ correct: 0, total: 0 });
    setNotice('');

    if (cardRef.current) {
      gsap.to(cardRef.current, {
        x: window.innerWidth < 640 ? 360 : 560,
        y: -28,
        autoAlpha: 0,
        duration: 0.38,
        ease: 'power2.in',
        onComplete: () => {
          setRemainingIds((ids) => ids.filter((id) => id !== currentCard.card_id));
          gsap.set(cardRef.current, { x: 0, y: 0, autoAlpha: 1, rotateY: 0 });
        },
      });
    } else {
      setRemainingIds((ids) => ids.filter((id) => id !== currentCard.card_id));
    }

    void sync.then((result) => {
      if (result === 'error') setSyncError(true);
    });
  }, [currentCard, pronunciation, service]);

  const toggleCritical = () => {
    const nextCritical = !criticalOnlyRef.current;
    criticalOnlyRef.current = nextCritical;
    setCriticalOnly(nextCritical);
    setRemainingIds(getAvailableCardIds(progress, nextCritical));
    setIsFlipped(false);
    setFlowFinished(false);
  };

  const startFlow = () => {
    setFlowFinished(false);
    setFlowSeconds(FLOW_SECONDS);
    setRemainingIds(getAvailableCardIds(progress, criticalOnly));
  };

  const startShadowing = () => {
    if (!currentCard) return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setNotice('Este navegador não oferece reconhecimento de fala local. Para manter o áudio privado, use a leitura e repita a frase sem gravação.');
      return;
    }
    recognitionRef.current?.stop();
    const recognition = new Recognition();
    if (!('processLocally' in recognition)) {
      setNotice('Este navegador não permite confirmar processamento local da fala. O microfone foi desativado para evitar enviar áudio a um serviço externo.');
      return;
    }
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.processLocally = true;
    setSpokenText('');
    pronunciationRef.current = { correct: 0, total: 0 };
    pronunciationRecordedRef.current = false;
    setListening(true);
    setNotice('Fale a frase em inglês. O microfone ficará ativo até você parar.');
    recognition.onresult = (event) => {
      const transcript = Array.from({ length: event.results.length }, (_, index) =>
        event.results[index][0]?.transcript || '',
      ).join(' ').trim();
      setSpokenText(transcript);
      const heard = new Set(transcript.split(/\s+/).map(normalizeWord).filter(Boolean));
      const expected = currentCard.front.split(/\s+/).map(normalizeWord).filter(Boolean);
      const matched = expected.filter((word) => heard.has(word)).length;
      pronunciationRef.current = { correct: matched, total: expected.length };
      setPronunciation({ correct: matched, total: expected.length });
    };
    recognition.onerror = (event) => {
      setListening(false);
      setNotice(event.error === 'language-not-supported'
        ? 'O pacote local de reconhecimento em inglês não está instalado neste navegador. Instale o pacote de idioma ou pratique sem gravação.'
        : 'O microfone não pôde iniciar localmente. Confira a permissão de áudio e o suporte do navegador.');
    };
    recognition.onend = () => {
      setListening(false);
      if (!pronunciationRecordedRef.current && pronunciationRef.current.total > 0) {
        pronunciationRecordedRef.current = true;
        setPronunciationAttempts((previous) => ({
          correct: previous.correct + pronunciationRef.current.correct,
          total: previous.total + pronunciationRef.current.total,
        }));
      }
    };
    try {
      recognition.start();
    } catch (error) {
      setListening(false);
      console.error('Não foi possível iniciar o reconhecimento de voz:', error);
      setNotice('Não foi possível iniciar o microfone. Tente novamente.');
    }
  };

  const stopShadowing = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const pronunciationPercent = pronunciationAttempts.total
    ? Math.round((pronunciationAttempts.correct / pronunciationAttempts.total) * 100)
    : null;
  const completionMessage = criticalOnly
    ? 'Não há cartas críticas no momento. Responda novamente quando precisar reforçar uma expressão.'
    : 'Você concluiu as cartas desta sessão. Volte mais tarde para revisar as próximas.';
  const renderPronunciation = () => (
    <div className="flashcards-pronunciation" aria-live="polite">
      {expectedWords.map((word, index) => {
        const heardWords = new Set(spokenText.split(/\s+/).map(normalizeWord));
        const isCorrect = heardWords.has(normalizeWord(word));
        return (
          <span key={`${word}-${index}`} className={isCorrect ? 'flashcards-word-correct' : 'flashcards-word-missing'}>
            {word}{index < expectedWords.length - 1 ? ' ' : ''}
          </span>
        );
      })}
      <span className="sr-only">Transcrição: {spokenText}</span>
    </div>
  );

  return (
    <div className="flashcards-app">
      <div ref={(element) => { if (element) orbsRef.current[0] = element; }} className="flashcards-orb flashcards-orb-one" />
      <div ref={(element) => { if (element) orbsRef.current[1] = element; }} className="flashcards-orb flashcards-orb-two" />
      <div ref={(element) => { if (element) orbsRef.current[2] = element; }} className="flashcards-orb flashcards-orb-three" />
      {flowSeconds !== null && <div ref={flowLineRef} className="flashcards-session-line" style={{ transform: 'scaleX(1)' }} />}

      <div className="flashcards-shell">
        <header className="flashcards-header">
          <div className="flashcards-brand" ref={brandRef}>
            <span className="flashcards-brand-mark"><BookOpen size={19} strokeWidth={1.4} /></span>
            <span>
              <span className="flashcards-brand-name">Brazilian Anki</span>
              <span className="flashcards-brand-caption">Repetição espaçada</span>
            </span>
          </div>

          <div className="flashcards-header-actions">
            <button type="button" className={`flashcards-chip ${criticalOnly ? 'is-active' : ''}`} onClick={toggleCritical}>
              Zona Crítica <span className="flashcards-chip-count">{criticalCount}</span>
            </button>
            <button type="button" className={`flashcards-flow-button ${flowSeconds !== null ? 'is-running' : ''}`} onClick={startFlow}>
              <Clock3 size={14} strokeWidth={1.6} />
              {flowSeconds === null ? 'Modo Flow (2 min)' : `Flow ${Math.floor(flowSeconds / 60)}:${String(flowSeconds % 60).padStart(2, '0')}`}
            </button>
          </div>

          <div className="flashcards-progress">
            <div className="flashcards-progress-label">Meta diária</div>
            <div className="flashcards-progress-value">{dailyCount} de 10 revisões</div>
            <div className="flashcards-progress-track">
              <div className="flashcards-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </header>

        <section className="flashcards-heading">
          <div className="flashcards-kicker">{criticalOnly ? 'Revisão focada' : 'Prática espaçada'}</div>
          <h1>Um pouco melhor, a cada revisão.</h1>
          <p>Leia, escute e tente lembrar antes de revelar a resposta.</p>
        </section>

        {currentCard ? (
          <>
            <div className="flashcards-deck">
              {nextCards[1] && <div className="flashcards-stack flashcards-stack-back" aria-hidden="true" />}
              {nextCards[0] && <div className="flashcards-stack flashcards-stack-front" aria-hidden="true" />}
              <div
                ref={cardRef}
                className="flashcards-card"
                role="button"
                tabIndex={0}
                aria-label={isFlipped ? 'Carta revelada; pressione espaço para voltar' : 'Revelar carta; pressione espaço'}
                onClick={flipCard}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    flipCard();
                  }
                }}
              >
                <div className="flashcards-face">
                  <span className="flashcards-category">{currentCard.category}</span>
                  <p className="flashcards-prompt">{currentCard.front}</p>
                  <div className="flashcards-audio-row" onClick={(event) => event.stopPropagation()}>
                    <button type="button" className="flashcards-icon-button" onClick={() => speak(currentCard, 1)}>
                      <Volume2 size={15} strokeWidth={1.6} /> Ouvir
                    </button>
                    <button type="button" className="flashcards-icon-button" onClick={() => speak(currentCard, 0.75)} aria-label="Ouvir em velocidade lenta">
                      0,75x
                    </button>
                    <button
                      type="button"
                      className={`flashcards-icon-button flashcards-mic-button ${listening ? 'is-listening' : ''}`}
                      onClick={listening ? stopShadowing : startShadowing}
                      aria-label={listening ? 'Parar treino de pronúncia' : 'Iniciar treino de pronúncia'}
                    >
                      <Mic size={15} strokeWidth={1.6} /> {listening ? 'Parar' : 'Pronúncia'}
                    </button>
                  </div>
                  {notice.includes('compatível') && <div className="flashcards-unsupported">{notice}</div>}
                  {spokenText && renderPronunciation()}
                  <span className="flashcards-card-hint">Toque na carta ou pressione espaço para revelar</span>
                </div>

                <div className="flashcards-face flashcards-face-back">
                  <span className="flashcards-category">
                    <span className="flashcards-wave" aria-label={speaking ? 'Áudio em reprodução' : 'Áudio parado'}>
                      {Array.from({ length: 4 }, (_, index) => (
                        <span
                          key={index}
                          ref={(element) => { if (element) waveRefs.current[index] = element; }}
                          className="flashcards-wave-bar"
                        />
                      ))}
                    </span>
                  </span>
                  <p className="flashcards-translation">{currentCard.back}</p>
                  <p className="flashcards-example">{currentCard.example}</p>
                  {currentCard.tip && <p className="flashcards-tip">{currentCard.tip}</p>}
                  {spokenText && renderPronunciation()}
                  <span className="flashcards-card-hint">A resposta melhora sua próxima revisão</span>
                </div>
              </div>
            </div>

            {isFlipped && (
              <div className="flashcards-ratings" role="group" aria-label="Avalie a dificuldade da carta">
                {ratings.map((rating, index) => (
                  <button
                    type="button"
                    key={rating.value}
                    className={`flashcards-rating flashcards-rating-${rating.className}`}
                    onClick={() => handleReview(rating.value)}
                  >
                    {rating.label}
                    <span className="flashcards-rating-key">{index + 1}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flashcards-session-meta">
              <span>Cartas na sessão: {remainingIds.length}</span>
              <span>Sequência: {combo}x</span>
              <span>Maior: {bestCombo}x</span>
            </div>
          </>
        ) : (
          <div className="flashcards-empty">
            <AudioLines size={22} strokeWidth={1.3} />
            <h2>{criticalOnly ? 'Sua zona crítica está em dia.' : 'Sessão concluída.'}</h2>
            <p>{completionMessage}</p>
            <button
              type="button"
              className="flashcards-primary-button"
              onClick={() => {
                setRemainingIds(getAvailableCardIds(progress, criticalOnly));
                setIsFlipped(false);
              }}
            >
              <RotateCcw size={15} strokeWidth={1.6} /> Revisar novamente
            </button>
          </div>
        )}

        {notice && !notice.includes('compatível') && <div role="status" className="flashcards-notice">{notice}</div>}
        {syncError && (
          <div role="alert" className="flashcards-notice">
            O progresso está salvo neste dispositivo, mas não foi possível sincronizar com o Supabase.
          </div>
        )}
        {!syncError && <div className="flashcards-notice">Cache local ativo{dueCount ? ` · ${dueCount} revisões vencidas` : ' · modo de demonstração'}.</div>}
      </div>

      {flowFinished && (
        <div className="fixed inset-0 z-[8000] flex items-center justify-center bg-black/55 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="flow-summary-title">
          <div className="flashcards-summary">
            <div className="flashcards-kicker">Sprint finalizado</div>
            <h2 id="flow-summary-title">Dois minutos de foco.</h2>
            <p>Uma revisão curta também constrói consistência.</p>
            <div className="flashcards-summary-stats">
              <div className="flashcards-summary-stat"><strong>{reviewed}</strong><span>cartas revisadas</span></div>
              <div className="flashcards-summary-stat"><strong>{bestCombo}x</strong><span>maior sequência</span></div>
              <div className="flashcards-summary-stat"><strong>{pronunciationPercent === null ? '—' : `${pronunciationPercent}%`}</strong><span>precisão de pronúncia</span></div>
            </div>
            <button type="button" className="flashcards-primary-button" onClick={() => setFlowFinished(false)}>Continuar estudando</button>
          </div>
        </div>
      )}
    </div>
  );
}
