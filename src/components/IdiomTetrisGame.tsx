import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowDown, ArrowLeft, ArrowRight, ChevronDown, ChevronLeft, RotateCw, Sparkles } from 'lucide-react';
import { IdiomTetrisEngine, type IdiomTetrisSnapshot } from '../games/IdiomTetrisEngine';
import { celebrateCorrectAnswer } from '../lib/gameRewards';

interface IdiomTetrisGameProps {
  onBack: () => void;
  onComplete: (points: number) => Promise<boolean> | boolean;
}

const IDIOMS = [
  { phrase: 'Break the ice', meaning: 'Start a friendly conversation' },
  { phrase: 'Under the weather', meaning: 'Feel a little ill' },
  { phrase: 'Piece of cake', meaning: 'Something very easy' },
  { phrase: 'Spill the beans', meaning: 'Reveal a secret' },
  { phrase: 'Once in a blue moon', meaning: 'Something that happens rarely' }
];

const CELL_COLORS = [
  '',
  'bg-cyan-300',
  'bg-orange-300',
  'bg-sky-400',
  'bg-amber-200',
  'bg-rose-400',
  'bg-emerald-300',
  'bg-fuchsia-400'
];

export const IdiomTetrisGame: React.FC<IdiomTetrisGameProps> = ({ onBack, onComplete }) => {
  const engineRef = useRef(new IdiomTetrisEngine());
  const scoreRef = useRef(0);
  const linesRef = useRef(0);
  const finishedRef = useRef(false);
  const [snapshot, setSnapshot] = useState<IdiomTetrisSnapshot>(() => engineRef.current.snapshot());
  const [score, setScore] = useState(0);
  const [lastReward, setLastReward] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [won, setWon] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'saving' | 'saved' | 'failed' | 'no-points' | null>(null);

  const finishRound = (points: number, didWin: boolean) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setScore(points);
    scoreRef.current = points;
    setWon(didWin);
    setIsFinished(true);
    setIsPlaying(false);
    if (didWin) celebrateCorrectAnswer();
    if (points < 1) {
      setSyncStatus('no-points');
      return;
    }
    setSyncStatus('saving');
    void Promise.resolve(onComplete(points))
      .then((saved) => setSyncStatus(saved ? 'saved' : 'failed'))
      .catch(() => setSyncStatus('failed'));
  };

  const applyEngineSnapshot = (nextSnapshot: IdiomTetrisSnapshot) => {
    const cleared = nextSnapshot.linesCleared - linesRef.current;
    if (cleared > 0) {
      celebrateCorrectAnswer();
      linesRef.current = nextSnapshot.linesCleared;
      scoreRef.current += cleared * 5;
      setScore(scoreRef.current);
      setLastReward(cleared * 5);
    }
    setSnapshot(nextSnapshot);
    if (nextSnapshot.linesCleared >= 5) finishRound(scoreRef.current + 50, true);
    else if (nextSnapshot.gameOver) finishRound(scoreRef.current, false);
  };

  const startGame = () => {
    engineRef.current = new IdiomTetrisEngine();
    scoreRef.current = 0;
    linesRef.current = 0;
    finishedRef.current = false;
    setSnapshot(engineRef.current.snapshot());
    setScore(0);
    setTimeLeft(60);
    setIsFinished(false);
    setWon(false);
    setSyncStatus(null);
    setIsPlaying(true);
  };

  const handleMove = (key: string) => {
    if (!isPlaying) return;
    if (key === 'left') applyEngineSnapshot(engineRef.current.moveHorizontally(-1));
    if (key === 'right') applyEngineSnapshot(engineRef.current.moveHorizontally(1));
    if (key === 'down') applyEngineSnapshot(engineRef.current.softDrop());
    if (key === 'rotate') applyEngineSnapshot(engineRef.current.rotatePiece());
    if (key === 'drop') applyEngineSnapshot(engineRef.current.hardDrop());
  };

  useEffect(() => {
    if (!isPlaying) return;
    const fallTimer = window.setInterval(() => applyEngineSnapshot(engineRef.current.step()), 500);
    return () => window.clearInterval(fallTimer);
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) return;
    const clock = window.setInterval(() => setTimeLeft((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(clock);
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying && timeLeft === 0) finishRound(scoreRef.current, false);
  }, [isPlaying, timeLeft]);

  useEffect(() => {
    if (!isPlaying) return;
    const handleKey = (event: KeyboardEvent) => {
      const keyMap: Record<string, string> = {
        ArrowLeft: 'left',
        ArrowRight: 'right',
        ArrowDown: 'down',
        ArrowUp: 'rotate',
        ' ': 'drop'
      };
      const action = keyMap[event.key];
      if (!action) return;
      event.preventDefault();
      handleMove(action);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isPlaying]);

  const lineIndex = Math.min(snapshot.linesCleared, IDIOMS.length - 1);
  const activeIdiom = IDIOMS[lineIndex];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <button type="button" onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-white/70 transition-colors hover:text-white"><ChevronLeft size={18} /> Back to games</button>
      <section className="relative overflow-hidden rounded-lg border border-white/15 bg-neutral-950/85 shadow-2xl backdrop-blur-xl">
        {lastReward > 0 && <motion.div key={`${snapshot.linesCleared}-${lastReward}`} initial={{ opacity: 0, y: 10, scale: 0.8 }} animate={{ opacity: 1, y: -18, scale: 1 }} className="pointer-events-none absolute right-5 top-16 z-10 rounded-full bg-emerald-300 px-3 py-1 text-sm font-black text-emerald-950 shadow-lg">+{lastReward}</motion.div>}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-300">Timed idiom blocks</p>
            <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">Idiom Tetris</h1>
          </div>
          <div className="flex gap-5 text-right">
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-white/45">Score</p><p className="text-xl font-black tabular-nums text-emerald-300">{score}</p></div>
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-white/45">Time</p><p className={`text-xl font-black tabular-nums ${timeLeft <= 10 ? 'text-rose-300' : 'text-amber-300'}`}>00:{String(timeLeft).padStart(2, '0')}</p></div>
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-white/45">Lines</p><p className="text-xl font-black tabular-nums text-cyan-200">{snapshot.linesCleared} / 5</p></div>
          </div>
        </header>

        <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(260px,1fr)_280px]">
          <div className="relative mx-auto w-full max-w-[320px]">
            <div className="grid aspect-[1/2] grid-cols-10 overflow-hidden rounded-md border border-white/15 bg-black/70">
              {snapshot.cells.flatMap((row, rowIndex) => row.map((cell, columnIndex) => <span key={`${rowIndex}-${columnIndex}`} className={`border-[0.5px] border-white/[0.035] ${CELL_COLORS[cell] || ''}`} />))}
            </div>
            {!isPlaying && !isFinished && <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/55 backdrop-blur-[2px]"><button type="button" onClick={startGame} className="rounded-md bg-amber-300 px-6 py-3 font-extrabold text-neutral-950 transition hover:bg-amber-200">Start game</button></div>}
            {isFinished && <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/70 p-5 text-center backdrop-blur-sm"><div><Sparkles className="mx-auto text-amber-300" size={28} /><h2 className="mt-3 text-xl font-black text-white">{won ? 'Five lines cleared!' : 'Round over'}</h2><p className="mt-2 text-sm text-white/65">{score} points</p><p className="mt-2 text-xs text-white/45">{syncStatus === 'saving' && 'Sending score…'}{syncStatus === 'saved' && 'Score added to this week’s board.'}{syncStatus === 'failed' && 'Score could not sync.'}{syncStatus === 'no-points' && 'No score was earned.'}</p><button type="button" onClick={startGame} className="mt-5 rounded-md bg-amber-300 px-4 py-2.5 text-sm font-extrabold text-neutral-950">Play again</button></div></div>}
          </div>

          <aside className="flex flex-col gap-4">
            <div className="rounded-md border border-rose-300/20 bg-rose-300/[0.06] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-200/70">Idiom card</p>
              <h2 className="mt-2 text-xl font-black text-white">{activeIdiom.phrase}</h2>
              <p className="mt-2 text-sm leading-5 text-white/60">{activeIdiom.meaning}</p>
              <p className="mt-3 text-[10px] text-white/35">+5 points per cleared line · +50 for five lines before time runs out</p>
            </div>

            <div className="grid grid-cols-3 gap-2" aria-label="Tetris controls">
              <span />
              <button type="button" onClick={() => handleMove('rotate')} aria-label="Rotate piece" className="inline-flex h-11 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-white hover:border-white/25"><RotateCw size={17} /></button>
              <span />
              <button type="button" onClick={() => handleMove('left')} aria-label="Move left" className="inline-flex h-11 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-white hover:border-white/25"><ArrowLeft size={17} /></button>
              <button type="button" onClick={() => handleMove('down')} aria-label="Move down" className="inline-flex h-11 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-white hover:border-white/25"><ArrowDown size={17} /></button>
              <button type="button" onClick={() => handleMove('right')} aria-label="Move right" className="inline-flex h-11 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-white hover:border-white/25"><ArrowRight size={17} /></button>
              <span />
              <button type="button" onClick={() => handleMove('drop')} aria-label="Hard drop" className="col-span-1 inline-flex h-11 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-white hover:border-white/25"><ChevronDown size={17} /></button>
              <span />
            </div>

            <p className="text-xs leading-5 text-white/40">Use arrow keys to move, up to rotate, and space to drop. The round and score stay on this device until the final score is submitted.</p>
          </aside>
        </div>
      </section>
    </main>
  );
};