import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Youtube,
  ExternalLink,
  Play,
  Copy,
  Check,
  Maximize2,
  Plus,
  Trash2,
  Edit3,
  Search,
  Music,
  Volume2,
  X,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Save,
  Bookmark,
  Languages,
  Mic,
  List,
  Sparkles,
  Loader2,
  Eye,
  Columns,
  Maximize,
  Minimize2
} from 'lucide-react';
import { translateText, lookupPtToEnDictionary, lookupDictionary } from '../lib/translator';
import { listenToAuth, syncToCloud } from '../lib/cloudSync';
import { subscribeToUserDataFromCloud } from '../lib/firebase';
import { User } from 'firebase/auth';

interface YouTubeHubProps {
  accentColor?: string;
}

export interface YouTubeLibraryItem {
  id: string;
  title: string;
  artist?: string; // Cantor / Artista
  category: string; // 'Música' | 'Aulas' | 'Gramática' | 'Conversação' | 'Outros'
  description?: string;
  embedId: string; // YouTube video ID
  youtubeUrl: string;
  lyrics?: string;
  translatedLyrics?: string; // Letra traduzida (Inglês / Espanhol)
  notes?: string;
  createdAt?: string;
}

const DEFAULT_YOUTUBE_LIBRARY: YouTubeLibraryItem[] = [
  {
    id: 'yt-music-1',
    title: 'Garota de Ipanema',
    artist: 'Tom Jobim & Vinicius de Moraes',
    category: 'Música',
    description: 'Um clássico da Bossa Nova para praticar ritmo, entonação e vocabulário.',
    embedId: 'c5Q91s0336U',
    youtubeUrl: 'https://www.youtube.com/watch?v=c5Q91s0336U',
    lyrics: `Olha que coisa mais linda, mais cheia de graça
É ela, menina, que vem e que passa
Num doce balanço a caminho do mar

Moça do corpo dourado, do sol de Ipanema
O seu balançado é mais que um poema
É a coisa mais linda que eu já vi passar

Ah, por que estou tão sozinho?
Ah, por que tudo é tão triste?
Ah, a beleza que existe
A beleza que não é só minha
Que também passa sozinha

Ah, se ela soubesse que quando ela passa
O mundo inteirinho se enche de graça
E fica mais lindo por causa do amor`,
    translatedLyrics: `Look what a beautiful thing, so full of grace
It is she, the girl who comes and goes by
In a sweet swaying rhythm on her way to the sea

Girl with the golden body, from the sun of Ipanema
Her swaying walk is more than a poem
It is the most beautiful thing I have ever seen pass by

Ah, why am I so alone?
Ah, why is everything so sad?
Ah, the beauty that exists
The beauty that is not only mine
That also passes by alone

Ah, if she only knew that when she passes by
The whole entire world fills with grace
And becomes more beautiful because of love`,
    notes: 'Trabalhar entonação poética, encontros vocálicos e vocabulário carioca.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'yt-music-2',
    title: 'Como Nossos Pais',
    artist: 'Elis Regina',
    category: 'Música',
    description: 'Poesia marcante da MPB. Prática de tempos verbais e interpretação.',
    embedId: '0-X233E5318',
    youtubeUrl: 'https://www.youtube.com/watch?v=0-X233E5318',
    lyrics: `Não posso reter o tempo
Mas não quero parar no espaço
Minha dor é perceber que apesar de termos feito tudo o que fizemos
Ainda somos os mesmos e vivemos como nossos pais

Você me pergunta pela minha paixão
Digo que estou representando a minha circulação
E que esse sangue em minhas veias é o mesmo de 1968

Mas é você que ama o passado e que não vê
Que o novo sempre vem`,
    translatedLyrics: `I cannot hold back time
But I do not want to stop in space
My grief is realizing that despite having done all that we did
We are still the same and live like our parents

You ask me about my passion
I tell you that I am representing my own blood circulation
And that this blood in my veins is the same as in 1968

But it is you who loves the past and cannot see
That the new always arrives`,
    notes: 'Foco na interpretação de texto e uso de conectivos.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'yt-lesson-1',
    title: 'Aprenda Português do Brasil - Pronúncia e Conversação Nativa',
    category: 'Aulas',
    description: 'Vídeos práticos para desenvolver fluência no português brasileiro.',
    embedId: 'lS1j3Xg5z7U',
    youtubeUrl: 'https://www.youtube.com/watch?v=lS1j3Xg5z7U',
    lyrics: '',
    translatedLyrics: '',
    notes: 'Vídeo para treino de fonética e sons nasais.',
    createdAt: new Date().toISOString(),
  },
];

export const YouTubeHub: React.FC<YouTubeHubProps> = ({ accentColor = '#3b82f6' }) => {
  const channelUrl = 'https://www.youtube.com/@brazilianinaction';

  // Library & Cloud Sync State
  const [library, setLibrary] = useState<YouTubeLibraryItem[]>(DEFAULT_YOUTUBE_LIBRARY);
  const [cloudUser, setCloudUser] = useState<User | null>(null);

  // Active Selected Item State
  const [activeItem, setActiveItem] = useState<YouTubeLibraryItem>(DEFAULT_YOUTUBE_LIBRARY[0]);
  const [customVideoUrl, setCustomVideoUrl] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isFullscreenMeet, setIsFullscreenMeet] = useState(false);
  const [hideBanner, setHideBanner] = useState(false);

  // Library UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [groupByArtist, setGroupByArtist] = useState(true);
  const [expandedArtists, setExpandedArtists] = useState<Record<string, boolean>>({});
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<YouTubeLibraryItem | null>(null);

  // Item Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formArtist, setFormArtist] = useState('');
  const [formCategory, setFormCategory] = useState('Música');
  const [formUrl, setFormUrl] = useState('');
  const [formLyrics, setFormLyrics] = useState('');
  const [formTranslatedLyrics, setFormTranslatedLyrics] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Interactive Lyrics Reader State
  const [fontSize, setFontSize] = useState(22);
  const [fontFamily, setFontFamily] = useState<'sans' | 'serif'>('serif');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'justify'>('left');
  const [activeTab, setActiveTab] = useState<'lyrics' | 'notes'>('lyrics');
  const [editableLyrics, setEditableLyrics] = useState(activeItem.lyrics || '');
  const [editableTranslatedLyrics, setEditableTranslatedLyrics] = useState(activeItem.translatedLyrics || '');
  const [isEditingLyrics, setIsEditingLyrics] = useState(false);
  const [isFormattingLyrics, setIsFormattingLyrics] = useState(false);

  // Translation Mode State: 'original' (PT) | 'bilingual' (PT + EN) | 'english' (EN)
  const [translationMode, setTranslationMode] = useState<'original' | 'bilingual' | 'english'>('original');
  const [isTranslatingLyrics, setIsTranslatingLyrics] = useState(false);

  // Google Meet Presentation Mode Options
  const [meetViewMode, setMeetViewMode] = useState<'split' | 'lyrics_focus' | 'lyrics_only'>('split');
  const [meetFontSize, setMeetFontSize] = useState(32); // High default visibility for classrooms
  const [meetAlign, setMeetAlign] = useState<'left' | 'center'>('center');
  const [isMeetVideoMinimized, setIsMeetVideoMinimized] = useState(false);

  // Word Translation Tooltip State
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [wordTargetLang, setWordTargetLang] = useState<'pt' | 'en'>('pt');
  const [translationResult, setTranslationResult] = useState<string>('');
  const [wordTooltipCoords, setWordTooltipCoords] = useState<{ x: number; y: number } | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const wordTooltipTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-close tooltip after 5 seconds
  const startTooltipTimer = (durationMs = 5000) => {
    if (wordTooltipTimerRef.current) {
      clearTimeout(wordTooltipTimerRef.current);
    }
    wordTooltipTimerRef.current = setTimeout(() => {
      setSelectedWord(null);
      setWordTooltipCoords(null);
    }, durationMs);
  };

  const clearTooltipTimer = () => {
    if (wordTooltipTimerRef.current) {
      clearTimeout(wordTooltipTimerRef.current);
      wordTooltipTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearTooltipTimer();
    };
  }, []);

  // Helper to extract YouTube embed ID
  const extractEmbedId = (url: string): string => {
    let extracted = url.trim();
    if (!extracted) return '';
    if (extracted.includes('v=')) {
      extracted = extracted.split('v=')[1]?.split('&')[0] || extracted;
    } else if (extracted.includes('youtu.be/')) {
      extracted = extracted.split('youtu.be/')[1]?.split('?')[0] || extracted;
    } else if (extracted.includes('embed/')) {
      extracted = extracted.split('embed/')[1]?.split('?')[0] || extracted;
    }
    return extracted;
  };

  // Sync active item's lyrics when active item changes
  useEffect(() => {
    setEditableLyrics(activeItem.lyrics || '');
    setEditableTranslatedLyrics(activeItem.translatedLyrics || '');
    setIsEditingLyrics(false);
  }, [activeItem]);

  // Initial Load from LocalStorage & Cloud Sync
  useEffect(() => {
    const stored = localStorage.getItem('bia_youtube_library');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLibrary(parsed);
          setActiveItem(parsed[0]);
        }
      } catch (e) {
        console.error('Error loading local YouTube library:', e);
      }
    }

    const unsubAuth = listenToAuth((user) => {
      setCloudUser(user);
      if (!user) return;

      const unsubCloud = subscribeToUserDataFromCloud(
        user.uid,
        'bia_youtube_library',
        (data) => {
          if (data && Array.isArray(data) && data.length > 0) {
            setLibrary(data);
            localStorage.setItem('bia_youtube_library', JSON.stringify(data));
          }
        },
        () => {
          const storedLocal = localStorage.getItem('bia_youtube_library');
          const payload = storedLocal ? JSON.parse(storedLocal) : DEFAULT_YOUTUBE_LIBRARY;
          if (payload && payload.length > 0) {
            syncToCloud(user.uid, 'bia_youtube_library', payload);
          }
        }
      );
      return () => unsubCloud();
    });

    return () => unsubAuth();
  }, []);

  // Helper to update library state + persist
  const saveLibraryState = (updatedList: YouTubeLibraryItem[]) => {
    setLibrary(updatedList);
    localStorage.setItem('bia_youtube_library', JSON.stringify(updatedList));
    if (cloudUser) {
      syncToCloud(cloudUser.uid, 'bia_youtube_library', updatedList);
    }
  };

  const handleCopyChannelLink = () => {
    navigator.clipboard.writeText(channelUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleLoadCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customVideoUrl) return;

    const embedId = extractEmbedId(customVideoUrl);
    if (!embedId) return;

    const newItem: YouTubeLibraryItem = {
      id: 'yt-custom-' + Date.now(),
      title: `Vídeo do YouTube (${embedId})`,
      category: 'Outros',
      description: 'Vídeo carregado pelo professor.',
      embedId,
      youtubeUrl: customVideoUrl,
      lyrics: '',
      translatedLyrics: '',
      notes: '',
      createdAt: new Date().toISOString(),
    };

    const updated = [newItem, ...library];
    saveLibraryState(updated);
    setActiveItem(newItem);
    setCustomVideoUrl('');
  };

  // Open Modal for Create or Edit
  const handleOpenModal = (itemToEdit?: YouTubeLibraryItem) => {
    if (itemToEdit) {
      setEditingItem(itemToEdit);
      setFormTitle(itemToEdit.title);
      setFormArtist(itemToEdit.artist || '');
      setFormCategory(itemToEdit.category || 'Música');
      setFormUrl(itemToEdit.youtubeUrl || `https://www.youtube.com/watch?v=${itemToEdit.embedId}`);
      setFormLyrics(itemToEdit.lyrics || '');
      setFormTranslatedLyrics(itemToEdit.translatedLyrics || '');
      setFormNotes(itemToEdit.notes || '');
    } else {
      setEditingItem(null);
      setFormTitle('');
      setFormArtist('');
      setFormCategory('Música');
      setFormUrl('');
      setFormLyrics('');
      setFormTranslatedLyrics('');
      setFormNotes('');
    }
    setItemModalOpen(true);
  };

  const handleSaveItemModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formUrl) return;

    const embedId = extractEmbedId(formUrl);

    if (editingItem) {
      const updatedList = library.map((item) =>
        item.id === editingItem.id
          ? {
              ...item,
              title: formTitle,
              artist: formArtist,
              category: formCategory,
              embedId: embedId || item.embedId,
              youtubeUrl: formUrl,
              lyrics: formLyrics,
              translatedLyrics: formTranslatedLyrics,
              notes: formNotes,
            }
          : item
      );
      saveLibraryState(updatedList);
      if (activeItem.id === editingItem.id) {
        setActiveItem({
          ...activeItem,
          title: formTitle,
          artist: formArtist,
          category: formCategory,
          embedId: embedId || activeItem.embedId,
          youtubeUrl: formUrl,
          lyrics: formLyrics,
          translatedLyrics: formTranslatedLyrics,
          notes: formNotes,
        });
      }
    } else {
      const newItem: YouTubeLibraryItem = {
        id: 'yt-item-' + Date.now(),
        title: formTitle,
        artist: formArtist,
        category: formCategory,
        embedId: embedId || 'c5Q91s0336U',
        youtubeUrl: formUrl,
        lyrics: formLyrics,
        translatedLyrics: formTranslatedLyrics,
        notes: formNotes,
        createdAt: new Date().toISOString(),
      };
      const updatedList = [newItem, ...library];
      saveLibraryState(updatedList);
      setActiveItem(newItem);
    }

    setItemModalOpen(false);
  };

  const handleDeleteItem = (idToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Deseja remover este item da biblioteca?')) {
      const updated = library.filter((item) => item.id !== idToDelete);
      saveLibraryState(updated);
      if (activeItem.id === idToDelete && updated.length > 0) {
        setActiveItem(updated[0]);
      }
    }
  };

  // Save changes to current active item's lyrics
  const handleSaveActiveLyrics = () => {
    const updatedItem = {
      ...activeItem,
      lyrics: editableLyrics,
      translatedLyrics: editableTranslatedLyrics,
    };
    const updatedList = library.map((item) => (item.id === activeItem.id ? updatedItem : item));
    saveLibraryState(updatedList);
    setActiveItem(updatedItem);
    setIsEditingLyrics(false);
  };

  // AI Format Lyrics into Stanzas
  const handleAiFormatLyrics = async (targetText: string, onSuccess: (formatted: string) => void) => {
    if (!targetText.trim()) return;
    setIsFormattingLyrics(true);
    try {
      const res = await fetch('/api/format-paragraphs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: targetText, mode: 'lyrics' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.formattedText) {
          onSuccess(data.formattedText);
        }
      }
    } catch (err) {
      console.error('Failed to auto-format lyrics with AI:', err);
    } finally {
      setIsFormattingLyrics(false);
    }
  };

  // Translate entire lyrics (Supports translating to Portuguese or English)
  const handleAutoTranslateLyrics = async (targetLang: 'pt' | 'en' = 'en') => {
    if (!editableLyrics.trim()) return;
    setIsTranslatingLyrics(true);
    try {
      const trans = await translateText(editableLyrics, 'auto', targetLang);
      if (trans && trans.trim()) {
        setEditableTranslatedLyrics(trans.trim());
        const updatedItem = { ...activeItem, translatedLyrics: trans.trim() };
        setActiveItem(updatedItem);
        setLibrary((prev) => prev.map((it) => (it.id === updatedItem.id ? updatedItem : it)));
        saveLibraryState(library.map((it) => (it.id === updatedItem.id ? updatedItem : it)));
        setTranslationMode('bilingual');
      }
    } catch (err) {
      console.error('Error auto-translating full lyrics:', err);
    } finally {
      setIsTranslatingLyrics(false);
    }
  };

  // Interactive Word Translation Click Handler (Instant lookup into Portuguese 🇧🇷 or English 🇺🇸)
  const handleWordClick = async (e: React.MouseEvent, rawWord: string, overrideTargetLang?: 'pt' | 'en') => {
    e.stopPropagation();
    const sanitized = rawWord.replace(/[^a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]/g, '').trim();
    if (!sanitized) return;

    const currentTarget = overrideTargetLang || wordTargetLang;

    const rect = e.currentTarget.getBoundingClientRect();
    
    // Prevent tooltip from overflowing edges
    const tooltipWidth = 260;
    let targetX = rect.left + rect.width / 2 - tooltipWidth / 2;
    if (targetX < 12) targetX = 12;
    if (targetX + tooltipWidth > window.innerWidth - 12) {
      targetX = window.innerWidth - tooltipWidth - 12;
    }

    let targetY = rect.top - 130;
    if (targetY < 20) {
      targetY = rect.bottom + 12;
    }

    setWordTooltipCoords({ x: targetX, y: targetY });
    setSelectedWord(sanitized);
    setIsTranslating(true);
    startTooltipTimer(5000);

    try {
      const trans = await translateText(sanitized, 'auto', currentTarget);
      setTranslationResult(trans || 'Tradução não encontrada');
    } catch (err) {
      setTranslationResult('Tradução não disponível');
    } finally {
      setIsTranslating(false);
    }
  };

  // Text-To-Speech Pronunciation Audio
  const handleSpeakWord = (word: string, lang = 'pt-BR') => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = lang;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  // Filtered Library
  const filteredLibrary = library.filter((item) => {
    const matchesCategory = selectedCategory === 'Todas' || item.category === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      item.title.toLowerCase().includes(q) ||
      (item.artist && item.artist.toLowerCase().includes(q)) ||
      (item.lyrics && item.lyrics.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  // Group filtered library by artist/singer
  const groupedByArtist = useMemo(() => {
    const map: Record<string, YouTubeLibraryItem[]> = {};
    filteredLibrary.forEach((item) => {
      const artistKey = item.artist?.trim() ? item.artist.trim() : 'Outros / Sem Cantor';
      if (!map[artistKey]) {
        map[artistKey] = [];
      }
      map[artistKey].push(item);
    });
    return map;
  }, [filteredLibrary]);

  const toggleArtistExpansion = (artistKey: string) => {
    setExpandedArtists((prev) => ({
      ...prev,
      [artistKey]: prev[artistKey] === true ? false : true,
    }));
  };

  const categories = ['Todas', 'Música', 'Aulas', 'Gramática', 'Conversação', 'Outros'];
  const hasLyricsInActive = Boolean(editableLyrics && editableLyrics.trim().length > 0);

  // Helper to split lyrics and translation into matching stanzas & lines
  const parsedLyricsData = useMemo(() => {
    if (!editableLyrics) return [];
    const ptStanzas = editableLyrics.split(/\n\s*\n/);
    const enStanzas = editableTranslatedLyrics ? editableTranslatedLyrics.split(/\n\s*\n/) : [];

    return ptStanzas.map((stanza, sIdx) => {
      const ptLines = stanza.split('\n').filter((l) => l.trim().length > 0);
      const enLines = enStanzas[sIdx] ? enStanzas[sIdx].split('\n').filter((l) => l.trim().length > 0) : [];

      return {
        lines: ptLines.map((ptLine, lIdx) => ({
          pt: ptLine,
          en: enLines[lIdx] || '',
        })),
      };
    });
  }, [editableLyrics, editableTranslatedLyrics]);

  return (
    <div
      className="w-full max-w-7xl mx-auto px-3 sm:px-6 md:px-8 py-4 md:py-6 flex flex-col gap-6 select-none"
      onClick={() => setSelectedWord(null)}
    >
      {/* CHANNEL HERO BANNER */}
      <AnimatePresence>
        {!hideBanner && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl bg-neutral-900/80 border border-white/10 p-4 md:p-5 shadow-lg overflow-hidden backdrop-blur-md"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-600/90 text-white rounded-xl shrink-0 shadow-md">
                  <Youtube size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono font-medium text-red-400 uppercase tracking-wider">
                      Brazilian Music & Vídeos
                    </span>
                    <span className="text-[10px] font-mono text-white/40 hidden sm:inline">• @brazilianinaction</span>
                  </div>
                  <h1 className="text-lg md:text-xl font-bold text-white tracking-tight">
                    Brazilian Music • Player, Letras & Tradução Bilíngue
                  </h1>
                </div>
              </div>

              {/* Header Controls */}
              <div className="flex items-center gap-2">
                <a
                  href={channelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-red-600/90 hover:bg-red-500 text-white font-medium text-xs transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Youtube size={14} />
                  <span>Canal Oficial</span>
                  <ExternalLink size={12} />
                </a>

                <button
                  type="button"
                  onClick={handleCopyChannelLink}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-all"
                  title="Copiar Link do Canal"
                >
                  {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>

                <button
                  type="button"
                  onClick={() => setHideBanner(true)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/10 transition-all"
                  title="Compactar"
                >
                  <ChevronUp size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* COMPACT BANNER TOGGLE (WHEN HIDDEN) */}
      {hideBanner && (
        <div className="flex items-center justify-between bg-neutral-900/60 border border-white/10 rounded-xl px-4 py-2">
          <div className="flex items-center gap-2 text-xs text-white/70 font-mono">
            <Youtube size={15} className="text-red-500" />
            <span className="font-semibold text-white">Brazilian Music & Biblioteca</span>
          </div>
          <button
            type="button"
            onClick={() => setHideBanner(false)}
            className="text-xs text-white/50 hover:text-white font-mono flex items-center gap-1 cursor-pointer"
          >
            <span>Expandir</span>
            <ChevronDown size={13} />
          </button>
        </div>
      )}

      {/* MAIN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT / MAIN COLUMN: VIDEO PLAYER & LYRICS */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-5">
          {/* PLAYER CARD */}
          <div className="bg-neutral-900/80 border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2 py-0.5 rounded bg-white/10 text-white/70 border border-white/10 text-[10px] font-mono font-medium shrink-0">
                  {activeItem.category}
                </span>
                <h2 className="text-xs sm:text-sm font-semibold text-white truncate flex items-center gap-1.5">
                  <span>{activeItem.title}</span>
                  {activeItem.artist && (
                    <span className="text-amber-300 font-medium text-xs font-sans">
                      • {activeItem.artist}
                    </span>
                  )}
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsFullscreenMeet(true)}
                  className="px-3.5 py-1.5 rounded-full bg-neutral-950/80 hover:bg-neutral-900 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md backdrop-blur-md"
                  title="Abrir em Tela Cheia para Apresentação"
                >
                  <Maximize2 size={13} />
                  <span>Tela Cheia</span>
                </button>
              </div>
            </div>

            {/* YouTube Embed */}
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-white/10 shadow-inner">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${activeItem.embedId}?autoplay=0&rel=0&modestbranding=1`}
                title={activeItem.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            {/* URL Input & Discrete Add Lyrics Action */}
            <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <form onSubmit={handleLoadCustomUrl} className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={customVideoUrl}
                  onChange={(e) => setCustomVideoUrl(e.target.value)}
                  placeholder="Cole outro link do YouTube..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 font-mono"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Play size={12} />
                  <span>Carregar</span>
                </button>
              </form>

              {/* Discrete button to open/add lyrics if not editing */}
              {!isEditingLyrics && (
                <button
                  type="button"
                  onClick={() => setIsEditingLyrics(true)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {hasLyricsInActive ? <Edit3 size={13} /> : <Plus size={13} />}
                  <span>{hasLyricsInActive ? 'Editar Letra / Texto' : '+ Adicionar Letra'}</span>
                </button>
              )}
            </div>
          </div>

          {/* INTERACTIVE LYRICS & TRANSLATION SECTION */}
          {(hasLyricsInActive || isEditingLyrics) && (
            <div className="bg-neutral-900/80 border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4 backdrop-blur-md">
              {/* Header with Translation Modes & Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-3 gap-3">
                <div className="flex items-center gap-2">
                  <Music size={16} className="text-amber-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-white/90">
                    Letra & Tradução Interativa
                  </h3>
                </div>

                <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                  {/* Translation Mode Switcher */}
                  <div className="flex bg-black/50 p-0.5 rounded-xl border border-white/15 text-xs">
                    <button
                      type="button"
                      onClick={() => setTranslationMode('original')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                        translationMode === 'original'
                          ? 'bg-white/20 text-white font-semibold shadow-sm'
                          : 'text-white/50 hover:text-white'
                      }`}
                    >
                      Português (PT)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTranslationMode('bilingual');
                        if (!editableTranslatedLyrics) {
                          handleAutoTranslateLyrics();
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
                        translationMode === 'bilingual'
                          ? 'bg-amber-500 text-black font-bold shadow-sm'
                          : 'text-amber-400/70 hover:text-amber-300'
                      }`}
                    >
                      <Languages size={12} />
                      <span>Modo Bilíngue</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTranslationMode('english');
                        if (!editableTranslatedLyrics) {
                          handleAutoTranslateLyrics();
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                        translationMode === 'english'
                          ? 'bg-blue-600 text-white font-semibold shadow-sm'
                          : 'text-white/50 hover:text-white'
                      }`}
                    >
                      Inglês (EN)
                    </button>
                  </div>

                  {/* Font Size & Typography Controls */}
                  <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-lg border border-white/10 text-xs">
                    <button
                      type="button"
                      onClick={() => setFontSize((prev) => Math.max(16, prev - 2))}
                      className="text-white/60 hover:text-white px-1 font-bold text-xs cursor-pointer"
                      title="Diminuir fonte"
                    >
                      A-
                    </button>
                    <span className="text-[10px] font-mono text-amber-400 font-semibold">{fontSize}px</span>
                    <button
                      type="button"
                      onClick={() => setFontSize((prev) => Math.min(48, prev + 2))}
                      className="text-white/60 hover:text-white px-1 font-bold text-xs cursor-pointer"
                      title="Aumentar fonte"
                    >
                      A+
                    </button>
                  </div>

                  {/* Font Family Toggle */}
                  <button
                    type="button"
                    onClick={() => setFontFamily(fontFamily === 'serif' ? 'sans' : 'serif')}
                    className="px-2 py-1 rounded-lg bg-black/40 hover:bg-black/60 text-white/70 hover:text-white border border-white/10 text-[10px] font-mono cursor-pointer"
                    title="Alternar Fonte"
                  >
                    {fontFamily === 'serif' ? 'Serif' : 'Sans'}
                  </button>

                  {/* Alignment Toggle */}
                  <button
                    type="button"
                    onClick={() => setTextAlign(textAlign === 'left' ? 'center' : 'left')}
                    className="px-2 py-1 rounded-lg bg-black/40 hover:bg-black/60 text-white/70 hover:text-white border border-white/10 text-[10px] font-mono cursor-pointer"
                    title="Alinhamento do Texto"
                  >
                    {textAlign === 'left' ? 'Esquerda' : 'Centro'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsEditingLyrics(!isEditingLyrics)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-all cursor-pointer"
                    title={isEditingLyrics ? 'Fechar Edição' : 'Editar Letra'}
                  >
                    <Edit3 size={13} />
                  </button>
                </div>
              </div>

              {/* Edit Mode vs Read/Translation Mode */}
              {isEditingLyrics ? (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Portuguese Lyrics Input */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-amber-300 font-semibold font-mono">
                          Letra Original (Português):
                        </label>
                        <button
                          type="button"
                          onClick={() => handleAiFormatLyrics(editableLyrics, (f) => setEditableLyrics(f))}
                          disabled={isFormattingLyrics || !editableLyrics.trim()}
                          className="px-2 py-0.5 rounded bg-purple-600/20 hover:bg-purple-600/35 text-purple-300 border border-purple-500/30 text-[11px] font-medium flex items-center gap-1 cursor-pointer disabled:opacity-40"
                        >
                          {isFormattingLyrics ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                          <span>Organizar Estrofes</span>
                        </button>
                      </div>
                      <textarea
                        value={editableLyrics}
                        onChange={(e) => setEditableLyrics(e.target.value)}
                        rows={10}
                        placeholder="Cole a letra da música em português..."
                        className="w-full p-3.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 font-sans text-sm leading-relaxed"
                      />
                    </div>

                    {/* English Translation Input */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-blue-300 font-semibold font-mono">
                          Tradução da Letra (Inglês):
                        </label>
                        <button
                          type="button"
                          onClick={() => handleAutoTranslateLyrics('en')}
                          disabled={isTranslatingLyrics || !editableLyrics.trim()}
                          className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border border-amber-500/30 text-[11px] font-medium flex items-center gap-1 cursor-pointer disabled:opacity-40"
                        >
                          {isTranslatingLyrics ? <Loader2 size={11} className="animate-spin" /> : <Languages size={11} />}
                          <span>Traduzir com IA</span>
                        </button>
                      </div>
                      <textarea
                        value={editableTranslatedLyrics}
                        onChange={(e) => setEditableTranslatedLyrics(e.target.value)}
                        rows={10}
                        placeholder="Tradução em inglês (ou clique em 'Traduzir com IA' acima)..."
                        className="w-full p-3.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-white/20 focus:outline-none focus:border-blue-400/50 font-sans text-sm leading-relaxed"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        setEditableLyrics(activeItem.lyrics || '');
                        setEditableTranslatedLyrics(activeItem.translatedLyrics || '');
                        setIsEditingLyrics(false);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-white/5 text-white/70 hover:text-white text-xs font-medium cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveActiveLyrics}
                      className="px-4 py-1.5 rounded-lg bg-amber-500 text-black hover:bg-amber-400 font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Save size={13} />
                      <span>Salvar Letra & Tradução</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* Action Bar with Translation Status & TTS */}
                  <div className="text-[11px] text-white/40 font-mono flex items-center justify-between gap-2 flex-wrap">
                    <span className="flex items-center gap-1 text-white/60">
                      <span>Toque em qualquer palavra para ver a tradução instantânea</span>
                    </span>

                    <div className="flex items-center gap-3">
                      {!editableTranslatedLyrics && (
                        <button
                          type="button"
                          onClick={() => handleAutoTranslateLyrics('en')}
                          disabled={isTranslatingLyrics}
                          className="text-amber-300 hover:text-amber-200 flex items-center gap-1 font-semibold text-[11px] bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-lg cursor-pointer transition-all"
                        >
                          {isTranslatingLyrics ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />}
                          <span>Ativar Tradução Bilíngue</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleSpeakWord(editableLyrics.slice(0, 150), 'pt-BR')}
                        className="text-amber-400 hover:text-amber-300 flex items-center gap-1.5 font-medium cursor-pointer"
                        title="Ouvir pronúncia da música em português"
                      >
                        <Volume2 size={13} />
                        <span>Ouvir Texto (PT)</span>
                      </button>
                    </div>
                  </div>

                  {/* Lyrics Display Canvas */}
                  <div
                    style={{ fontSize: `${fontSize}px` }}
                    className={`p-6 sm:p-8 rounded-2xl bg-black/60 border border-white/10 text-white/95 leading-relaxed min-h-[420px] max-h-[680px] overflow-y-auto custom-scrollbar shadow-inner ${
                      fontFamily === 'serif' ? 'font-serif' : 'font-sans'
                    } ${textAlign === 'center' ? 'text-center' : 'text-left'}`}
                  >
                    {parsedLyricsData.length > 0 ? (
                      parsedLyricsData.map((stanza, sIdx) => (
                        <div key={sIdx} className="mb-6 last:mb-0 space-y-2">
                          {stanza.lines.map((line, lIdx) => {
                            const tokens = line.pt.split(/(\s+)/);

                            return (
                              <div key={lIdx} className="flex flex-col gap-0.5">
                                {/* Portuguese Line (or hidden if english-only) */}
                                {translationMode !== 'english' && (
                                  <div
                                    className={`flex flex-wrap items-center leading-snug ${
                                      textAlign === 'center' ? 'justify-center' : 'justify-start'
                                    }`}
                                  >
                                    {tokens.map((token, tIdx) => {
                                      if (/^\s+$/.test(token)) {
                                        return <span key={tIdx}>&nbsp;</span>;
                                      }

                                      return (
                                        <span
                                          key={tIdx}
                                          onClick={(e) => handleWordClick(e, token)}
                                          className="hover:bg-amber-400/25 hover:text-amber-300 rounded px-1 py-0.5 transition-all cursor-pointer font-medium hover:underline underline-offset-4 inline-block"
                                        >
                                          {token}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* English Translated Line (Bilingual or English-only mode) */}
                                {(translationMode === 'bilingual' || translationMode === 'english') && line.en && (
                                  <div
                                    style={{ fontSize: `${Math.max(14, fontSize - 4)}px` }}
                                    className={`text-amber-300/80 font-sans italic leading-tight ${
                                      textAlign === 'center' ? 'text-center' : 'text-left'
                                    }`}
                                  >
                                    {line.en}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))
                    ) : (
                      <p className="text-white/40 text-sm italic font-sans text-center py-10">
                        Nenhuma letra cadastrada para este vídeo. Clique em "+ Adicionar Letra" acima.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: SAVED LIBRARY */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-3.5 bg-neutral-900/80 border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl h-fit backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Bookmark size={16} className="text-white/70" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-white">
                Biblioteca de Músicas
              </h2>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setGroupByArtist(!groupByArtist)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                  groupByArtist
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold shadow-sm'
                    : 'bg-white/5 text-white/60 hover:text-white border-white/10'
                }`}
                title={groupByArtist ? 'Agrupado por Cantor' : 'Exibir como Lista'}
              >
                {groupByArtist ? <Mic size={12} /> : <List size={12} />}
                <span>{groupByArtist ? 'Cantor' : 'Lista'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenModal()}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/10 text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
              >
                <Plus size={13} />
                <span>Novo</span>
              </button>
            </div>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-col gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-2.5 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar música, cantor ou letra..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/20 font-mono"
              />
            </div>

            {/* Category Chips */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-mono transition-all shrink-0 cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-white/20 text-white font-semibold border border-white/20'
                      : 'bg-white/5 text-white/50 hover:text-white border border-white/5'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Library Items List */}
          <div className="flex flex-col gap-2 max-h-[550px] overflow-y-auto custom-scrollbar pr-1">
            {filteredLibrary.length === 0 ? (
              <div className="p-6 text-center text-xs text-white/40 border border-dashed border-white/10 rounded-xl">
                Nenhuma música encontrada.
              </div>
            ) : groupByArtist ? (
              /* GROUPED BY ARTIST / CANTOR */
              Object.keys(groupedByArtist).map((artist) => {
                const isExpanded = searchQuery.trim().length > 0 ? true : expandedArtists[artist] === true;
                const artistItems = groupedByArtist[artist];

                return (
                  <div key={artist} className="flex flex-col gap-1 border border-white/5 rounded-xl bg-black/20 overflow-hidden">
                    {/* Artist Header Folder */}
                    <button
                      type="button"
                      onClick={() => toggleArtistExpansion(artist)}
                      className="w-full p-2.5 px-3 flex items-center justify-between gap-2 bg-white/[0.04] hover:bg-white/[0.08] transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Mic size={13} className="text-amber-400 shrink-0" />
                        <span className="text-xs font-semibold text-white truncate">
                          {artist}
                        </span>
                        <span className="text-[10px] font-mono text-white/40 bg-white/10 px-1.5 py-0.2 rounded-full shrink-0">
                          {artistItems.length}
                        </span>
                      </div>
                      <div className="text-white/40 shrink-0">
                        {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </div>
                    </button>

                    {/* Artist Songs List */}
                    {isExpanded && (
                      <div className="flex flex-col gap-1 p-1.5 pt-0.5">
                        {artistItems.map((item) => {
                          const isSelected = activeItem.id === item.id;

                          return (
                            <div
                              key={item.id}
                              onClick={() => setActiveItem(item)}
                              className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 group ${
                                isSelected
                                  ? 'bg-amber-500/15 border-amber-500/40 text-white font-medium shadow-sm'
                                  : 'bg-white/[0.02] border-white/5 hover:border-white/15 hover:bg-white/[0.06] text-white/80'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 truncate">
                                <div className={`p-1 rounded-full shrink-0 ${isSelected ? 'bg-amber-400 text-black' : 'bg-white/10 text-white/50 group-hover:text-white'}`}>
                                  <Play size={9} className="fill-current" />
                                </div>
                                <span className="text-xs truncate font-sans">
                                  {item.title}
                                </span>
                                {item.lyrics && (
                                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.2 rounded shrink-0">
                                    Letra
                                  </span>
                                )}
                                {item.translatedLyrics && (
                                  <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1 py-0.2 rounded shrink-0">
                                    PT/EN
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenModal(item);
                                  }}
                                  className="p-1 text-white/60 hover:text-white transition-colors cursor-pointer"
                                  title="Editar"
                                >
                                  <Edit3 size={11} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteItem(item.id, e)}
                                  className="p-1 text-white/60 hover:text-red-400 transition-colors cursor-pointer"
                                  title="Remover"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              /* COMPACT FLAT LIST */
              filteredLibrary.map((item) => {
                const isSelected = activeItem.id === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveItem(item)}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 group ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/40 text-white font-medium shadow-sm'
                        : 'bg-white/[0.02] border-white/5 hover:border-white/15 hover:bg-white/[0.06] text-white/80'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 truncate">
                      <div className={`p-1 rounded-full shrink-0 ${isSelected ? 'bg-amber-400 text-black' : 'bg-white/10 text-white/50 group-hover:text-white'}`}>
                        <Play size={10} className="fill-current" />
                      </div>
                      <div className="flex flex-col min-w-0 truncate">
                        <span className="text-xs truncate font-medium text-white">
                          {item.title}
                        </span>
                        {item.artist && (
                          <span className="text-[10px] text-amber-300/80 truncate">
                            {item.artist}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.lyrics && (
                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.2 rounded">
                          Letra
                        </span>
                      )}
                      {item.translatedLyrics && (
                        <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1 py-0.2 rounded">
                          PT/EN
                        </span>
                      )}
                      <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(item);
                          }}
                          className="p-1 text-white/60 hover:text-white transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit3 size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteItem(item.id, e)}
                          className="p-1 text-white/60 hover:text-red-400 transition-colors cursor-pointer"
                          title="Remover"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* WORD TRANSLATION TOOLTIP (OVERLAY WITH HIGH Z-INDEX & ADAPTIVE POSITION - AUTO CLOSES IN 5 SECONDS) */}
      <AnimatePresence>
        {selectedWord && wordTooltipCoords && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 5 }}
            style={{
              position: 'fixed',
              left: `${wordTooltipCoords.x}px`,
              top: `${wordTooltipCoords.y}px`,
              zIndex: 10000,
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={clearTooltipTimer}
            onMouseLeave={() => startTooltipTimer(5000)}
            className="w-64 p-3.5 rounded-2xl bg-neutral-900 border border-amber-400/40 shadow-2xl backdrop-blur-2xl flex flex-col gap-2.5 pointer-events-auto overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-amber-300 capitalize">{selectedWord}</span>
                <span className="text-[9px] font-mono text-white/40 bg-white/5 px-1.5 py-0.5 rounded">5s</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  clearTooltipTimer();
                  setSelectedWord(null);
                  setWordTooltipCoords(null);
                }}
                className="text-white/40 hover:text-white p-0.5 cursor-pointer"
                title="Fechar"
              >
                <X size={13} />
              </button>
            </div>

            {/* Target Language Selector Tabs inside Tooltip */}
            <div className="flex items-center justify-between bg-black/60 p-0.5 rounded-lg border border-white/10 text-[11px] font-mono">
              <button
                type="button"
                onClick={async () => {
                  setWordTargetLang('pt');
                  startTooltipTimer(5000);
                  setIsTranslating(true);
                  const res = await translateText(selectedWord, 'auto', 'pt');
                  setTranslationResult(res);
                  setIsTranslating(false);
                }}
                className={`flex-1 py-1 rounded text-center transition-all cursor-pointer font-semibold ${
                  wordTargetLang === 'pt'
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                🇧🇷 Português
              </button>
              <button
                type="button"
                onClick={async () => {
                  setWordTargetLang('en');
                  startTooltipTimer(5000);
                  setIsTranslating(true);
                  const res = await translateText(selectedWord, 'auto', 'en');
                  setTranslationResult(res);
                  setIsTranslating(false);
                }}
                className={`flex-1 py-1 rounded text-center transition-all cursor-pointer font-semibold ${
                  wordTargetLang === 'en'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                🇺🇸 English
              </button>
            </div>

            <div className="text-xs text-white/95 font-medium leading-relaxed bg-white/5 p-2.5 rounded-xl border border-white/10 min-h-[42px] flex items-center">
              {isTranslating ? (
                <div className="flex items-center gap-1.5 text-white/50 text-[11px] font-mono">
                  <Loader2 size={12} className="animate-spin text-amber-400" />
                  <span>Traduzindo instantaneamente...</span>
                </div>
              ) : (
                <div className="flex flex-col gap-0.5 w-full">
                  <span className="text-white font-bold text-sm">{translationResult}</span>
                  <span className="text-[10px] text-amber-400/80 font-mono">
                    {wordTargetLang === 'pt' ? 'Tradução em Português 🇧🇷' : 'Tradução em Inglês 🇺🇸'}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/10">
              <button
                type="button"
                onClick={() => handleSpeakWord(selectedWord, wordTargetLang === 'en' ? 'en-US' : 'pt-BR')}
                className="text-[11px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-semibold"
              >
                <Volume2 size={12} />
                <span>Ouvir Áudio</span>
              </button>
              <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                Instantâneo
              </span>
            </div>

            {/* 5-Second Animated Dismiss Bar */}
            <div className="w-full bg-white/10 h-0.5 rounded-full overflow-hidden mt-0.5">
              <motion.div
                key={`${selectedWord}_${wordTargetLang}`}
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 5, ease: 'linear' }}
                className="h-full bg-amber-400"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CREATE / EDIT ITEM MODAL */}
      <AnimatePresence>
        {itemModalOpen && (
          <div className="fixed inset-0 z-[9990] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl bg-neutral-900 border border-white/15 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Youtube size={18} className="text-red-500" />
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                    {editingItem ? 'Editar Item da Biblioteca' : 'Cadastrar Nova Música ou Vídeo'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setItemModalOpen(false)}
                  className="p-1 text-white/60 hover:text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveItemModal} className="flex flex-col gap-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white/70 font-mono mb-1">Título da Música / Vídeo *</label>
                    <input
                      type="text"
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Ex: Garota de Ipanema"
                      className="w-full p-2.5 rounded-lg bg-black/40 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-white/30"
                    />
                  </div>

                  <div>
                    <label className="block text-white/70 font-mono mb-1">Cantor / Artista / Banda</label>
                    <input
                      type="text"
                      value={formArtist}
                      onChange={(e) => setFormArtist(e.target.value)}
                      placeholder="Ex: Tom Jobim, Elis Regina..."
                      className="w-full p-2.5 rounded-lg bg-black/40 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-white/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white/70 font-mono mb-1">Categoria *</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full p-2.5 rounded-lg bg-black border border-white/10 text-white focus:outline-none focus:border-white/30"
                    >
                      <option value="Música">Música</option>
                      <option value="Aulas">Aulas</option>
                      <option value="Gramática">Gramática</option>
                      <option value="Conversação">Conversação</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-white/70 font-mono mb-1">Link do YouTube *</label>
                    <input
                      type="text"
                      required
                      value={formUrl}
                      onChange={(e) => setFormUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full p-2.5 rounded-lg bg-black/40 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-white/30 font-mono text-[11px]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-white/70 font-mono">
                      Letra em Português (Opcional)
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAiFormatLyrics(formLyrics, (formatted) => setFormLyrics(formatted))}
                      disabled={isFormattingLyrics || !formLyrics.trim()}
                      className="px-2 py-0.5 rounded bg-purple-600/20 hover:bg-purple-600/35 text-purple-300 border border-purple-500/30 text-[10px] font-mono flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                    >
                      {isFormattingLyrics ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                      <span>Separar Parágrafos</span>
                    </button>
                  </div>
                  <textarea
                    value={formLyrics}
                    onChange={(e) => setFormLyrics(e.target.value)}
                    rows={4}
                    placeholder="Cole a letra da música em português..."
                    className="w-full p-2.5 rounded-lg bg-black/40 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-white/30 font-sans leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-white/70 font-mono mb-1">
                    Tradução em Inglês (Opcional)
                  </label>
                  <textarea
                    value={formTranslatedLyrics}
                    onChange={(e) => setFormTranslatedLyrics(e.target.value)}
                    rows={3}
                    placeholder="Cole a tradução em inglês..."
                    className="w-full p-2.5 rounded-lg bg-black/40 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-white/30 font-sans leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-white/70 font-mono mb-1">Observações Pedagógicas</label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Dicas para a aula..."
                    className="w-full p-2.5 rounded-lg bg-black/40 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-white/30"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setItemModalOpen(false)}
                    className="px-3.5 py-2 rounded-lg bg-white/5 text-white/70 hover:text-white font-medium cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white font-medium shadow-sm cursor-pointer"
                  >
                    Salvar na Biblioteca
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULLSCREEN PRESENTATION MODE - FLOATING CONTROLS & ULTRA READABLE */}
      {isFullscreenMeet && (
        <div className="fixed inset-0 z-[9999] bg-neutral-950 p-2 sm:p-4 md:p-6 flex flex-col justify-between overflow-hidden select-none">
          {/* Top Floating Controls - No Background Bar, Floating Pills Like Lousa de Horarios */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 shrink-0 z-30 pointer-events-auto">
            {/* Song Badge */}
            <div className="flex items-center gap-2 bg-neutral-950/80 px-3 py-1.5 rounded-full border border-white/15 backdrop-blur-md shadow-md min-w-0 max-w-full">
              <div className="p-1 bg-red-600 rounded-full text-white shadow-sm shrink-0">
                <Youtube size={14} />
              </div>
              <div className="min-w-0 flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-white tracking-tight truncate max-w-[120px] sm:max-w-[220px]">
                  {activeItem.title}
                </span>
                {activeItem.artist && (
                  <span className="text-[10px] text-amber-400 font-medium truncate hidden sm:inline">
                    • {activeItem.artist}
                  </span>
                )}
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                  Tela Cheia
                </span>
              </div>
            </div>

            {/* Floating Presentation Controls Toolbar */}
            <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto max-w-full py-0.5 custom-scrollbar">
              {/* View Layout Selector */}
              <div className="flex bg-neutral-950/80 p-0.5 rounded-full border border-white/15 backdrop-blur-md shadow-md text-xs">
                <button
                  type="button"
                  onClick={() => setMeetViewMode('split')}
                  className={`px-2.5 sm:px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                    meetViewMode === 'split'
                      ? 'bg-amber-500 text-black font-bold shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                  title="Vídeo à esquerda + Letra à direita"
                >
                  <span className="flex items-center gap-1">
                    <Columns size={12} />
                    <span className="hidden sm:inline">Dividido</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setMeetViewMode('lyrics_focus')}
                  className={`px-2.5 sm:px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                    meetViewMode === 'lyrics_focus'
                      ? 'bg-amber-500 text-black font-bold shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                  title="Letra em destaque com vídeo no topo"
                >
                  <span className="flex items-center gap-1">
                    <Eye size={12} />
                    <span>Foco</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setMeetViewMode('lyrics_only')}
                  className={`px-2.5 sm:px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                    meetViewMode === 'lyrics_only'
                      ? 'bg-amber-500 text-black font-bold shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                  title="Somente texto em tela cheia"
                >
                  <span>Letra</span>
                </button>
              </div>

              {/* Translation Mode Selector */}
              <div className="flex bg-neutral-950/80 p-0.5 rounded-full border border-white/15 backdrop-blur-md shadow-md text-xs">
                <button
                  type="button"
                  onClick={() => setTranslationMode('original')}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                    translationMode === 'original'
                      ? 'bg-amber-500 text-black font-bold'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  PT
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTranslationMode('bilingual');
                    if (!editableTranslatedLyrics) handleAutoTranslateLyrics();
                  }}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5 transition-all cursor-pointer ${
                    translationMode === 'bilingual'
                      ? 'bg-amber-500 text-black font-bold'
                      : 'text-amber-400/80 hover:text-amber-300'
                  }`}
                >
                  <Languages size={10} />
                  <span>Dual</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTranslationMode('english');
                    if (!editableTranslatedLyrics) handleAutoTranslateLyrics();
                  }}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                    translationMode === 'english'
                      ? 'bg-amber-500 text-black font-bold'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  EN
                </button>
              </div>

              {/* Font Size Adjuster */}
              <div className="flex items-center gap-0.5 bg-neutral-950/80 px-2 py-0.5 rounded-full border border-white/15 backdrop-blur-md shadow-md text-xs">
                <button
                  type="button"
                  onClick={() => setMeetFontSize((prev) => Math.max(18, prev - 4))}
                  className="text-white/70 hover:text-white px-1 font-bold text-xs cursor-pointer"
                  title="Diminuir fonte"
                >
                  A-
                </button>
                <span className="text-[10px] font-mono text-amber-400 font-bold px-1">{meetFontSize}</span>
                <button
                  type="button"
                  onClick={() => setMeetFontSize((prev) => Math.min(84, prev + 4))}
                  className="text-white/70 hover:text-white px-1 font-bold text-xs cursor-pointer"
                  title="Aumentar fonte"
                >
                  A+
                </button>
              </div>

              {/* Speak Audio */}
              <button
                type="button"
                onClick={() => handleSpeakWord(editableLyrics.slice(0, 150), 'pt-BR')}
                className="p-1.5 px-2.5 rounded-full bg-neutral-950/80 hover:bg-amber-500/20 text-amber-300 border border-white/15 backdrop-blur-md shadow-md text-xs font-medium flex items-center gap-1 cursor-pointer"
                title="Ouvir áudio em português"
              >
                <Volume2 size={12} />
              </button>

              {/* Exit Fullscreen */}
              <button
                type="button"
                onClick={() => setIsFullscreenMeet(false)}
                className="px-3 py-1 rounded-full bg-neutral-950/80 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-bold transition-all cursor-pointer backdrop-blur-md shadow-md flex items-center gap-1"
                title="Sair da Tela Cheia"
              >
                <X size={13} />
                <span>Sair</span>
              </button>
            </div>
          </div>

          {/* MAIN PRESENTATION CANVAS (COMPLETELY OVERLAP-FREE) */}
          <div className="flex-1 min-h-0 my-3 flex flex-col overflow-hidden">
            {meetViewMode === 'split' ? (
              /* SPLIT 50/50 VIEW: Clean two-column layout */
              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch overflow-hidden">
                {/* Video Player Column */}
                <div className="lg:col-span-5 xl:col-span-5 flex flex-col justify-center min-h-0">
                  <div className="w-full aspect-video rounded-2xl overflow-hidden border border-white/20 bg-black shadow-2xl relative">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${activeItem.embedId}?autoplay=1&rel=0&modestbranding=1`}
                      title={activeItem.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>

                {/* Lyrics Reader Column */}
                <div className="lg:col-span-7 xl:col-span-7 flex-1 min-h-0 flex flex-col bg-neutral-900/90 border border-white/15 rounded-2xl p-5 sm:p-8 backdrop-blur-2xl shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3 shrink-0">
                    <span className="text-xs font-mono font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <Music size={15} />
                      <span>Letra da Música & Tradução</span>
                    </span>
                    <span className="text-[11px] font-mono text-white/40">
                      Clique na palavra para tradução imediata
                    </span>
                  </div>

                  <div
                    style={{ fontSize: `${meetFontSize}px` }}
                    className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar leading-relaxed text-white/95 font-serif pr-2 ${
                      meetAlign === 'center' ? 'text-center' : 'text-left'
                    }`}
                  >
                    {parsedLyricsData.length > 0 ? (
                      parsedLyricsData.map((stanza, sIdx) => (
                        <div key={sIdx} className="mb-6 last:mb-0 space-y-2">
                          {stanza.lines.map((line, lIdx) => {
                            const tokens = line.pt.split(/(\s+)/);

                            return (
                              <div key={lIdx} className="flex flex-col gap-0.5">
                                {translationMode !== 'english' && (
                                  <div
                                    className={`flex flex-wrap items-center leading-snug ${
                                      meetAlign === 'center' ? 'justify-center' : 'justify-start'
                                    }`}
                                  >
                                    {tokens.map((token, tIdx) => {
                                      if (/^\s+$/.test(token)) {
                                        return <span key={tIdx}>&nbsp;</span>;
                                      }

                                      return (
                                        <span
                                          key={tIdx}
                                          onClick={(e) => handleWordClick(e, token)}
                                          className="hover:bg-amber-400/30 hover:text-amber-300 rounded px-1.5 py-0.5 transition-all cursor-pointer font-medium hover:underline underline-offset-4 inline-block"
                                        >
                                          {token}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}

                                {(translationMode === 'bilingual' || translationMode === 'english') && line.en && (
                                  <div
                                    style={{ fontSize: `${Math.max(16, meetFontSize - 8)}px` }}
                                    className={`text-amber-300/80 font-sans italic leading-tight ${
                                      meetAlign === 'center' ? 'text-center' : 'text-left'
                                    }`}
                                  >
                                    {line.en}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))
                    ) : (
                      <p className="text-white/40 text-base italic font-sans text-center my-auto">
                        Sem letra disponível para este vídeo.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : meetViewMode === 'lyrics_focus' ? (
              /* LYRICS FOCUS MODE: Video Dock at Top + Giant Lyrics in Center (Zero Overlapping) */
              <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
                {/* Top Video Dock Bar (Collapsible without covering text) */}
                <div className="shrink-0 flex items-center justify-between bg-black/60 border border-white/15 rounded-2xl p-2.5 px-4 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="w-28 sm:w-36 aspect-video rounded-lg overflow-hidden border border-white/20 bg-black shrink-0">
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${activeItem.embedId}?autoplay=1&rel=0&modestbranding=1`}
                        title={activeItem.title}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                    <div className="truncate">
                      <span className="text-xs font-bold text-white block truncate">{activeItem.title}</span>
                      <span className="text-[11px] text-amber-400/90 font-mono block truncate">{activeItem.artist}</span>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-white/50 hidden md:inline">
                    Foco no Texto da Aula • Letras Ampliadas
                  </span>
                </div>

                {/* Giant Lyrics Reading Room */}
                <div className="flex-1 min-h-0 flex flex-col bg-neutral-900/95 border border-white/15 rounded-3xl p-6 sm:p-10 backdrop-blur-2xl shadow-2xl overflow-hidden">
                  <div
                    style={{ fontSize: `${meetFontSize}px` }}
                    className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar leading-relaxed text-white/95 font-serif px-2 sm:px-6 ${
                      meetAlign === 'center' ? 'text-center' : 'text-left'
                    }`}
                  >
                    {parsedLyricsData.length > 0 ? (
                      parsedLyricsData.map((stanza, sIdx) => (
                        <div key={sIdx} className="mb-8 last:mb-0 space-y-3">
                          {stanza.lines.map((line, lIdx) => {
                            const tokens = line.pt.split(/(\s+)/);

                            return (
                              <div key={lIdx} className="flex flex-col gap-1">
                                {translationMode !== 'english' && (
                                  <div
                                    className={`flex flex-wrap items-center leading-snug ${
                                      meetAlign === 'center' ? 'justify-center' : 'justify-start'
                                    }`}
                                  >
                                    {tokens.map((token, tIdx) => {
                                      if (/^\s+$/.test(token)) {
                                        return <span key={tIdx}>&nbsp;</span>;
                                      }

                                      return (
                                        <span
                                          key={tIdx}
                                          onClick={(e) => handleWordClick(e, token)}
                                          className="hover:bg-amber-400/30 hover:text-amber-300 rounded px-2 py-0.5 transition-all cursor-pointer font-medium hover:underline underline-offset-4 inline-block"
                                        >
                                          {token}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}

                                {(translationMode === 'bilingual' || translationMode === 'english') && line.en && (
                                  <div
                                    style={{ fontSize: `${Math.max(18, meetFontSize - 10)}px` }}
                                    className={`text-amber-300/80 font-sans italic leading-tight ${
                                      meetAlign === 'center' ? 'text-center' : 'text-left'
                                    }`}
                                  >
                                    {line.en}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))
                    ) : (
                      <p className="text-white/40 text-base italic font-sans text-center my-auto">
                        Sem letra disponível para este vídeo.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* PURE LYRICS ONLY MODE: 100% Full Screen Text for Large Projectors */
              <div className="flex-1 min-h-0 flex flex-col bg-neutral-900/95 border border-white/15 rounded-3xl p-6 sm:p-12 backdrop-blur-2xl shadow-2xl overflow-hidden">
                <div
                  style={{ fontSize: `${meetFontSize}px` }}
                  className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar leading-relaxed text-white/95 font-serif px-2 sm:px-8 ${
                    meetAlign === 'center' ? 'text-center' : 'text-left'
                  }`}
                >
                  {parsedLyricsData.length > 0 ? (
                    parsedLyricsData.map((stanza, sIdx) => (
                      <div key={sIdx} className="mb-8 last:mb-0 space-y-3">
                        {stanza.lines.map((line, lIdx) => {
                          const tokens = line.pt.split(/(\s+)/);

                          return (
                            <div key={lIdx} className="flex flex-col gap-1">
                              {translationMode !== 'english' && (
                                <div
                                  className={`flex flex-wrap items-center leading-snug ${
                                    meetAlign === 'center' ? 'justify-center' : 'justify-start'
                                  }`}
                                >
                                  {tokens.map((token, tIdx) => {
                                    if (/^\s+$/.test(token)) {
                                      return <span key={tIdx}>&nbsp;</span>;
                                    }

                                    return (
                                      <span
                                        key={tIdx}
                                        onClick={(e) => handleWordClick(e, token)}
                                        className="hover:bg-amber-400/30 hover:text-amber-300 rounded px-2 py-0.5 transition-all cursor-pointer font-medium hover:underline underline-offset-4 inline-block"
                                      >
                                        {token}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}

                              {(translationMode === 'bilingual' || translationMode === 'english') && line.en && (
                                <div
                                  style={{ fontSize: `${Math.max(18, meetFontSize - 10)}px` }}
                                  className={`text-amber-300/80 font-sans italic leading-tight ${
                                    meetAlign === 'center' ? 'text-center' : 'text-left'
                                  }`}
                                >
                                  {line.en}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))
                  ) : (
                    <p className="text-white/40 text-base italic font-sans text-center my-auto">
                      Sem letra disponível para este vídeo.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="flex justify-between items-center pt-1 shrink-0 text-[10px] text-white/40 font-mono">
            <span>Modo Tela Cheia ativado</span>
            <span>Aperte Esc ou clique em Sair para retornar</span>
          </div>
        </div>
      )}
    </div>
  );
};
