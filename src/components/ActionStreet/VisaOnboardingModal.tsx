import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Plane, ShieldCheck, Volume2, X } from 'lucide-react';
import gsap from 'gsap';
import visaInterviewData from '../../data/visaInterviewData.json';
import { lookupDictionary } from '../../lib/translator';
import type { ActionStreetProfile } from './ActionStreetContext';
import { glass } from './shared/glass';
import { matchesDs160Answer, type IntendedStay, type TripPurpose, type VisaOnboardingRecord } from '../../lib/actionStreet/visaOnboarding';

type Phase = 'ds160' | 'interview' | 'approved' | 'flight' | 'immigration';

interface Props {
  profile: ActionStreetProfile;
  onSave: (record: VisaOnboardingRecord) => boolean;
  onBeginArrival: () => void;
  onComplete: () => void;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function speak(text: string, role: string): void {
  if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.pitch = role.startsWith('CBP') ? 0.86 : 0.92;
    utterance.rate = 0.92;
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    console.warn('O navegador não conseguiu iniciar a voz do onboarding.', error);
  }
}

function playStampSound(): void {
  if (typeof window.AudioContext === 'undefined') return;
  try {
    const audio = new window.AudioContext();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(980, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(210, audio.currentTime + 0.12);
    gain.gain.setValueAtTime(0.18, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.16);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.onended = () => void audio.close();
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.16);
  } catch (error) {
    console.warn('O navegador não conseguiu reproduzir o som do carimbo.', error);
  }
}

function normalizeEnglishWord(word: string): string {
  return word.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z']/g, '');
}

function InteractivePrompt({
  text,
  excludedWords,
  selectedWord,
  onWordClick,
}: {
  text: string;
  excludedWords?: string[];
  selectedWord: string | null;
  onWordClick: (word: string) => void;
}) {
  const excluded = new Set(excludedWords?.map(normalizeEnglishWord) ?? []);

  return text.split(/(\s+)/).map((token, index) => {
    const word = normalizeEnglishWord(token);
    if (!word || excluded.has(word)) return token;

    return (
      <button
        key={`${index}-${word}`}
        type="button"
        aria-label={`Ver tradução e ouvir ${word}`}
        aria-pressed={selectedWord === word}
        onClick={() => onWordClick(word)}
        className="notranslate mx-px inline rounded-sm border-b border-dotted border-white/40 px-px text-white/95 transition-colors hover:border-amber-200 hover:text-amber-100 focus-visible:outline focus-visible:outline-1 focus-visible:outline-amber-200"
        title="Clique para ver a tradução e ouvir a pronúncia"
        translate="no"
      >
        {token}
      </button>
    );
  });
}

function InterviewWordHint({
  word,
  translation,
  role,
  onClose,
}: {
  word: string;
  translation: string | null;
  role: string;
  onClose: () => void;
}) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-amber-200/20 bg-amber-100/5 px-3 py-2" role="status" aria-live="polite">
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-wide text-amber-100">{word}</p>
        <p className="mt-0.5 text-xs text-white/80">
          {translation ?? 'Tradução offline não disponível para esta palavra.'}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => speak(word, role)}
          aria-label={`Ouvir pronúncia de ${word}`}
          className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-amber-100"
        >
          <Volume2 className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar tradução"
          className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function DigitalPassport({
  profile,
  visaApproved,
  admitted,
}: {
  profile: ActionStreetProfile;
  visaApproved: boolean;
  admitted: boolean;
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const playerName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Viajante';
  const initials = playerName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#d6c69d]/60 bg-[#e8dfc9] p-3 text-slate-900 shadow-inner sm:p-4">
      <div className="flex items-center justify-between border-b border-slate-900/15 pb-2">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-700">Brazilian in Action</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Passaporte digital · treinamento</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-[3.5rem_1fr] items-center gap-3 sm:grid-cols-[4.25rem_1fr_auto]">
        <div className="flex aspect-[0.78] items-center justify-center overflow-hidden border border-slate-700/30 bg-[#cfc5ad] text-sm font-black text-slate-700">
          {profile.photoUrl && !photoFailed ? (
            <img
              src={profile.photoUrl}
              alt={`Foto de ${playerName}`}
              className="h-full w-full object-cover"
              onError={() => setPhotoFailed(true)}
            />
          ) : initials}
        </div>
        <div className="min-w-0">
          <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Traveler</p>
          <p className="break-words text-sm font-black uppercase leading-tight">{playerName}</p>
          <p className="mt-1 text-[9px] font-semibold text-slate-600">
            {profile.city || profile.country
              ? [profile.city, profile.country].filter(Boolean).join(', ')
              : 'Brazil · Brazilian in Action'}
          </p>
          <p className="mt-1 text-[8px] font-bold uppercase tracking-wider text-slate-500">First destination · New York City</p>
        </div>
        {(visaApproved || admitted) && (
          <div className="col-span-2 flex flex-wrap gap-1.5 sm:col-span-1 sm:max-w-44 sm:justify-end">
            {visaApproved && (
              <span data-passport-stamp="visa" className="rotate-[-5deg] rounded border-2 border-emerald-800/75 px-2 py-1 text-[8px] font-black uppercase leading-tight text-emerald-800">
                U.S. Visa B1/B2 · Training Only
              </span>
            )}
            {admitted && (
              <span data-passport-stamp="admission" className="rotate-[3deg] rounded border-2 border-emerald-800/75 px-2 py-1 text-[8px] font-black uppercase leading-tight text-emerald-800">
                Admitted · JFK · Training Only
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function VisaOnboardingModal({ profile, onSave, onBeginArrival, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>('ds160');
  const [purpose, setPurpose] = useState<TripPurpose | null>(null);
  const [intendedStay, setIntendedStay] = useState<IntendedStay | null>(null);
  const [destinationSelected, setDestinationSelected] = useState(false);
  const [showDs160Confirmation, setShowDs160Confirmation] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [retryUsed, setRetryUsed] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerFeedback, setAnswerFeedback] = useState('');
  const [answerHint, setAnswerHint] = useState('');
  const [answerCorrect, setAnswerCorrect] = useState(false);
  const [typing, setTyping] = useState(false);
  const [immigrationAnswer, setImmigrationAnswer] = useState<string | null>(null);
  const [immigrationFeedback, setImmigrationFeedback] = useState('');
  const [visaApproved, setVisaApproved] = useState(false);
  const [visaApprovedAt, setVisaApprovedAt] = useState<number | null>(null);
  const [admitted, setAdmitted] = useState(false);
  const [admissionRecord, setAdmissionRecord] = useState<VisaOnboardingRecord | null>(null);
  const [storageError, setStorageError] = useState('');
  const [selectedInterviewWord, setSelectedInterviewWord] = useState<{ word: string; translation: string | null } | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const passportRef = useRef<HTMLDivElement>(null);
  const planeRef = useRef<SVGSVGElement>(null);
  const typingTimer = useRef<number | null>(null);
  const onBeginArrivalRef = useRef(onBeginArrival);
  const onCompleteRef = useRef(onComplete);
  const playerName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'traveler';
  const consularQuestions = visaInterviewData.consularInterview.questions;
  const currentQuestion = consularQuestions[questionIndex];
  const playerPrompt = currentQuestion?.prompt.replace('{{playerName}}', playerName);
  const immigration = visaInterviewData.airportImmigration;
  const hasForm = purpose !== null && intendedStay !== null && destinationSelected;
  const promptRole = phase === 'immigration'
    ? immigration.officerRole
    : visaInterviewData.consularInterview.officerRole;
  const promptNameWords = phase === 'interview' ? playerName.split(/\s+/).map(normalizeEnglishWord) : [];

  onBeginArrivalRef.current = onBeginArrival;
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const context = gsap.context(() => {
      if (!prefersReducedMotion()) {
        gsap.fromTo(dialog, { opacity: 0, y: 18, scale: 0.985 }, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.36,
          ease: 'power2.out',
          clearProps: 'transform',
        });
      }
    }, dialog);
    dialog.querySelector<HTMLElement>('button:not([disabled])')?.focus();
    return () => {
      context.revert();
      if (typingTimer.current !== null) window.clearTimeout(typingTimer.current);
      window.speechSynthesis?.cancel();
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  useEffect(() => {
    if (phase !== 'interview' && phase !== 'immigration') return;
    const prompt = phase === 'interview' ? playerPrompt : immigration.prompt;
    const role = phase === 'interview'
      ? visaInterviewData.consularInterview.officerRole
      : immigration.officerRole;
    if (!prompt) return;
    setTyping(true);
    typingTimer.current = window.setTimeout(() => {
      setTyping(false);
      speak(prompt, role);
      typingTimer.current = null;
    }, 800);
    return () => {
      if (typingTimer.current !== null) {
        window.clearTimeout(typingTimer.current);
        typingTimer.current = null;
      }
      window.speechSynthesis?.cancel();
    };
  }, [phase, questionIndex, playerPrompt, immigration.prompt, immigration.officerRole]);

  useEffect(() => {
    setSelectedInterviewWord(null);
  }, [phase, questionIndex]);

  const handleInterviewWordClick = (word: string) => {
    const cleanWord = normalizeEnglishWord(word);
    if (!cleanWord) return;
    const translation = visaInterviewData.wordTranslations[cleanWord] ?? lookupDictionary(cleanWord);
    setSelectedInterviewWord({ word: cleanWord, translation });
    speak(cleanWord, promptRole);
  };

  useEffect(() => {
    if (phase !== 'approved') return;
    speak(visaInterviewData.consularInterview.approval, visaInterviewData.consularInterview.officerRole);
    const stamp = passportRef.current?.querySelector<HTMLElement>('[data-passport-stamp="visa"]');
    if (!stamp || prefersReducedMotion()) return;
    const context = gsap.context(() => {
      gsap.fromTo(stamp, { scale: 2.3, rotation: -22, opacity: 0 }, {
        scale: 1,
        rotation: -7,
        opacity: 1,
        duration: 0.36,
        ease: 'back.out(1.7)',
      });
    }, stamp);
    return () => context.revert();
  }, [phase]);

  useEffect(() => {
    if (phase !== 'flight') return;
    const plane = planeRef.current;
    if (!plane || prefersReducedMotion()) {
      setPhase('immigration');
      return;
    }
    const context = gsap.context(() => {
      gsap.fromTo(plane, { x: -145, opacity: 0.2 }, {
        x: 145,
        opacity: 1,
        duration: 1.65,
        ease: 'power1.inOut',
        onComplete: () => setPhase('immigration'),
      });
    }, plane);
    return () => context.revert();
  }, [phase]);

  useEffect(() => {
    if (!admitted || !admissionRecord) return;
    const overlay = overlayRef.current;
    const stamp = passportRef.current?.querySelector<HTMLElement>('[data-passport-stamp="admission"]');
    if (!overlay) return;
    let active = true;
    const finish = () => {
      if (active) onCompleteRef.current();
    };
    onBeginArrivalRef.current();
    if (prefersReducedMotion()) {
      finish();
      return () => {
        active = false;
      };
    }

    const context = gsap.context(() => {
      const timeline = gsap.timeline({ onComplete: finish });
      timeline.to(overlay, { opacity: 0, duration: 0.58, ease: 'power2.inOut' }, 0);
      if (stamp) {
        timeline.fromTo(stamp, { scale: 2.4, rotation: 14, opacity: 0 }, {
          scale: 1,
          rotation: 4,
          opacity: 1,
          duration: 0.34,
          ease: 'back.out(1.7)',
        }, 0);
      }
    }, overlay);
    return () => {
      active = false;
      context.revert();
    };
  }, [admitted, admissionRecord]);

  const confirmDs160 = () => {
    if (!hasForm) return;
    if (!showDs160Confirmation) {
      setShowDs160Confirmation(true);
      return;
    }
    setShowDs160Confirmation(false);
    setQuestionIndex(0);
    setRetryUsed(false);
    setSelectedAnswer(null);
    setAnswerFeedback('');
    setAnswerHint('');
    setAnswerCorrect(false);
    setPhase('interview');
  };

  const chooseInterviewAnswer = (value: string, feedback: string, correct?: boolean) => {
    if (selectedAnswer !== null || !currentQuestion) return;
    const matchesForm = currentQuestion.consistencyField && purpose && intendedStay
      ? matchesDs160Answer(currentQuestion.consistencyField, value, { purpose, intendedStay })
      : correct === true;
    setSelectedAnswer(value);
    setAnswerCorrect(matchesForm);
    if (!matchesForm && currentQuestion.consistencyField) {
      setAnswerFeedback(currentQuestion.mismatchLine ?? 'Hold on, that is different from your DS-160.');
      setAnswerHint(currentQuestion.mismatchFeedback ?? 'Confira o DS-160 e tente novamente.');
      speak(currentQuestion.mismatchLine ?? 'Hold on, that is different from your DS-160.', visaInterviewData.consularInterview.officerRole);
      return;
    }
    setAnswerFeedback(feedback);
    setAnswerHint(matchesForm ? '' : 'Tente outra resposta. Você pode tentar novamente.');
  };

  const continueInterview = () => {
    if (!answerCorrect) {
      if (!retryUsed) {
        setRetryUsed(true);
        setSelectedAnswer(null);
        setAnswerFeedback('');
        setAnswerHint('');
        return;
      }
      setPhase('ds160');
      setShowDs160Confirmation(false);
      setQuestionIndex(0);
      setRetryUsed(false);
      setSelectedAnswer(null);
      setAnswerFeedback('');
      setAnswerHint('');
      setAnswerCorrect(false);
      return;
    }
    if (questionIndex < consularQuestions.length - 1) {
      setQuestionIndex((index) => index + 1);
      setRetryUsed(false);
      setSelectedAnswer(null);
      setAnswerFeedback('');
      setAnswerHint('');
      setAnswerCorrect(false);
      return;
    }
    setVisaApprovedAt(Date.now());
    setVisaApproved(true);
    setPhase('approved');
    playStampSound();
  };

  const answerImmigration = (value: string, feedback: string, correct: boolean) => {
    if (immigrationAnswer !== null) return;
    setImmigrationAnswer(value);
    setImmigrationFeedback(feedback);
    if (!correct || !purpose || !intendedStay) return;

    const record: VisaOnboardingRecord = {
      hasCompletedOnboarding: true,
      purpose,
      intendedStay,
      destination: 'new-york-city',
      visaApprovedAt: visaApprovedAt ?? Date.now(),
      admittedAt: Date.now(),
    };
    if (!onSave(record)) {
      setStorageError('Não foi possível salvar seu visto neste navegador. Verifique o espaço disponível e selecione a resposta correta novamente.');
      setImmigrationAnswer(null);
      return;
    }
    setStorageError('');
    setAdmissionRecord(record);
    setAdmitted(true);
    playStampSound();
  };

  const phaseLabel = phase === 'ds160'
    ? '1 · DS-160'
    : phase === 'interview' || phase === 'approved'
      ? '2 · Consular Interview'
      : '3 · JFK Airport';
  const passportVisaVisible = visaApproved || phase === 'flight' || phase === 'immigration';

  return (
    <div ref={overlayRef} className="absolute inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-slate-950/85 p-3 text-white sm:p-6">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Primeira entrada nos Estados Unidos · treinamento, não é documento oficial"
        className="my-auto w-full max-w-2xl rounded-3xl border border-white/15 bg-slate-950/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.65)] backdrop-blur-[8px] sm:p-6"
      >
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className={glass.label}>Action Street · experiência de aprendizagem</p>
            <h1 className="mt-1 text-lg font-black leading-tight sm:text-2xl">Sua primeira entrada nos Estados Unidos</h1>
          </div>
          <span className="shrink-0 rounded-full border border-amber-200/30 bg-amber-300/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-amber-100 sm:text-[9px]">
            Treinamento · não é documento oficial
          </span>
        </header>

        <div ref={passportRef} className="mb-4">
          <DigitalPassport
            profile={profile}
            visaApproved={passportVisaVisible}
            admitted={admitted}
          />
        </div>

        <div className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-white/55" aria-label={`Etapa atual: ${phaseLabel}`}>
          <span className={phase === 'ds160' ? 'text-sky-200' : ''}>DS-160</span>
          <span aria-hidden="true">·</span>
          <span className={phase === 'interview' || phase === 'approved' ? 'text-sky-200' : ''}>Consulado</span>
          <span aria-hidden="true">·</span>
          <span className={phase === 'flight' || phase === 'immigration' ? 'text-sky-200' : ''}>JFK</span>
        </div>

        {phase === 'ds160' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-sky-200" aria-hidden="true" />
              <h2 className="text-sm font-black">{visaInterviewData.ds160.title}</h2>
            </div>

            <fieldset>
              <legend className="mb-2 text-xs font-bold text-white/80">{visaInterviewData.ds160.purposeLabel}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {visaInterviewData.ds160.purposeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={purpose === option.value}
                    onClick={() => {
                      if (option.value === 'tourism' || option.value === 'business') setPurpose(option.value);
                      setShowDs160Confirmation(false);
                    }}
                    className={`rounded-xl border px-3 py-2.5 text-left text-sm font-bold transition ${
                      purpose === option.value ? 'border-sky-200/70 bg-sky-400/15 text-white' : 'border-white/15 bg-white/5 text-white/75 hover:bg-white/10'
                    }`}
                  >
                    {option.label} <span className="ml-1 text-[10px] text-white/55">{option.visaClass}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-xs font-bold text-white/80">{visaInterviewData.ds160.stayLabel}</legend>
              <div className="grid grid-cols-3 gap-2">
                {visaInterviewData.ds160.stayOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={intendedStay === option.value}
                    onClick={() => {
                      if (option.value === '10-days' || option.value === '2-weeks' || option.value === '1-month') setIntendedStay(option.value);
                      setShowDs160Confirmation(false);
                    }}
                    className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition sm:text-sm ${
                      intendedStay === option.value ? 'border-sky-200/70 bg-sky-400/15 text-white' : 'border-white/15 bg-white/5 text-white/75 hover:bg-white/10'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-xs font-bold text-white/80">{visaInterviewData.ds160.destinationLabel}</legend>
              <button
                type="button"
                aria-pressed={destinationSelected}
                onClick={() => {
                  setDestinationSelected(true);
                  setShowDs160Confirmation(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm font-bold transition ${
                  destinationSelected ? 'border-sky-200/70 bg-sky-400/15 text-white' : 'border-white/15 bg-white/5 text-white/75 hover:bg-white/10'
                }`}
              >
                <span>{visaInterviewData.ds160.destination.label} <span className="text-xs font-medium text-white/55">· {visaInterviewData.ds160.destination.country}</span></span>
                <span className="rounded-full border border-emerald-200/30 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-100">Desbloqueada</span>
              </button>
            </fieldset>

            {showDs160Confirmation && (
              <div className="rounded-xl border border-emerald-200/25 bg-emerald-300/10 px-3 py-2.5 text-xs font-bold leading-relaxed text-emerald-100" role="status">
                {visaInterviewData.ds160.confirmation}
              </div>
            )}
            <p className="text-[10px] leading-relaxed text-white/45">Exercício de idioma. Nenhuma solicitação oficial, taxa ou coleta biométrica é realizada.</p>
            <button type="button" onClick={confirmDs160} disabled={!hasForm} className={`w-full ${glass.primaryButton}`}>
              {showDs160Confirmation ? 'Ir para a entrevista consular' : 'Confirmar DS-160'}
              {showDs160Confirmation ? <ArrowRight className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            </button>
          </div>
        )}

        {phase === 'interview' && currentQuestion && (
          <div className="space-y-3">
            <div className={`${glass.chip} !rounded-2xl px-4 py-3`}>
              <p className={glass.label}>{visaInterviewData.consularInterview.officerRole} · Pergunta {questionIndex + 1} de {consularQuestions.length}</p>
              {typing ? (
                <p className="mt-2 text-sm font-semibold text-white/55" role="status" aria-live="polite">Typing...</p>
              ) : (
                <p className="mt-2 text-base font-semibold leading-relaxed">
                  <InteractivePrompt
                    text={playerPrompt ?? ''}
                    excludedWords={promptNameWords}
                    selectedWord={selectedInterviewWord?.word ?? null}
                    onWordClick={handleInterviewWordClick}
                  />
                </p>
              )}
              {selectedInterviewWord && (
                <InterviewWordHint
                  word={selectedInterviewWord.word}
                  translation={selectedInterviewWord.translation}
                  role={promptRole}
                  onClose={() => setSelectedInterviewWord(null)}
                />
              )}
            </div>
            {!typing && (
              <div className="space-y-2">
                {currentQuestion.options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={selectedAnswer !== null}
                    onClick={() => chooseInterviewAnswer(option.value, option.feedback, option.correct)}
                    className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm font-semibold leading-relaxed transition disabled:cursor-default ${
                      selectedAnswer === option.value
                        ? answerCorrect
                          ? 'border-emerald-200/60 bg-emerald-300/15 text-white'
                          : 'border-amber-200/50 bg-amber-300/10 text-white'
                        : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
            {selectedAnswer !== null && (
              <div className="space-y-2" role="status" aria-live="polite">
                <p className={`rounded-xl border px-3 py-2 text-xs leading-relaxed ${answerCorrect ? 'border-emerald-200/20 bg-emerald-300/10 text-emerald-100' : 'border-amber-200/20 bg-amber-300/10 text-amber-50'}`}>
                  {answerFeedback}
                  {answerHint && <span className="mt-1 block text-amber-100/80">{answerHint}</span>}
                </p>
                <button type="button" onClick={continueInterview} className={`w-full ${glass.primaryButton}`}>
                  {answerCorrect
                    ? questionIndex === consularQuestions.length - 1 ? 'Continuar para aprovação' : 'Continuar entrevista'
                    : retryUsed ? 'Revisar DS-160' : 'Tentar novamente'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {phase === 'approved' && (
          <div className="space-y-4 text-center">
            <div className="rounded-2xl border border-white/15 bg-slate-900/70 p-4">
              <p className={glass.label}>{visaInterviewData.consularInterview.officerRole}</p>
              <p className="mt-2 text-lg font-black text-emerald-100">{visaInterviewData.consularInterview.approval}</p>
            </div>
            <button type="button" onClick={() => setPhase('flight')} className={`w-full ${glass.primaryButton}`}>
              Board Flight to NYC <Plane className="h-4 w-4" />
            </button>
          </div>
        )}

        {phase === 'flight' && (
          <div className="space-y-5 py-6 text-center">
            <p className={glass.label}>Embarque · New York City</p>
            <div className="relative mx-auto flex h-16 max-w-md items-center justify-between overflow-hidden rounded-full border border-white/15 bg-slate-900/75 px-5">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/65">Brazil</span>
              <span className="absolute left-1/2 top-1/2 h-px w-1/2 -translate-y-1/2 bg-gradient-to-r from-sky-200/10 via-sky-200/65 to-sky-200/10" />
              <Plane ref={planeRef} className="relative z-10 h-5 w-5 text-sky-100" aria-hidden="true" />
              <span className="text-[10px] font-black uppercase tracking-wider text-white/65">JFK · NYC</span>
            </div>
            <p className="text-sm text-white/65">Voo concluído. Apresentando sua pasta de viagem à imigração.</p>
          </div>
        )}

        {phase === 'immigration' && (
          <div className="space-y-3">
            <div className={`${glass.chip} !rounded-2xl px-4 py-3`}>
              <p className={glass.label}>{immigration.officerRole} · JFK Airport</p>
              {typing ? (
                <p className="mt-2 text-sm font-semibold text-white/55" role="status" aria-live="polite">Typing...</p>
              ) : (
                <p className="mt-2 text-base font-semibold leading-relaxed">
                  <InteractivePrompt
                    text={immigration.prompt}
                    selectedWord={selectedInterviewWord?.word ?? null}
                    onWordClick={handleInterviewWordClick}
                  />
                </p>
              )}
              {selectedInterviewWord && (
                <InterviewWordHint
                  word={selectedInterviewWord.word}
                  translation={selectedInterviewWord.translation}
                  role={promptRole}
                  onClose={() => setSelectedInterviewWord(null)}
                />
              )}
            </div>
            {!typing && !admitted && (
              <div className="space-y-2">
                {immigration.options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={immigrationAnswer !== null}
                    onClick={() => answerImmigration(option.value, option.feedback, option.correct === true)}
                    className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm font-semibold leading-relaxed transition disabled:cursor-default ${
                      immigrationAnswer === option.value
                        ? option.correct ? 'border-emerald-200/60 bg-emerald-300/15' : 'border-amber-200/50 bg-amber-300/10'
                        : 'border-white/15 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
            {immigrationFeedback && (
              <p className="rounded-xl border border-white/15 bg-slate-900/75 px-3 py-2 text-xs leading-relaxed text-white/80" role="status" aria-live="polite">
                {immigrationFeedback}
              </p>
            )}
            {immigrationAnswer && !admitted && (
              <button
                type="button"
                onClick={() => {
                  setImmigrationAnswer(null);
                  setImmigrationFeedback('');
                }}
                className={`w-full ${glass.secondaryButton}`}
              >
                Tentar responder novamente
              </button>
            )}
            {storageError && <p className="text-xs leading-relaxed text-rose-200" role="alert">{storageError}</p>}
          </div>
        )}
      </section>
    </div>
  );
}
