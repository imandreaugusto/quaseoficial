import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Eye,
  EyeOff,
  RotateCcw,
  Send,
  Sparkles,
  Volume2
} from 'lucide-react';
import { IdiomTetrisGame } from './IdiomTetrisGame';
import { celebrateCorrectAnswer } from '../lib/gameRewards';

export type LocalGameId =
  | 'crossword'
  | 'hex-words'
  | 'word-search'
  | 'memory'
  | 'picture-match'
  | 'audio-quiz'
  | 'sentence-scramble'
  | 'visual-vocabulary'
  | 'idiom-blocks'
  | 'flashcards'
  | 'context-quest'
  | 'yes-no-speed'
  | 'custom-quiz'
  | 'hangman';

interface LocalGameRunnerProps {
  gameId: LocalGameId;
  title: string;
  onBack: () => void;
  onComplete: (points: number) => Promise<boolean> | boolean;
}

interface ChoiceQuestion {
  prompt: string;
  options: string[];
  answer: string;
}

const CROSSWORD_ROUNDS = [
  { prompt: 'A place where books are borrowed (7)', answer: 'library' },
  { prompt: 'The opposite of “noisy” (5)', answer: 'quiet' },
  { prompt: 'A person who teaches a class (7)', answer: 'teacher' },
  { prompt: 'A trip from one place to another (7)', answer: 'journey' },
  { prompt: 'The meal you eat in the morning (9)', answer: 'breakfast' }
];

const HEX_ROUNDS = [
  { prompt: 'Find a word meaning “look at and understand written words”.', letters: ['R', 'E', 'A', 'D'], answer: 'read' },
  { prompt: 'Find a word meaning “to wish for something good”.', letters: ['H', 'O', 'P', 'E'], answer: 'hope' },
  { prompt: 'Find a word meaning “attention or concern”.', letters: ['C', 'A', 'R', 'E'], answer: 'care' },
  { prompt: 'Find a word meaning “the measured passing of moments”.', letters: ['T', 'I', 'M', 'E'], answer: 'time' },
  { prompt: 'Find a word meaning “a happy expression”.', letters: ['M', 'I', 'L', 'E', 'S'], answer: 'smile' }
];

const CHOICE_ROUNDS: Partial<Record<LocalGameId, ChoiceQuestion[]>> = {
  'picture-match': [
    { prompt: 'Which word matches this picture? 🍎', options: ['apple', 'chair', 'cloud'], answer: 'apple' },
    { prompt: 'Which word matches this picture? 🚲', options: ['window', 'bicycle', 'bread'], answer: 'bicycle' },
    { prompt: 'Which word matches this picture? 🐢', options: ['turtle', 'market', 'pencil'], answer: 'turtle' },
    { prompt: 'Which word matches this picture? 🌧️', options: ['garden', 'rain', 'mirror'], answer: 'rain' },
    { prompt: 'Which word matches this picture? 🧳', options: ['luggage', 'kitchen', 'cloud'], answer: 'luggage' }
  ],
  'audio-quiz': [
    { prompt: 'Listen and choose the word you hear.', options: ['thought', 'though', 'through'], answer: 'thought' },
    { prompt: 'Listen and choose the word you hear.', options: ['ship', 'sheep', 'shape'], answer: 'sheep' },
    { prompt: 'Listen and choose the word you hear.', options: ['quiet', 'quite', 'quote'], answer: 'quiet' },
    { prompt: 'Listen and choose the word you hear.', options: ['weather', 'whether', 'whither'], answer: 'weather' },
    { prompt: 'Listen and choose the word you hear.', options: ['beach', 'peach', 'pitch'], answer: 'beach' }
  ],
  'visual-vocabulary': [
    { prompt: '🌱 A small plant growing from a seed is a…', options: ['sprout', 'shadow', 'branch'], answer: 'sprout' },
    { prompt: '🧊 Frozen water is…', options: ['steam', 'ice', 'soil'], answer: 'ice' },
    { prompt: '🪜 You climb this to reach a higher place.', options: ['ladder', 'blanket', 'basket'], answer: 'ladder' },
    { prompt: '🧵 You use this to sew fabric.', options: ['thread', 'feather', 'leather'], answer: 'thread' },
    { prompt: '🧭 This helps you find direction.', options: ['compass', 'cushion', 'copper'], answer: 'compass' }
  ],
  'context-quest': [
    { prompt: 'Maya took an umbrella because the sky was dark and cloudy. What does “cloudy” describe?', options: ['The sky', 'The umbrella', 'The walk'], answer: 'The sky' },
    { prompt: 'Tom was exhausted after running ten miles. “Exhausted” means…', options: ['very tired', 'very hungry', 'very early'], answer: 'very tired' },
    { prompt: 'The tiny café was crowded, so we waited outside. “Crowded” means…', options: ['full of people', 'closed for the day', 'far from town'], answer: 'full of people' },
    { prompt: 'Lena whispered so the baby would keep sleeping. She spoke…', options: ['quietly', 'quickly', 'angrily'], answer: 'quietly' },
    { prompt: 'The path was slippery after the rain. It was easy to…', options: ['fall', 'get lost', 'get warm'], answer: 'fall' }
  ],
  'custom-quiz': [
    { prompt: 'Choose the correct past form: “Yesterday, we ___ to the museum.”', options: ['go', 'went', 'gone'], answer: 'went' },
    { prompt: 'Choose the correct article: “She adopted ___ friendly dog.”', options: ['a', 'an', 'the'], answer: 'a' },
    { prompt: 'Choose the opposite of “borrow”.', options: ['lend', 'keep', 'owe'], answer: 'lend' },
    { prompt: 'Choose the correct preposition: “The keys are ___ the table.”', options: ['on', 'at', 'between'], answer: 'on' },
    { prompt: 'Choose the correct plural of “child”.', options: ['childs', 'childes', 'children'], answer: 'children' }
  ]
};

const SENTENCES = [
  ['She', 'usually', 'walks', 'to', 'school.'],
  ['We', 'have', 'already', 'finished', 'lunch.'],
  ['They', 'were', 'watching', 'a', 'movie.'],
  ['I', 'will', 'call', 'you', 'tomorrow.'],
  ['He', 'has', 'never', 'visited', 'London.']
];

const FLASHCARDS = [
  { word: 'reliable', meaning: 'confiável' },
  { word: 'to borrow', meaning: 'pegar emprestado' },
  { word: 'crowded', meaning: 'lotado' },
  { word: 'to notice', meaning: 'perceber' },
  { word: 'to improve', meaning: 'melhorar' }
];

const YES_NO_ROUNDS: Array<{ statement: string; answer: boolean }> = [
  { statement: 'A triangle has three sides.', answer: true },
  { statement: '“Tiny” means very large.', answer: false },
  { statement: 'A dentist works with teeth.', answer: true },
  { statement: '“Borrow” means to give something away.', answer: false },
  { statement: 'Winter is usually colder than summer.', answer: true }
];

const MEMORY_CARDS = [
  { pair: 0, text: 'apple' }, { pair: 0, text: 'maçã' },
  { pair: 1, text: 'bridge' }, { pair: 1, text: 'ponte' },
  { pair: 2, text: 'cloud' }, { pair: 2, text: 'nuvem' },
  { pair: 3, text: 'drawer' }, { pair: 3, text: 'gaveta' }
];

const WORD_SEARCH = [
  'C', 'A', 'T', 'E', 'R',
  'D', 'O', 'G', 'X', 'Y',
  'B', 'I', 'R', 'D', 'S',
  'F', 'O', 'X', 'A', 'B',
  'H', 'E', 'N', 'U', 'P'
];

const WORD_SEARCH_TARGETS = [
  { word: 'CAT', cells: [0, 1, 2] },
  { word: 'DOG', cells: [5, 6, 7] },
  { word: 'BIRD', cells: [10, 11, 12, 13] },
  { word: 'FOX', cells: [15, 16, 17] }
];

const HANGMAN_WORDS = ['journey', 'lantern', 'harvest', 'whisper', 'shelter'];

const normalize = (value: string) => value.trim().toLowerCase().replace(/[.!?]+$/g, '');

export const LocalGameRunner: React.FC<LocalGameRunnerProps> = ({ gameId, title, onBack, onComplete }) => {
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answer, setAnswer] = useState('');
  const [hexSelectedLetters, setHexSelectedLetters] = useState<number[]>([]);
  const [feedback, setFeedback] = useState('');
  const [finished, setFinished] = useState(false);
  const [scoreSync, setScoreSync] = useState<'saving' | 'saved' | 'failed' | 'no-points' | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [selectedCells, setSelectedCells] = useState<number[]>([]);
  const [foundCells, setFoundCells] = useState<number[]>([]);
  const [memoryOpen, setMemoryOpen] = useState<number[]>([]);
  const [memoryMatched, setMemoryMatched] = useState<number[]>([]);
  const [hangmanGuesses, setHangmanGuesses] = useState<string[]>([]);
  const [hangmanWordIndex, setHangmanWordIndex] = useState(0);
  const [memoryOrder] = useState(() => MEMORY_CARDS.map((_, index) => index).sort(() => Math.random() - 0.5));
  const memoryTimer = useRef<number | null>(null);
  const finishedRef = useRef(false);

  useEffect(() => () => {
    if (memoryTimer.current !== null) window.clearTimeout(memoryTimer.current);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const complete = (finalScore: number) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setScore(finalScore);
    setFinished(true);
    if (finalScore < 1) {
      setScoreSync('no-points');
      return;
    }
    setScoreSync('saving');
    void Promise.resolve(onComplete(finalScore))
      .then((saved) => setScoreSync(saved ? 'saved' : 'failed'))
      .catch(() => setScoreSync('failed'));
  };

  const answerChoice = (question: ChoiceQuestion, choice: string, points: number) => {
    if (finished || feedback) return;
    const correct = choice === question.answer;
    if (correct) celebrateCorrectAnswer();
    const nextScore = score + (correct ? points : 0);
    setScore(nextScore);
    setFeedback(correct ? `Correto! +${points} pontos` : `Resposta: ${question.answer}`);
    window.setTimeout(() => {
      setFeedback('');
      if (roundIndex >= 4) complete(nextScore);
      else setRoundIndex((current) => current + 1);
    }, 550);
  };

  const answerTextRound = (rounds: Array<{ prompt: string; answer: string }>, points: number) => {
    if (normalize(answer) !== normalize(rounds[roundIndex].answer)) {
      setFeedback('Tente outra resposta.');
      return;
    }
    celebrateCorrectAnswer();
    const nextScore = score + points;
    setScore(nextScore);
    setAnswer('');
    setFeedback(`Correto! +${points} pontos`);
    window.setTimeout(() => {
      setFeedback('');
      if (roundIndex >= rounds.length - 1) complete(nextScore);
      else setRoundIndex((current) => current + 1);
    }, 400);
  };

  const selectHexLetter = (letterIndex: number) => {
    if (finished || feedback || hexSelectedLetters.includes(letterIndex)) return;
    const puzzle = HEX_ROUNDS[roundIndex];
    const nextSelection = [...hexSelectedLetters, letterIndex];
    setHexSelectedLetters(nextSelection);
    if (nextSelection.length < puzzle.answer.length) return;

    const guess = nextSelection.map((index) => puzzle.letters[index]).join('').toLowerCase();
    if (guess !== puzzle.answer) {
      setFeedback('As letras não formam a palavra. Tente de novo.');
      window.setTimeout(() => {
        setHexSelectedLetters([]);
        setFeedback('');
      }, 550);
      return;
    }

    celebrateCorrectAnswer();
    const nextScore = score + 10;
    setScore(nextScore);
    setFeedback('Palavra encontrada! +10 pontos');
    window.setTimeout(() => {
      setFeedback('');
      if (roundIndex >= HEX_ROUNDS.length - 1) complete(nextScore);
      else {
        setRoundIndex((current) => current + 1);
        setHexSelectedLetters([]);
      }
    }, 450);
  };

  const choiceRounds = CHOICE_ROUNDS[gameId];
  const textRounds = gameId === 'crossword' ? CROSSWORD_ROUNDS : null;
  const currentSentence = SENTENCES[roundIndex];
  const currentFlashcard = FLASHCARDS[roundIndex];
  const currentHangmanWord = HANGMAN_WORDS[hangmanWordIndex];
  const wrongHangmanGuesses = hangmanGuesses.filter((letter) => !currentHangmanWord.includes(letter)).length;
  const hangmanSolved = currentHangmanWord.split('').every((letter) => hangmanGuesses.includes(letter));

  const checkSentence = () => {
    const isCorrect = selectedWords.join(' ') === currentSentence.join(' ');
    if (isCorrect) celebrateCorrectAnswer();
    const nextScore = score + (isCorrect ? 20 : 0);
    setScore(nextScore);
    setFeedback(isCorrect ? 'Frase correta! +20 pontos' : 'Quase lá. Tente reorganizar as palavras.');
    if (isCorrect) {
      window.setTimeout(() => {
        setFeedback('');
        if (roundIndex >= SENTENCES.length - 1) complete(nextScore);
        else {
          setRoundIndex((current) => current + 1);
          setSelectedWords([]);
        }
      }, 450);
    }
  };

  const clickMemoryCard = (cardIndex: number) => {
    if (finished || memoryMatched.includes(cardIndex) || memoryOpen.includes(cardIndex) || memoryOpen.length >= 2) return;
    const nextOpen = [...memoryOpen, cardIndex];
    setMemoryOpen(nextOpen);
    if (nextOpen.length !== 2) return;

    const [first, second] = nextOpen;
    if (MEMORY_CARDS[first].pair === MEMORY_CARDS[second].pair) {
      celebrateCorrectAnswer();
      const nextMatched = [...memoryMatched, first, second];
      const nextScore = score + 10;
      setMemoryMatched(nextMatched);
      setScore(nextScore);
      setMemoryOpen([]);
      setFeedback('Par encontrado! +10 pontos');
      if (nextMatched.length === MEMORY_CARDS.length) window.setTimeout(() => complete(nextScore), 450);
      else window.setTimeout(() => setFeedback(''), 650);
    } else {
      setFeedback('Não combinam. Tente de novo.');
      memoryTimer.current = window.setTimeout(() => {
        setMemoryOpen([]);
        setFeedback('');
      }, 700);
    }
  };

  const clickWordSearchCell = (cellIndex: number) => {
    if (finished || foundCells.includes(cellIndex)) return;
    const nextCells = [...selectedCells, cellIndex];
    setSelectedCells(nextCells);
    const target = WORD_SEARCH_TARGETS[roundIndex];
    if (nextCells.length < target.cells.length) return;

    const matched = nextCells.join(',') === target.cells.join(',');
    const nextScore = score + (matched ? 10 : 0);
    setScore(nextScore);
    if (matched) {
      celebrateCorrectAnswer();
      const nextFound = [...foundCells, ...nextCells];
      setFoundCells(nextFound);
      setFeedback(`${target.word} encontrada! +10 pontos`);
      if (roundIndex >= WORD_SEARCH_TARGETS.length - 1) window.setTimeout(() => complete(nextScore), 450);
      else window.setTimeout(() => {
        setRoundIndex((current) => current + 1);
        setSelectedCells([]);
        setFeedback('');
      }, 450);
    } else {
      setFeedback('Esse caminho não combina. Tente de novo.');
      window.setTimeout(() => {
        setSelectedCells([]);
        setFeedback('');
      }, 450);
    }
  };

  const clickHangmanLetter = (letter: string) => {
    if (finished || hangmanGuesses.includes(letter)) return;
    const nextGuesses = [...hangmanGuesses, letter];
    setHangmanGuesses(nextGuesses);
    const solved = currentHangmanWord.split('').every((character) => nextGuesses.includes(character));
    const errors = nextGuesses.filter((character) => !currentHangmanWord.includes(character)).length;
    if (solved) {
      celebrateCorrectAnswer();
      setFeedback('Palavra descoberta! +10 pontos');
      window.setTimeout(() => complete(10), 500);
    } else if (errors >= 6) {
      setFeedback(`A palavra era “${currentHangmanWord}”.`);
      window.setTimeout(() => complete(0), 650);
    }
  };

  const handleYesNo = (value: boolean) => {
    const correct = value === YES_NO_ROUNDS[roundIndex].answer;
    if (correct) celebrateCorrectAnswer();
    const nextScore = score + (correct ? 10 : 0);
    setScore(nextScore);
    setFeedback(correct ? 'Correto! +10 pontos' : 'Quase lá.');
    window.setTimeout(() => {
      setFeedback('');
      if (roundIndex >= YES_NO_ROUNDS.length - 1) complete(nextScore);
      else setRoundIndex((current) => current + 1);
    }, 400);
  };

  const listenToWord = (word: string) => {
    if (!('speechSynthesis' in window)) {
      setFeedback('A reprodução de voz não está disponível neste navegador.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  const wrongSentenceWords = currentSentence.filter((word) => !selectedWords.includes(word));
  const currentQuestion = choiceRounds?.[roundIndex];

  if (gameId === 'idiom-blocks') {
    return <IdiomTetrisGame onBack={onBack} onComplete={onComplete} />;
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <button type="button" onClick={onBack} className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white/85 backdrop-blur-xl transition hover:bg-white/20 hover:text-white">
        <ChevronLeft size={18} /> Voltar aos jogos
      </button>

      <section className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/[0.08] shadow-[0_8px_40px_rgba(0,0,0,0.25)] backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
        {feedback.match(/\+\d+/)?.[0] && <motion.div key={`${roundIndex}-${score}-${feedback}`} initial={{ opacity: 0, y: 10, scale: 0.8 }} animate={{ opacity: 1, y: -18, scale: 1 }} className="pointer-events-none absolute right-5 top-16 z-10 rounded-full bg-emerald-300 px-3 py-1 text-sm font-black text-emerald-950 shadow-lg">{feedback.match(/\+\d+/)?.[0]}</motion.div>}
        <header className="relative flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">Brazilian Games</p>
            <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">{title}</h1>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-right backdrop-blur-xl">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/55">Pontos</p>
            <p className="text-xl font-black tabular-nums text-emerald-300">{score}</p>
          </div>
        </header>

        <div className="relative min-h-[330px] px-5 py-7 sm:px-9 sm:py-10">
          {finished ? (
            <div className="mx-auto max-w-md py-7 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-emerald-300/20 text-emerald-200 backdrop-blur-xl"><Sparkles size={25} /></div>
              <h2 className="mt-5 text-2xl font-black text-white">Rodada concluída</h2>
              <p className="mt-2 text-sm text-white/65">Pontuação final: <span className="font-extrabold text-white">{score}</span></p>
              <p aria-live="polite" className="mt-2 text-xs text-white/60">
                {scoreSync === 'saving' && 'Enviando a pontuação ao ranking semanal…'}
                {scoreSync === 'saved' && 'Pontuação adicionada ao ranking da semana.'}
                {scoreSync === 'failed' && 'Não foi possível sincronizar. A pontuação vale só para esta rodada.'}
                {scoreSync === 'no-points' && 'Nenhum ponto foi conquistado nesta rodada.'}
              </p>
              <button type="button" onClick={onBack} className="mt-6 rounded-2xl bg-gradient-to-r from-blue-500 to-violet-500 px-6 py-3 font-extrabold text-white shadow-lg shadow-violet-500/25 transition hover:brightness-110">Voltar aos jogos</button>
            </div>
          ) : textRounds ? (
            <form onSubmit={(event) => { event.preventDefault(); answerTextRound(textRounds, gameId === 'crossword' ? 10 : 10); }} className="mx-auto max-w-xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">{gameId === 'crossword' ? `Pista ${roundIndex + 1} de ${textRounds.length}` : `Desafio ${roundIndex + 1} de ${textRounds.length}`}</p>
              <h2 className="mt-4 text-xl font-extrabold text-white sm:text-2xl">{textRounds[roundIndex].prompt}</h2>
              <div className="mx-auto my-5 flex justify-center gap-1" aria-label="Grade da resposta">
                {Array.from({ length: textRounds[roundIndex].answer.length }).map((_, index) => <span key={index} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/25 bg-white/10 text-sm font-black uppercase text-cyan-100 backdrop-blur-xl">{answer.trim()[index] || ''}</span>)}
              </div>
              <div className="mx-auto mt-7 flex max-w-md flex-col gap-3 sm:flex-row">
                <label className="sr-only" htmlFor="local-word-answer">Resposta</label>
                <input id="local-word-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} autoComplete="off" className="min-w-0 flex-1 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none backdrop-blur-xl placeholder:text-white/40 focus:border-violet-300/70" placeholder="Sua resposta" />
                <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-violet-500 px-5 py-3 font-extrabold text-white shadow-lg shadow-violet-500/25 transition hover:brightness-110"><Check size={16} /> Verificar</button>
              </div>
              <p aria-live="polite" className="mt-4 min-h-5 text-sm font-bold text-emerald-300">{feedback}</p>
            </form>
          ) : gameId === 'hex-words' ? (
            <div className="mx-auto max-w-md text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Quebra-cabeça hexagonal {roundIndex + 1} de {HEX_ROUNDS.length}</p>
              <h2 className="mt-4 text-lg font-extrabold leading-6 text-white">{HEX_ROUNDS[roundIndex].prompt}</h2>
              <p className="mt-2 text-xs text-white/45">Selecione cada letra uma vez para formar a palavra.</p>
              <div className="mx-auto mt-7 flex max-w-xs flex-wrap justify-center gap-3">
                {HEX_ROUNDS[roundIndex].letters.map((letter, index) => <button key={`${letter}-${index}`} type="button" disabled={hexSelectedLetters.includes(index) || Boolean(feedback)} onClick={() => selectHexLetter(index)} className="flex h-14 w-14 items-center justify-center bg-cyan-300/25 text-lg font-black text-white shadow-lg backdrop-blur-xl transition hover:bg-cyan-200/40 disabled:opacity-35 [clip-path:polygon(25%_5%,75%_5%,100%_50%,75%_95%,25%_95%,0%_50%)]">{letter}</button>)}
              </div>
              <div className="mx-auto mt-5 flex min-h-10 max-w-xs justify-center gap-1">
                {HEX_ROUNDS[roundIndex].answer.split('').map((_, index) => <span key={index} className="flex h-9 w-9 items-center justify-center border-b-2 border-amber-300 text-base font-black uppercase text-white">{HEX_ROUNDS[roundIndex].letters[hexSelectedLetters[index]] || ''}</span>)}
              </div>
              <p aria-live="polite" className="mt-4 min-h-5 text-sm font-bold text-emerald-300">{feedback}</p>
            </div>
          ) : gameId === 'word-search' ? (
            <div className="mx-auto max-w-md text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Encontre a palavra {roundIndex + 1} de {WORD_SEARCH_TARGETS.length}</p>
              <p className="mt-3 text-sm text-white/75">Selecione as letras de <strong className="text-cyan-200">{WORD_SEARCH_TARGETS[roundIndex].word}</strong>, da esquerda para a direita.</p>
              <div className="mx-auto mt-6 grid w-fit grid-cols-5 gap-2">
                {WORD_SEARCH.map((letter, index) => {
                  const isSelected = selectedCells.includes(index);
                  const isFound = foundCells.includes(index);
                  return <button key={index} type="button" onClick={() => clickWordSearchCell(index)} className={`h-11 w-11 rounded-xl border text-sm font-black backdrop-blur-xl transition ${isFound ? 'border-emerald-300/50 bg-emerald-300/25 text-emerald-100' : isSelected ? 'border-cyan-300 bg-cyan-300/30 text-white' : 'border-white/20 bg-white/10 text-white hover:border-white/40 hover:bg-white/20'}`}>{letter}</button>;
                })}
              </div>
              <p aria-live="polite" className="mt-4 min-h-5 text-sm font-bold text-emerald-300">{feedback}</p>
              <button type="button" onClick={() => setSelectedCells([])} className="mt-2 inline-flex items-center gap-2 text-xs text-white/45 hover:text-white"><RotateCcw size={13} /> Limpar seleção</button>
            </div>
          ) : gameId === 'memory' ? (
            <div className="mx-auto max-w-lg text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Associe a palavra em inglês ao significado em português</p>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {memoryOrder.map((cardIndex) => {
                  const isOpen = memoryOpen.includes(cardIndex) || memoryMatched.includes(cardIndex);
                  return <button key={cardIndex} type="button" onClick={() => clickMemoryCard(cardIndex)} className={`flex min-h-20 items-center justify-center rounded-2xl border p-3 text-sm font-extrabold backdrop-blur-xl transition ${memoryMatched.includes(cardIndex) ? 'border-emerald-300/50 bg-emerald-300/20 text-emerald-100' : isOpen ? 'border-cyan-300/60 bg-cyan-300/20 text-white' : 'border-white/20 bg-white/10 text-white hover:border-white/40 hover:bg-white/20'}`}>{isOpen ? MEMORY_CARDS[cardIndex].text : 'BIA'}</button>;
                })}
              </div>
              <p aria-live="polite" className="mt-4 min-h-5 text-sm font-bold text-emerald-300">{feedback}</p>
            </div>
          ) : gameId === 'sentence-scramble' ? (
            <div className="mx-auto max-w-xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Frase {roundIndex + 1} de {SENTENCES.length} · +20 pontos</p>
              <div className="mt-5 flex min-h-16 flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-xl">
                {selectedWords.length ? selectedWords.map((word, index) => <button key={`${word}-${index}`} type="button" onClick={() => setSelectedWords((current) => current.filter((_, wordIndex) => wordIndex !== index))} className="rounded-full bg-cyan-300/25 px-3 py-2 text-sm font-bold text-white">{word}</button>) : <span className="text-xs text-white/50">Monte sua frase aqui</span>}
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {[...wrongSentenceWords].sort((left, right) => left.localeCompare(right)).map((word, index) => <button key={`${word}-${index}`} type="button" onClick={() => setSelectedWords((current) => [...current, word])} className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white/85 backdrop-blur-xl hover:border-white/40 hover:bg-white/20">{word}</button>)}
              </div>
              <button type="button" onClick={checkSentence} disabled={selectedWords.length !== currentSentence.length} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-violet-500 px-5 py-3 font-extrabold text-white shadow-lg shadow-violet-500/25 disabled:cursor-not-allowed disabled:opacity-40"><Check size={16} /> Verificar frase</button>
              <p aria-live="polite" className="mt-4 min-h-5 text-sm font-bold text-emerald-300">{feedback}</p>
            </div>
          ) : gameId === 'flashcards' ? (
            <div className="mx-auto max-w-md text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Cartão {roundIndex + 1} de {FLASHCARDS.length}</p>
              <button type="button" onClick={() => setFlipped((current) => !current)} className="mt-5 flex min-h-52 w-full flex-col items-center justify-center rounded-3xl border border-white/25 bg-gradient-to-br from-amber-300/20 via-white/10 to-cyan-300/15 p-6 shadow-xl backdrop-blur-xl">
                {flipped ? <><EyeOff className="mb-3 text-cyan-200" size={20} /><span className="text-2xl font-black text-white">{currentFlashcard.meaning}</span></> : <><Eye className="mb-3 text-amber-200" size={20} /><span className="text-3xl font-black text-white">{currentFlashcard.word}</span></>}
              </button>
              <div className="mt-4 flex justify-center gap-3">
                <button type="button" onClick={() => {
                  const nextIndex = roundIndex + 1;
                  if (nextIndex >= FLASHCARDS.length) complete(score);
                  else { setRoundIndex(nextIndex); setFlipped(false); }
                }} className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white/80 backdrop-blur-xl hover:bg-white/20">Revisar de novo</button>
                <button type="button" onClick={() => {
                  celebrateCorrectAnswer();
                  const nextScore = score + 10;
                  setScore(nextScore);
                  const nextIndex = roundIndex + 1;
                  if (nextIndex >= FLASHCARDS.length) complete(nextScore);
                  else { setRoundIndex(nextIndex); setFlipped(false); }
                }} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-violet-500/25">Eu sei <ArrowRight size={15} /></button>
              </div>
            </div>
          ) : gameId === 'yes-no-speed' ? (
            <div className="mx-auto max-w-xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Afirmação {roundIndex + 1} de {YES_NO_ROUNDS.length}</p>
              <h2 className="mt-7 text-2xl font-black leading-snug text-white">{YES_NO_ROUNDS[roundIndex].statement}</h2>
              <div className="mt-7 flex justify-center gap-3">
                <button type="button" onClick={() => handleYesNo(true)} className="rounded-2xl bg-emerald-400/90 px-8 py-3 font-extrabold text-emerald-950 shadow-lg shadow-emerald-500/25 transition hover:brightness-110">Sim</button>
                <button type="button" onClick={() => handleYesNo(false)} className="rounded-2xl bg-rose-400/90 px-8 py-3 font-extrabold text-rose-950 shadow-lg shadow-rose-500/25 transition hover:brightness-110">Não</button>
              </div>
              <p aria-live="polite" className="mt-4 min-h-5 text-sm font-bold text-emerald-300">{feedback}</p>
            </div>
          ) : gameId === 'hangman' ? (
            <div className="mx-auto max-w-xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Adivinhe a palavra · 6 erros permitidos</p>
              <div className="mt-7 flex justify-center gap-2">
                {currentHangmanWord.split('').map((letter, index) => <span key={`${letter}-${index}`} className="flex h-12 w-9 items-center justify-center border-b-2 border-cyan-300 text-xl font-black uppercase text-white">{hangmanGuesses.includes(letter) || finished ? letter : ''}</span>)}
              </div>
              <p className="mt-4 text-xs text-white/50">Erros: {wrongHangmanGuesses} / 6</p>
              <div className="mx-auto mt-6 grid max-w-md grid-cols-7 gap-2">
                {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => <button key={letter} type="button" disabled={hangmanGuesses.includes(letter)} onClick={() => clickHangmanLetter(letter.toLowerCase())} className="rounded-lg border border-white/20 bg-white/10 py-2 text-xs font-bold text-white/85 backdrop-blur-xl hover:bg-white/20 disabled:opacity-25">{letter}</button>)}
              </div>
              <p aria-live="polite" className="mt-4 min-h-5 text-sm font-bold text-emerald-300">{feedback}</p>
            </div>
          ) : currentQuestion ? (
            <div className="mx-auto max-w-xl text-center">
              {gameId === 'context-quest' && <p className="mb-5 rounded-2xl border border-white/20 bg-white/10 p-4 text-left text-sm leading-6 text-white/80 backdrop-blur-xl">{currentQuestion.prompt.split(' What does ')[0].split(' “')[0]}</p>}
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Pergunta {roundIndex + 1} de 5</p>
              <h2 className="mt-3 text-xl font-extrabold leading-7 text-white">{gameId === 'context-quest' ? currentQuestion.prompt.split(' What does ')[1] ? `What does ${currentQuestion.prompt.split(' What does ')[1]}` : currentQuestion.prompt : currentQuestion.prompt}</h2>
              {gameId === 'audio-quiz' && <button type="button" onClick={() => listenToWord(currentQuestion.answer)} className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-sm font-bold text-white backdrop-blur-xl hover:bg-white/25"><Volume2 size={16} /> Ouvir pronúncia</button>}
              <div className="mx-auto mt-6 grid max-w-md gap-2">
                {currentQuestion.options.map((option) => <button key={option} type="button" onClick={() => answerChoice(currentQuestion, option, 10)} className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-left text-sm font-semibold text-white/90 backdrop-blur-xl transition hover:border-violet-300/60 hover:bg-white/20">{option}</button>)}
              </div>
              <p aria-live="polite" className="mt-4 min-h-5 text-sm font-bold text-emerald-300">{feedback}</p>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
};