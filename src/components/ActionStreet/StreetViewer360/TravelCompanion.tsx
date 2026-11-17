import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Footprints, MessageCircle, Ticket, Volume2, VolumeX, X } from 'lucide-react';
import companionData from '../../../data/actionStreetCompanion.json';
import { applyDialogueChoice, getAvailableDialogueChoices, getDialogueForSpot, type LocalDialogue, type LocalDialogueChoice } from '../../../lib/actionStreet/dialogueEngine';
import { getTouristLevelProgress, refreshChallengeTickets } from '../../../lib/actionStreet/progression';
import { playActionStreetSound } from '../../../lib/actionStreet/soundEffects';
import type { ActionStreetActivityKind } from '../ActionStreetContext';
import { useActionStreet } from '../ActionStreetContext';
import { glass } from '../shared/glass';

type CompanionLineKey = 'welcome' | 'idle' | 'collectible' | 'correct' | 'quick' | 'quickAnswer' | 'wrong' | 'travel' | 'dialogue' | 'challenge' | 'photo';
type CompanionLine = { en: string; pt: string };
type CompanionLines = Record<CompanionLineKey, CompanionLine[]>;

const lines = companionData as CompanionLines;
const ACTIVITY_LINE: Partial<Record<ActionStreetActivityKind, CompanionLineKey>> = {
  travel: 'travel',
  collectible: 'collectible',
  'correct-answer': 'correct',
  'wrong-answer': 'wrong',
  'mission-complete': 'challenge',
  dialogue: 'dialogue',
  challenge: 'challenge',
  photo: 'photo',
};
const SOUND_CUE: Partial<Record<ActionStreetActivityKind, Parameters<typeof playActionStreetSound>[0]>> = {
  travel: 'takeoff',
  collectible: 'collect',
  'correct-answer': 'success',
  'wrong-answer': 'error',
  'mission-complete': 'success',
  dialogue: 'stamp',
  challenge: 'success',
  photo: 'camera',
};

interface Props {
  cityId: string;
  spotId: string;
  paused: boolean;
  onStartChallenge: () => void;
}

export default function TravelCompanion({ cityId, spotId, paused, onStartChallenge }: Props) {
  const { state, updateState, activity, reportActivity, soundEnabled, setSoundEnabled } = useActionStreet();
  const [line, setLine] = useState<CompanionLine>(() => lines.welcome[0]);
  const [isOpen, setIsOpen] = useState(() => window.innerWidth >= 768);
  const [dialogue, setDialogue] = useState<LocalDialogue | null>(null);
  const [dialogueResult, setDialogueResult] = useState<{ character: string; feedback: string } | null>(null);
  const [dialogueError, setDialogueError] = useState('');
  const [tickets, setTickets] = useState(() => refreshChallengeTickets(state.tickets));
  const level = getTouristLevelProgress(state.xp);
  const lastActivityId = useRef(activity?.id ?? 0);
  const correctStreak = useRef(0);
  const lastInteractionAt = useRef(Date.now());
  const lastNudgeAt = useRef(0);
  const soundEnabledRef = useRef(soundEnabled);
  const hasInteracted = useRef(false);
  const lineRef = useRef(line);
  const speakRef = useRef<(text: string) => void>(() => undefined);
  const recentLineIndexes = useRef<Partial<Record<CompanionLineKey, number>>>({});
  const idleAnnounce = useRef<() => void>(() => undefined);
  const availableDialogue = getDialogueForSpot(state, cityId, spotId);
  soundEnabledRef.current = soundEnabled;

  const speak = (text: string) => {
    if (!hasInteracted.current || !soundEnabledRef.current || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.96;
    window.speechSynthesis.speak(utterance);
  };

  lineRef.current = line;
  speakRef.current = speak;
  const announce = (nextLine: CompanionLine) => {
    setLine(nextLine);
    speak(nextLine.en);
  };

  const randomLine = (key: CompanionLineKey, preferredIndex?: number) => {
    const choices = lines[key];
    if (preferredIndex !== undefined) return choices[Math.min(preferredIndex, choices.length - 1)];
    if (choices.length === 1) return choices[0];
    let index = Math.floor(Math.random() * choices.length);
    if (index === recentLineIndexes.current[key]) index = (index + 1) % choices.length;
    recentLineIndexes.current[key] = index;
    return choices[index];
  };

  idleAnnounce.current = () => announce(randomLine('idle'));

  useEffect(() => {
    const onInteraction = () => {
      if (!hasInteracted.current) speakRef.current(lineRef.current.en);
      hasInteracted.current = true;
      lastInteractionAt.current = Date.now();
    };
    window.addEventListener('pointerdown', onInteraction, { passive: true });
    window.addEventListener('keydown', onInteraction);
    const timer = window.setInterval(() => {
      if (paused || dialogue || !hasInteracted.current) return;
      if (Date.now() - lastInteractionAt.current < 20_000 || Date.now() - lastNudgeAt.current < 90_000) return;
      lastNudgeAt.current = Date.now();
      idleAnnounce.current();
    }, 3_000);
    return () => {
      window.removeEventListener('pointerdown', onInteraction);
      window.removeEventListener('keydown', onInteraction);
      window.clearInterval(timer);
      window.speechSynthesis?.cancel();
    };
  }, [dialogue, paused]);

  useEffect(() => {
    if (activity && activity.id !== lastActivityId.current) {
      lastActivityId.current = activity.id;
      lastInteractionAt.current = Date.now();
      const key = ACTIVITY_LINE[activity.kind];
      if (activity.kind === 'correct-answer') {
        correctStreak.current += 1;
        if (activity.elapsedMs !== undefined && activity.elapsedMs <= 5_000 && correctStreak.current === 1) {
          announce(randomLine('quickAnswer'));
        } else if (key) {
          announce(randomLine(key, Math.min(correctStreak.current - 1, 2)));
        }
      } else if (activity.kind === 'collectible' && activity.elapsedMs !== undefined && activity.elapsedMs <= 3_000) {
        announce(randomLine('quick'));
      } else {
        if (activity.kind === 'wrong-answer') correctStreak.current = 0;
        if (key) announce(randomLine(key));
      }
      const cue = SOUND_CUE[activity.kind];
      if (cue) playActionStreetSound(cue, soundEnabledRef.current);
    }
  }, [activity]);

  useEffect(() => {
    const refresh = () => {
      const next = refreshChallengeTickets(state.tickets);
      setTickets(next);
      if (next.available !== state.tickets.available || next.lastRefillAt !== state.tickets.lastRefillAt) {
        updateState((previous) => {
          const current = refreshChallengeTickets(previous.tickets);
          return current.available === previous.tickets.available && current.lastRefillAt === previous.tickets.lastRefillAt
            ? previous
            : { ...previous, tickets: current };
        });
      }
    };
    if (state.tickets.available >= 3) {
      setTickets(state.tickets);
      return;
    }
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(timer);
  }, [state.tickets, updateState]);

  const openDialogue = () => {
    if (!availableDialogue) return;
    setDialogue(availableDialogue);
    setDialogueResult(null);
    setDialogueError('');
  };

  const chooseDialogue = (choice: LocalDialogueChoice) => {
    if (!dialogue) return;
    if (state.balance < (choice.costDollars ?? 0)) {
      setDialogueError('Você ainda não tem Action Dollars suficientes para essa opção.');
      return;
    }
    try {
      const next = applyDialogueChoice(state, dialogue, choice);
      updateState(() => next);
      setDialogueResult({ character: dialogue.character, feedback: choice.feedback });
      setDialogue(null);
      setDialogueError('');
      reportActivity('dialogue', cityId, spotId);
    } catch (reason) {
      setDialogueError(reason instanceof Error ? reason.message : 'Não foi possível registrar essa conversa.');
    }
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (!next) window.speechSynthesis?.cancel();
  };

  const closeDialogue = () => {
    setDialogue(null);
    setDialogueError('');
  };

  return (
    <aside className={`absolute left-1/2 top-[13rem] z-20 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 text-white sm:left-auto sm:right-6 sm:top-[8.25rem] sm:translate-x-0 ${glass.panelOverImagery}`}>
      <header className="flex items-center justify-between gap-2 px-3 py-2.5">
        <button type="button" onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen} className="flex min-w-0 items-center gap-2 text-left">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-100/40 bg-amber-300/20 text-amber-100">
            <Footprints className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className={`block ${glass.label}`}>Travel companion</span>
            <span className="block truncate text-xs font-black">{level.current.title} · {state.xp} XP</span>
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-white/60 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={toggleSound} aria-label={soundEnabled ? 'Desativar voz e sons' : 'Ativar voz e sons'} aria-pressed={soundEnabled} className="rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white">
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {isOpen && (
        <div className="max-h-[min(48dvh,25rem)] space-y-3 overflow-y-auto border-t border-white/10 px-4 pb-4 pt-3">
          <div className={`rounded-2xl px-3 py-2.5 ${glass.chip}`}>
            <p className="text-sm font-bold leading-snug">{line.en}</p>
            <p className="mt-1 text-xs leading-relaxed text-white/65">{line.pt}</p>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold text-white/60">
              <span>Next level: {level.next?.title ?? 'Local legend'}</span>
              <span>{level.next ? `${Math.max(0, level.next.minXp - state.xp)} XP left` : 'MAX'}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-violet-400 transition-[width]" style={{ width: `${level.progress * 100}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={openDialogue} disabled={!availableDialogue} className={`${glass.secondaryButton} !min-h-10 !px-2 !py-2 !text-xs disabled:cursor-not-allowed disabled:opacity-45`}>
              <MessageCircle className="h-4 w-4" />
              {availableDialogue ? 'Talk to local' : 'No new chat'}
            </button>
            <button type="button" onClick={onStartChallenge} disabled={tickets.available === 0} className={`${glass.primaryButton} !min-h-10 !px-2 !py-2 !text-xs disabled:cursor-not-allowed disabled:opacity-45`}>
              <Ticket className="h-4 w-4" />
              Challenge · {tickets.available}/3
            </button>
          </div>
          <p className="text-center text-[10px] text-white/45">Optional challenge tickets refill one every 6 hours.</p>

          {dialogue && (
            <section className={`rounded-2xl p-3 ${glass.chip}`} aria-label={`Conversation with ${dialogue.character}`}>
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className={glass.label}>{dialogue.character}</p>
                  <p className="mt-1 text-sm leading-relaxed">{dialogue.line}</p>
                </div>
                <button type="button" onClick={closeDialogue} aria-label="Close conversation" className="rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2">
                {getAvailableDialogueChoices(dialogue, state).map((choice) => {
                  const affordable = state.balance >= (choice.costDollars ?? 0);
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      disabled={!affordable}
                      onClick={() => chooseDialogue(choice)}
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-left text-xs leading-relaxed transition hover:border-blue-200/50 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <span className="block">{choice.text}</span>
                      {choice.costDollars ? <span className="mt-1 block text-[10px] font-bold text-amber-200">Costs {choice.costDollars} Action Dollars</span> : null}
                    </button>
                  );
                })}
              </div>
              {dialogueError && <p className="mt-2 text-xs text-rose-200" role="alert">{dialogueError}</p>}
            </section>
          )}

          {dialogueResult && !dialogue && (
            <div className={`rounded-2xl px-3 py-2.5 ${glass.chip}`} role="status">
              <p className={glass.label}>{dialogueResult.character}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/85">{dialogueResult.feedback}</p>
              <button type="button" onClick={() => setDialogueResult(null)} className="mt-2 text-[10px] font-bold text-blue-200 hover:text-white">Dismiss</button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
