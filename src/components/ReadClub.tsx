import React, { useState, useEffect, useRef } from 'react';
import { StoryItem, ReadSession, GlossaryEntry } from '../types';
import { US_LANDMARKS } from '../data';
import { Plus, Trash2, Edit, ChevronRight, ChevronLeft, ChevronDown, BookOpen, Volume2, HelpCircle, FileText, Settings, Compass, HelpCircle as KeyboardIcon, Search, Download, Trash, Maximize2, X, Clock, Play, Pause, Check, Languages, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translateText, lookupDictionary } from '../lib/translator';
import { BrazilianLogo } from './BrazilianLogo';

interface ReadClubProps {
  library: StoryItem[];
  onAddStory: (story: Omit<StoryItem, 'id'>) => void;
  onUpdateStory: (id: number, updated: Partial<StoryItem>) => void;
  onDeleteStory: (id: number) => void;
  sessions: ReadSession[];
  onSaveSession: (session: ReadSession) => void;
  onDeleteSession: (key: string) => void;
  glossary: Record<string, GlossaryEntry>;
  onAddGlossary: (word: string, translation: string, bookId: number | null, bookTitle: string) => void;
  onRemoveGlossary: (word: string) => void;
  onClearGlossary: () => void;
  learnedWords: Record<number, string[]>;
  onToggleLearnedWord: (bookId: number, word: string) => void;
  accentColor: string;
}

export const ReadClub: React.FC<ReadClubProps> = ({
  library,
  onAddStory,
  onUpdateStory,
  onDeleteStory,
  sessions,
  onSaveSession,
  onDeleteSession,
  glossary,
  onAddGlossary,
  onRemoveGlossary,
  onClearGlossary,
  learnedWords,
  onToggleLearnedWord,
  accentColor,
}) => {
  const [activeTab, setActiveTab] = useState<'story' | 'music'>('story');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [activeBook, setActiveBook] = useState<StoryItem | null>(null);
  const [activeSession, setActiveSession] = useState<ReadSession | null>(null);

  // Modal forms
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<StoryItem | null>(null);
  const [newSessionModalOpen, setNewSessionModalOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  // Reader Customization State
  const [readerTheme, setReaderTheme] = useState<'night' | 'sepia' | 'cream' | 'paper'>('night');
  const [fontSize, setFontSize] = useState(24);
  const [fontFamily, setFontFamily] = useState<'poppins' | 'lora' | 'crimson' | 'playfair' | 'space' | 'cursive' | 'mono'>('poppins');
  const [alignMode, setAlignMode] = useState<'center' | 'justify'>('center');
  const [showReaderSettings, setShowReaderSettings] = useState(false);

  // Background US Landmarks Wallpaper Rotation State
  const [bgIndex, setBgIndex] = useState(0);
  const [bgSlideshowActive, setBgSlideshowActive] = useState(true);

  // Automatic US Landmark Background Switcher (every 8 seconds)
  useEffect(() => {
    if (!bgSlideshowActive) return;
    const timer = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % US_LANDMARKS.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [bgSlideshowActive]);

  // Interactive Tools Toggles
  const [rulerActive, setRulerActive] = useState(false);
  const [rulerY, setRulerY] = useState(0);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isQsOpen, setIsQsOpen] = useState(false);

  // Q&A / Hints step
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [hintRevealed, setHintRevealed] = useState(false);

  // TTS Engine State
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [ttsRate, setTtsRate] = useState(1);
  const [ttsCurrentParagraph, setTtsCurrentParagraph] = useState<number | null>(null);
  const [selectedTranslateWord, setSelectedTranslateWord] = useState('');
  const [translationText, setTranslationText] = useState('');
  const [transCoords, setTransCoords] = useState({ x: 0, y: 0 });
  const transTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startTransTimer = (durationMs = 5000) => {
    if (transTimerRef.current) {
      clearTimeout(transTimerRef.current);
    }
    transTimerRef.current = setTimeout(() => {
      setSelectedTranslateWord('');
      setTranslationText('');
    }, durationMs);
  };

  const clearTransTimer = () => {
    if (transTimerRef.current) {
      clearTimeout(transTimerRef.current);
      transTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearTransTimer();
    };
  }, []);

  // Google Meet Presentation Mode State
  const [isMeetFullscreen, setIsMeetFullscreen] = useState(false);
  const [meetTime, setMeetTime] = useState(0);
  const [isMeetTimerRunning, setIsMeetTimerRunning] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isMeetTimerRunning) {
      interval = setInterval(() => {
        setMeetTime((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isMeetTimerRunning]);

  const formatMeetTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const [isFormattingText, setIsFormattingText] = useState(false);

  const handleAiFormatText = async (targetText: string, onSuccess: (formatted: string) => void) => {
    if (!targetText.trim()) return;
    setIsFormattingText(true);
    try {
      const res = await fetch('/api/format-paragraphs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: targetText, mode: activeTab === 'music' ? 'lyrics' : 'story' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.formattedText) {
          onSuccess(data.formattedText);
        }
      }
    } catch (err) {
      console.error('Failed to auto-format story text:', err);
    } finally {
      setIsFormattingText(false);
    }
  };

  const paperRef = useRef<HTMLDivElement>(null);
  const ttsParagraphsRef = useRef<string[]>([]);
  const ttsUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Group books by category
  const getGroupedBooks = () => {
    const filtered = library.filter((b) => {
      const typeMatch = b.type === activeTab;
      const q = searchQuery.toLowerCase();
      if (!typeMatch) return false;
      if (!q) return true;
      return (
        b.title.toLowerCase().includes(q) ||
        b.cat.toLowerCase().includes(q) ||
        b.text.toLowerCase().includes(q)
      );
    });

    const groups: Record<string, StoryItem[]> = {};
    filtered.forEach((b) => {
      const category = (b.cat || 'GERAL').toUpperCase();
      if (!groups[category]) groups[category] = [];
      groups[category].push(b);
    });

    return groups;
  };

  const groupedBooks = getGroupedBooks();

  const handleToggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // Starting a session
  const handleOpenNewSession = (book: StoryItem) => {
    setActiveBook(book);
    setNewSessionName('');
    setNewSessionModalOpen(true);
  };

  const handleStartSession = () => {
    if (!newSessionName.trim() || !activeBook) return;
    const key = `${activeBook.id}_${newSessionName.trim()}`;

    // Create session structure
    const newSession: ReadSession = {
      key,
      bookId: activeBook.id,
      className: newSessionName.trim(),
      notes: '',
      marks: {},
    };

    onSaveSession(newSession);
    setActiveSession(newSession);
    setNewSessionModalOpen(false);
    enterReadingMode(activeBook, newSession);
  };

  const rcChangeSize = (d: number) => {
    setFontSize((prev) => Math.max(12, Math.min(48, prev + d)));
  };

  const enterReadingMode = (book: StoryItem, session: ReadSession | null) => {
    setActiveBook(book);
    setActiveSession(session);
    setCurrentQIdx(0);
    setHintRevealed(false);
    setSelectedTranslateWord('');
    setTranslationText('');
    setTtsCurrentParagraph(null);
    setTtsPlaying(false);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  };

  const exitReadingMode = () => {
    if (activeSession) {
      onSaveSession(activeSession);
    }
    setActiveBook(null);
    setActiveSession(null);
    setTtsPlaying(false);
    setTtsCurrentParagraph(null);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  };

// Built-in English-Portuguese Dictionary for Instant Word Lookup
const COMMON_DICTIONARY: Record<string, string> = {
  the: 'o, a, os, as',
  a: 'um, uma',
  an: 'um, uma',
  and: 'e',
  or: 'ou',
  but: 'mas, porém',
  in: 'em, dentro de',
  on: 'em, sobre',
  at: 'em, no, na',
  to: 'para, a',
  for: 'para, por',
  with: 'com',
  without: 'sem',
  of: 'de',
  from: 'de, vindo de',
  by: 'por, perto de',
  is: 'é, está',
  are: 'são, estão',
  was: 'era, estava',
  were: 'eram, estavam',
  be: 'ser, estar',
  have: 'ter, possuir',
  has: 'tem, possui',
  had: 'tinha, teve',
  do: 'fazer',
  does: 'faz',
  did: 'fez',
  will: 'vai, irá',
  would: 'iria, gostaria',
  can: 'pode, conseguir',
  could: 'poderia, devia',
  should: 'deveria',
  must: 'deve, obrigatório',
  may: 'pode, talvez',
  might: 'poderia',
  this: 'este, esta, isto',
  that: 'aquele, aquela, isso',
  these: 'estes, estas',
  those: 'aqueles, aquelas',
  i: 'eu',
  you: 'você, vocês',
  he: 'ele',
  she: 'ela',
  it: 'ele, ela (coisa/animal)',
  we: 'nós',
  they: 'eles, elas',
  my: 'meu, minha',
  your: 'seu, sua',
  his: 'dele',
  her: 'dela',
  its: 'dele, dela',
  our: 'nosso, nossa',
  their: 'deles, delas',
  love: 'amor, amar',
  life: 'vida',
  time: 'tempo, hora',
  day: 'dia',
  night: 'noite',
  world: 'mundo',
  work: 'trabalhar, trabalho',
  people: 'pessoas',
  way: 'caminho, jeito',
  good: 'bom, boa',
  great: 'ótimo, grande',
  new: 'novo, nova',
  old: 'velho, antigo',
  first: 'primeiro',
  last: 'último',
  see: 'ver, enxergar',
  know: 'saber, conhecer',
  think: 'pensar, achar',
  make: 'fazer, criar',
  take: 'pegar, levar',
  come: 'vir, chegar',
  go: 'ir',
  give: 'dar, fornecer',
  find: 'encontrar, achar',
  tell: 'contar, dizer',
  say: 'dizer, falar',
  ask: 'perguntar, pedir',
  read: 'ler',
  write: 'escrever',
  listen: 'ouvir, escutar',
  speak: 'falar',
  learn: 'aprender',
  teach: 'ensinar',
  book: 'livro',
  story: 'história',
  song: 'música, canção',
  music: 'música',
  lyric: 'letra da música',
  lyrics: 'letras de música',
  hello: 'olá',
  hi: 'oi',
  yes: 'sim',
  no: 'não',
  please: 'por favor',
  thank: 'agradecer',
  thanks: 'obrigado(a)',
  friend: 'amigo, amiga',
  happy: 'feliz',
  beautiful: 'bonito, lindo',
};

// Word & Sentence interactions (Translating on click with instant pronunciation)
  const handleWordClick = async (e: React.MouseEvent, wordRaw: string) => {
    const wordClean = wordRaw.toLowerCase().replace(/[^a-zA-ZáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/g, '');
    if (!wordClean || !activeBook) return;

    if (e.shiftKey) {
      onToggleLearnedWord(activeBook.id, wordClean);
      return;
    }

    // Automatically speak word in English
    speakSelectedWord(wordClean);

    // Get exact viewport position for fixed tooltip
    const targetEl = e.currentTarget as HTMLElement;
    const rect = targetEl.getBoundingClientRect();
    setTransCoords({
      x: rect.left + rect.width / 2,
      y: rect.top - 12,
    });

    setSelectedTranslateWord(wordClean);
    setTranslationText('Traduzindo...');
    startTransTimer(5000);

    // Fast path 1: Built-in dictionary lookup
    const fastMatch = COMMON_DICTIONARY[wordClean] || lookupDictionary(wordClean);
    if (fastMatch) {
      setTranslationText(fastMatch);
      onAddGlossary(wordClean, fastMatch, activeBook.id, activeBook.title);
      return;
    }

    // Universal multi-tiered translate API (Gemini -> Google Translate -> Lingva -> MyMemory -> Dictionary)
    try {
      const translation = await translateText(wordClean);
      if (translation) {
        setTranslationText(translation);
        onAddGlossary(wordClean, translation, activeBook.id, activeBook.title);
        return;
      }
    } catch (err) {
      console.warn('Word translate error', err);
    }

    setTranslationText(fastMatch || wordClean);
  };

  // Translate full sentence or paragraph
  const handleTranslateSentence = async (e: React.MouseEvent, fullText: string) => {
    e.stopPropagation();
    if (!fullText || !activeBook) return;

    const targetEl = e.currentTarget as HTMLElement;
    const rect = targetEl.getBoundingClientRect();
    setTransCoords({
      x: rect.left + rect.width / 2,
      y: rect.top - 12,
    });

    const displayWord = fullText.length > 35 ? fullText.substring(0, 35) + '...' : fullText;
    setSelectedTranslateWord(`Frase: "${displayWord}"`);
    setTranslationText('Traduzindo frase completa...');
    startTransTimer(5000);

    try {
      const translation = await translateText(fullText);
      if (translation && translation.toLowerCase() !== fullText.toLowerCase()) {
        setTranslationText(translation);
        return;
      }
    } catch (e) {
      console.warn('Sentence translate error', e);
    }

    setTranslationText('Não foi possível obter a tradução desta frase.');
  };

  // Story CRUD Modals
  const [modalTextValue, setModalTextValue] = useState('');

  const handleOpenAddStory = () => {
    setEditingBook(null);
    setModalTextValue('');
    setEditorModalOpen(true);
  };

  const handleOpenEditStory = (book: StoryItem) => {
    setEditingBook(book);
    setModalTextValue(book.text || '');
    setEditorModalOpen(true);
  };

  const handleSaveBook = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const cat = (form.elements.namedItem('cat') as HTMLInputElement).value.toUpperCase() || 'GERAL';
    const title = (form.elements.namedItem('title') as HTMLInputElement).value;
    const level = (form.elements.namedItem('level') as HTMLSelectElement).value || 'B1';
    const coverUrl = (form.elements.namedItem('coverUrl') as HTMLInputElement)?.value || '';
    const text = (form.elements.namedItem('text') as HTMLTextAreaElement).value;
    const qs = (form.elements.namedItem('qs') as HTMLTextAreaElement).value;
    const hints = (form.elements.namedItem('hints') as HTMLTextAreaElement).value;

    if (!title || !text) return;

    if (editingBook) {
      onUpdateStory(editingBook.id, { cat, title, level, coverUrl, text, qs, hints });
    } else {
      onAddStory({ type: activeTab, cat, title, level, coverUrl, text, qs, hints });
    }

    setEditorModalOpen(false);
  };

  // TTS Reader logic
  const handlePlayTTS = () => {
    if (!activeBook) return;
    if (ttsPlaying) {
      window.speechSynthesis.cancel();
      setTtsPlaying(false);
      setTtsCurrentParagraph(null);
      return;
    }

    const paragraphs = activeBook.text.split(/\n\s*\n/).filter((p) => p.trim());
    ttsParagraphsRef.current = paragraphs;
    setTtsPlaying(true);
    playParagraph(0);
  };

  const playParagraph = (index: number) => {
    const paragraphs = ttsParagraphsRef.current;
    if (index >= paragraphs.length) {
      setTtsPlaying(false);
      setTtsCurrentParagraph(null);
      return;
    }

    setTtsCurrentParagraph(index);
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(paragraphs[index]);
    utter.lang = 'en-US';
    utter.rate = ttsRate;
    utter.onend = () => {
      if (ttsPlaying) {
        playParagraph(index + 1);
      }
    };
    utter.onerror = () => {
      setTtsPlaying(false);
      setTtsCurrentParagraph(null);
    };

    ttsUtteranceRef.current = utter;
    window.speechSynthesis.speak(utter);
  };

  const handleRateChange = (rate: number) => {
    setTtsRate(rate);
    if (ttsPlaying && ttsCurrentParagraph !== null) {
      playParagraph(ttsCurrentParagraph);
    }
  };

  // Keyboard shortcut bounds
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeBook) return;
      const targetTag = (e.target as HTMLElement).tagName.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') return;

      if (e.key === 'Escape') exitReadingMode();
      if (e.key === ' ') {
        e.preventDefault();
        handlePlayTTS();
      }
      if (e.key === 'n' || e.key === 'N') setIsNotesOpen(!isNotesOpen);
      if (e.key === 'q' || e.key === 'Q') setIsQsOpen(!isQsOpen);
      if (e.key === 'g' || e.key === 'G') setIsGlossaryOpen(!isGlossaryOpen);
      if (e.key === 'r' || e.key === 'R') setRulerActive(!rulerActive);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeBook, ttsPlaying, ttsCurrentParagraph, isNotesOpen, isQsOpen, isGlossaryOpen, rulerActive]);

  // Handle Reading focus ruler height
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (rulerActive) {
        setRulerY(e.clientY - 20);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [rulerActive]);

  // Glossary file download builders
  const handleExportGlossary = (format: 'csv' | 'txt') => {
    const entries = Object.values(glossary) as GlossaryEntry[];
    if (entries.length === 0) {
      alert('Seu glossário está vazio.');
      return;
    }

    let content = '';
    let type = '';
    let ext = '';

    if (format === 'csv') {
      content = 'Word,Translation,From Book,Date Added\n' + entries
        .map((e) => `"${e.word}","${e.translation}","${e.bookTitle}","${new Date(e.addedAt).toLocaleDateString()}"`)
        .join('\n');
      type = 'text/csv';
      ext = 'csv';
    } else {
      content = entries
        .map((e) => `${e.word} - ${e.translation} (Livro: ${e.bookTitle})`)
        .join('\n');
      type = 'text/plain';
      ext = 'txt';
    }

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `glossario-brazilian-in-action.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const speakSelectedWord = (word: string) => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(word);
      utter.lang = 'en-US';
      utter.rate = 0.85;
      window.speechSynthesis.speak(utter);
    }
  };

  // Reader Themes Styling Mapping
  const readerThemesStyles = {
    night: {
      bg: 'bg-neutral-950/70 border-white/15 backdrop-blur-md text-neutral-100 shadow-2xl',
      titleColor: 'text-amber-400',
      wordHover: 'hover:bg-amber-400/20 hover:text-amber-300',
      learned: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
    },
    sepia: {
      bg: 'bg-[#f4e4c1]/90 border-[#e1ceaa] text-[#3a2f1d] shadow-2xl backdrop-blur-md',
      titleColor: 'text-[#6b4a1f]',
      wordHover: 'hover:bg-[#6b4a1f]/10 hover:text-[#6b4a1f]',
      learned: 'bg-emerald-800/10 text-emerald-800 border border-emerald-800/20',
    },
    cream: {
      bg: 'bg-[#fcf9f2]/90 border-[#ebdcc1] text-[#2b2620] shadow-2xl backdrop-blur-md',
      titleColor: 'text-[#826136]',
      wordHover: 'hover:bg-[#826136]/10 hover:text-[#826136]',
      learned: 'bg-emerald-800/10 text-emerald-800 border border-emerald-800/20',
    },
    paper: {
      bg: 'bg-white/90 border-neutral-200 text-neutral-900 shadow-2xl backdrop-blur-md',
      titleColor: 'text-neutral-800',
      wordHover: 'hover:bg-neutral-100 hover:text-neutral-900',
      learned: 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20',
    },
  };

  const currentThemeStyle = readerThemesStyles[readerTheme];

  const questionList = activeBook?.qs ? activeBook.qs.split('\n').filter((q) => q.trim()) : [];
  const hintList = activeBook?.hints ? activeBook.hints.split('\n').filter((h) => h.trim()) : [];

  return (
    <div className="h-screen w-full flex overflow-hidden text-white">
      {/* 1. Left Sidebar: Library Selector */}
      {!activeBook && (
        <div className="w-full md:w-80 bg-neutral-950/70 border-r border-white/10 flex flex-col p-4 pt-16 md:pt-4 pl-24 sm:pl-28 md:pl-4 backdrop-blur-md h-full flex-shrink-0 z-20">
          <div className="text-center mb-4">
            <h3 className="text-xs font-light tracking-[0.25em] uppercase text-white/50">Biblioteca</h3>
          </div>

          <div className="flex bg-white/[0.03] p-1 rounded-lg border border-white/5 mb-4">
            <button
              onClick={() => setActiveTab('story')}
              className={`flex-1 py-1.5 rounded-md text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer ${
                activeTab === 'story' ? 'bg-white/10 text-white' : 'text-white/40'
              }`}
            >
              Histórias
            </button>
            <button
              onClick={() => setActiveTab('music')}
              className={`flex-1 py-1.5 rounded-md text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer ${
                activeTab === 'music' ? 'bg-white/10 text-white' : 'text-white/40'
              }`}
            >
              Músicas
            </button>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-2.5 text-white/30" size={14} />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-white/30 text-white"
            />
          </div>

          <button
            onClick={handleOpenAddStory}
            className="w-full py-2 bg-white/5 border border-dashed border-white/10 hover:border-white/30 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white/60 hover:text-white transition-all flex items-center justify-center gap-1.5 mb-4 cursor-pointer"
          >
            <Plus size={12} />
            <span>Adicionar Novo</span>
          </button>

          {/* Groupings display Accordion */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-2">
            {Object.keys(groupedBooks).length === 0 ? (
              <div className="text-center py-10 text-white/20 italic text-xs">Vazio</div>
            ) : (
              Object.keys(groupedBooks).map((category) => {
                const isExpanded = searchQuery.trim().length > 0 ? true : expandedCategories[category] === true;
                const categoryBooks = groupedBooks[category];

                return (
                  <div key={category} className="border-b border-white/5 pb-2">
                    <button
                      onClick={() => handleToggleCategory(category)}
                      className="w-full flex items-center justify-between py-2 text-left text-[10px] font-semibold tracking-wider text-white/40 uppercase cursor-pointer"
                    >
                      <span>{category}</span>
                      {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>

                    {isExpanded && (
                      <div className="pl-2 mt-1 flex flex-col gap-1">
                        {categoryBooks.map((b) => (
                          <div
                            key={b.id}
                            className="group flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.03] transition-all"
                          >
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="flex items-center justify-between w-full">
                                <button
                                  onClick={() => enterReadingMode(b, null)}
                                  className="text-left text-xs font-medium text-white/80 hover:text-white truncate block cursor-pointer flex-1"
                                >
                                  {b.title}
                                  {b.level && (
                                    <span className="ml-2 text-[9px] px-1 rounded bg-white/10 text-white/50 border border-white/5 font-bold">
                                      {b.level}
                                    </span>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTranslateSentence(e, b.title);
                                  }}
                                  className="p-1 rounded text-white/40 hover:text-amber-300 hover:bg-white/10 transition-all cursor-pointer opacity-0 group-hover:opacity-100 shrink-0"
                                  title="Traduzir título"
                                >
                                  <Languages size={11} />
                                </button>
                              </div>

                              {/* Sessions nested inside */}
                              <div className="mt-1 flex flex-col gap-0.5">
                                <button
                                  onClick={() => handleOpenNewSession(b)}
                                  className="text-[9px] text-amber-400 hover:text-amber-300 font-semibold uppercase tracking-wider cursor-pointer"
                                >
                                  + Sessão
                                </button>
                                {sessions
                                  .filter((s) => s.bookId === b.id)
                                  .map((s) => (
                                    <div
                                      key={s.key}
                                      className="flex justify-between items-center text-[9px] text-white/40 hover:text-white/80 pl-2 mt-0.5 border-l border-white/10 group/sess"
                                    >
                                      <button
                                        onClick={() => enterReadingMode(b, s)}
                                        className="text-left truncate cursor-pointer flex-1"
                                      >
                                        • {s.className}
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (window.confirm('Excluir esta sessão?')) {
                                            onDeleteSession(s.key);
                                          }
                                        }}
                                        className="opacity-0 group-hover/sess:opacity-100 text-red-400 hover:text-red-300 transition-all cursor-pointer"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button
                                onClick={() => handleOpenEditStory(b)}
                                className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 cursor-pointer"
                                title="Editar"
                              >
                                <Edit size={10} />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm('Deseja excluir este item?')) {
                                    onDeleteStory(b.id);
                                  }
                                }}
                                className="p-1 rounded text-red-400/50 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                                title="Excluir"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 2. Right Workspace (Reading Room Stage) */}
      <div className="flex-1 flex flex-col relative h-full overflow-hidden">
        {activeBook ? (
          <div className="flex-1 flex flex-col h-full relative overflow-hidden">
            {/* Floating Topbar inside reader (No solid background bar, floating pills like Lousa de Horarios) */}
            <div className="px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 z-30 flex-shrink-0 pl-24 sm:pl-28 md:pl-6 pointer-events-auto">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
                <button
                  type="button"
                  onClick={exitReadingMode}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-full text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/30 uppercase tracking-wider shrink-0"
                  title="Concluir leitura e voltar para a biblioteca"
                >
                  <Check size={14} />
                  <span>Done</span>
                </button>
                <div className="flex items-center gap-1.5 max-w-[160px] sm:max-w-sm bg-neutral-950/80 p-1 px-3 rounded-full border border-white/15 backdrop-blur-md shadow-md">
                  <h4 className="text-xs font-semibold uppercase tracking-widest text-amber-400 truncate">
                    {activeBook.title}
                  </h4>
                  <button
                    type="button"
                    onClick={(e) => handleTranslateSentence(e, activeBook.title)}
                    className="p-1 rounded-full hover:bg-white/10 text-white/40 hover:text-amber-300 transition-all cursor-pointer shrink-0"
                    title="Traduzir título da história/música"
                  >
                    <Languages size={12} />
                  </button>
                </div>
                {activeSession && (
                  <span className="text-[10px] bg-neutral-950/80 border border-white/15 text-white/60 px-2.5 py-1 rounded-full uppercase font-mono hidden md:inline backdrop-blur-md">
                    Sessão: {activeSession.className}
                  </span>
                )}
              </div>

              {/* Toolbar Actions - Floating Pills */}
              <div className="flex items-center gap-1.5 flex-wrap relative">
                <button
                  onClick={handlePlayTTS}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md shadow-md ${
                    ttsPlaying
                      ? 'bg-amber-500 text-black shadow-amber-500/25'
                      : 'bg-neutral-950/80 border border-white/15 text-white/80 hover:text-white'
                  }`}
                >
                  <Volume2 size={13} />
                  <span>{ttsPlaying ? 'Parar' : 'Ouvir'}</span>
                </button>

                {ttsPlaying && (
                  <select
                    value={ttsRate}
                    onChange={(e) => handleRateChange(parseFloat(e.target.value))}
                    className="bg-neutral-950/80 border border-white/15 rounded-full px-2 py-1 text-xs text-white backdrop-blur-md"
                  >
                    <option value="0.8">0.8x</option>
                    <option value="1">1.0x</option>
                    <option value="1.25">1.25x</option>
                    <option value="1.5">1.5x</option>
                    <option value="2">2.0x</option>
                  </select>
                )}

                {/* Streamlined Appearance Dropdown Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowReaderSettings(!showReaderSettings)}
                    className="px-3 py-1.5 bg-neutral-950/80 hover:bg-neutral-900 border border-white/15 text-white/80 hover:text-white rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-md shadow-md"
                    title="Personalizar Fonte, Tema e Alinhamento"
                  >
                    <Settings size={13} />
                    <span className="hidden sm:inline">Aparência</span>
                  </button>

                  {/* Appearance Popover Menu */}
                  <AnimatePresence>
                    {showReaderSettings && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-11 w-64 bg-neutral-900/95 border border-white/15 rounded-2xl p-4 shadow-2xl backdrop-blur-2xl z-50 flex flex-col gap-3 text-xs"
                      >
                        <div className="flex justify-between items-center border-b border-white/10 pb-2">
                          <span className="font-bold uppercase tracking-wider text-white/60 text-[10px]">Aparência do Leitor</span>
                          <button
                            onClick={() => setShowReaderSettings(false)}
                            className="text-white/40 hover:text-white cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        {/* Font Family */}
                        <div>
                          <label className="text-[10px] text-white/50 block mb-1 uppercase font-semibold">Fonte</label>
                          <select
                            value={fontFamily}
                            onChange={(e) => setFontFamily(e.target.value as any)}
                            className="w-full bg-neutral-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white"
                          >
                            <option value="poppins">Poppins (Sans)</option>
                            <option value="lora">Lora (Serif)</option>
                            <option value="crimson">Crimson Pro (Clássica)</option>
                            <option value="playfair">Playfair (Display)</option>
                            <option value="space">Space Grotesk (Tech)</option>
                            <option value="cursive">Manuscrita (Script)</option>
                            <option value="mono">Monospace (Código)</option>
                          </select>
                        </div>

                        {/* Theme */}
                        <div>
                          <label className="text-[10px] text-white/50 block mb-1 uppercase font-semibold">Tema</label>
                          <select
                            value={readerTheme}
                            onChange={(e) => setReaderTheme(e.target.value as any)}
                            className="w-full bg-neutral-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white"
                          >
                            <option value="night">Vidro Escuro</option>
                            <option value="sepia">Sépia</option>
                            <option value="cream">Creme</option>
                            <option value="paper">Papel Claro</option>
                          </select>
                        </div>

                        {/* Alignment & Font Size */}
                        <div className="flex items-center justify-between pt-1">
                          <div>
                            <label className="text-[10px] text-white/50 block mb-1 uppercase font-semibold">Alinhamento</label>
                            <button
                              onClick={() => setAlignMode((prev) => (prev === 'center' ? 'justify' : 'center'))}
                              className="px-2.5 py-1 bg-neutral-950 border border-white/10 rounded-lg text-xs text-white/80 hover:text-white font-mono"
                            >
                              {alignMode === 'center' ? 'Centro' : 'Justificado'}
                            </button>
                          </div>

                          <div>
                            <label className="text-[10px] text-white/50 block mb-1 uppercase font-semibold">Tamanho</label>
                            <div className="flex bg-neutral-950 border border-white/10 rounded-lg p-0.5">
                              <button
                                onClick={() => rcChangeSize(-2)}
                                className="px-2 py-0.5 text-xs font-bold text-white/70 hover:text-white cursor-pointer"
                              >
                                A-
                              </button>
                              <button
                                onClick={() => rcChangeSize(2)}
                                className="px-2 py-0.5 text-xs font-bold text-white/70 hover:text-white cursor-pointer"
                              >
                                A+
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Stopwatch & Fullscreen Toggle */}
                <div className="flex items-center gap-1.5 bg-neutral-950/80 border border-white/15 px-3 py-1.5 rounded-full font-mono text-xs text-white backdrop-blur-md shadow-md">
                  <Clock size={12} className="text-white/40" />
                  <span>{formatMeetTime(meetTime)}</span>
                  <button
                    type="button"
                    onClick={() => setIsMeetTimerRunning(!isMeetTimerRunning)}
                    className="ml-0.5 p-0.5 hover:bg-white/10 rounded text-white/70 hover:text-white cursor-pointer"
                    title={isMeetTimerRunning ? "Pausar Cronômetro" : "Iniciar Cronômetro"}
                  >
                    {isMeetTimerRunning ? <Pause size={12} /> : <Play size={12} />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (document.fullscreenElement) {
                      document.exitFullscreen?.().catch(() => {});
                      setIsMeetFullscreen(false);
                    } else {
                      document.documentElement.requestFullscreen?.().catch(() => {});
                      setIsMeetFullscreen(true);
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all flex items-center gap-1.5 cursor-pointer shadow-md backdrop-blur-md border ${
                    isMeetFullscreen
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-950/30'
                      : 'bg-neutral-950/80 border-blue-500/30 hover:bg-neutral-900 text-blue-300 shadow-md'
                  }`}
                  title="Alternar Tela Cheia"
                >
                  <Maximize2 size={13} />
                  <span>Tela Cheia</span>
                </button>
              </div>
            </div>

            {/* Ambient Background Wallpaper */}
            <div 
              className="absolute inset-0 bg-cover bg-center filter blur-lg opacity-40 scale-105 pointer-events-none transition-all duration-1000 ease-in-out z-0"
              style={{
                backgroundImage: `url(${activeBook.coverUrl || US_LANDMARKS[bgIndex].url})`
              }}
            />

            {/* Centered glass sheet container (scrolls over ambient backdrop) */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-8 pb-28 flex justify-center relative z-10 custom-scrollbar">
              <div
                ref={paperRef}
                className={`w-full max-w-3xl h-fit rounded-3xl border shadow-[0_25px_60px_rgba(0,0,0,0.85)] p-8 sm:p-14 relative flex flex-col leading-relaxed backdrop-blur-2xl transition-all ${currentThemeStyle.bg}`}
                style={{
                  fontSize: `${fontSize}px`,
                  fontFamily:
                    fontFamily === 'lora'
                      ? "'Lora', Georgia, serif"
                      : fontFamily === 'crimson'
                      ? "'Crimson Pro', Georgia, serif"
                      : fontFamily === 'playfair'
                      ? "'Playfair Display', Georgia, serif"
                      : fontFamily === 'space'
                      ? "'Space Grotesk', sans-serif"
                      : fontFamily === 'cursive'
                      ? "'Caveat', cursive"
                      : fontFamily === 'mono'
                      ? "'JetBrains Mono', monospace"
                      : "'Poppins', sans-serif",
                }}
              >
                <div className="relative group/title flex flex-col items-center justify-center gap-2 mb-6 text-center">
                  <h1 className={`text-2xl sm:text-3xl font-extralight tracking-tight uppercase ${currentThemeStyle.titleColor} flex items-center justify-center flex-wrap gap-x-2 gap-y-1`}>
                    {activeBook.title.split(/(\s+)/).map((word, wIdx) => {
                      const cleanWord = word.toLowerCase().replace(/[^a-zA-ZáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/g, '');
                      if (!cleanWord) return <React.Fragment key={wIdx}>{word}</React.Fragment>;
                      return (
                        <span
                          key={wIdx}
                          onClick={(e) => handleWordClick(e, word)}
                          className="inline-block hover:bg-amber-400/20 hover:text-amber-300 rounded px-1 transition-all cursor-pointer"
                          title="Clique na palavra do título para tradução e pronúncia"
                        >
                          {word}
                        </span>
                      );
                    })}
                  </h1>
                  <button
                    type="button"
                    onClick={(e) => handleTranslateSentence(e, activeBook.title)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 hover:bg-amber-500/20 text-white/50 hover:text-amber-300 border border-white/10 hover:border-amber-500/30 text-xs font-medium transition-all cursor-pointer shadow-sm mt-1"
                    title="Traduzir título completo da história/música"
                  >
                    <Languages size={14} />
                    <span>Traduzir Título</span>
                  </button>
                </div>

                {/* Optional Story Cover Image / Illustration Banner */}
                {activeBook.coverUrl && (
                  <div className="mb-8 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative max-h-80 group">
                    <img
                      src={activeBook.coverUrl}
                      alt={activeBook.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                  </div>
                )}

                {/* Subtext mapping with customizable alignment */}
                <div className={`flex flex-col gap-2.5 sm:gap-3 text-justify ${alignMode === 'center' ? 'text-center' : 'text-justify'}`}>
                  {activeBook.text.split(/\n\s*\n/).filter((p) => p.trim()).map((para, pIdx) => {
                    const isTtsHighlight = ttsCurrentParagraph === pIdx;
                    const lines = para.split('\n').filter((l) => l.trim());

                    return (
                      <div
                        key={pIdx}
                        className={`group/para relative transition-all duration-300 p-1.5 sm:p-2 rounded-xl ${
                          isTtsHighlight ? 'bg-amber-400/20 shadow-lg' : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="leading-relaxed inline">
                          {lines.map((line, lIdx) => (
                            <React.Fragment key={lIdx}>
                              {lIdx > 0 && <br />}
                              {line.split(/(\s+)/).map((word, wIdx) => {
                                const cleanWord = word.toLowerCase().replace(/[^a-zA-ZáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/g, '');
                                const learnedList = learnedWords[activeBook.id] || [];
                                const isLearned = learnedList.includes(cleanWord);

                                if (!cleanWord) return <React.Fragment key={wIdx}>{word}</React.Fragment>;

                                return (
                                  <span
                                    key={wIdx}
                                    onClick={(e) => handleWordClick(e, word)}
                                    className={`inline-block mx-[1px] px-[2px] rounded cursor-pointer transition-all duration-150 ${
                                      isLearned ? currentThemeStyle.learned : currentThemeStyle.wordHover
                                    }`}
                                    title="Clique na palavra: Ver tradução e pronúncia"
                                  >
                                    {word}
                                  </span>
                                );
                              })}
                            </React.Fragment>
                          ))}
                        </div>

                        {/* Instant Paragraph Translation Trigger */}
                        <button
                          type="button"
                          onClick={(e) => handleTranslateSentence(e, para)}
                          className="ml-2 inline-flex items-center justify-center p-1.5 rounded-lg bg-white/5 hover:bg-amber-500/20 text-white/30 hover:text-amber-300 border border-white/10 hover:border-amber-500/30 transition-all cursor-pointer opacity-0 group-hover/para:opacity-100"
                          title="Traduzir parágrafo / estrofe"
                        >
                          <Languages size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Done Card */}
                <div className="mt-12 pt-8 border-t border-white/10 text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-2xl flex items-center justify-center shadow-lg">
                    <Check size={24} />
                  </div>
                  <h3 className="text-base font-bold text-white uppercase tracking-wider">
                    Concluiu a leitura deste texto?
                  </h3>
                  <button
                    type="button"
                    onClick={exitReadingMode}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-2xl text-xs uppercase tracking-widest transition-all cursor-pointer shadow-xl shadow-emerald-950/40 flex items-center gap-2"
                  >
                    <Check size={18} />
                    <span>Done - Concluir & Voltar ao Início</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Dynamic visual focusing ruler */}
            {rulerActive && (
              <div
                className="fixed left-0 right-0 h-10 pointer-events-none z-[1200] border-t border-b border-amber-500/25 bg-amber-500/5 mix-blend-screen"
                style={{ top: `${rulerY}px` }}
              />
            )}

            {/* Word Translator Popup Overlay (Auto-closes in 5 seconds) */}
            <AnimatePresence>
              {translationText && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 5 }}
                  className="fixed z-[200000] bg-neutral-950/95 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] border border-amber-500/50 backdrop-blur-2xl transition-all pointer-events-auto min-w-[190px] max-w-[320px] overflow-hidden flex flex-col gap-1.5"
                  style={{
                    left: `${Math.max(100, Math.min(window.innerWidth - 100, transCoords.x))}px`,
                    top: `${Math.max(80, transCoords.y)}px`,
                    transform: 'translate(-50%, -100%)',
                  }}
                  onMouseEnter={clearTransTimer}
                  onMouseLeave={() => startTransTimer(5000)}
                >
                  <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-amber-400 uppercase text-[11px] tracking-wider truncate">
                      <span>{selectedTranslateWord}</span>
                      <button
                        onClick={() => speakSelectedWord(selectedTranslateWord)}
                        className="p-1 text-white/60 hover:text-amber-300 transition-colors cursor-pointer"
                        title="Ouvir Pronúncia em Inglês"
                      >
                        <Volume2 size={13} />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-mono text-white/40 bg-white/5 px-1 py-0.5 rounded">5s</span>
                      <button
                        onClick={() => {
                          clearTransTimer();
                          setSelectedTranslateWord('');
                          setTranslationText('');
                        }}
                        className="p-1 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors cursor-pointer"
                        title="Fechar"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-emerald-300 leading-snug">
                    {translationText}
                  </div>

                  {/* 5-Second Animated Dismiss Bar */}
                  <div className="w-full bg-white/10 h-0.5 rounded-full overflow-hidden mt-1">
                    <motion.div
                      key={selectedTranslateWord + translationText}
                      initial={{ width: '100%' }}
                      animate={{ width: '0%' }}
                      transition={{ duration: 5, ease: 'linear' }}
                      className="h-full bg-amber-400"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Side Drawers implementation */}
            <AnimatePresence>
              {isNotesOpen && (
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  className="fixed right-0 top-0 h-full w-80 bg-neutral-950 border-l border-white/10 p-6 shadow-2xl z-[1500] flex flex-col justify-between"
                >
                  <div>
                    <h3 className="text-xs font-bold tracking-widest text-amber-400 uppercase mb-4">
                      Notas do Aluno
                    </h3>
                    <textarea
                      value={activeSession?.notes || ''}
                      onChange={(e) => {
                        if (activeSession) {
                          const updated = { ...activeSession, notes: e.target.value };
                          setActiveSession(updated);
                          onSaveSession(updated);
                        }
                      }}
                      placeholder="Anote dúvidas, correções ou tópicos pendentes aqui..."
                      className="w-full h-80 bg-white/5 border border-white/10 rounded-xl p-4 text-xs font-light leading-relaxed focus:outline-none focus:border-white/20 resize-none"
                    />
                  </div>
                  <button
                    onClick={() => setIsNotesOpen(false)}
                    className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-bold tracking-wider uppercase cursor-pointer"
                  >
                    Fechar
                  </button>
                </motion.div>
              )}

              {isQsOpen && (
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  className="fixed right-0 top-0 h-full w-80 bg-neutral-950 border-l border-white/10 p-6 shadow-2xl z-[1500] flex flex-col justify-between"
                >
                  <div className="flex-1 flex flex-col gap-4">
                    <h3 className="text-xs font-bold tracking-widest text-amber-400 uppercase">
                      Guia de Perguntas
                    </h3>

                    {questionList.length === 0 ? (
                      <p className="text-xs text-white/30 italic">Sem perguntas para este item.</p>
                    ) : (
                      <div className="flex-1 flex flex-col justify-between">
                        <div className="flex flex-col gap-4">
                          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                            <span className="text-[10px] font-bold text-amber-400/60 uppercase font-mono tracking-widest">
                              Question {currentQIdx + 1}
                            </span>
                            <p className="text-sm font-light mt-2 leading-relaxed text-white/95">
                              {questionList[currentQIdx]}
                            </p>
                          </div>

                          {hintList[currentQIdx] && (
                            <div className="flex flex-col gap-1.5">
                              <button
                                onClick={() => setHintRevealed(!hintRevealed)}
                                className="text-left text-[10px] font-bold tracking-wider uppercase text-amber-500 hover:text-amber-400 cursor-pointer"
                              >
                                {hintRevealed ? 'Ocultar Dica' : 'Exibir Dica'}
                              </button>
                              {hintRevealed && (
                                <p className="text-xs text-white/50 italic leading-relaxed bg-white/[0.01] p-3 rounded border border-white/5">
                                  {hintList[currentQIdx]}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Pagination steps */}
                        <div className="flex justify-between items-center bg-white/[0.02] p-2 rounded-xl">
                          <button
                            onClick={() => {
                              setCurrentQIdx((prev) => Math.max(0, prev - 1));
                              setHintRevealed(false);
                            }}
                            disabled={currentQIdx === 0}
                            className="px-3 py-1.5 rounded-lg text-xs bg-white/5 text-white disabled:opacity-30 cursor-pointer"
                          >
                            Prev
                          </button>
                          <span className="text-xs font-mono font-bold text-white/50">
                            {currentQIdx + 1} / {questionList.length}
                          </span>
                          <button
                            onClick={() => {
                              setCurrentQIdx((prev) => Math.min(questionList.length - 1, prev + 1));
                              setHintRevealed(false);
                            }}
                            disabled={currentQIdx === questionList.length - 1}
                            className="px-3 py-1.5 rounded-lg text-xs bg-white/5 text-white disabled:opacity-30 cursor-pointer"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setIsQsOpen(false)}
                    className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-bold tracking-wider uppercase mt-4 cursor-pointer"
                  >
                    Fechar
                  </button>
                </motion.div>
              )}

              {isGlossaryOpen && (
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  className="fixed right-0 top-0 h-full w-80 bg-neutral-950 border-l border-white/10 p-6 shadow-2xl z-[1500] flex flex-col justify-between"
                >
                  <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                    <h3 className="text-xs font-bold tracking-widest text-amber-400 uppercase">
                      Glossário de Aula ({Object.keys(glossary).length})
                    </h3>

                    {Object.keys(glossary).length === 0 ? (
                      <p className="text-xs text-white/20 italic text-center py-20">
                        O vocabulário traduzido ficará salvo aqui.
                      </p>
                    ) : (
                      <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
                        {(Object.values(glossary) as GlossaryEntry[]).map((g) => (
                          <div
                            key={g.word}
                            className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex flex-col gap-1 hover:border-white/10 transition-all"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-white">{g.word}</span>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => speakSelectedWord(g.word)}
                                  className="text-[10px] text-white/40 hover:text-white cursor-pointer"
                                  title="Pronunciar"
                                >
                                  
                                </button>
                                <button
                                  onClick={() => onRemoveGlossary(g.word)}
                                  className="text-xs text-red-400/60 hover:text-red-400 cursor-pointer"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                            {g.translation && (
                              <span className="text-xs text-amber-200/80 italic font-light">
                                — {g.translation}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions footer */}
                  <div className="flex flex-col gap-2 mt-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleExportGlossary('csv')}
                        className="flex-1 py-2 rounded-lg bg-white/5 text-[9px] font-bold uppercase tracking-wider text-white/70 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Download size={10} />
                        CSV
                      </button>
                      <button
                        onClick={() => handleExportGlossary('txt')}
                        className="flex-1 py-2 rounded-lg bg-white/5 text-[9px] font-bold uppercase tracking-wider text-white/70 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Download size={10} />
                        TXT
                      </button>
                    </div>
                    <button
                      onClick={onClearGlossary}
                      className="w-full py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Trash size={10} />
                      Limpar Tudo
                    </button>
                    <button
                      onClick={() => setIsGlossaryOpen(false)}
                      className="w-full py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold tracking-wider uppercase cursor-pointer"
                    >
                      Fechar
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* Landing presentation when no story selected */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none bg-radial from-neutral-900/40 via-transparent">
            <div className="mb-4 drop-shadow-2xl">
              <BrazilianLogo size="xl" />
            </div>
            <h2 className="text-sm font-semibold tracking-[0.25em] text-white/50 uppercase mt-2">
              READ CLUB
            </h2>
            <p className="text-xs text-white/40 mt-2 max-w-sm leading-relaxed">
              Desenvolva as habilidades de compreensão, leitura e vocabulário de seus alunos. Selecione uma história ou música na biblioteca ao lado para iniciar.
            </p>
          </div>
        )}
      </div>

      {/* Editor Modal for Story/Music creation & updates */}
      {editorModalOpen && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/85 backdrop-blur-md px-4">
          <form
            onSubmit={handleSaveBook}
            className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl flex flex-col gap-4"
          >
            <h3 className="text-sm font-bold tracking-widest uppercase text-center" style={{ color: accentColor }}>
              {editingBook ? 'Editar Material' : 'Adicionar Novo Material'}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-white/40 uppercase tracking-widest">
                  {activeTab === 'music' ? 'Cantor / Artista' : 'Categoria'}
                </label>
                <input
                  type="text"
                  name="cat"
                  defaultValue={editingBook?.cat || ''}
                  required
                  placeholder={activeTab === 'music' ? 'Coldplay' : 'Travel Stories'}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-white/30 text-white"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-white/40 uppercase tracking-widest">Título</label>
                <input
                  type="text"
                  name="title"
                  defaultValue={editingBook?.title || ''}
                  required
                  placeholder={activeTab === 'music' ? 'Yellow' : 'Trip to NYC'}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-white/30 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Nível</label>
                <select
                  name="level"
                  defaultValue={editingBook?.level || 'B1'}
                  className="bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="A1">A1 - Iniciante</option>
                  <option value="A2">A2 - Básico</option>
                  <option value="B1">B1 - Intermediário</option>
                  <option value="B2">B2 - Intermediário Superior</option>
                  <option value="C1">C1 - Avançado</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">URL Imagem da História (Opcional)</label>
                <input
                  type="text"
                  name="coverUrl"
                  defaultValue={editingBook?.coverUrl || ''}
                  placeholder="https://images.unsplash.com/..."
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-white/30 text-white"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Texto / Letra</label>
                <button
                  type="button"
                  onClick={() => handleAiFormatText(modalTextValue, (formatted) => setModalTextValue(formatted))}
                  disabled={isFormattingText || !modalTextValue.trim()}
                  className="px-2 py-0.5 rounded bg-purple-600/20 hover:bg-purple-600/35 text-purple-300 border border-purple-500/30 text-[10px] font-mono flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                  title="Separar texto em parágrafos de forma estruturada"
                >
                  {isFormattingText ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                  <span>Organizar em Parágrafos</span>
                </button>
              </div>
              <textarea
                name="text"
                value={modalTextValue}
                onChange={(e) => setModalTextValue(e.target.value)}
                required
                rows={6}
                placeholder="Insira o texto completo aqui..."
                className="bg-white/5 border border-white/10 rounded-lg p-3 text-xs focus:outline-none focus:border-white/30 text-white resize-none leading-relaxed font-sans"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-white/40 uppercase tracking-widest">Perguntas (Uma por linha)</label>
                <textarea
                  name="qs"
                  defaultValue={editingBook?.qs || ''}
                  rows={3}
                  placeholder="What is the story about?..."
                  className="bg-white/5 border border-white/10 rounded-lg p-3 text-xs focus:outline-none focus:border-white/30 text-white resize-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-white/40 uppercase tracking-widest">Dicas (Uma por linha)</label>
                <textarea
                  name="hints"
                  defaultValue={editingBook?.hints || ''}
                  rows={3}
                  placeholder="Look at the first paragraph..."
                  className="bg-white/5 border border-white/10 rounded-lg p-3 text-xs focus:outline-none focus:border-white/30 text-white resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => setEditorModalOpen(false)}
                className="flex-1 py-3 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-lg text-black text-xs font-bold uppercase tracking-wider cursor-pointer"
                style={{ backgroundColor: accentColor }}
              >
                Salvar Material
              </button>
            </div>
          </form>
        </div>
      )}

      {/* New Reading Session creation modal */}
      {newSessionModalOpen && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/85 backdrop-blur-md px-4">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-sm font-bold tracking-widest uppercase text-center mb-4" style={{ color: accentColor }}>
              Nova Sessão de Leitura
            </h3>
            <p className="text-xs text-white/50 text-center mb-6">
              Identifique o estudante ou a turma para carregar notas e marcações de palavras específicas:
            </p>
            <input
              type="text"
              placeholder="Nome do Aluno ou Turma"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white/30 mb-6"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setNewSessionModalOpen(false)}
                className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleStartSession}
                className="flex-1 py-2.5 rounded-lg text-black text-xs font-bold uppercase tracking-wider cursor-pointer"
                style={{ backgroundColor: accentColor }}
              >
                Iniciar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts informational overlay modal */}
      {shortcutsModalOpen && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <div className="bg-neutral-950 border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl flex flex-col gap-6">
            <h3 className="text-sm font-bold tracking-widest text-center uppercase" style={{ color: accentColor }}>
              Atalhos do Teclado - Read Club
            </h3>

            <div className="flex flex-col gap-3 font-sans">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-xs text-white/70">Aumentar/Diminuir Fonte</span>
                <span className="flex gap-1"><kbd className="bg-white/10 px-2 py-0.5 rounded text-[11px]">A+</kbd> <kbd className="bg-white/10 px-2 py-0.5 rounded text-[11px]">A-</kbd></span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-xs text-white/70">Ouvir / Pausar TTS</span>
                <kbd className="bg-white/10 px-2.5 py-0.5 rounded text-[11px] font-semibold">Espaço</kbd>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-xs text-white/70">Alternar Notas Rápidas</span>
                <kbd className="bg-white/10 px-2.5 py-0.5 rounded text-[11px] font-semibold">N</kbd>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-xs text-white/70">Alternar Questionários</span>
                <kbd className="bg-white/10 px-2.5 py-0.5 rounded text-[11px] font-semibold">Q</kbd>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-xs text-white/70">Abrir Glossário</span>
                <kbd className="bg-white/10 px-2.5 py-0.5 rounded text-[11px] font-semibold">G</kbd>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-xs text-white/70">Alternar Régua de Foco</span>
                <kbd className="bg-white/10 px-2.5 py-0.5 rounded text-[11px] font-semibold">R</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/70">Fechar Sala / Leitor</span>
                <kbd className="bg-white/10 px-2.5 py-0.5 rounded text-[11px] font-semibold">Esc</kbd>
              </div>
            </div>

            <button
              onClick={() => setShortcutsModalOpen(false)}
              className="w-full py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold tracking-wider uppercase cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}


    </div>
  );
};
