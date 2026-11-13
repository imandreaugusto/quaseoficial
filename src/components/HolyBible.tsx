import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, ChevronLeft, ChevronRight, Cross, LoaderCircle, Volume2, VolumeX, X } from 'lucide-react';
import { lookupDictionary, translateText } from '../lib/translator';

interface BibleVerse {
  number: number;
  text: string;
}

interface BibleChapter {
  number: number;
  verses: BibleVerse[];
}

interface BibleBook {
  name: string;
  chapters: BibleChapter[];
}

interface BibleData {
  books: BibleBook[];
}

const VERSES_PER_SPREAD = 20;

const cleanWord = (word: string) => word.toLowerCase().replace(/[^a-z']/g, '').replace(/^'+|'+$/g, '');

const playPageTurnSound = () => {
  const context = new window.AudioContext();
  const duration = 0.24;
  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate);
  const samples = buffer.getChannelData(0);

  for (let index = 0; index < samples.length; index += 1) {
    const fade = 1 - index / samples.length;
    samples[index] = (Math.random() * 2 - 1) * fade * fade;
  }

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const volume = context.createGain();
  source.buffer = buffer;
  filter.type = 'lowpass';
  filter.frequency.value = 1800;
  volume.gain.setValueAtTime(0.0001, context.currentTime);
  volume.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.025);
  volume.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  source.connect(filter);
  filter.connect(volume);
  volume.connect(context.destination);
  source.onended = () => void context.close();
  source.start();
  source.stop(context.currentTime + duration);
};

export const HolyBible = () => {
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [bookIndex, setBookIndex] = useState(0);
  const [chapterNumber, setChapterNumber] = useState(1);
  const [pageIndex, setPageIndex] = useState(0);
  const [turnDirection, setTurnDirection] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedWord, setSelectedWord] = useState('');
  const [translation, setTranslation] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState('');
  const [soundError, setSoundError] = useState('');
  const translationRequest = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setLoadError('');

    void fetch(`${import.meta.env.BASE_URL}bible/king-james-version.json`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json() as BibleData;
        if (!Array.isArray(data.books) || data.books.length !== 66) {
          throw new Error('The Bible data file has an invalid structure.');
        }
        setBooks(data.books);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Could not load the King James Bible:', error);
        setLoadError('Não foi possível carregar o texto da Bíblia. Tente novamente.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [loadAttempt]);

  const activeBook = books[bookIndex];
  const activeChapter = activeBook?.chapters.find((chapter) => chapter.number === chapterNumber);
  const pageCount = activeChapter ? Math.max(1, Math.ceil(activeChapter.verses.length / VERSES_PER_SPREAD)) : 1;
  const firstVerseIndex = pageIndex * VERSES_PER_SPREAD;
  const visibleVerses = activeChapter?.verses.slice(firstVerseIndex, firstVerseIndex + VERSES_PER_SPREAD) ?? [];
  const splitIndex = Math.ceil(visibleVerses.length / 2);

  const changePosition = (nextBookIndex: number, nextChapterNumber: number, nextPageIndex: number, direction: number) => {
    setTurnDirection(direction);
    translationRequest.current += 1;
    setIsTranslating(false);
    if (soundEnabled) {
      try {
        playPageTurnSound();
        setSoundError('');
      } catch (error) {
        console.warn('Could not play the page-turn sound:', error);
        setSoundError('O navegador não conseguiu reproduzir o som da página.');
      }
    }
    setSelectedWord('');
    setTranslation('');
    setBookIndex(nextBookIndex);
    setChapterNumber(nextChapterNumber);
    setPageIndex(nextPageIndex);
  };

  const turnPage = (direction: -1 | 1) => {
    if (!activeBook || !activeChapter) return;

    if (direction > 0) {
      if (pageIndex + 1 < pageCount) {
        changePosition(bookIndex, chapterNumber, pageIndex + 1, direction);
        return;
      }
      if (chapterNumber < activeBook.chapters.length) {
        changePosition(bookIndex, chapterNumber + 1, 0, direction);
        return;
      }
      if (bookIndex + 1 < books.length) {
        changePosition(bookIndex + 1, 1, 0, direction);
      }
      return;
    }

    if (pageIndex > 0) {
      changePosition(bookIndex, chapterNumber, pageIndex - 1, direction);
      return;
    }
    if (chapterNumber > 1) {
      const previousChapter = activeBook.chapters[chapterNumber - 2];
      changePosition(bookIndex, chapterNumber - 1, Math.ceil(previousChapter.verses.length / VERSES_PER_SPREAD) - 1, direction);
      return;
    }
    if (bookIndex > 0) {
      const previousBook = books[bookIndex - 1];
      const lastChapter = previousBook.chapters.at(-1);
      if (lastChapter) {
        changePosition(bookIndex - 1, lastChapter.number, Math.ceil(lastChapter.verses.length / VERSES_PER_SPREAD) - 1, direction);
      }
    }
  };

  const handleWordClick = async (word: string) => {
    const wordToTranslate = cleanWord(word);
    if (!wordToTranslate) return;

    setSelectedWord(wordToTranslate);
    setTranslation('');
    setIsTranslating(false);
    setTranslationError('');
    const requestId = translationRequest.current + 1;
    translationRequest.current = requestId;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(wordToTranslate);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }

    const dictionaryMatch = lookupDictionary(wordToTranslate);
    if (dictionaryMatch) {
      setTranslation(dictionaryMatch);
      return;
    }

    setIsTranslating(true);
    try {
      const translated = await translateText(wordToTranslate);
      if (translationRequest.current === requestId) setTranslation(translated);
    } catch (error) {
      console.error(`Could not translate Bible word "${wordToTranslate}":`, error);
      if (translationRequest.current === requestId) {
        setTranslationError('Não foi possível obter a tradução agora.');
      }
    } finally {
      if (translationRequest.current === requestId) setIsTranslating(false);
    }
  };

  const renderVerses = (verses: BibleVerse[]) => verses.map((verse) => (
    <p key={verse.number} className="mb-2 text-justify text-[13px] leading-[1.75] text-[#3d3021] sm:text-sm">
      <sup className="mr-1 select-none font-serif text-[10px] font-bold text-amber-800/70">{verse.number}</sup>
      {verse.text.split(/(\s+)/).map((part, index) => {
        if (!cleanWord(part)) return <span key={index}>{part}</span>;
        return (
          <button
            key={index}
            type="button"
            onClick={() => void handleWordClick(part)}
            className={`notranslate rounded-sm text-left transition-colors hover:bg-amber-300/50 focus-visible:outline focus-visible:outline-1 focus-visible:outline-amber-800 ${
              selectedWord === cleanWord(part) ? 'bg-amber-300/60' : ''
            }`}
            translate="no"
            aria-label={`Traduzir ${cleanWord(part)}`}
          >
            {part}
          </button>
        );
      })}
    </p>
  ));

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-3 text-white/80">
        <LoaderCircle className="animate-spin" size={20} />
        Carregando a King James Version...
      </div>
    );
  }

  if (loadError || !activeBook || !activeChapter) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 bg-black/20 p-8 text-center text-white">
        <Cross className="text-amber-300" size={30} />
        <p>{loadError || 'A leitura não está disponível.'}</p>
        {loadError && (
          <button
            type="button"
            onClick={() => setLoadAttempt((attempt) => attempt + 1)}
            className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-neutral-950"
          >
            Tentar novamente
          </button>
        )}
      </div>
    );
  }

  const leftPage = visibleVerses.slice(0, splitIndex);
  const rightPage = visibleVerses.slice(splitIndex);
  const isAtStart = bookIndex === 0 && chapterNumber === 1 && pageIndex === 0;
  const isAtEnd = bookIndex === books.length - 1
    && chapterNumber === activeBook.chapters.length
    && pageIndex === pageCount - 1;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-3 pb-8 pt-3 text-white sm:px-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-black/25 p-4 shadow-xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300">
            <Cross size={23} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-wide">Holy Bible</h1>
            <p className="text-xs text-white/60">King James Version · leitura interativa em inglês</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="bible-book">Livro</label>
          <select
            id="bible-book"
            value={bookIndex}
            onChange={(event) => changePosition(Number(event.target.value), 1, 0, 1)}
            className="min-w-36 rounded-xl border border-white/15 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-300"
          >
            {books.map((book, index) => <option key={book.name} value={index}>{book.name}</option>)}
          </select>
          <label className="sr-only" htmlFor="bible-chapter">Capítulo</label>
          <select
            id="bible-chapter"
            value={chapterNumber}
            onChange={(event) => changePosition(bookIndex, Number(event.target.value), 0, 1)}
            className="rounded-xl border border-white/15 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-300"
          >
            {activeBook.chapters.map((chapter) => (
              <option key={chapter.number} value={chapter.number}>Cap. {chapter.number}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setSoundEnabled((enabled) => !enabled)}
            aria-label={soundEnabled ? 'Desativar som de página' : 'Ativar som de página'}
            title={soundEnabled ? 'Som de página ligado' : 'Som de página desligado'}
            className="rounded-xl border border-white/15 bg-white/5 p-2.5 text-amber-200 transition hover:bg-white/10"
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </header>

      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 items-center gap-2 text-sm text-white/75">
          <BookOpen size={16} className="shrink-0 text-amber-300" />
          <span className="truncate">{activeBook.name} {chapterNumber}</span>
          <span className="shrink-0 text-white/40">·</span>
          <span className="shrink-0">Pág. {pageIndex + 1} de {pageCount}</span>
        </div>
        <p className="hidden text-right text-xs text-white/45 sm:block">Clique em uma palavra para ver a tradução e ouvir a pronúncia.</p>
      </div>

      <section className="relative overflow-hidden rounded-[1.5rem] border border-amber-100/20 bg-[#24190f] p-2 shadow-[0_24px_70px_rgba(0,0,0,0.45)] sm:rounded-[2rem] sm:p-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${bookIndex}-${chapterNumber}-${pageIndex}`}
            initial={{ opacity: 0.6, rotateY: turnDirection > 0 ? -8 : 8, scale: 0.99 }}
            animate={{ opacity: 1, rotateY: 0, scale: 1 }}
            exit={{ opacity: 0.6, rotateY: turnDirection > 0 ? 8 : -8, scale: 0.99 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="grid min-h-[30rem] grid-cols-1 overflow-hidden rounded-[1.15rem] bg-[#f7efd9] shadow-inner md:grid-cols-2 md:rounded-[1.5rem]"
            style={{ transformPerspective: 1200 }}
          >
            <article className="relative border-b border-[#8f704a]/25 px-5 py-7 sm:px-8 sm:py-9 md:border-b-0 md:border-r md:px-10">
              <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-5 bg-gradient-to-l from-[#725637]/10 to-transparent md:block" />
              <h2 className="mb-5 text-center font-serif text-lg font-bold text-[#5b3c1f]">
                {pageIndex === 0 ? `${activeBook.name} ${chapterNumber}` : `${activeBook.name} ${chapterNumber}`}
              </h2>
              {renderVerses(leftPage)}
              {leftPage.length === 0 && <p className="text-sm text-[#3d3021]/60">Fim do capítulo</p>}
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 font-serif text-xs text-[#8f704a]/70">
                {firstVerseIndex + 1}
              </span>
            </article>

            <article className="relative px-5 py-7 sm:px-8 sm:py-9 md:px-10">
              <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-5 bg-gradient-to-r from-[#725637]/10 to-transparent md:block" />
              <h2 className="mb-5 text-center font-serif text-lg font-bold text-[#5b3c1f]">{activeBook.name}</h2>
              {renderVerses(rightPage)}
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 font-serif text-xs text-[#8f704a]/70">
                {firstVerseIndex + splitIndex + 1}
              </span>
            </article>
          </motion.div>
        </AnimatePresence>
      </section>

      {(selectedWord || translationError) && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-amber-300/25 bg-amber-950/30 px-4 py-3 text-sm text-amber-50">
          <div className="min-w-0">
            {selectedWord && <p className="font-bold text-amber-200">{selectedWord}</p>}
            {isTranslating && <p className="mt-1 text-white/70">Traduzindo...</p>}
            {translation && <p className="mt-1">{translation}</p>}
            {translationError && <p className="mt-1 text-rose-200">{translationError}</p>}
          </div>
          <button
            type="button"
            onClick={() => {
              translationRequest.current += 1;
              setSelectedWord('');
              setTranslation('');
              setTranslationError('');
              setIsTranslating(false);
            }}
            aria-label="Fechar tradução"
            className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <nav className="flex items-center justify-between gap-3" aria-label="Navegação da Bíblia">
        <button
          type="button"
          disabled={isAtStart}
          onClick={() => turnPage(-1)}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronLeft size={18} /> Anterior
        </button>
        <span className="text-xs text-white/50">{activeBook.name} {chapterNumber} · {firstVerseIndex + 1}–{Math.min(firstVerseIndex + visibleVerses.length, activeChapter.verses.length)}</span>
        <button
          type="button"
          disabled={isAtEnd}
          onClick={() => turnPage(1)}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-neutral-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-35"
        >
          Próxima <ChevronRight size={18} />
        </button>
      </nav>

      {(soundError || translationError) && (
        <p className="text-center text-xs text-rose-200" role="status">{soundError || translationError}</p>
      )}

      <footer className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center text-xs leading-relaxed text-white/55">
        <p>King James Version (1611) · 66 livros do cânone protestante. Texto-fonte: edição digital nº 10.</p>
        <a
          href="https://www.gutenberg.org/ebooks/10"
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-amber-200/80 underline decoration-amber-200/30 underline-offset-2 hover:text-amber-100"
        >
          Fonte do texto digital
        </a>
      </footer>
    </main>
  );
};
