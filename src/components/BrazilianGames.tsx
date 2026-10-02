import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlignLeft,
  AudioLines,
  BookOpenText,
  Brain,
  Check,
  ChevronLeft,
  CircleHelp,
  Clock3,
  Gamepad2,
  Grid2X2,
  Image,
  Layers3,
  Medal,
  RefreshCw,
  Search,
  Shuffle,
  Sparkles,
  Type,
  Trophy,
  Volume2,
  X
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { celebrateCorrectAnswer } from '../lib/gameRewards';
import {
  loadBrazilianGamesLeaderboard,
  submitBrazilianGameScore,
  type WeeklyGameLeaderboard
} from '../lib/brazilianGamesApi';
import { LocalGameRunner, type LocalGameId } from './LocalGameRunner';

type GameCategory = 'Words' | 'Vocabulary' | 'Grammar' | 'Reading';
type GameId = LocalGameId | 'word-rush';

interface GameEntry {
  id: GameId;
  title: string;
  category: GameCategory;
  description: string;
  icon: LucideIcon;
  color: string;
  playable?: boolean;
}

const GAMES: GameEntry[] = [
  { id: 'crossword', title: 'Crossword Sprint', category: 'Words', description: 'Solve short English clues and fill the letter slots.', icon: Grid2X2, color: 'text-amber-300', playable: true },
  { id: 'hex-words', title: 'HexaLetters', category: 'Words', description: 'Choose letters on a hex board to form words.', icon: Layers3, color: 'text-cyan-300', playable: true },
  { id: 'word-search', title: 'Word Search', category: 'Words', description: 'Tap hidden words in the letter grid.', icon: Search, color: 'text-emerald-300', playable: true },
  { id: 'memory', title: 'Memory Match', category: 'Vocabulary', description: 'Vire as cartas e encontre os pares correspondentes.', icon: Brain, color: 'text-pink-300', playable: true },
  { id: 'picture-match', title: 'Picture Match', category: 'Vocabulary', description: 'Associe imagens a palavras em inglês.', icon: Image, color: 'text-sky-300', playable: true },
  { id: 'audio-quiz', title: 'Listen & Choose', category: 'Vocabulary', description: 'Ouça a pronúncia do navegador e escolha a palavra.', icon: Volume2, color: 'text-violet-300', playable: true },
  { id: 'sentence-scramble', title: 'Sentence Builder', category: 'Grammar', description: 'Organize as palavras para montar frases corretas.', icon: AlignLeft, color: 'text-orange-300', playable: true },
  { id: 'visual-vocabulary', title: 'Visual Vocabulary', category: 'Vocabulary', description: 'Aprenda palavras com imagens e associações locais.', icon: Sparkles, color: 'text-lime-300', playable: true },
  { id: 'idiom-blocks', title: 'Idiom Tetris', category: 'Vocabulary', description: 'Clear falling blocks while practicing common expressions.', icon: Gamepad2, color: 'text-red-300', playable: true },
  { id: 'flashcards', title: 'Flashcards', category: 'Vocabulary', description: 'Revise palavras e significados em cartões rápidos.', icon: BookOpenText, color: 'text-yellow-300', playable: true },
  { id: 'context-quest', title: 'Context Quest', category: 'Reading', description: 'Descubra o significado de palavras em contexto.', icon: BookOpenText, color: 'text-teal-300', playable: true },
  { id: 'word-rush', title: 'Word Rush', category: 'Words', description: 'Forme palavras corretas antes do cronômetro zerar.', icon: Clock3, color: 'text-rose-300', playable: true },
  { id: 'yes-no-speed', title: 'Yes or No?', category: 'Reading', description: 'Leia frases curtas e responda sob pressão.', icon: CircleHelp, color: 'text-blue-300', playable: true },
  { id: 'custom-quiz', title: 'Quiz Studio', category: 'Grammar', description: 'Responda a desafios de múltipla escolha.', icon: Check, color: 'text-fuchsia-300', playable: true },
  { id: 'hangman', title: 'Hangman', category: 'Words', description: 'Descubra a palavra antes que as tentativas acabem.', icon: Type, color: 'text-indigo-300', playable: true }
];

const WORDS = [
  { word: 'journey', hint: 'A trip from one place to another' },
  { word: 'bright', hint: 'Full of light or intelligence' },
  { word: 'gather', hint: 'To bring things or people together' },
  { word: 'curious', hint: 'Eager to learn or know something' },
  { word: 'careful', hint: 'Giving attention to avoid mistakes' },
  { word: 'breathe', hint: 'To take air into and out of your lungs' },
  { word: 'improve', hint: 'To become better' },
  { word: 'weather', hint: 'The condition of the air outside' },
  { word: 'whisper', hint: 'To speak very quietly' },
  { word: 'balance', hint: 'An even distribution or a steady position' },
  { word: 'discover', hint: 'To find something for the first time' },
  { word: 'practice', hint: 'Repeated activity to get better at something' }
];

const scramble = (word: string): string => {
  const letters = word.split('');
  for (let index = letters.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [letters[index], letters[target]] = [letters[target], letters[index]];
  }
  const result = letters.join('');
  return result === word ? `${result.slice(1)}${result[0]}` : result;
};

const normalizeAnswer = (answer: string): string => answer.trim().toLowerCase();

const createSessionId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const randomValue = Math.floor(Math.random() * 16);
    const value = character === 'x' ? randomValue : (randomValue & 0x3) | 0x8;
    return value.toString(16);
  });
};

export const BrazilianGames: React.FC = () => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'All' | GameCategory>('All');
  const [activeGameId, setActiveGameId] = useState<GameId | null>(null);
  const [showingRound, setShowingRound] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [scrambledWord, setScrambledWord] = useState(() => scramble(WORDS[0].word));
  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [completed, setCompleted] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [won, setWon] = useState(false);
  const [leaderboard, setLeaderboard] = useState<WeeklyGameLeaderboard | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState('');
  const sessionIdRef = useRef('');
  const scoreSubmittedRef = useRef(false);

  const refreshLeaderboard = async () => {
    setLeaderboardLoading(true);
    setLeaderboardError('');
    try {
      setLeaderboard(await loadBrazilianGamesLeaderboard());
    } catch (error) {
      setLeaderboardError(error instanceof Error ? error.message : 'Ranking indisponível.');
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const recordScore = async (gameId: GameId, points: number, sessionId: string): Promise<boolean> => {
    if (points < 1) return false;
    try {
      await submitBrazilianGameScore(gameId, sessionId, points);
      await refreshLeaderboard();
      return true;
    } catch (error) {
      setLeaderboardError(error instanceof Error ? error.message : 'Não foi possível sincronizar esta pontuação.');
      return false;
    }
  };

  useEffect(() => {
    void refreshLeaderboard();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timerId = window.setInterval(() => setTimeLeft((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timerId);
  }, [playing]);

  useEffect(() => {
    if (timeLeft === 0) setPlaying(false);
  }, [timeLeft]);

  useEffect(() => {
    if (!showingRound || playing || score < 1 || !sessionIdRef.current || scoreSubmittedRef.current) return;
    scoreSubmittedRef.current = true;
    void recordScore('word-rush', score, sessionIdRef.current).then((saved) => {
      setFeedback(saved ? 'Score submitted to this week’s board.' : 'Could not sync this score.');
    });
  }, [showingRound, playing, score]);

  const filteredGames = GAMES.filter((game) => {
    const matchesCategory = category === 'All' || game.category === category;
    const matchesQuery = `${game.title} ${game.description}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const startRound = () => {
    setActiveGameId('word-rush');
    sessionIdRef.current = createSessionId();
    scoreSubmittedRef.current = false;
    setShowingRound(true);
    setWordIndex(0);
    setScrambledWord(scramble(WORDS[0].word));
    setAnswer('');
    setScore(0);
    setTimeLeft(60);
    setCompleted(0);
    setFeedback('');
    setWon(false);
    setPlaying(true);
  };

  const submitAnswer = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!playing) return;

    if (normalizeAnswer(answer) !== WORDS[wordIndex].word) {
      setFeedback('Not quite. Try again.');
      return;
    }

    const nextCompleted = completed + 1;
    celebrateCorrectAnswer();
    setCompleted(nextCompleted);
    setScore((current) => current + 5);
    setAnswer('');

    if (nextCompleted === WORDS.length) {
      setScore((current) => current + 50);
      setFeedback('All words complete! +50 bonus');
      setWon(true);
      setPlaying(false);
      return;
    }

    const nextIndex = wordIndex + 1;
    setWordIndex(nextIndex);
    setScrambledWord(scramble(WORDS[nextIndex].word));
    setFeedback('Correct! +5 points');
  };

  if (showingRound) {
    const activeWord = WORDS[wordIndex];
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setShowingRound(false);
            setActiveGameId(null);
          }}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-white/70 transition-colors hover:text-white"
        >
          <ChevronLeft size={18} /> Back to games
        </button>

        <section className="relative overflow-hidden rounded-lg border border-white/15 bg-neutral-950/85 shadow-2xl backdrop-blur-xl">
          {feedback.match(/\+\d+/)?.[0] && <motion.div key={`${completed}-${feedback}`} initial={{ opacity: 0, y: 10, scale: 0.8 }} animate={{ opacity: 1, y: -18, scale: 1 }} className="pointer-events-none absolute right-5 top-16 z-10 rounded-full bg-emerald-300 px-3 py-1 text-sm font-black text-emerald-950 shadow-lg">{feedback.match(/\+\d+/)?.[0]}</motion.div>}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-7">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Timed vocabulary</p>
              <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">Word Rush</h1>
            </div>
            <div className="flex gap-5 text-right">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">Score</p>
                <p className="text-xl font-black tabular-nums text-emerald-300">{score}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">Time</p>
                <p className={`text-xl font-black tabular-nums ${timeLeft <= 10 ? 'text-rose-300' : 'text-amber-300'}`}>
                  00:{String(timeLeft).padStart(2, '0')}
                </p>
              </div>
            </div>
          </div>

          <div className="px-5 py-8 sm:px-10 sm:py-12">
            {playing ? (
              <>
                <div className="mb-8 text-center">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/45">Unscramble the word</p>
                  <p className="mt-3 text-4xl font-black tracking-[0.12em] text-white sm:text-6xl">{scrambledWord}</p>
                  <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-white/65">{activeWord.hint}</p>
                </div>

                <form onSubmit={submitAnswer} className="mx-auto flex max-w-lg flex-col gap-3 sm:flex-row">
                  <label className="sr-only" htmlFor="word-rush-answer">Your answer</label>
                  <input
                    id="word-rush-answer"
                    autoComplete="off"
                    autoCapitalize="none"
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    className="min-w-0 flex-1 rounded-md border border-white/15 bg-white/[0.06] px-4 py-3 text-base text-white outline-none transition focus:border-amber-300/70 focus:ring-2 focus:ring-amber-300/20"
                    placeholder="Type the word"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-300 px-5 py-3 font-extrabold text-neutral-950 transition hover:bg-amber-200 active:scale-[0.98]"
                  >
                    <Check size={17} /> Check
                  </button>
                </form>
                <p aria-live="polite" className="mt-4 min-h-6 text-center text-sm font-bold text-emerald-300">{feedback}</p>
                <p className="mt-2 text-center text-xs text-white/40">{completed} / {WORDS.length} words · +5 each · +50 for completing the set</p>
              </>
            ) : (
              <div className="mx-auto max-w-lg py-4 text-center">
                <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${won ? 'bg-emerald-300/15 text-emerald-300' : 'bg-amber-300/15 text-amber-300'}`}>
                  {won ? <Sparkles size={25} /> : <Clock3 size={25} />}
                </div>
                <h2 className="mt-5 text-2xl font-black text-white">{won ? 'Round complete' : 'Time is up'}</h2>
                <p className="mt-2 text-sm text-white/60">Final score: <span className="font-extrabold text-white">{score}</span></p>
                <p aria-live="polite" className="mt-3 min-h-5 text-xs text-cyan-200">{feedback}</p>
                <button type="button" onClick={startRound} className="mt-6 rounded-md bg-amber-300 px-5 py-3 font-extrabold text-neutral-950 transition hover:bg-amber-200">
                  Play again
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    );
  }

  if (activeGameId && activeGameId !== 'word-rush') {
    const activeGame = GAMES.find((game) => game.id === activeGameId);
    return (
      <LocalGameRunner
        gameId={activeGameId}
        title={activeGame?.title || 'Brazilian Games'}
        onBack={() => setActiveGameId(null)}
        onComplete={(points) => recordScore(activeGameId, points, createSessionId())}
      />
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="relative mb-8 overflow-hidden rounded-lg border border-white/10 bg-neutral-950/75 px-5 py-7 shadow-2xl backdrop-blur-xl sm:px-9 sm:py-9">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 border-l border-white/5 bg-gradient-to-br from-amber-300/[0.08] via-cyan-300/[0.03] to-transparent md:block" />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-amber-300">
              <Gamepad2 size={15} /> Brazilian in Action
            </div>
            <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl">Brazilian Games</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/60">English practice, one round at a time.</p>
          </div>
          <div className="flex items-end gap-6 border-t border-white/10 pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
            <div><p className="text-2xl font-black text-white">15</p><p className="text-[10px] font-bold uppercase tracking-wider text-white/45">Games</p></div>
            <div><p className="text-2xl font-black text-emerald-300">15</p><p className="text-[10px] font-bold uppercase tracking-wider text-white/45">Playable</p></div>
          </div>
        </div>
      </header>

      <section aria-label="Game selection">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-white">Choose a game</h2>
            <p className="mt-1 text-xs text-white/45">Choose a challenge and add points to this week’s board.</p>
          </div>
          <label className="relative block sm:w-72">
            <span className="sr-only">Search games</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-md border border-white/10 bg-neutral-950/70 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-amber-300/60"
              placeholder="Search games"
            />
          </label>
        </div>

        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter games by category">
          {(['All', 'Words', 'Vocabulary', 'Grammar', 'Reading'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              aria-pressed={category === item}
              className={`rounded-md border px-3 py-1.5 text-xs font-bold transition ${category === item ? 'border-amber-300 bg-amber-300 text-neutral-950' : 'border-white/10 bg-white/[0.04] text-white/65 hover:border-white/25 hover:text-white'}`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {filteredGames.map((game, index) => {
            const Icon = game.icon;
            return (
              <motion.article
                key={game.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, delay: Math.min(index * 0.025, 0.2) }}
                whileHover={{ y: -3 }}
                className="flex min-h-48 flex-col rounded-lg border border-amber-300/25 bg-neutral-950/75 p-4 backdrop-blur-lg transition-colors hover:border-amber-200/70"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-md bg-white/[0.06] ${game.color}`}><Icon size={19} /></span>
                  <span className="rounded-sm bg-emerald-300/15 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-300">
                    Ready
                  </span>
                </div>
                <div className="mt-4 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">{game.category}</p>
                  <h3 className="mt-1 text-base font-extrabold text-white">{game.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-white/55">{game.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (game.id === 'word-rush') startRound();
                    else setActiveGameId(game.id);
                  }}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-amber-300 px-3 py-2 text-xs font-extrabold text-neutral-950 transition hover:bg-amber-200 active:scale-[0.98]"
                >
                  <Shuffle size={14} /> Play {game.title}
                </button>
              </motion.article>
            );
          })}
        </div>
        {filteredGames.length === 0 && <p className="rounded-lg border border-white/10 bg-neutral-950/70 p-8 text-center text-sm text-white/55">No games match that search.</p>}
      </section>

      <section className="mt-9 overflow-hidden rounded-lg border border-white/10 bg-neutral-950/80 shadow-2xl backdrop-blur-xl" aria-labelledby="games-leaderboard-title">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
          <div>
            <div className="flex items-center gap-2 text-amber-300"><Trophy size={17} /><h2 id="games-leaderboard-title" className="text-lg font-extrabold text-white">Weekly leaderboard</h2></div>
            <p className="mt-1 text-xs text-white/45">Week starts Sunday · São Paulo time · {leaderboard?.weekStart || 'current week'}</p>
          </div>
          <button type="button" onClick={() => void refreshLeaderboard()} disabled={leaderboardLoading} className="inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-xs font-bold text-white/75 transition hover:border-white/30 hover:text-white disabled:opacity-50">
            <RefreshCw size={14} className={leaderboardLoading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            {leaderboardError ? (
              <p role="status" className="rounded-md border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm text-amber-100/80">{leaderboardError}</p>
            ) : leaderboardLoading && !leaderboard ? (
              <p className="p-4 text-sm text-white/50">Loading this week’s scores…</p>
            ) : leaderboard?.entries.length ? (
              <ol className="divide-y divide-white/[0.07]">
                {leaderboard.entries.map((entry) => (
                  <li key={entry.rank} className={`flex items-center gap-3 px-2 py-3 ${entry.isCurrentUser ? 'rounded-md bg-cyan-300/[0.07]' : ''}`}>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-black ${entry.rank === 1 ? 'border-amber-200/60 bg-gradient-to-br from-yellow-100 via-amber-300 to-amber-700 text-amber-950' : entry.rank === 2 ? 'border-slate-200/60 bg-gradient-to-br from-slate-100 via-slate-300 to-slate-500 text-slate-950' : entry.rank === 3 ? 'border-orange-200/60 bg-gradient-to-br from-orange-100 via-orange-300 to-orange-700 text-orange-950' : 'border-white/10 bg-white/[0.04] text-white/65'}`}>
                      {entry.rank <= 3 ? <Medal size={16} /> : entry.rank}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white/85">{entry.name}{entry.isCurrentUser ? ' (you)' : ''}</span>
                    <span className="text-sm font-black tabular-nums text-emerald-300">{entry.points} pts</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="rounded-md border border-white/[0.07] p-5 text-sm text-white/50">No scores this week yet. Finish a Word Rush round to join the board.</p>
            )}
          </div>

          <aside className="flex flex-col justify-between rounded-md border border-cyan-300/20 bg-gradient-to-br from-cyan-300/[0.10] via-neutral-950/60 to-emerald-300/[0.05] p-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.17em] text-cyan-200/70">Your position</p>
              {leaderboard?.currentUser ? (
                <>
                  <p className="mt-3 text-3xl font-black text-white">#{leaderboard.currentUser.rank}</p>
                  <p className="mt-1 text-sm text-white/65">{leaderboard.currentUser.points} points this week</p>
                  {leaderboard.currentUser.rank > 10 && <p className="mt-4 text-xs leading-5 text-cyan-100/75">Only {leaderboard.currentUser.pointsToTopTen} more points to reach the Top 10.</p>}
                </>
              ) : (
                <p className="mt-3 text-sm leading-5 text-white/65">Your position will appear after your first scored round.</p>
              )}
            </div>
            <p className="mt-6 text-[10px] leading-4 text-white/35">Your name is shown; your email is not published on the board.</p>
          </aside>
        </div>
      </section>

      <div className="mt-8 flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-white/40">
        <AudioLines size={14} className="text-cyan-300" />
        <span>Weekly challenge · Word Rush</span>
      </div>
    </main>
  );
};