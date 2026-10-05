import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlignLeft,
  ArrowRight,
  AudioLines,
  BookOpenText,
  Brain,
  Check,
  ChevronLeft,
  CircleHelp,
  Clock3,
  Gamepad2,
  GraduationCap,
  Grid2X2,
  Image,
  Layers3,
  LayoutGrid,
  Medal,
  RefreshCw,
  Search,
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

type GameCategory = 'Palavras' | 'Vocabulário' | 'Gramática' | 'Leitura' | 'Pronúncia' | 'Memória';
type GameId = LocalGameId | 'word-rush';

interface GameEntry {
  id: GameId;
  title: string;
  category: GameCategory;
  description: string;
  icon: LucideIcon;
  color: string;
  tag: string;
  gradient: string;
  playable?: boolean;
}

const CATEGORY_FILTERS: Array<{ id: 'Todos' | GameCategory; icon: LucideIcon }> = [
  { id: 'Todos', icon: LayoutGrid },
  { id: 'Palavras', icon: Type },
  { id: 'Vocabulário', icon: BookOpenText },
  { id: 'Gramática', icon: GraduationCap },
  { id: 'Leitura', icon: AlignLeft },
  { id: 'Pronúncia', icon: Volume2 },
  { id: 'Memória', icon: Brain }
];

// Capas opcionais: salve src/assets/images/games/<id-do-jogo>.jpg (ou png/webp); hero.jpg é o fundo do topo.
const GAME_IMAGES = import.meta.glob('../assets/images/games/*.{jpg,jpeg,png,webp}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const findGameImage = (name: string): string | undefined =>
  Object.entries(GAME_IMAGES).find(([path]) => path.split('/').pop()?.replace(/\.[^.]+$/, '') === name)?.[1];
const heroImage = findGameImage('hero');

const GAMES: GameEntry[] = [
  { id: 'crossword', title: 'Crossword Sprint', category: 'Palavras', description: 'Resolva dicas curtas em inglês e preencha as letras.', icon: Grid2X2, color: 'text-amber-200', tag: 'border-emerald-300/40 bg-emerald-400/20 text-emerald-100', gradient: 'from-amber-400/40 via-orange-500/20 to-transparent', playable: true },
  { id: 'hex-words', title: 'HexaLetters', category: 'Palavras', description: 'Escolha letras no tabuleiro hexagonal e forme palavras.', icon: Layers3, color: 'text-cyan-200', tag: 'border-violet-300/40 bg-violet-400/20 text-violet-100', gradient: 'from-cyan-400/40 via-sky-500/20 to-transparent', playable: true },
  { id: 'word-search', title: 'Word Search', category: 'Palavras', description: 'Encontre as palavras escondidas na grade de letras.', icon: Search, color: 'text-emerald-200', tag: 'border-emerald-300/40 bg-emerald-400/20 text-emerald-100', gradient: 'from-emerald-400/40 via-teal-500/20 to-transparent', playable: true },
  { id: 'memory', title: 'Memory Match', category: 'Memória', description: 'Vire as cartas e encontre os pares correspondentes.', icon: Brain, color: 'text-pink-200', tag: 'border-sky-300/40 bg-sky-400/20 text-sky-100', gradient: 'from-pink-400/40 via-fuchsia-500/20 to-transparent', playable: true },
  { id: 'picture-match', title: 'Picture Match', category: 'Vocabulário', description: 'Associe imagens a palavras em inglês.', icon: Image, color: 'text-sky-200', tag: 'border-orange-300/40 bg-orange-400/20 text-orange-100', gradient: 'from-sky-400/40 via-blue-500/20 to-transparent', playable: true },
  { id: 'audio-quiz', title: 'Listen & Choose', category: 'Pronúncia', description: 'Ouça a pronúncia e escolha a palavra certa.', icon: Volume2, color: 'text-violet-200', tag: 'border-pink-300/40 bg-pink-400/20 text-pink-100', gradient: 'from-violet-400/40 via-purple-500/20 to-transparent', playable: true },
  { id: 'sentence-scramble', title: 'Sentence Builder', category: 'Gramática', description: 'Organize as palavras para montar frases corretas.', icon: AlignLeft, color: 'text-orange-200', tag: 'border-cyan-300/40 bg-cyan-400/20 text-cyan-100', gradient: 'from-orange-400/40 via-amber-500/20 to-transparent', playable: true },
  { id: 'visual-vocabulary', title: 'Visual Vocabulary', category: 'Vocabulário', description: 'Aprenda palavras novas com imagens do dia a dia.', icon: Sparkles, color: 'text-lime-200', tag: 'border-orange-300/40 bg-orange-400/20 text-orange-100', gradient: 'from-lime-400/40 via-green-500/20 to-transparent', playable: true },
  { id: 'idiom-blocks', title: 'Idiom Tetris', category: 'Vocabulário', description: 'Limpe os blocos que caem enquanto pratica expressões comuns.', icon: Gamepad2, color: 'text-red-200', tag: 'border-orange-300/40 bg-orange-400/20 text-orange-100', gradient: 'from-red-400/40 via-rose-500/20 to-transparent', playable: true },
  { id: 'flashcards', title: 'Flashcards', category: 'Vocabulário', description: 'Revise palavras e significados em cartões rápidos.', icon: BookOpenText, color: 'text-yellow-200', tag: 'border-orange-300/40 bg-orange-400/20 text-orange-100', gradient: 'from-yellow-400/40 via-amber-500/20 to-transparent', playable: true },
  { id: 'context-quest', title: 'Context Quest', category: 'Leitura', description: 'Descubra o significado das palavras pelo contexto.', icon: BookOpenText, color: 'text-teal-200', tag: 'border-cyan-300/40 bg-cyan-400/20 text-cyan-100', gradient: 'from-teal-400/40 via-cyan-500/20 to-transparent', playable: true },
  { id: 'word-rush', title: 'Word Rush', category: 'Palavras', description: 'Forme as palavras certas antes que o cronômetro zere.', icon: Clock3, color: 'text-rose-200', tag: 'border-emerald-300/40 bg-emerald-400/20 text-emerald-100', gradient: 'from-rose-400/40 via-pink-500/20 to-transparent', playable: true },
  { id: 'yes-no-speed', title: 'Yes or No?', category: 'Leitura', description: 'Leia frases curtas e responda rápido, sob pressão.', icon: CircleHelp, color: 'text-blue-200', tag: 'border-cyan-300/40 bg-cyan-400/20 text-cyan-100', gradient: 'from-blue-400/40 via-indigo-500/20 to-transparent', playable: true },
  { id: 'custom-quiz', title: 'Quiz Studio', category: 'Gramática', description: 'Responda a desafios de múltipla escolha.', icon: Check, color: 'text-fuchsia-200', tag: 'border-cyan-300/40 bg-cyan-400/20 text-cyan-100', gradient: 'from-fuchsia-400/40 via-purple-500/20 to-transparent', playable: true },
  { id: 'hangman', title: 'Hangman', category: 'Palavras', description: 'Descubra a palavra antes que as tentativas acabem.', icon: Type, color: 'text-indigo-200', tag: 'border-emerald-300/40 bg-emerald-400/20 text-emerald-100', gradient: 'from-indigo-400/40 via-violet-500/20 to-transparent', playable: true }
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
  const [category, setCategory] = useState<'Todos' | GameCategory>('Todos');
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
      setFeedback(saved ? 'Pontuação enviada ao ranking da semana.' : 'Não foi possível sincronizar esta pontuação.');
    });
  }, [showingRound, playing, score]);

  const filteredGames = GAMES.filter((game) => {
    const matchesCategory = category === 'Todos' || game.category === category;
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
      setFeedback('Quase lá. Tente de novo.');
      return;
    }

    const nextCompleted = completed + 1;
    celebrateCorrectAnswer();
    setCompleted(nextCompleted);
    setScore((current) => current + 5);
    setAnswer('');

    if (nextCompleted === WORDS.length) {
      setScore((current) => current + 50);
      setFeedback('Todas as palavras! +50 de bônus');
      setWon(true);
      setPlaying(false);
      return;
    }

    const nextIndex = wordIndex + 1;
    setWordIndex(nextIndex);
    setScrambledWord(scramble(WORDS[nextIndex].word));
    setFeedback('Correto! +5 pontos');
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
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white/85 backdrop-blur-xl transition hover:bg-white/20 hover:text-white"
        >
          <ChevronLeft size={18} /> Voltar aos jogos
        </button>

        <section className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/[0.08] shadow-[0_8px_40px_rgba(0,0,0,0.25)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
          {feedback.match(/\+\d+/)?.[0] && <motion.div key={`${completed}-${feedback}`} initial={{ opacity: 0, y: 10, scale: 0.8 }} animate={{ opacity: 1, y: -18, scale: 1 }} className="pointer-events-none absolute right-5 top-16 z-10 rounded-full bg-emerald-300 px-3 py-1 text-sm font-black text-emerald-950 shadow-lg">{feedback.match(/\+\d+/)?.[0]}</motion.div>}
          <div className="relative flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-7">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200">Vocabulário contra o tempo</p>
              <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">Word Rush</h1>
            </div>
            <div className="flex gap-3 text-right">
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-xl">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/55">Pontos</p>
                <p className="text-xl font-black tabular-nums text-emerald-300">{score}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-xl">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/55">Tempo</p>
                <p className={`text-xl font-black tabular-nums ${timeLeft <= 10 ? 'text-rose-300' : 'text-amber-300'}`}>
                  00:{String(timeLeft).padStart(2, '0')}
                </p>
              </div>
            </div>
          </div>

          <div className="relative px-5 py-8 sm:px-10 sm:py-12">
            {playing ? (
              <>
                <div className="mb-8 text-center">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/55">Desembaralhe a palavra</p>
                  <p className="mt-3 text-4xl font-black tracking-[0.12em] text-white sm:text-6xl">{scrambledWord}</p>
                  <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-white/65">{activeWord.hint}</p>
                </div>

                <form onSubmit={submitAnswer} className="mx-auto flex max-w-lg flex-col gap-3 sm:flex-row">
                  <label className="sr-only" htmlFor="word-rush-answer">Sua resposta</label>
                  <input
                    id="word-rush-answer"
                    autoComplete="off"
                    autoCapitalize="none"
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    className="min-w-0 flex-1 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-base text-white outline-none backdrop-blur-xl transition placeholder:text-white/40 focus:border-violet-300/70 focus:ring-2 focus:ring-violet-300/25"
                    placeholder="Digite a palavra"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-violet-500 px-5 py-3 font-extrabold text-white shadow-lg shadow-violet-500/25 transition hover:brightness-110 active:scale-[0.98]"
                  >
                    <Check size={17} /> Verificar
                  </button>
                </form>
                <p aria-live="polite" className="mt-4 min-h-6 text-center text-sm font-bold text-emerald-300">{feedback}</p>
                <p className="mt-2 text-center text-xs text-white/50">{completed} / {WORDS.length} palavras · +5 cada · +50 por completar o conjunto</p>
              </>
            ) : (
              <div className="mx-auto max-w-lg py-4 text-center">
                <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/15 backdrop-blur-xl ${won ? 'bg-emerald-300/20 text-emerald-200' : 'bg-amber-300/20 text-amber-200'}`}>
                  {won ? <Sparkles size={25} /> : <Clock3 size={25} />}
                </div>
                <h2 className="mt-5 text-2xl font-black text-white">{won ? 'Rodada concluída' : 'O tempo acabou'}</h2>
                <p className="mt-2 text-sm text-white/65">Pontuação final: <span className="font-extrabold text-white">{score}</span></p>
                <p aria-live="polite" className="mt-3 min-h-5 text-xs text-cyan-100">{feedback}</p>
                <button type="button" onClick={startRound} className="mt-6 rounded-2xl bg-gradient-to-r from-blue-500 to-violet-500 px-6 py-3 font-extrabold text-white shadow-lg shadow-violet-500/25 transition hover:brightness-110">
                  Jogar de novo
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
      <header className="relative mb-8 overflow-hidden rounded-3xl border border-white/20 bg-white/[0.06] px-6 py-9 shadow-[0_8px_40px_rgba(0,0,0,0.25)] backdrop-blur-2xl sm:px-10 sm:py-12">
        {heroImage && <img src={heroImage} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-70" />}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950/60 via-slate-950/20 to-transparent" />
        <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-blue-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-10 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
        <div className="relative flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-white/75">
              <Gamepad2 size={16} /> Brazilian Games
            </div>
            <h1 className="text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl">
              Jogue. Pratique.
              <span className="block bg-gradient-to-r from-blue-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Melhore seu inglês.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/75 sm:text-base">Jogos divertidos e interativos para ampliar seu vocabulário, reforçar a gramática e ganhar confiança.</p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 backdrop-blur-xl"><p className="text-2xl font-black text-white">{GAMES.length}</p><p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Jogos</p></div>
            <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 backdrop-blur-xl"><p className="text-2xl font-black text-emerald-300">{GAMES.filter((game) => game.playable).length}</p><p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Disponíveis</p></div>
          </div>
        </div>
      </header>

      <section aria-label="Seleção de jogos">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-white/70">Categorias de jogos</h2>
            <p className="mt-1 text-xs text-white/55">Escolha um desafio e some pontos no ranking da semana.</p>
          </div>
          <label className="relative block sm:w-72">
            <span className="sr-only">Buscar jogos</span>
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/55" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-full border border-white/20 bg-white/10 py-2.5 pl-10 pr-4 text-sm text-white outline-none backdrop-blur-xl placeholder:text-white/45 focus:border-violet-300/70"
              placeholder="Buscar jogos"
            />
          </label>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar jogos por categoria">
          {CATEGORY_FILTERS.map(({ id, icon: ChipIcon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setCategory(id)}
              aria-pressed={category === id}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold backdrop-blur-xl transition ${category === id ? 'border-blue-300/60 bg-blue-500/30 text-white shadow-[0_0_20px_rgba(59,130,246,0.45)]' : 'border-white/20 bg-white/10 text-white/75 hover:border-white/40 hover:bg-white/15 hover:text-white'}`}
            >
              <ChipIcon size={14} /> {id}
            </button>
          ))}
          <span className="ml-auto rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/70 backdrop-blur-xl">{filteredGames.length} {filteredGames.length === 1 ? 'jogo' : 'jogos'}</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {filteredGames.map((game, index) => {
            const Icon = game.icon;
            const cover = findGameImage(game.id);
            const openGame = () => {
              if (game.id === 'word-rush') startRound();
              else setActiveGameId(game.id);
            };
            return (
              <motion.article
                key={game.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: Math.min(index * 0.04, 0.4) }}
                whileHover={{ y: -4 }}
                className="group relative flex min-h-60 flex-col overflow-hidden rounded-2xl border border-white/20 bg-white/[0.08] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.2)] backdrop-blur-xl transition-colors hover:border-white/40"
              >
                {cover ? (
                  <img src={cover} alt="" aria-hidden="true" loading="lazy" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-70 transition duration-500 group-hover:scale-110 group-hover:opacity-85" />
                ) : (
                  <>
                    <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${game.gradient}`} />
                    <Icon aria-hidden="true" className={`pointer-events-none absolute -right-4 -top-4 h-36 w-36 opacity-25 transition duration-500 group-hover:scale-110 group-hover:opacity-40 ${game.color}`} strokeWidth={1.2} />
                  </>
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-950/10 to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

                <div className="relative flex items-start justify-between gap-3">
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider backdrop-blur-md ${game.tag}`}>{game.category}</span>
                </div>
                <div className="relative mt-auto pt-10">
                  <h3 className="text-xl font-extrabold text-white drop-shadow">{game.title}</h3>
                  <p className="mt-1.5 text-sm leading-5 text-white/80">{game.description}</p>
                  <button
                    type="button"
                    onClick={openGame}
                    aria-label={`Jogar ${game.title}`}
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 py-1.5 pl-1.5 pr-5 text-sm font-bold text-white backdrop-blur-xl transition hover:bg-white/25 hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] active:scale-[0.97]"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 shadow-md"><ArrowRight size={15} /></span>
                    Jogar
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>
        {filteredGames.length === 0 && <p className="rounded-2xl border border-white/20 bg-white/10 p-8 text-center text-sm text-white/70 backdrop-blur-xl">Nenhum jogo encontrado para essa busca.</p>}
      </section>

      <section className="mt-9 overflow-hidden rounded-3xl border border-white/20 bg-white/[0.07] shadow-[0_8px_40px_rgba(0,0,0,0.2)] backdrop-blur-2xl" aria-labelledby="games-leaderboard-title">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
          <div>
            <div className="flex items-center gap-2 text-amber-200"><Trophy size={17} /><h2 id="games-leaderboard-title" className="text-lg font-extrabold text-white">Ranking semanal</h2></div>
            <p className="mt-1 text-xs text-white/60">A semana começa no domingo · horário de São Paulo · {leaderboard?.weekStart || 'semana atual'}</p>
          </div>
          <button type="button" onClick={() => void refreshLeaderboard()} disabled={leaderboardLoading} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white/80 backdrop-blur-xl transition hover:bg-white/20 hover:text-white disabled:opacity-50">
            <RefreshCw size={14} className={leaderboardLoading ? 'animate-spin' : ''} /> Atualizar
          </button>
        </div>

        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            {leaderboardError ? (
              <p role="status" className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">{leaderboardError}</p>
            ) : leaderboardLoading && !leaderboard ? (
              <p className="p-4 text-sm text-white/60">Carregando as pontuações da semana…</p>
            ) : leaderboard?.entries.length ? (
              <ol className="divide-y divide-white/10">
                {leaderboard.entries.map((entry) => (
                  <li key={entry.rank} className={`flex items-center gap-3 px-2 py-3 ${entry.isCurrentUser ? 'rounded-xl bg-cyan-300/15' : ''}`}>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-black ${entry.rank === 1 ? 'border-amber-200/60 bg-gradient-to-br from-yellow-100 via-amber-300 to-amber-700 text-amber-950' : entry.rank === 2 ? 'border-slate-200/60 bg-gradient-to-br from-slate-100 via-slate-300 to-slate-500 text-slate-950' : entry.rank === 3 ? 'border-orange-200/60 bg-gradient-to-br from-orange-100 via-orange-300 to-orange-700 text-orange-950' : 'border-white/10 bg-white/[0.04] text-white/65'}`}>
                      {entry.rank <= 3 ? <Medal size={16} /> : entry.rank}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white/85">{entry.name}{entry.isCurrentUser ? ' (você)' : ''}</span>
                    <span className="text-sm font-black tabular-nums text-emerald-300">{entry.points} pts</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="rounded-2xl border border-white/15 bg-white/5 p-5 text-sm text-white/65">Ainda não há pontuações nesta semana. Termine uma rodada de Word Rush para entrar no ranking.</p>
            )}
          </div>

          <aside className="flex flex-col justify-between rounded-2xl border border-white/20 bg-gradient-to-br from-cyan-300/15 via-white/5 to-emerald-300/10 p-5 backdrop-blur-xl">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.17em] text-cyan-100/80">Sua posição</p>
              {leaderboard?.currentUser ? (
                <>
                  <p className="mt-3 text-3xl font-black text-white">#{leaderboard.currentUser.rank}</p>
                  <p className="mt-1 text-sm text-white/70">{leaderboard.currentUser.points} pontos nesta semana</p>
                  {leaderboard.currentUser.rank > 10 && <p className="mt-4 text-xs leading-5 text-cyan-100/85">Faltam só {leaderboard.currentUser.pointsToTopTen} pontos para chegar ao Top 10.</p>}
                </>
              ) : (
                <p className="mt-3 text-sm leading-5 text-white/70">Sua posição aparecerá depois da primeira rodada com pontos.</p>
              )}
            </div>
            <p className="mt-6 text-[10px] leading-4 text-white/50">Seu nome aparece no ranking; seu e-mail não é publicado.</p>
          </aside>
        </div>
      </section>

      <div className="mt-8 flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-white/40">
        <AudioLines size={14} className="text-cyan-300" />
        <span>Desafio semanal · Word Rush</span>
      </div>
    </main>
  );
};