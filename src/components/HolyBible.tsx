import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import { BookOpen, Check, ChevronLeft, ChevronRight, Clipboard, Highlighter, LoaderCircle, NotebookPen, Volume2, VolumeX, X } from 'lucide-react';
import { ChristianCrossIcon } from './ChristianCrossIcon';
import { lookupDictionary, translateText } from '../lib/translator';

interface BibleVerse {
  number: number;
  text: string;
  copyText?: string;
  continuation?: boolean;
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

interface ReaderGeometry {
  width: number;
  height: number;
  columns: 1 | 2;
}

interface TranslationPopup {
  word: string;
  text: string;
  loading: boolean;
  error: string;
  left: number;
  top: number;
}

interface PageTurnState {
  direction: -1 | 1;
  frontVerses: BibleVerse[];
  backVerses: BibleVerse[];
  frontTitle: string;
  backTitle: string;
  frontPageNumber: number;
  backPageNumber: number;
  targetBookIndex: number;
  targetChapterNumber: number;
  targetPageIndex: number;
}

interface VerseAnnotation {
  highlight: string;
  note: string;
}

type VerseAnnotations = Record<string, VerseAnnotation>;

const cleanWord = (word: string) => word.toLowerCase().replace(/[^a-z']/g, '').replace(/^'+|'+$/g, '');
const PAGE_CLASSES = 'relative min-w-0 overflow-hidden border-b border-[#8f704a]/25 px-5 py-5 sm:px-8 sm:py-7 md:border-b-0 md:px-8';
const PAGE_CONTENT_GUTTER = 64;
const ANNOTATIONS_STORAGE_KEY = 'holy-bible-annotations-v1';
const HIGHLIGHT_COLORS = [
  { name: 'Amarelo', value: 'rgba(250, 204, 21, 0.42)' },
  { name: 'Verde', value: 'rgba(74, 222, 128, 0.32)' },
  { name: 'Azul', value: 'rgba(96, 165, 250, 0.32)' },
  { name: 'Rosa', value: 'rgba(244, 114, 182, 0.32)' },
];

const readVerseAnnotations = (): VerseAnnotations => {
  try {
    const stored = window.localStorage.getItem(ANNOTATIONS_STORAGE_KEY);
    if (!stored) return {};
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Stored Bible annotations have an invalid format.');
    }
    const annotations: VerseAnnotations = {};
    Object.entries(parsed).forEach(([reference, value]) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('A saved Bible annotation has an invalid format.');
      }
      const annotation = value as Record<string, unknown>;
      if (
        typeof annotation.highlight !== 'string'
        || (annotation.highlight && !HIGHLIGHT_COLORS.some((color) => color.value === annotation.highlight))
        || typeof annotation.note !== 'string'
      ) {
        throw new Error('A saved Bible annotation has invalid content.');
      }
      annotations[reference] = { highlight: annotation.highlight, note: annotation.note };
    });
    return annotations;
  } catch (error) {
    console.error('Could not load saved Bible annotations:', error);
    return {};
  }
};

const playPageTurnSound = () => {
  const context = new window.AudioContext();
  const duration = 0.48;
  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate);
  const samples = buffer.getChannelData(0);

  for (let index = 0; index < samples.length; index += 1) {
    const progress = index / samples.length;
    const fade = Math.sin(Math.PI * progress) * (1 - progress * 0.45);
    samples[index] = (Math.random() * 2 - 1) * fade * 0.55;
  }

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const volume = context.createGain();
  source.buffer = buffer;
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2400, context.currentTime);
  filter.frequency.exponentialRampToValueAtTime(650, context.currentTime + duration);
  volume.gain.setValueAtTime(0.0001, context.currentTime);
  volume.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.045);
  volume.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  source.connect(filter);
  filter.connect(volume);
  volume.connect(context.destination);
  source.onended = () => void context.close();
  source.start();
  source.stop(context.currentTime + duration);
};

const splitIntoPages = (verses: BibleVerse[], heights: number[], pageCapacity: number) => {
  if (!verses.length) return [[]];
  if (pageCapacity <= 0 || heights.length !== verses.length) return [verses];

  const pages: BibleVerse[][] = [];
  let page: BibleVerse[] = [];
  let usedHeight = 0;

  verses.forEach((verse, index) => {
    const verseHeight = heights[index];
    if (page.length && usedHeight + verseHeight > pageCapacity) {
      pages.push(page);
      page = [];
      usedHeight = 0;
    }
    page.push(verse);
    usedHeight += verseHeight;
  });

  if (page.length) pages.push(page);
  return pages;
};

const getPopupPosition = (rect: DOMRect) => ({
  left: Math.max(12, Math.min(rect.left + rect.width / 2 - 140, window.innerWidth - 292)),
  top: Math.max(12, Math.min(rect.top - 120, window.innerHeight - 132)),
});

export const HolyBible = () => {
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [bookIndex, setBookIndex] = useState(0);
  const [chapterNumber, setChapterNumber] = useState(1);
  const [pageIndex, setPageIndex] = useState(0);
  const [isBookOpen, setIsBookOpen] = useState(false);
  const [isOpeningBook, setIsOpeningBook] = useState(false);
  const [annotations, setAnnotations] = useState<VerseAnnotations>(readVerseAnnotations);
  const [highlightColor, setHighlightColor] = useState(HIGHLIGHT_COLORS[0].value);
  const [editingNote, setEditingNote] = useState<{ reference: string; text: string } | null>(null);
  const [annotationError, setAnnotationError] = useState('');
  const [pageTurn, setPageTurn] = useState<PageTurnState | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundError, setSoundError] = useState('');
  const [geometry, setGeometry] = useState<ReaderGeometry>({ width: 0, height: 0, columns: 1 });
  const [pageVerses, setPageVerses] = useState<BibleVerse[][][]>([]);
  const [translationPopup, setTranslationPopup] = useState<TranslationPopup | null>(null);
  const [copiedVerse, setCopiedVerse] = useState<number | null>(null);
  const [copyError, setCopyError] = useState('');
  const pageFrameRef = useRef<HTMLDivElement | null>(null);
  const openingSpreadRef = useRef<HTMLDivElement | null>(null);
  const openingCoverRef = useRef<HTMLButtonElement | null>(null);
  const openingShadowRef = useRef<HTMLDivElement | null>(null);
  const markerToolbarRef = useRef<HTMLDivElement | null>(null);
  const readerRef = useRef<HTMLElement | null>(null);
  const previousAnnotationsRef = useRef<VerseAnnotations>(annotations);
  const measurementRef = useRef<HTMLDivElement | null>(null);
  const pageTurnSheetRef = useRef<HTMLDivElement | null>(null);
  const pageTurnShadowRef = useRef<HTMLDivElement | null>(null);
  const isTurningPage = useRef(false);
  const translationRequest = useRef(0);
  const copiedFeedbackTimer = useRef<number | null>(null);
  const popupAnchor = useRef<HTMLElement | null>(null);

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

  useEffect(() => {
    const frame = pageFrameRef.current;
    if (!frame) return undefined;

    const measure = () => {
      const bounds = frame.getBoundingClientRect();
      const columns: 1 | 2 = window.matchMedia('(min-width: 768px)').matches ? 2 : 1;
      setGeometry((current) => {
        const width = Math.floor(bounds.width);
        const height = Math.floor(bounds.height);
        if (current.width === width && current.height === height && current.columns === columns) return current;
        return { width, height, columns };
      });
    };

    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    measure();
    return () => observer.disconnect();
  }, [isBookOpen, isLoading]);

  useLayoutEffect(() => {
    if (!isOpeningBook) return undefined;

    const finishOpening = () => {
      setIsBookOpen(true);
      setIsOpeningBook(false);
    };
    const cover = openingCoverRef.current;
    const spread = openingSpreadRef.current;
    if (!cover || !spread || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finishOpening();
      return undefined;
    }

    const timeline = gsap.timeline({ onComplete: finishOpening });
    timeline
      .fromTo(spread, { autoAlpha: 0, scale: 0.985, filter: 'brightness(0.72)' }, {
        autoAlpha: 1,
        scale: 1,
        filter: 'brightness(1)',
        duration: 0.65,
        ease: 'power2.out',
      }, 0)
      .to(cover, {
        xPercent: window.matchMedia('(min-width: 768px)').matches ? 50 : 0,
        rotationY: -154,
        scaleX: 0.98,
        duration: 0.95,
        ease: 'power3.inOut',
      }, 0.08)
      .to(cover, {
        rotationY: -180,
        scaleX: 1,
        duration: 0.4,
        ease: 'power2.out',
      }, '-=0.16');

    if (openingShadowRef.current) {
      timeline.fromTo(openingShadowRef.current, { opacity: 0.04 }, {
        opacity: 0.48,
        duration: 0.55,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: 1,
      }, 0.08);
    }

    return () => {
      timeline.kill();
    };
  }, [isOpeningBook]);

  useEffect(() => {
    try {
      window.localStorage.setItem(ANNOTATIONS_STORAGE_KEY, JSON.stringify(annotations));
      setAnnotationError('');
    } catch (error) {
      console.error('Could not save Bible annotations:', error);
      setAnnotationError('Não foi possível salvar suas marcações neste dispositivo.');
    }
  }, [annotations]);

  useLayoutEffect(() => {
    const toolbar = markerToolbarRef.current;
    const reader = readerRef.current;
    const animations: gsap.core.Tween[] = [];
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    if (toolbar) {
      animations.push(gsap.fromTo(toolbar, { autoAlpha: 0, y: 12 }, {
        autoAlpha: 1,
        y: 0,
        duration: 0.42,
        ease: 'power2.out',
      }));
    }
    if (reader) {
      animations.push(gsap.fromTo(reader, { autoAlpha: 0, y: 18, scale: 0.985 }, {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.58,
        ease: 'power3.out',
      }));
    }

    return () => animations.forEach((animation) => animation.kill());
  }, [isBookOpen]);

  useLayoutEffect(() => {
    const previousAnnotations = previousAnnotationsRef.current;
    const paragraphs = [...document.querySelectorAll<HTMLElement>('[data-verse-reference]')];
    const animations: gsap.core.Tween[] = [];

    Object.entries(annotations).forEach(([reference, annotation]) => {
      const previousColor = previousAnnotations[reference]?.highlight;
      if (previousColor === annotation.highlight || !annotation.highlight) return;
      paragraphs
        .filter((paragraph) => paragraph.dataset.verseReference === reference)
        .forEach((paragraph) => {
          animations.push(gsap.fromTo(paragraph, { backgroundColor: previousColor || 'rgba(0, 0, 0, 0)' }, {
            backgroundColor: annotation.highlight || 'rgba(0, 0, 0, 0)',
            duration: 0.55,
            ease: 'power2.out',
          }));
        });
    });

    Object.entries(previousAnnotations).forEach(([reference, annotation]) => {
      if (!annotation.highlight || annotations[reference]?.highlight) return;
      paragraphs
        .filter((paragraph) => paragraph.dataset.verseReference === reference)
        .forEach((paragraph) => {
          animations.push(gsap.to(paragraph, {
            backgroundColor: 'rgba(0, 0, 0, 0)',
            duration: 0.35,
            ease: 'power1.out',
          }));
        });
    });
    previousAnnotationsRef.current = annotations;
    return () => animations.forEach((animation) => animation.kill());
  }, [annotations]);

  useEffect(() => () => {
    if (copiedFeedbackTimer.current !== null) window.clearTimeout(copiedFeedbackTimer.current);
  }, []);

  useEffect(() => {
    if (!translationPopup) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setTranslationPopup(null);
    };
    const repositionPopup = () => {
      if (!popupAnchor.current) return;
      const position = getPopupPosition(popupAnchor.current.getBoundingClientRect());
      setTranslationPopup((current) => current ? { ...current, ...position } : current);
    };
    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', repositionPopup);
    window.addEventListener('scroll', repositionPopup, true);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', repositionPopup);
      window.removeEventListener('scroll', repositionPopup, true);
    };
  }, [translationPopup]);

  const activeBook = books[bookIndex];
  const activeChapter = activeBook?.chapters.find((chapter) => chapter.number === chapterNumber);
  const horizontalPadding = window.innerWidth >= 640 ? 64 : 40;
  const measurementWidth = Math.max(
    0,
    geometry.width / geometry.columns - horizontalPadding,
  );
  const verticalPadding = window.innerWidth >= 640 ? 56 : 40;
  const pageCapacity = Math.max(0, geometry.height - verticalPadding - PAGE_CONTENT_GUTTER);

  useLayoutEffect(() => {
    const measurementNode = measurementRef.current;
    if (!activeChapter || !measurementNode || geometry.width === 0 || geometry.height === 0) {
      setPageVerses([]);
      return;
    }

    const verseNodes = [...measurementNode.querySelectorAll<HTMLElement>('[data-measure-verse]')];
    const measuredVerses: BibleVerse[] = [];
    const heights: number[] = [];

    activeChapter.verses.forEach((verse, index) => {
      const node = verseNodes[index];
      const verseHeight = node.getBoundingClientRect().height + 8;
      if (verseHeight <= pageCapacity) {
        measuredVerses.push(verse);
        heights.push(verseHeight);
        return;
      }

      const lineFragments = new Map<number, string>();
      for (const token of node.querySelectorAll<HTMLElement>('[data-measure-token]')) {
        const bounds = token.getBoundingClientRect();
        const line = Math.round(bounds.top);
        lineFragments.set(line, `${lineFragments.get(line) ?? ''}${token.textContent ?? ''}`);
      }
      const lines = [...lineFragments.values()].map((line) => line.trim()).filter(Boolean);
      const paragraph = node.querySelector('p');
      const lineHeight = paragraph ? Number.parseFloat(getComputedStyle(paragraph).lineHeight) : 22;
      const maxLinesPerPage = Math.max(1, Math.floor((pageCapacity - 8) / lineHeight));

      for (let start = 0; start < lines.length; start += maxLinesPerPage) {
        const text = lines.slice(start, start + maxLinesPerPage).join(' ');
        measuredVerses.push({
          number: verse.number,
          text: start > 0 ? ` ${text}` : text,
          copyText: verse.text,
          continuation: start > 0,
        });
        heights.push(Math.min(
          pageCapacity,
          Math.ceil(Math.min(lines.length - start, maxLinesPerPage) * lineHeight) + 8,
        ));
      }
    });

    const columns = splitIntoPages(measuredVerses, heights, pageCapacity);
    const spreads: BibleVerse[][][] = [];

    for (let index = 0; index < columns.length; index += geometry.columns) {
      spreads.push(geometry.columns === 2
        ? [columns[index], columns[index + 1] ?? []]
        : [columns[index]]);
    }

    setPageVerses(spreads);
  }, [activeChapter, geometry, measurementWidth, pageCapacity]);

  useEffect(() => {
    if (pageVerses.length && (pageIndex < 0 || pageIndex >= pageVerses.length)) {
      setPageIndex(pageVerses.length - 1);
    }
  }, [pageIndex, pageVerses]);

  useLayoutEffect(() => {
    if (!pageTurn) return undefined;

    const finishTurn = () => {
      setBookIndex(pageTurn.targetBookIndex);
      setChapterNumber(pageTurn.targetChapterNumber);
      setPageIndex(pageTurn.targetPageIndex);
      setPageTurn(null);
      isTurningPage.current = false;
    };

    const sheet = pageTurnSheetRef.current;
    if (!sheet || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finishTurn();
      return undefined;
    }

    const timeline = gsap.timeline({ onComplete: finishTurn });
    timeline
      .to(sheet, {
        rotateY: pageTurn.direction > 0 ? -92 : 92,
        scaleX: 0.97,
        z: 8,
        duration: 0.38,
        ease: 'power2.in',
      })
      .to(sheet, {
        rotateY: pageTurn.direction > 0 ? -180 : 180,
        scaleX: 1,
        z: 0,
        duration: 0.38,
        ease: 'power2.out',
      });

    if (pageTurnShadowRef.current) {
      timeline.fromTo(
        pageTurnShadowRef.current,
        { opacity: 0.08 },
        { opacity: 0.48, duration: 0.38, ease: 'sine.inOut', yoyo: true, repeat: 1 },
        0,
      );
    }

    return () => {
      timeline.kill();
    };
  }, [pageTurn]);

  const currentSpread = pageVerses[pageIndex] ?? [[], []];
  const leftPage = currentSpread[0] ?? [];
  const rightPage = currentSpread[1] ?? [];
  const visibleVerses = currentSpread.flat();
  const firstVerseIndex = visibleVerses[0]?.number ?? 1;
  const lastVerseIndex = visibleVerses.at(-1)?.number ?? firstVerseIndex;
  const isAtStart = bookIndex === 0 && chapterNumber === 1 && pageIndex === 0;
  const isAtEnd = Boolean(activeBook && bookIndex === books.length - 1
    && chapterNumber === activeBook.chapters.length
    && pageIndex === pageVerses.length - 1);

  const clearTranslation = () => {
    translationRequest.current += 1;
    setTranslationPopup(null);
  };

  const changePosition = useCallback((
    nextBookIndex: number,
    nextChapterNumber: number,
    nextPageIndex: number,
    playSound = true,
  ) => {
    isTurningPage.current = false;
    setPageTurn(null);
    clearTranslation();
    setCopyError('');
    setCopiedVerse(null);

    if (soundEnabled && playSound) {
      try {
        playPageTurnSound();
        setSoundError('');
      } catch (error) {
        console.warn('Could not play the page-turn sound:', error);
        setSoundError('O navegador não conseguiu reproduzir o som da página.');
      }
    }

    setBookIndex(nextBookIndex);
    setChapterNumber(nextChapterNumber);
    setPageIndex(nextPageIndex);
  }, [soundEnabled]);

  const startPageTurn = (
    targetBookIndex: number,
    targetChapterNumber: number,
    targetPageIndex: number,
    direction: -1 | 1,
  ) => {
    if (isTurningPage.current) return;

    const targetSpread = targetBookIndex === bookIndex && targetChapterNumber === chapterNumber
      ? pageVerses[targetPageIndex]
      : undefined;
    const frontVerses = geometry.columns === 2
      ? direction > 0 ? rightPage : leftPage
      : leftPage;
    const backVerses = targetSpread
      ? geometry.columns === 2
        ? direction > 0 ? targetSpread[0] ?? [] : targetSpread[1] ?? targetSpread[0] ?? []
        : targetSpread[0] ?? []
      : [];
    const targetBookName = books[targetBookIndex]?.name ?? activeBook?.name ?? '';
    const frontTitle = geometry.columns === 2 && direction > 0
      ? activeBook?.name ?? ''
      : `${activeBook?.name ?? ''} ${chapterNumber}`;
    const backTitle = geometry.columns === 2 && direction < 0
      ? targetBookName
      : `${targetBookName} ${targetChapterNumber}`;

    isTurningPage.current = true;
    clearTranslation();
    setCopyError('');
    setCopiedVerse(null);

    if (soundEnabled) {
      try {
        playPageTurnSound();
        setSoundError('');
      } catch (error) {
        console.warn('Could not play the page-turn sound:', error);
        setSoundError('O navegador não conseguiu reproduzir o som da página.');
      }
    }

    setPageTurn({
      direction,
      frontVerses,
      backVerses,
      frontTitle,
      backTitle,
      frontPageNumber: frontVerses[0]?.number ?? firstVerseIndex,
      backPageNumber: backVerses[0]?.number ?? (direction > 0 ? lastVerseIndex + 1 : 1),
      targetBookIndex,
      targetChapterNumber,
      targetPageIndex,
    });
  };

  const turnPage = (direction: -1 | 1) => {
    if (!activeBook || !activeChapter || pageVerses.length === 0) return;

    if (direction > 0) {
      if (pageIndex + 1 < pageVerses.length) {
        startPageTurn(bookIndex, chapterNumber, pageIndex + 1, direction);
        return;
      }
      if (chapterNumber < activeBook.chapters.length) {
        startPageTurn(bookIndex, chapterNumber + 1, 0, direction);
        return;
      }
      if (bookIndex + 1 < books.length) startPageTurn(bookIndex + 1, 1, 0, direction);
      return;
    }

    if (pageIndex > 0) {
      startPageTurn(bookIndex, chapterNumber, pageIndex - 1, direction);
      return;
    }
    if (chapterNumber > 1) {
      startPageTurn(bookIndex, chapterNumber - 1, -1, direction);
      return;
    }
    if (bookIndex > 0) {
      const previousBook = books[bookIndex - 1];
      const lastChapter = previousBook.chapters.at(-1);
      if (lastChapter) {
        startPageTurn(bookIndex - 1, lastChapter.number, -1, direction);
      }
    }
  };

  const handleWordClick = async (word: string, event: React.MouseEvent<HTMLButtonElement>) => {
    const wordToTranslate = cleanWord(word);
    if (!wordToTranslate) return;

    const anchor = event.currentTarget;
    const rect = anchor.getBoundingClientRect();
    popupAnchor.current = anchor;
    const position = getPopupPosition(rect);
    const requestId = translationRequest.current + 1;
    translationRequest.current = requestId;
    setTranslationPopup({ word: wordToTranslate, text: '', loading: false, error: '', ...position });

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(wordToTranslate);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }

    const dictionaryMatch = lookupDictionary(wordToTranslate);
    if (dictionaryMatch) {
      setTranslationPopup((current) => current?.word === wordToTranslate ? { ...current, text: dictionaryMatch } : current);
      return;
    }

    setTranslationPopup((current) => current?.word === wordToTranslate ? { ...current, loading: true } : current);
    try {
      const translated = await translateText(wordToTranslate);
      if (translationRequest.current === requestId) {
        setTranslationPopup((current) => current?.word === wordToTranslate
          ? { ...current, text: translated, loading: false }
          : current);
      }
    } catch (error) {
      console.error(`Could not translate Bible word "${wordToTranslate}":`, error);
      if (translationRequest.current === requestId) {
        setTranslationPopup((current) => current?.word === wordToTranslate
          ? { ...current, loading: false, error: 'Não foi possível obter a tradução agora.' }
          : current);
      }
    }
  };

  const handleCopyVerse = async (verse: BibleVerse) => {
    try {
      await navigator.clipboard.writeText(`${activeBook?.name} ${chapterNumber}:${verse.number} — ${verse.copyText ?? verse.text}`);
      setCopiedVerse(verse.number);
      setCopyError('');
      if (copiedFeedbackTimer.current !== null) window.clearTimeout(copiedFeedbackTimer.current);
      copiedFeedbackTimer.current = window.setTimeout(() => setCopiedVerse(null), 1800);
    } catch (error) {
      console.error('Could not copy Bible verse:', error);
      setCopyError('Não foi possível copiar. Verifique a permissão de área de transferência do navegador.');
    }
  };

  const updateAnnotation = (reference: string, update: Partial<VerseAnnotation>) => {
    setAnnotations((current) => {
      const annotation = {
        highlight: current[reference]?.highlight ?? '',
        note: current[reference]?.note ?? '',
        ...update,
      };
      const next = { ...current };
      if (!annotation.highlight && !annotation.note) delete next[reference];
      else next[reference] = annotation;
      return next;
    });
    setAnnotationError('');
  };

  const renderVerses = (verses: BibleVerse[]) => verses.map((verse) => {
    const reference = `${activeBook.name} ${chapterNumber}:${verse.number}`;
    const annotation = annotations[reference];
    return (
    <div key={`${verse.number}-${verse.text}`} className="relative mb-2 pr-16 text-[13px] leading-[1.65] text-[#3d3021] sm:text-sm">
      <p className="m-0 text-justify">
        <span
          data-verse-reference={reference}
          className="rounded-[2px] px-[2px]"
          style={{ backgroundColor: annotation?.highlight || 'transparent', boxDecorationBreak: 'clone' }}
        >
          {!verse.continuation && <sup className="mr-1 select-none font-serif text-[10px] font-bold text-amber-800/70">{verse.number}</sup>}
          {verse.text.split(/(\s+)/).map((part, index) => {
            if (!cleanWord(part)) return <span key={index}>{part}</span>;
            return (
              <button
                key={index}
                type="button"
                onClick={(event) => void handleWordClick(part, event)}
                className={`notranslate rounded-sm text-left transition-colors hover:bg-amber-300/50 focus-visible:outline focus-visible:outline-1 focus-visible:outline-amber-800 ${
                  translationPopup?.word === cleanWord(part) ? 'bg-amber-300/60' : ''
                }`}
                translate="no"
                aria-label={`Traduzir ${cleanWord(part)}`}
              >
                {part}
              </button>
            );
          })}
        </span>
      </p>
      <button
        type="button"
        onClick={() => void handleCopyVerse(verse)}
        aria-label={copiedVerse === verse.number ? `Versículo ${verse.number} copiado` : `Copiar versículo ${verse.number}`}
        title={copiedVerse === verse.number ? 'Copiado!' : 'Copiar versículo'}
        className="absolute right-0 top-0 rounded p-1 text-[#8f704a] transition hover:bg-amber-200 hover:text-amber-950 focus-visible:outline focus-visible:outline-1 focus-visible:outline-amber-800"
      >
        {copiedVerse === verse.number ? <Check size={13} /> : <Clipboard size={13} />}
      </button>
      <button
        type="button"
        onClick={() => updateAnnotation(reference, {
          highlight: annotation?.highlight === highlightColor ? '' : highlightColor,
        })}
        aria-label={annotation?.highlight === highlightColor ? `Remover marca-texto de ${reference}` : `Marcar ${reference}`}
        title={annotation?.highlight === highlightColor ? 'Remover marca-texto' : 'Marcar versículo'}
        className={`absolute right-6 top-0 rounded p-1 transition hover:bg-amber-200 hover:text-amber-950 focus-visible:outline focus-visible:outline-1 focus-visible:outline-amber-800 ${
          annotation?.highlight ? 'text-amber-900' : 'text-[#8f704a]'
        }`}
      >
        <Highlighter size={13} />
      </button>
      <button
        type="button"
        onClick={() => setEditingNote({ reference, text: annotation?.note ?? '' })}
        aria-label={annotation?.note ? `Editar nota de ${reference}` : `Adicionar nota a ${reference}`}
        title={annotation?.note ? 'Editar nota' : 'Adicionar nota'}
        className={`absolute right-12 top-0 rounded p-1 transition hover:bg-amber-200 hover:text-amber-950 focus-visible:outline focus-visible:outline-1 focus-visible:outline-amber-800 ${
          annotation?.note ? 'text-amber-900' : 'text-[#8f704a]'
        }`}
      >
        <NotebookPen size={13} />
      </button>
    </div>
    );
  });

  const renderPageFace = (
    verses: BibleVerse[],
    title: string,
    pageNumber: number,
  ) => (
    <article className={`${PAGE_CLASSES} h-full bg-[#f7efd9]`} aria-hidden="true">
      <h2 className="mb-3 h-8 text-center font-serif text-lg font-bold text-[#5b3c1f]">
        {title}
      </h2>
      <div className="h-[calc(100%-4rem)] overflow-hidden">
        {verses.map((verse) => (
          <div key={`${verse.number}-${verse.text}`} className="mb-2 pr-7 text-[13px] leading-[1.65] text-[#3d3021] sm:text-sm">
            <p className="m-0 text-justify">
              {!verse.continuation && <sup className="mr-1 font-serif text-[10px] font-bold text-amber-800/70">{verse.number}</sup>}
              {verse.text}
            </p>
          </div>
        ))}
      </div>
      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 font-serif text-xs text-[#8f704a]/70">
        {pageNumber}
      </span>
    </article>
  );

  const measurementVerses = activeChapter?.verses ?? [];

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
        <ChristianCrossIcon className="text-amber-300" size={30} />
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

  const firstVisibleVerse = visibleVerses[0]?.number ?? 1;
  const lastVisibleVerse = visibleVerses.at(-1)?.number ?? firstVisibleVerse;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-3 pb-5 pt-3 text-white sm:gap-4 sm:px-6">
      <header className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-black/25 p-3 shadow-xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300">
            <ChristianCrossIcon size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-wide">Holy Bible</h1>
            <p className="text-xs text-white/60">King James Version · leitura interativa em inglês</p>
          </div>
        </div>

        {isBookOpen && <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="bible-book">Livro</label>
          <select
            id="bible-book"
            value={bookIndex}
            onChange={(event) => changePosition(Number(event.target.value), 1, 0, false)}
            className="min-w-32 rounded-xl border border-white/15 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-300"
          >
            {books.map((book, index) => <option key={book.name} value={index}>{book.name}</option>)}
          </select>
          <label className="sr-only" htmlFor="bible-chapter">Capítulo</label>
          <select
            id="bible-chapter"
            value={chapterNumber}
            onChange={(event) => changePosition(bookIndex, Number(event.target.value), 0, false)}
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
          <button
            type="button"
            onClick={() => setIsBookOpen(false)}
            aria-label="Fechar livro"
            title="Fechar livro"
            className="rounded-xl border border-white/15 bg-white/5 p-2.5 text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>}
      </header>

      {!isBookOpen ? (
        <section
          className="relative isolate mx-auto w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-amber-100/20 bg-gradient-to-br from-[#3a2919] to-[#17100a] p-2 shadow-[0_30px_80px_rgba(0,0,0,0.55)] sm:p-3"
          style={{ height: 'clamp(28rem, 68dvh, 42rem)', perspective: 1800 }}
          aria-label="Bíblia fechada"
        >
          <div
            ref={openingSpreadRef}
            aria-hidden="true"
            className="absolute inset-2 grid grid-cols-2 overflow-hidden rounded-[1rem] bg-[#f7efd9] shadow-[inset_0_0_34px_rgba(90,60,30,0.2)] opacity-0 sm:inset-3 sm:rounded-[1.25rem]"
            style={{ visibility: 'hidden' }}
          >
            {[activeChapter.verses.slice(0, Math.ceil(activeChapter.verses.length / 2)), activeChapter.verses.slice(Math.ceil(activeChapter.verses.length / 2), Math.ceil(activeChapter.verses.length / 2) + 10)].map((verses, page) => (
              <article
                key={page}
                className={`min-w-0 overflow-hidden px-3 py-5 text-[#3d3021] sm:px-7 sm:py-8 ${
                  page === 0 ? 'border-r border-[#8f704a]/25' : 'border-l border-white/50'
                }`}
              >
                <h2 className="mb-4 text-center font-serif text-sm font-bold text-[#5b3c1f] sm:text-lg">
                  {activeBook.name}{page === 0 ? '' : ` ${chapterNumber}`}
                </h2>
                <div className="space-y-2 font-serif text-[10px] leading-relaxed sm:text-xs">
                  {verses.map((verse) => (
                    <p key={verse.number} className="m-0 text-justify">
                      <sup className="mr-1 font-bold text-amber-800/70">{verse.number}</sup>
                      {verse.text}
                    </p>
                  ))}
                </div>
                <span className="mt-4 block text-center font-serif text-[10px] text-[#8f704a]/70">
                  {verses[0]?.number ?? 1}
                </span>
              </article>
            ))}
          </div>
          <div
            ref={openingShadowRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-3 left-1/2 z-10 w-16 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#321e0c]/40 to-transparent opacity-0 sm:inset-y-4 sm:w-24"
          />
          <button
            ref={openingCoverRef}
            type="button"
            onClick={() => setIsOpeningBook(true)}
            disabled={isOpeningBook}
            aria-label="Abrir a Bíblia"
            className="group absolute inset-y-2 left-[7%] z-20 w-[86%] overflow-visible rounded-[1.35rem] border border-[#b99a5c]/65 p-0 text-[#d7bd82] shadow-[0_26px_48px_rgba(0,0,0,0.55),inset_8px_0_12px_rgba(255,255,255,0.035),inset_-8px_0_16px_rgba(0,0,0,0.75)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300 disabled:cursor-wait md:left-1/4 md:w-1/2 sm:inset-y-3"
            style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
          >
            <span
              className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-[1.3rem] bg-[radial-gradient(ellipse_at_50%_38%,#24211d_0%,#11100f_58%,#080808_100%)] px-5 py-8 transition-[border-color,box-shadow] duration-300 group-hover:border-[#d3b873] group-hover:shadow-[inset_8px_0_12px_rgba(255,255,255,0.04),inset_-8px_0_16px_rgba(0,0,0,0.75)] sm:px-8 sm:py-10"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <span aria-hidden="true" className="pointer-events-none absolute inset-3 rounded-[1rem] border border-[#c6a75f]/45" />
              <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-[#9d824b]/60 via-[#342c1d] to-transparent" />
              <span aria-hidden="true" className="pointer-events-none absolute inset-y-5 left-4 w-px bg-[#d0b36e]/20" />
              <span className="mb-5 text-[9px] font-semibold tracking-[0.35em] text-[#c8ae72]/75 sm:mb-7 sm:text-[10px]">THE HOLY SCRIPTURES</span>
              <ChristianCrossIcon size={56} className="mb-5 text-[#ddc581] drop-shadow-[0_2px_8px_rgba(214,184,111,0.28)] transition-transform duration-300 group-hover:scale-105 sm:mb-7 sm:h-16 sm:w-16" />
              <span className="font-serif text-2xl font-semibold tracking-[0.24em] sm:text-3xl">HOLY</span>
              <span className="mt-1 font-serif text-2xl font-semibold tracking-[0.24em] sm:text-3xl">BIBLE</span>
              <span className="mt-4 text-[9px] tracking-[0.3em] text-[#c8ae72]/70 sm:mt-5 sm:text-[10px]">KING JAMES VERSION</span>
              <span aria-hidden="true" className="mt-6 h-px w-20 bg-gradient-to-r from-transparent via-[#c6a75f]/70 to-transparent sm:mt-8" />
              <span className="mt-4 text-xs font-medium tracking-wide text-[#eee1bd]/75 transition-colors group-hover:text-[#fff5d8] sm:mt-5">Toque para abrir</span>
            </span>
            <span
              aria-hidden="true"
              className="absolute inset-0 grid place-items-center overflow-hidden rounded-[1.3rem] border border-[#d6c18e]/60 bg-[linear-gradient(100deg,#e7d9b8_0%,#faf2dc_48%,#ddcba2_100%)] text-[#8f704a]"
              style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
            >
              <span className="absolute inset-3 rounded-[1rem] border border-[#9b7a46]/25" />
              <span className="flex flex-col items-center font-serif">
                <ChristianCrossIcon size={36} className="text-[#9b7a46]/55" />
                <span className="mt-3 text-[9px] tracking-[0.35em] text-[#8f704a]/70">THE HOLY SCRIPTURES</span>
              </span>
              <span className="absolute inset-y-0 right-0 w-3 bg-gradient-to-l from-[#8f704a]/20 to-transparent" />
            </span>
          </button>
        </section>
      ) : (
        <>
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 items-center gap-2 text-sm text-white/75">
          <BookOpen size={16} className="shrink-0 text-amber-300" />
          <span className="truncate">{activeBook.name} {chapterNumber}</span>
          <span className="shrink-0 text-white/40">·</span>
          <span className="shrink-0">Pág. {pageIndex + 1} de {pageVerses.length || '…'}</span>
        </div>
        <p className="hidden text-right text-xs text-white/45 sm:block">Clique numa palavra para traduzir e ouvir a pronúncia.</p>
      </div>

      <div
        ref={markerToolbarRef}
        role="group"
        aria-label="Ferramentas de marcação"
        className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5 shadow-lg"
      >
        <Highlighter size={17} className="mr-1 text-amber-200" aria-hidden="true" />
        <span className="mr-1 text-xs font-medium text-white/75">Marca-texto</span>
        {HIGHLIGHT_COLORS.map((color) => (
          <button
            key={color.name}
            type="button"
            onClick={() => setHighlightColor(color.value)}
            aria-label={`Selecionar marca-texto ${color.name.toLowerCase()}`}
            aria-pressed={highlightColor === color.value}
            title={color.name}
            className={`h-7 w-7 rounded-full border-2 transition hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 ${
              highlightColor === color.value ? 'border-white ring-2 ring-white/25' : 'border-white/25'
            }`}
            style={{ backgroundColor: color.value }}
          />
        ))}
        <span className="ml-1 text-xs text-white/50">Escolha uma cor e toque no versículo. Use <NotebookPen size={13} className="inline align-[-2px]" /> para anotar.</span>
        {annotationError && <p role="alert" className="w-full text-xs text-rose-200">{annotationError}</p>}
      </div>

      <section
        ref={readerRef}
        className="relative isolate overflow-hidden rounded-[1.25rem] border border-amber-100/20 bg-gradient-to-br from-[#3a2919] to-[#17100a] p-2 shadow-[0_24px_70px_rgba(0,0,0,0.5)] sm:rounded-[1.75rem] sm:p-3"
        style={{ height: 'clamp(28rem, 68dvh, 42rem)' }}
        aria-label="Livro aberto"
      >
        <div
          ref={pageFrameRef}
          className="relative h-full overflow-hidden rounded-[1rem] bg-[#f7efd9] shadow-inner md:rounded-[1.25rem]"
          style={{ perspective: 1800 }}
        >
          <div
            ref={measurementRef}
            aria-hidden="true"
            className="pointer-events-none invisible absolute left-[-200vw] top-0"
            style={{ width: measurementWidth || '100%' }}
          >
            {measurementVerses.map((verse) => (
              <div
                key={verse.number}
                data-measure-verse
                className="mb-2 pr-7 text-[13px] leading-[1.65] text-[#3d3021] sm:text-sm"
              >
                <p className="m-0 text-justify">
                  <sup className="mr-1 font-serif text-[10px] font-bold">{verse.number}</sup>
                  {verse.text.split(/(\s+)/).map((part, index) => (
                    <span data-measure-token key={index}>{part}</span>
                  ))}
                </p>
              </div>
            ))}
          </div>

          {pageVerses.length > 0 ? (
            <div className="absolute inset-0 grid h-full grid-cols-1 overflow-hidden bg-[#f7efd9] shadow-[inset_0_0_30px_rgba(90,60,30,0.12)] md:grid-cols-2">
                <article className={`${PAGE_CLASSES} md:border-r`} style={{ height: '100%' }}>
                  <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-5 bg-gradient-to-l from-[#725637]/10 to-transparent md:block" />
                  <h2 className="mb-3 h-8 text-center font-serif text-lg font-bold text-[#5b3c1f]">
                    {activeBook.name} {chapterNumber}
                  </h2>
                  <div className="h-[calc(100%-4rem)] overflow-hidden">{renderVerses(leftPage)}</div>
                  <span className="absolute bottom-2 left-1/2 -translate-x-1/2 font-serif text-xs text-[#8f704a]/70">
                    {leftPage[0]?.number ?? firstVerseIndex}
                  </span>
                </article>

                {geometry.columns === 2 && (
                  <article className={`${PAGE_CLASSES} md:border-l-0`} style={{ height: '100%' }}>
                    <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-5 bg-gradient-to-r from-[#725637]/10 to-transparent md:block" />
                    <h2 className="mb-3 h-8 text-center font-serif text-lg font-bold text-[#5b3c1f]">
                      {activeBook.name}
                    </h2>
                    <div className="h-[calc(100%-4rem)] overflow-hidden">{renderVerses(rightPage)}</div>
                    <span className="absolute bottom-2 left-1/2 -translate-x-1/2 font-serif text-xs text-[#8f704a]/70">
                      {rightPage[0]?.number ?? lastVerseIndex}
                    </span>
                  </article>
                )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-[#725637]">
              <LoaderCircle className="animate-spin" size={18} />
              Preparando páginas...
            </div>
          )}

          {pageTurn && (
            <>
              <div
                ref={pageTurnShadowRef}
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-1/2 z-[5] hidden w-16 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#321e0c]/30 to-transparent md:block"
              />
              <div
                ref={pageTurnSheetRef}
                aria-hidden="true"
                className={`pointer-events-none absolute inset-y-0 z-10 w-full md:w-1/2 ${
                  pageTurn.direction > 0 ? 'right-0' : 'left-0'
                }`}
                style={{
                  transformOrigin: pageTurn.direction > 0 ? 'left center' : 'right center',
                  transformStyle: 'preserve-3d',
                  willChange: 'transform',
                  filter: 'drop-shadow(0 8px 10px rgba(48, 30, 12, 0.26))',
                }}
              >
                <div
                  className="absolute inset-0 overflow-hidden rounded-[0.5rem] bg-[#f7efd9]"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  {renderPageFace(pageTurn.frontVerses, pageTurn.frontTitle, pageTurn.frontPageNumber)}
                  <div className={`pointer-events-none absolute inset-y-0 w-8 ${
                    pageTurn.direction > 0
                      ? 'left-0 bg-gradient-to-r from-[#725637]/20 via-[#725637]/5 to-transparent'
                      : 'right-0 bg-gradient-to-l from-[#725637]/20 via-[#725637]/5 to-transparent'
                  }`} />
                </div>
                <div
                  className="absolute inset-0 overflow-hidden rounded-[0.5rem] bg-[#f7efd9]"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  {renderPageFace(pageTurn.backVerses, pageTurn.backTitle, pageTurn.backPageNumber)}
                  <div className={`pointer-events-none absolute inset-y-0 w-8 ${
                    pageTurn.direction > 0
                      ? 'right-0 bg-gradient-to-l from-[#725637]/20 via-[#725637]/5 to-transparent'
                      : 'left-0 bg-gradient-to-r from-[#725637]/20 via-[#725637]/5 to-transparent'
                  }`} />
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <nav className="flex items-center justify-between gap-2" aria-label="Navegação da Bíblia">
        <button
          type="button"
          disabled={isAtStart}
          onClick={() => turnPage(-1)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35 sm:gap-2 sm:px-4"
        >
          <ChevronLeft size={18} /> Anterior
        </button>
        <span className="min-w-0 truncate text-center text-xs text-white/60">
          {activeBook.name} {chapterNumber} · {firstVisibleVerse}–{lastVisibleVerse}
        </span>
        <button
          type="button"
          disabled={isAtEnd}
          onClick={() => turnPage(1)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-3 py-2.5 text-sm font-bold text-neutral-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-35 sm:gap-2 sm:px-4"
        >
          Próxima <ChevronRight size={18} />
        </button>
      </nav>

      {(translationPopup || copiedVerse !== null || copyError || soundError) && (
        createPortal(
          <div
            role="status"
            className={`fixed z-[100] max-h-[35dvh] w-[min(17.5rem,calc(100vw-1.5rem))] overflow-auto rounded-2xl border border-amber-200/30 bg-[#24190f]/95 p-3 text-sm text-amber-50 shadow-2xl backdrop-blur-xl ${
              translationPopup ? '' : 'bottom-4 left-1/2 -translate-x-1/2'
            }`}
            style={translationPopup ? { left: translationPopup.left, top: translationPopup.top } : undefined}
          >
            {translationPopup ? (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-amber-200">{translationPopup.word}</p>
                  {translationPopup.loading && <p className="mt-1 text-white/70">Traduzindo...</p>}
                  {translationPopup.text && <p className="mt-1">{translationPopup.text}</p>}
                  {translationPopup.error && <p className="mt-1 text-rose-200">{translationPopup.error}</p>}
                </div>
                <button
                  type="button"
                  onClick={clearTranslation}
                  aria-label="Fechar tradução"
                  className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
            ) : copiedVerse !== null ? (
              <p>Versículo copiado.</p>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <span>{copyError || soundError}</span>
                <button
                  type="button"
                  onClick={() => {
                    setCopyError('');
                    setSoundError('');
                  }}
                  aria-label="Fechar aviso"
                  className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>,
          document.body,
        )
      )}
      {editingNote && createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Fechar edição da nota"
            onClick={() => setEditingNote(null)}
            className="absolute inset-0 h-full w-full cursor-default"
          />
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="bible-note-title"
            onSubmit={(event) => {
              event.preventDefault();
              updateAnnotation(editingNote.reference, { note: editingNote.text.trim() });
              setEditingNote(null);
            }}
            className="relative z-10 w-full max-w-lg rounded-3xl border border-amber-200/20 bg-[#24190f] p-5 text-amber-50 shadow-2xl sm:p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="bible-note-title" className="font-serif text-xl font-bold text-amber-100">Minha anotação</h2>
                <p className="mt-1 text-sm text-white/60">{editingNote.reference}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingNote(null)}
                aria-label="Fechar"
                className="rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <label htmlFor="bible-note" className="sr-only">Texto da anotação</label>
            <textarea
              id="bible-note"
              autoFocus
              value={editingNote.text}
              onChange={(event) => setEditingNote((current) => current
                ? { ...current, text: event.target.value }
                : current)}
              placeholder="Escreva sua reflexão sobre este versículo..."
              rows={5}
              className="w-full resize-y rounded-2xl border border-white/15 bg-black/25 p-3 text-sm leading-relaxed text-white outline-none placeholder:text-white/35 focus:border-amber-300/70"
            />
            <div className="mt-4 flex flex-wrap justify-between gap-2">
              {annotations[editingNote.reference]?.note && (
                <button
                  type="button"
                  onClick={() => {
                    updateAnnotation(editingNote.reference, { note: '' });
                    setEditingNote(null);
                  }}
                  className="rounded-xl px-3 py-2 text-sm text-rose-200 transition hover:bg-rose-400/10"
                >
                  Apagar nota
                </button>
              )}
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingNote(null)}
                  className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/75 transition hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-neutral-950 transition hover:bg-amber-300"
                >
                  Salvar nota
                </button>
              </div>
            </div>
          </form>
        </div>,
        document.body,
      )}
        </>
      )}

      <footer className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 text-center text-xs leading-relaxed text-white/55">
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
