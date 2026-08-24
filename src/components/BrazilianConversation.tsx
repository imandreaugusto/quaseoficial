import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, listenToAuth, syncToCloud } from '../lib/cloudSync';
import { subscribeToUserDataFromCloud } from '../lib/firebase';
import {
  Sparkles,
  MessageSquare,
  Mic,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Bookmark,
  BookmarkCheck,
  Star,
  Search,
  Trash2,
  Edit,
  Save,
  Check,
  RotateCw,
  Eye,
  Settings,
  HelpCircle,
  Maximize2,
  Layers,
  List,
  Languages,
  X
} from 'lucide-react';
import { ConversationLesson, VocabularyItem } from '../types';
import { INITIAL_CONVERSATION_LIBRARY } from '../data';
import { translateText, lookupDictionary } from '../lib/translator';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];

const GOALS = [
  'Conversation',
  'Cambridge Speaking',
  'IELTS',
  'TOEFL',
  'Business English',
  'Kids',
  'Teenagers',
  'General English'
];

const THEMES = [
  'Travel', 'Food', 'Technology', 'School', 'Work', 'Shopping',
  'Sports', 'Health', 'Daily Routine', 'Music', 'Movies', 'Books',
  'Social Media', 'Environment', 'Animals', 'Family', 'Education',
  'Culture', 'Nature', 'Transportation', 'Weather', 'Friendship',
  'Dreams', 'Jobs', 'Festivals', 'Holiday'
];

const DURATIONS = [
  '5 Minutes',
  '10 Minutes',
  '15 Minutes',
  '20 Minutes',
  '30 Minutes',
  '45 Minutes',
  '60 Minutes',
  'Free Talk (No Limit)'
];

interface BrazilianConversationProps {
  accentColor: string;
}

interface DefinitionState {
  word: string;
  pos: string;
  pronunciation: string;
  translation: string;
  example: string;
  loading: boolean;
  error: boolean;
}

export const BrazilianConversation: React.FC<BrazilianConversationProps> = ({ accentColor }) => {
  // Navigation tabs inside Brazilian Conversation
  const [activeTab, setActiveTab] = useState<'generate' | 'library' | 'vocabulary'>('generate');

  // Creation State
  const [selectedLevel, setSelectedLevel] = useState<string>('B1');
  const [selectedGoal, setSelectedGoal] = useState<string>('Conversation');
  const [selectedTheme, setSelectedTheme] = useState<string>('Travel');
  const [selectedDuration, setSelectedDuration] = useState<string>('20 Minutes');

  // AI Generation Loading & Result States
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [currentLesson, setCurrentLesson] = useState<ConversationLesson | null>(null);
  const [activeStep, setActiveStep] = useState<number>(1); // Step 1 to 7

  // Stopwatch state
  const [time, setTime] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Dictionary Modal / Pop-up State
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [definition, setDefinition] = useState<DefinitionState | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ x: number; y: number } | null>(null);

  // Vocabulary list (Brazilian Conversation local glossary)
  const [savedWords, setSavedWords] = useState<VocabularyItem[]>([]);

  // Saved Lessons Library state
  const [library, setLibrary] = useState<ConversationLesson[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState('All');
  const [filterGoal, setFilterGoal] = useState('All');
  const [filterTheme, setFilterTheme] = useState('All');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  // Edit Lesson Modal
  const [editingLesson, setEditingLesson] = useState<ConversationLesson | null>(null);

  // Presentation & Flashcard state
  const [viewMode, setViewMode] = useState<'flashcard' | 'list'>('flashcard');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [isFullscreenMeet, setIsFullscreenMeet] = useState<boolean>(false);

  // Reset question index when step changes
  useEffect(() => {
    setCurrentQuestionIndex(0);
  }, [activeStep]);

  // Initial Data Loading
  useEffect(() => {
    const storedLibrary = localStorage.getItem('bia_conversation_library');
    if (storedLibrary) {
      try {
        const parsed = JSON.parse(storedLibrary);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLibrary(parsed);
          setCurrentLesson(parsed[0]);
        } else {
          setLibrary(INITIAL_CONVERSATION_LIBRARY as any);
          setCurrentLesson(INITIAL_CONVERSATION_LIBRARY[0] as any);
          localStorage.setItem('bia_conversation_library', JSON.stringify(INITIAL_CONVERSATION_LIBRARY));
        }
      } catch (e) {
        console.error('Error loading library', e);
        setLibrary(INITIAL_CONVERSATION_LIBRARY as any);
        setCurrentLesson(INITIAL_CONVERSATION_LIBRARY[0] as any);
      }
    } else {
      setLibrary(INITIAL_CONVERSATION_LIBRARY as any);
      setCurrentLesson(INITIAL_CONVERSATION_LIBRARY[0] as any);
      localStorage.setItem('bia_conversation_library', JSON.stringify(INITIAL_CONVERSATION_LIBRARY));
    }

    const storedSavedWords = localStorage.getItem('bia_conversation_saved_words');
    if (storedSavedWords) {
      try {
        setSavedWords(JSON.parse(storedSavedWords));
      } catch (e) {
        console.error('Error loading saved words', e);
      }
    }
  }, []);

  // Helper to extract items for current step
  const getStepItems = (step: number): string[] => {
    if (!currentLesson) return [];
    switch (step) {
      case 2:
        return currentLesson.warmup || [];
      case 3:
        return currentLesson.mainDiscussion || [];
      case 4:
        return currentLesson.followup || [];
      case 6:
        return currentLesson.expressions || [];
      default:
        return [];
    }
  };

  const handleNextQuestion = () => {
    const items = getStepItems(activeStep);
    if (items.length === 0) {
      if (activeStep < 7) {
        setActiveStep((prev) => prev + 1);
        setCurrentQuestionIndex(0);
      }
      return;
    }
    if (currentQuestionIndex < items.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      if (activeStep < 7) {
        setActiveStep((prev) => prev + 1);
        setCurrentQuestionIndex(0);
      } else {
        setCurrentQuestionIndex(0);
      }
    }
  };

  const handlePrevQuestion = () => {
    const items = getStepItems(activeStep);
    if (items.length === 0) {
      if (activeStep > 1) {
        setActiveStep((prev) => prev - 1);
        setCurrentQuestionIndex(0);
      }
      return;
    }
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    } else {
      if (activeStep > 1) {
        setActiveStep((prev) => prev - 1);
        setCurrentQuestionIndex(0);
      }
    }
  };

  useEffect(() => {
    setCurrentQuestionIndex(0);
  }, [activeStep, currentLesson?.id]);

  // Keyboard navigation for presentation/flashcards
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === ' ') {
        if (e.key === ' ') e.preventDefault();
        handleNextQuestion();
      } else if (e.key === 'ArrowLeft') {
        handlePrevQuestion();
      } else if (e.key === 'Escape') {
        setIsFullscreenMeet(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestionIndex, activeStep, currentLesson, isFullscreenMeet]);

  // Save changes helper with Cloud Sync
  const saveLibraryToStorage = (updatedLib: ConversationLesson[]) => {
    setLibrary(updatedLib);
    localStorage.setItem('bia_conversation_library', JSON.stringify(updatedLib));
    if (auth.currentUser) {
      syncToCloud(auth.currentUser.uid, 'bia_conversation_library', updatedLib);
    }
  };

  const saveWordsToStorage = (updatedWords: VocabularyItem[]) => {
    setSavedWords(updatedWords);
    localStorage.setItem('bia_conversation_saved_words', JSON.stringify(updatedWords));
    if (auth.currentUser) {
      syncToCloud(auth.currentUser.uid, 'bia_conversation_saved_words', updatedWords);
    }
  };

  // Real-time Cloud Sync Listener
  useEffect(() => {
    const unsubAuth = listenToAuth((user) => {
      if (!user) return;
      const unsubLib = subscribeToUserDataFromCloud(
        user.uid,
        'bia_conversation_library',
        (data) => {
          if (data && Array.isArray(data) && data.length > 0) {
            setLibrary(data);
            localStorage.setItem('bia_conversation_library', JSON.stringify(data));
          }
        },
        () => {
          const stored = localStorage.getItem('bia_conversation_library');
          const payload = stored ? JSON.parse(stored) : library;
          if (payload && payload.length > 0) {
            syncToCloud(user.uid, 'bia_conversation_library', payload);
          }
        }
      );
      const unsubWords = subscribeToUserDataFromCloud(
        user.uid,
        'bia_conversation_saved_words',
        (data) => {
          if (data && Array.isArray(data)) {
            setSavedWords(data);
            localStorage.setItem('bia_conversation_saved_words', JSON.stringify(data));
          }
        },
        () => {
          const stored = localStorage.getItem('bia_conversation_saved_words');
          const payload = stored ? JSON.parse(stored) : savedWords;
          if (payload && payload.length > 0) {
            syncToCloud(user.uid, 'bia_conversation_saved_words', payload);
          }
        }
      );
      return () => {
        unsubLib();
        unsubWords();
      };
    });
    return () => unsubAuth();
  }, []);

  // Stopwatch ticking
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  const toggleTimer = () => setIsTimerRunning(!isTimerRunning);
  const resetTimer = () => {
    setIsTimerRunning(false);
    setTime(0);
  };

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Select a random theme
  const handleRandomTheme = () => {
    const randomIndex = Math.floor(Math.random() * THEMES.length);
    setSelectedTheme(THEMES[randomIndex]);
  };

  // Call API to generate lesson
  const handleGenerate = async (regenerate = false) => {
    setIsGenerating(true);
    setGenerationStep('Engaging English pedagogical framework...');
    setCurrentLesson(null);
    setActiveStep(1);
    resetTimer();

    const loadingPhrases = [
      'Structuring speaking lesson outline...',
      'Writing level-appropriate starter text...',
      'Mapping core vocabulary list...',
      'Formulating natural conversational expressions...',
      'Drafting target discussion prompts...',
      'Configuring grammar focus and teacher advice...',
      'Polishing activity metadata...'
    ];

    let phraseIdx = 0;
    const progressInterval = setInterval(() => {
      if (phraseIdx < loadingPhrases.length) {
        setGenerationStep(loadingPhrases[phraseIdx]);
        phraseIdx++;
      }
    }, 1200);

    try {
      const response = await fetch('/api/generate-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: selectedLevel,
          goal: selectedGoal,
          theme: regenerate && currentLesson ? currentLesson.theme : selectedTheme,
          duration: selectedDuration
        })
      });

      if (!response.ok) {
        throw new Error('API returned an error');
      }

      const resJson = await response.json();
      const data = resJson.data || {};
      const generated: ConversationLesson = {
        id: String(Date.now()),
        title: data.title || 'Conversa Personalizada',
        starter: data.starter || 'Warm welcome to our speaking session.',
        warmup: Array.isArray(data.warmup) ? data.warmup : [],
        mainDiscussion: Array.isArray(data.mainDiscussion) ? data.mainDiscussion : [],
        followup: Array.isArray(data.followup) ? data.followup : [],
        vocabulary: Array.isArray(data.vocabulary) ? data.vocabulary : [],
        expressions: Array.isArray(data.expressions) ? data.expressions : [],
        grammarFocus: data.grammarFocus || 'Conversação Geral',
        teacherNotes: Array.isArray(data.teacherNotes) ? data.teacherNotes : [],
        level: selectedLevel,
        goal: selectedGoal,
        theme: regenerate && currentLesson ? currentLesson.theme : selectedTheme,
        duration: selectedDuration,
        createdAt: new Date().toLocaleDateString('pt-BR')
      };

      setCurrentLesson(generated);
    } catch (e) {
      console.error('Error generating lesson', e);
      alert('Houve um erro ao gerar a conversa com a IA. Por favor, tente novamente.');
    } finally {
      clearInterval(progressInterval);
      setIsGenerating(false);
    }
  };

  // Word Click - Instant dictionary & translation fallback
  const handleWordClick = async (word: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’]/g, '').trim();
    if (!cleanWord || cleanWord.length <= 1) return;

    setSelectedWord(cleanWord);
    setPopoverPosition({ x: e.clientX, y: e.clientY - 10 });
    setDefinition({
      word: cleanWord,
      pos: '',
      pronunciation: '',
      translation: 'Traduzindo...',
      example: '',
      loading: true,
      error: false
    });

    // Fast local dictionary check
    const localMatch = lookupDictionary(cleanWord.toLowerCase());

    try {
      const response = await fetch('/api/define-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: cleanWord,
          context: currentLesson?.starter
        })
      });

      if (response.ok) {
        const resJson = await response.json();
        if (resJson.data && resJson.data.translation && resJson.data.translation !== 'Tradução indisponível' && resJson.data.translation.toLowerCase() !== cleanWord.toLowerCase()) {
          setDefinition({
            ...resJson.data,
            word: cleanWord,
            loading: false,
            error: false
          });
          return;
        }
      }
    } catch (err) {
      console.warn('/api/define-word failed, falling back to multi-tiered translate');
    }

    // Secondary fallback: translateText
    try {
      const translation = await translateText(cleanWord);
      if (translation) {
        setDefinition({
          word: cleanWord,
          pos: 'palavra',
          pronunciation: `/${cleanWord}/`,
          translation: translation,
          example: `Word: ${cleanWord}`,
          loading: false,
          error: false
        });
        return;
      }
    } catch (err) {
      console.warn('translateText failed in BrazilianConversation', err);
    }

    setDefinition({
      word: cleanWord,
      pos: 'palavra',
      pronunciation: `/${cleanWord}/`,
      translation: localMatch || cleanWord,
      example: `Word: ${cleanWord}`,
      loading: false,
      error: false
    });
  };

  // Translate full sentence / question
  const handleTranslateSentence = async (fullText: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!fullText) return;

    setSelectedWord(`Frase/Pergunta`);
    if (e) {
      setPopoverPosition({ x: e.clientX, y: e.clientY - 10 });
    } else {
      setPopoverPosition({ x: window.innerWidth / 2, y: 200 });
    }

    setDefinition({
      word: 'Frase Completa',
      pos: 'frase',
      pronunciation: '',
      translation: 'Traduzindo...',
      example: fullText,
      loading: true,
      error: false
    });

    try {
      const translation = await translateText(fullText);
      if (translation && translation.toLowerCase() !== fullText.toLowerCase()) {
        setDefinition({
          word: 'Tradução da Frase',
          pos: 'frase',
          pronunciation: '',
          translation: translation,
          example: `"${fullText}"`,
          loading: false,
          error: false
        });
        return;
      }
    } catch (e) {
      console.warn('Sentence translate API error', e);
    }

    setDefinition({
      word: 'Aviso',
      pos: '',
      pronunciation: '',
      translation: 'Não foi possível obter a tradução desta frase.',
      example: '',
      loading: false,
      error: true
    });
  };

  // Text to Speech
  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.88;
    window.speechSynthesis.speak(utterance);
  };

  const speakWord = (word: string) => speakText(word);

  // Toggle Save Word to Glossary
  const handleSaveWord = (wordItem: { word: string; pos: string; pronunciation: string; translation: string; example: string }) => {
    const isAlreadySaved = savedWords.some((w) => w.word.toLowerCase() === wordItem.word.toLowerCase());
    if (isAlreadySaved) {
      const filtered = savedWords.filter((w) => w.word.toLowerCase() !== wordItem.word.toLowerCase());
      saveWordsToStorage(filtered);
    } else {
      saveWordsToStorage([...savedWords, wordItem]);
    }
  };

  // Save current lesson to storage
  const handleSaveLesson = () => {
    if (!currentLesson) return;
    const exists = library.some((l) => l.title === currentLesson.title && l.level === currentLesson.level);
    if (exists) {
      alert('Esta atividade já está salva na sua biblioteca.');
      return;
    }

    const updated = [...library, { ...currentLesson, id: String(Date.now()), isFavorite: false }];
    saveLibraryToStorage(updated);
    alert('Atividade salva com sucesso na biblioteca!');
  };

  const handleToggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = library.map((item) =>
      item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
    );
    saveLibraryToStorage(updated);
    if (currentLesson && currentLesson.id === id) {
      setCurrentLesson({ ...currentLesson, isFavorite: !currentLesson.isFavorite });
    }
  };

  const handleDeleteLesson = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Tem certeza de que deseja excluir esta atividade de conversação salva?')) {
      const updated = library.filter((item) => item.id !== id);
      saveLibraryToStorage(updated);
    }
  };

  const handleOpenSavedLesson = (lesson: ConversationLesson) => {
    setCurrentLesson(lesson);
    setActiveStep(1);
    resetTimer();
    setActiveTab('generate');
  };

  // Render clickable tokens for Interactive reading and instant translation
  const renderInteractiveText = (text: string) => {
    if (!text) return null;
    const strophes = text.split(/\n\s*\n/).filter(Boolean);
    return (
      <div className="flex flex-col gap-4 text-left leading-relaxed">
        {strophes.map((strophe, sIdx) => {
          const lines = strophe.split('\n').filter(Boolean);
          return (
            <p key={sIdx} className="mb-0">
              {lines.map((line, lIdx) => (
                <React.Fragment key={lIdx}>
                  {lIdx > 0 && <br />}
                  {line.split(/(\s+)/).map((token, idx) => {
                    if (/^\s+$/.test(token)) {
                      return token;
                    }
                    const match = token.match(/^([a-zA-Z0-9'’-]+)(.*)$/);
                    if (match) {
                      const word = match[1];
                      const punctuation = match[2];
                      const isSaved = savedWords.some((w) => w.word.toLowerCase() === word.toLowerCase());
                      return (
                        <React.Fragment key={idx}>
                          <span
                            onClick={(e) => handleWordClick(word, e)}
                            className={`cursor-pointer transition-all rounded px-0.5 inline-block ${
                              isSaved
                                ? 'text-amber-300 font-semibold underline underline-offset-4 decoration-amber-400/60 hover:text-amber-200'
                                : 'hover:text-blue-300 hover:bg-white/10'
                            }`}
                            title="Clique para ver a tradução e pronúncia da palavra"
                          >
                            {word}
                          </span>
                          {punctuation}
                        </React.Fragment>
                      );
                    }
                    return <span key={idx}>{token}</span>;
                  })}
                </React.Fragment>
              ))}
            </p>
          );
        })}
      </div>
    );
  };

  // Reusable component to render questions in Flashcard or List mode
  const renderQuestionSection = (
    title: string,
    subtitle: string,
    questions: string[]
  ) => {
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return (
        <div className="p-6 bg-white/[0.01] border border-white/5 rounded-2xl text-center text-xs text-white/40">
          Nenhuma pergunta cadastrada nesta seção.
        </div>
      );
    }

    const safeIndex = Math.min(Math.max(0, currentQuestionIndex), questions.length - 1);
    const currentQ = questions[safeIndex] || '';

    return (
      <div className="flex flex-col gap-5">
        {/* Step Header & View Mode Switcher */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />
              <h3 className="text-xs uppercase tracking-widest text-white/50 font-bold">{title}</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={() => setIsFullscreenMeet(true)}
              className="px-3.5 py-1.5 bg-neutral-950/80 hover:bg-neutral-900 text-blue-300 border border-blue-500/30 rounded-full text-xs font-bold tracking-wide transition-all flex items-center gap-1.5 shadow-md backdrop-blur-md cursor-pointer"
              title="Abrir em Tela Cheia"
            >
              <Maximize2 size={13} />
              <span>Tela Cheia</span>
            </button>

            {/* Flashcard / List Mode Toggle */}
            <div className="flex bg-neutral-900 border border-white/10 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setViewMode('flashcard')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === 'flashcard'
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-white/40 hover:text-white/70'
                }`}
                title="Mostrar perguntas uma por uma (Flashcard)"
              >
                <Layers size={13} />
                <span className="hidden md:inline">Flashcard</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-white/40 hover:text-white/70'
                }`}
                title="Mostrar lista com todas as perguntas"
              >
                <List size={13} />
                <span className="hidden md:inline">Lista</span>
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'flashcard' ? (
          /* SINGLE FLASHCARD DISPLAY */
          <div className="flex flex-col gap-4">
            {/* Flashcard Box */}
            <div className="bg-gradient-to-b from-neutral-900/90 to-neutral-900/40 border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl relative min-h-[260px] md:min-h-[290px] flex flex-col justify-between items-center text-center">
              
              {/* Top Bar of Card */}
              <div className="w-full flex justify-between items-center text-[10px] uppercase tracking-widest font-mono text-white/40 border-b border-white/5 pb-3">
                <span className="font-semibold text-white/60">
                  PERGUNTA {safeIndex + 1} DE {questions.length}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleTranslateSentence(currentQ, e)}
                    className="p-1.5 bg-white/5 hover:bg-amber-500/20 text-white/40 hover:text-amber-300 border border-white/10 hover:border-amber-500/30 rounded-lg transition-all cursor-pointer"
                    title="Traduzir pergunta completa em português"
                  >
                    <Languages size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => speakText(currentQ)}
                    className="p-1.5 bg-white/5 hover:bg-blue-500/20 text-white/40 hover:text-blue-300 border border-white/10 hover:border-blue-500/30 rounded-lg transition-all cursor-pointer"
                    title="Ouvir pronúncia da pergunta em inglês"
                  >
                    <Volume2 size={15} />
                  </button>
                </div>
              </div>

              {/* Main Question Text (Interactive Words) */}
              <div className="my-6 text-lg md:text-2xl lg:text-3xl font-medium leading-relaxed text-white/95 max-w-2xl select-text">
                {renderInteractiveText(currentQ)}
              </div>
            </div>

            {/* Flashcard Bottom Navigation & Question Picker */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white/[0.01] border border-white/5 rounded-2xl p-3">
              <button
                type="button"
                onClick={handlePrevQuestion}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-wider text-white/80 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer w-full sm:w-auto justify-center"
              >
                <ChevronLeft size={16} />
                <span>Anterior</span>
              </button>

              {/* Number pills to jump */}
              <div className="flex flex-wrap justify-center gap-1.5">
                {questions.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                      idx === safeIndex
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                        : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleNextQuestion}
                className="px-4 py-2 bg-blue-600/90 hover:bg-blue-600 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-950/20 w-full sm:w-auto justify-center"
              >
                <span>Próxima</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          /* FULL LIST DISPLAY */
          <div className="grid grid-cols-1 gap-3">
            {questions.map((q, i) => (
              <div
                key={i}
                className="p-5 bg-white/[0.02] border border-white/5 hover:border-white/15 rounded-2xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                <div className="flex gap-3 items-start flex-1">
                  <span className="text-xs font-mono font-bold text-white/30 mt-0.5">0{i + 1}</span>
                  <div className="text-sm md:text-base text-white/90 font-medium leading-relaxed select-text">
                    {renderInteractiveText(q)}
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => speakText(q)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/70 hover:text-white transition-all cursor-pointer flex items-center gap-1 text-xs"
                    title="Ouvir Pergunta"
                  >
                    <Volume2 size={13} />
                    <span className="hidden md:inline">Ouvir</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentQuestionIndex(i);
                      setViewMode('flashcard');
                    }}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/70 hover:text-white transition-all cursor-pointer flex items-center gap-1 text-xs"
                    title="Focar nesta pergunta em Flashcard"
                  >
                    <Layers size={13} />
                    <span className="hidden md:inline">Flashcard</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Close dictionary popover on clicking elsewhere
  useEffect(() => {
    const handleOutsideClick = () => {
      setSelectedWord(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Filter & Search Library
  const filteredLibrary = library.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.theme.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.grammarFocus.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = filterLevel === 'All' || item.level === filterLevel;
    const matchesGoal = filterGoal === 'All' || item.goal === filterGoal;
    const matchesTheme = filterTheme === 'All' || item.theme === filterTheme;
    const matchesFavorite = !showOnlyFavorites || item.isFavorite;

    return matchesSearch && matchesLevel && matchesGoal && matchesTheme && matchesFavorite;
  });

  return (
    <div className="w-full max-w-6xl mx-auto px-4 md:px-8 pb-28 md:pb-36 pt-2">
      {/* App Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-light tracking-wider text-white">
            Brazilian <span className="font-semibold" style={{ color: accentColor }}>Conversation</span>
          </h1>
        </div>

        {/* Tab buttons */}
        <div className="flex bg-neutral-900/60 p-1 rounded-xl border border-white/5 backdrop-blur-md self-stretch sm:self-auto justify-stretch sm:justify-start">
          <button
            onClick={() => setActiveTab('generate')}
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all duration-200 ${
              activeTab === 'generate' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
            }`}
          >
            Studio
          </button>
          <button
            onClick={() => setActiveTab('library')}
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all duration-200 relative ${
              activeTab === 'library' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
            }`}
          >
            Library
            {library.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {library.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('vocabulary')}
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all duration-200 ${
              activeTab === 'vocabulary' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
            }`}
          >
            Glossary
            {savedWords.length > 0 && (
              <span className="ml-1 text-[10px] text-amber-300 font-mono">({savedWords.length})</span>
            )}
          </button>
        </div>
      </div>

      {/* Main Panel Routing */}
      <AnimatePresence mode="wait">
        {activeTab === 'generate' && (
          <motion.div
            key="studio-tab"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Left side: Configuration (if no lesson generated, or expandable) */}
            <div className={`lg:col-span-4 flex flex-col gap-6`}>
              <div className="bg-neutral-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.01] rounded-full blur-2xl pointer-events-none" />

                <h2 className="text-sm font-semibold tracking-widest text-white/80 uppercase mb-5 flex items-center gap-2">
                  <Sparkles size={14} style={{ color: accentColor }} />
                  Lesson Settings
                </h2>

                <div className="flex flex-col gap-5">
                  {/* Choose your level */}
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-2 font-semibold">
                      Choose your Level
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {LEVELS.map((level) => (
                        <button
                          key={level}
                          onClick={() => setSelectedLevel(level)}
                          className={`py-2 rounded-xl text-xs font-semibold transition-all border ${
                            selectedLevel === level
                              ? 'border-white/20 text-black'
                              : 'bg-white/[0.02] border-white/5 text-white/50 hover:text-white hover:border-white/10'
                          }`}
                          style={{
                            backgroundColor: selectedLevel === level ? accentColor : undefined
                          }}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Choose your goal */}
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-2 font-semibold">
                      Choose your Goal
                    </label>
                    <select
                      value={selectedGoal}
                      onChange={(e) => setSelectedGoal(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white/80 focus:outline-none focus:border-white/20 transition-all font-semibold"
                    >
                      {GOALS.map((goal) => (
                        <option key={goal} value={goal} className="bg-neutral-950 text-white/80">
                          {goal}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Choose your theme */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[10px] uppercase tracking-wider text-white/40 block font-semibold">
                        Choose your Theme
                      </label>
                      <button
                        onClick={handleRandomTheme}
                        className="text-[10px] uppercase tracking-wider text-white/60 hover:text-white flex items-center gap-1.5 transition-all font-semibold"
                      >
                        Random Theme
                      </button>
                    </div>
                    <select
                      value={selectedTheme}
                      onChange={(e) => setSelectedTheme(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white/80 focus:outline-none focus:border-white/20 transition-all font-semibold"
                    >
                      {THEMES.map((theme) => (
                        <option key={theme} value={theme} className="bg-neutral-950 text-white/80">
                          {theme}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Conversation Duration */}
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-2 font-semibold">
                      Conversation Duration
                    </label>
                    <select
                      value={selectedDuration}
                      onChange={(e) => setSelectedDuration(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white/80 focus:outline-none focus:border-white/20 transition-all font-semibold"
                    >
                      {DURATIONS.map((dur) => (
                        <option key={dur} value={dur} className="bg-neutral-950 text-white/80">
                          {dur}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={() => handleGenerate(false)}
                    disabled={isGenerating}
                    className="w-full py-3.5 rounded-xl text-xs uppercase font-bold tracking-widest text-black flex items-center justify-center gap-2 transition-all hover:brightness-110 disabled:opacity-50 cursor-pointer mt-2"
                    style={{ backgroundColor: accentColor }}
                  >
                    <Sparkles size={14} className="animate-pulse" />
                    {isGenerating ? 'Gerando Lição de Conversa...' : 'Gerar Lição de Conversa'}
                  </button>
                </div>
              </div>

              {/* Saved words widget inside Studio */}
              {savedWords.length > 0 && (
                <div className="bg-neutral-900/30 border border-white/5 rounded-2xl p-4 hidden lg:block">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                      Recent Saved Words
                    </h3>
                    <button
                      onClick={() => setActiveTab('vocabulary')}
                      className="text-[9px] uppercase tracking-widest hover:underline"
                      style={{ color: accentColor }}
                    >
                      View All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {savedWords.slice(0, 8).map((w, i) => (
                      <span
                        key={i}
                        onClick={() => speakWord(w.word)}
                        className="px-2 py-1 bg-white/[0.02] border border-white/10 rounded-lg text-xs text-white/60 hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        {w.word}
                        <Volume2 size={10} className="text-white/30" />
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right side: Lesson Output / Work Area */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              {isGenerating ? (
                // LOADING STAGE
                <div className="bg-neutral-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-12 shadow-xl flex flex-col items-center justify-center min-h-[450px]">
                  <div className="relative mb-6">
                    <div className="w-16 h-16 rounded-full border-t border-b border-white/10 animate-spin flex items-center justify-center" />
                    <Sparkles
                      className="absolute inset-0 m-auto animate-pulse text-white/50"
                      size={20}
                      style={{ color: accentColor }}
                    />
                  </div>
                  <h3 className="text-sm font-semibold tracking-widest text-white/80 uppercase mb-2">
                    AI Lesson Design Studio
                  </h3>
                  <p className="text-xs text-white/40 text-center max-w-sm font-mono animate-pulse">
                    {generationStep}
                  </p>
                </div>
              ) : currentLesson ? (
                // GENERATED LESSON INTERACTIVE AREA
                <div className="flex flex-col gap-6">
                  {/* Lesson Meta Bar */}
                  <div className="bg-neutral-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border border-white/10 mr-2"
                        style={{ color: accentColor, borderColor: `${accentColor}30` }}
                      >
                        {currentLesson.level}
                      </span>
                      <span className="text-[10px] text-white/40 font-mono">
                        {currentLesson.goal} • {currentLesson.theme}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <h2 className="text-lg font-medium text-white tracking-wide">
                          {currentLesson.title}
                        </h2>
                        <button
                          type="button"
                          onClick={(e) => handleTranslateSentence(currentLesson.title, e)}
                          className="p-1 rounded-lg bg-white/5 hover:bg-amber-500/20 text-white/40 hover:text-amber-300 border border-white/10 transition-all cursor-pointer"
                          title="Traduzir título da lição"
                        >
                          <Languages size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setCurrentLesson(null)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/30 uppercase tracking-wider"
                        title="Concluir lição e voltar para a tela inicial do aplicativo"
                      >
                        <Check size={14} />
                        <span>Done</span>
                      </button>

                      {library.length > 0 && (
                        <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-xl">
                          <button
                            onClick={() => {
                              const currIdx = library.findIndex((l) => l.id === currentLesson.id);
                              if (currIdx > 0) {
                                setCurrentLesson(library[currIdx - 1]);
                                setActiveStep(1);
                              }
                            }}
                            disabled={library.findIndex((l) => l.id === currentLesson.id) <= 0}
                            className="px-2 py-1 text-[10px] font-bold uppercase rounded-lg hover:bg-white/10 disabled:opacity-20 text-white/80 cursor-pointer flex items-center gap-1"
                            title="Lição Anterior da Biblioteca"
                          >
                            <ChevronLeft size={12} />
                            <span className="hidden md:inline">Anterior</span>
                          </button>
                          <span className="text-[10px] font-mono text-white/40 px-1">
                            {Math.max(1, library.findIndex((l) => l.id === currentLesson.id) + 1)}/{library.length}
                          </span>
                          <button
                            onClick={() => {
                              const currIdx = library.findIndex((l) => l.id === currentLesson.id);
                              if (currIdx >= 0 && currIdx < library.length - 1) {
                                setCurrentLesson(library[currIdx + 1]);
                                setActiveStep(1);
                              }
                            }}
                            disabled={
                              library.findIndex((l) => l.id === currentLesson.id) < 0 ||
                              library.findIndex((l) => l.id === currentLesson.id) >= library.length - 1
                            }
                            className="px-2 py-1 text-[10px] font-bold uppercase rounded-lg bg-blue-600/80 hover:bg-blue-600 disabled:opacity-20 text-white cursor-pointer flex items-center gap-1"
                            title="Próxima Lição da Biblioteca"
                          >
                            <span className="hidden md:inline">Próxima Lição</span>
                            <ChevronRight size={12} />
                          </button>
                        </div>
                      )}

                      <button
                        onClick={handleSaveLesson}
                        className="flex-1 sm:flex-initial px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold uppercase tracking-wider text-white/70 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Save size={13} />
                        Save Activity
                      </button>

                      <button
                        onClick={() => handleGenerate(true)}
                        className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/70 hover:text-white transition-all cursor-pointer"
                        title="Regenerar lição"
                      >
                        <RotateCw size={14} />
                      </button>

                      <button
                        onClick={() => handleToggleFavorite(currentLesson.id)}
                        className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/70 hover:text-white transition-all cursor-pointer"
                        title="Favorito"
                      >
                        <Star
                          size={14}
                          className={currentLesson.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Flexible Class Stopwatch */}
                  <div className="bg-neutral-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-xl flex justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                        <Clock size={16} className={isTimerRunning ? 'animate-pulse text-green-400' : 'text-white/40'} />
                      </div>
                      <div>
                        <p className="text-[9px] font-mono uppercase tracking-wider text-white/30">
                          Speaking Stopwatch
                        </p>
                        <p className="text-xl font-mono text-white/90 font-semibold">
                          {formatTime(time)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleTimer}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                          isTimerRunning
                            ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                            : 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'
                        }`}
                      >
                        {isTimerRunning ? <Pause size={12} /> : <Play size={12} />}
                        {isTimerRunning ? 'Pause' : 'Start'}
                      </button>
                      <button
                        onClick={resetTimer}
                        className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/50 hover:text-white transition-all cursor-pointer"
                        title="Reset stopwatch"
                      >
                        <RotateCcw size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Stepwise Presentation Box */}
                  <div className="bg-neutral-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl relative min-h-[350px] flex flex-col justify-between">
                    {/* step header tabs (jump directly to step) */}
                    <div className="flex flex-wrap gap-1 border-b border-white/5 pb-4 mb-6">
                      {[1, 2, 3, 4, 5, 6, 7].map((stepNum) => {
                        const stepLabels = [
                          'Starter Text',
                          'Warm-up',
                          'Discussion',
                          'Follow-up',
                          'Vocabulary',
                          'Expressions',
                          'Teacher Guide'
                        ];
                        const isActive = activeStep === stepNum;
                        return (
                          <button
                            key={stepNum}
                            onClick={() => setActiveStep(stepNum)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider border transition-all cursor-pointer ${
                              isActive
                                ? 'bg-white/10 text-white border-white/15'
                                : 'bg-transparent text-white/40 border-transparent hover:text-white/60 hover:bg-white/5'
                            }`}
                            style={{ borderColor: isActive ? accentColor : undefined }}
                          >
                            {stepNum}. {stepLabels[stepNum - 1]}
                          </button>
                        );
                      })}
                    </div>

                    {/* Step Content Renderers */}
                    <div className="flex-1 mb-8">
                      <AnimatePresence mode="wait">
                        {activeStep === 1 && (
                          <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="flex flex-col gap-4"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: accentColor }}
                              />
                              <h3 className="text-xs uppercase tracking-widest text-white/40 font-bold">
                                Step 1 • Conversation Starter
                              </h3>
                            </div>
                            <div className="mt-4 p-6 bg-white/[0.01] border border-white/5 rounded-2xl leading-relaxed text-sm text-white/80 select-text relative">
                              {renderInteractiveText(currentLesson.starter)}
                            </div>
                          </motion.div>
                        )}

                        {activeStep === 2 && (
                          <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                          >
                            {renderQuestionSection(
                              'Step 2 • Warm-up Questions',
                              'Perguntas fáceis e leves para introduzir o aluno na discussão sem bloqueios.',
                              currentLesson.warmup
                            )}
                          </motion.div>
                        )}

                        {activeStep === 3 && (
                          <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                          >
                            {renderQuestionSection(
                              'Step 3 • Main Discussion',
                              `Perguntas de conversação estruturadas especificamente para o nível ${currentLesson.level}.`,
                              currentLesson.mainDiscussion
                            )}
                          </motion.div>
                        )}

                        {activeStep === 4 && (
                          <motion.div
                            key="step4"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                          >
                            {renderQuestionSection(
                              'Step 4 • Follow-up Prompts',
                              'Estimule respostas mais longas e detalhadas utilizando estas perguntas auxiliares de aprofundamento.',
                              currentLesson.followup
                            )}
                          </motion.div>
                        )}

                        {activeStep === 5 && (
                          <motion.div
                            key="step5"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="flex flex-col gap-4"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: accentColor }}
                              />
                              <h3 className="text-xs uppercase tracking-widest text-white/40 font-bold">
                                Step 5 • Useful Vocabulary
                              </h3>
                            </div>
                            <p className="text-xs text-white/40 leading-relaxed max-w-xl mb-2">
                              Vocabulário central estruturado pela IA para auxiliar na expressão das ideias. Clique nas palavras para escutar a pronúncia.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {(currentLesson.vocabulary || []).map((vocab, i) => {
                                const isSaved = savedWords.some(
                                  (w) => w.word.toLowerCase() === vocab.word.toLowerCase()
                                );
                                return (
                                  <div
                                    key={i}
                                    className="p-4 bg-white/[0.01] border border-white/5 hover:border-white/15 rounded-2xl flex flex-col gap-1 transition-all group relative"
                                  >
                                    <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-semibold text-white/90">{vocab.word}</h4>
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/40 uppercase font-mono">
                                          {vocab.pos}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={() => speakWord(vocab.word)}
                                          className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/70"
                                          title="Listen pronunciation"
                                        >
                                          <Volume2 size={11} />
                                        </button>
                                        <button
                                          onClick={() => handleSaveWord(vocab)}
                                          className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/70"
                                          title={isSaved ? 'Remove from Glossary' : 'Save word'}
                                        >
                                          <Star
                                            size={11}
                                            className={isSaved ? 'fill-amber-300 text-amber-300' : ''}
                                          />
                                        </button>
                                      </div>
                                    </div>
                                    <p className="text-[10px] text-white/30 font-mono italic">
                                      {vocab.pronunciation} •{' '}
                                      <span className="text-amber-300/60 not-italic font-sans">
                                        {vocab.translation}
                                      </span>
                                    </p>
                                    <p className="text-xs text-white/60 mt-1 pl-2 border-l border-white/10 italic leading-relaxed">
                                      "{vocab.example}"
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}

                        {activeStep === 6 && (
                          <motion.div
                            key="step6"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                          >
                            {renderQuestionSection(
                              'Step 6 • Natural Expressions',
                              'Expressões úteis e articuladores de discurso para dar fluidez e elegância ao speaking do aluno.',
                              currentLesson.expressions
                            )}
                          </motion.div>
                        )}

                        {activeStep === 7 && (
                          <motion.div
                            key="step7"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="flex flex-col gap-5"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: accentColor }}
                              />
                              <h3 className="text-xs uppercase tracking-widest text-white/40 font-bold">
                                Step 7 • Teacher Notes & Grammar Focus
                              </h3>
                            </div>

                            {/* Grammar Target Box */}
                            <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl flex flex-col gap-1.5">
                              <h4 className="text-[10px] uppercase tracking-wider text-white/40 font-bold">
                                Grammar Target
                              </h4>
                              <p className="text-sm font-semibold text-white/90">
                                {currentLesson.grammarFocus}
                              </p>
                            </div>

                            {/* Teachers suggestions */}
                            <div className="flex flex-col gap-2">
                              <h4 className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-1">
                                Facilitator Suggestions
                              </h4>
                              <div className="flex flex-col gap-2">
                                {(currentLesson.teacherNotes || []).map((note, i) => (
                                  <div
                                    key={i}
                                    className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-xs text-white/70 leading-relaxed flex gap-2 items-start"
                                  >
                                    <span
                                      className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                                      style={{ backgroundColor: accentColor }}
                                    />
                                    <span>{note}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Step Navigator Footer */}
                    <div className="flex justify-between items-center border-t border-white/5 pt-5 mt-4">
                      <button
                        onClick={() => setActiveStep((prev) => Math.max(1, prev - 1))}
                        disabled={activeStep === 1}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-xl text-xs font-semibold uppercase tracking-wider text-white/70 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <ChevronLeft size={14} />
                        Previous
                      </button>

                      <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
                        Step {activeStep} of 7
                      </div>

                      <button
                        onClick={() => setActiveStep((prev) => Math.min(7, prev + 1))}
                        disabled={activeStep === 7}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-xl text-xs font-semibold uppercase tracking-wider text-white/70 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                      >
                        Next
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // STUDIO INITIAL WELCOME EMBEDDED
                <div className="bg-neutral-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-12 shadow-xl flex flex-col items-center justify-center min-h-[450px] relative overflow-hidden">
                  <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/[0.01] rounded-full blur-3xl pointer-events-none" />
                  <div
                    className="p-4 rounded-3xl bg-white/[0.01] border border-white/5 mb-6"
                    style={{ color: accentColor }}
                  >
                    <Mic size={36} />
                  </div>
                  <h3 className="text-xl font-medium tracking-wide text-white text-center">
                    Brazilian Conversation Studio
                  </h3>
                  <p className="text-xs text-white/40 text-center max-w-sm leading-relaxed mt-2">
                    Escolha as preferências ao lado e clique em{' '}
                    <span className="font-semibold text-white/60">Generate Conversation</span> para criar
                    uma experiência completa e profissional de speaking para
                    suas aulas.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'library' && (
          <motion.div
            key="library-tab"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex flex-col gap-6"
          >
            {/* Search and filter toolbar */}
            <div className="bg-neutral-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-3">
                {/* Search query input */}
                <div className="flex-1 bg-white/[0.02] border border-white/15 rounded-xl px-4 py-2.5 flex items-center gap-3">
                  <Search size={15} className="text-white/30" />
                  <input
                    type="text"
                    placeholder="Search by title, theme or grammar focus..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-xs text-white placeholder-white/30 focus:outline-none"
                  />
                </div>

                {/* Level selection */}
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="bg-neutral-900 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white/70 focus:outline-none"
                >
                  <option value="All">All Levels</option>
                  {LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>

                {/* Goal selection */}
                <select
                  value={filterGoal}
                  onChange={(e) => setFilterGoal(e.target.value)}
                  className="bg-neutral-900 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white/70 focus:outline-none"
                >
                  <option value="All">All Goals</option>
                  {GOALS.map((goal) => (
                    <option key={goal} value={goal}>
                      {goal}
                    </option>
                  ))}
                </select>

                {/* Favorite toggle switch */}
                <button
                  onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                    showOnlyFavorites
                      ? 'bg-yellow-400/10 border-yellow-400/20 text-yellow-400'
                      : 'bg-white/[0.02] border-white/15 text-white/50 hover:text-white'
                  }`}
                >
                  <Star size={13} className={showOnlyFavorites ? 'fill-yellow-400' : ''} />
                  Favorites
                </button>
              </div>
            </div>

            {/* Library Grid rendering */}
            {filteredLibrary.length === 0 ? (
              <div className="bg-neutral-900/40 border border-white/5 rounded-3xl p-16 text-center shadow-xl">
                <BookOpen size={32} className="text-white/20 mx-auto mb-4" />
                <h3 className="text-sm uppercase tracking-widest text-white/60 font-semibold">
                  No Saved Conversations Found
                </h3>
                <p className="text-xs text-white/40 mt-1 max-w-md mx-auto leading-relaxed">
                  Gere e salve lições no Studio ou limpe os filtros para visualizar as conversas salvas
                  na biblioteca.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredLibrary.map((lesson) => (
                  <div
                    key={lesson.id}
                    onClick={() => handleOpenSavedLesson(lesson)}
                    className="p-5 bg-neutral-900/40 backdrop-blur-xl border border-white/10 rounded-2xl hover:border-white/20 hover:bg-neutral-900/50 transition-all cursor-pointer group flex flex-col justify-between h-[210px] relative overflow-hidden"
                  >
                    <div>
                      {/* Badge and action headers */}
                      <div className="flex justify-between items-start">
                        <span
                          className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border border-white/10"
                          style={{ color: accentColor, borderColor: `${accentColor}30` }}
                        >
                          {lesson.level}
                        </span>
                        <div className="flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingLesson(lesson);
                            }}
                            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white"
                            title="Edit"
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            onClick={(e) => handleToggleFavorite(lesson.id, e)}
                            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white"
                            title="Toggle Favorite"
                          >
                            <Star
                              size={12}
                              className={lesson.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}
                            />
                          </button>
                          <button
                            onClick={(e) => handleDeleteLesson(lesson.id, e)}
                            className="p-1.5 bg-white/5 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-white"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Content block */}
                      <h4 className="text-sm font-semibold text-white/90 group-hover:text-white transition-all tracking-wide mt-3 line-clamp-1">
                        {lesson.title}
                      </h4>
                      <p className="text-[10px] text-white/40 tracking-wider uppercase font-mono mt-1">
                        {lesson.theme} • {lesson.goal}
                      </p>
                      <p className="text-xs text-white/50 line-clamp-2 mt-2 leading-relaxed">
                        {lesson.starter}
                      </p>
                    </div>

                    <div className="border-t border-white/5 pt-3 mt-3 flex justify-between items-center">
                      <span className="text-[9px] text-white/30 font-mono italic">
                        {lesson.grammarFocus}
                      </span>
                      <span className="text-[9px] text-white/30 font-mono">{lesson.createdAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'vocabulary' && (
          <motion.div
            key="vocabulary-tab"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex flex-col gap-6"
          >
            {/* Saved words table view */}
            <div className="bg-neutral-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
              <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-white/80">
                    Vocabulary Notebook
                  </h2>
                  <p className="text-xs text-white/40 mt-0.5">
                    Palavras e expressões salvas durante suas leituras no Speaking Studio.
                  </p>
                </div>
                {savedWords.length > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm('Deseja limpar todo o seu vocabulário de conversação?')) {
                        saveWordsToStorage([]);
                      }
                    }}
                    className="px-3.5 py-1.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-semibold uppercase tracking-wider text-red-400 hover:bg-red-500/20 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={12} />
                    Limpar Tudo
                  </button>
                )}
              </div>

              {savedWords.length === 0 ? (
                <div className="py-16 text-center text-white/30">
                  <BookOpen size={28} className="mx-auto text-white/15 mb-3" />
                  <p className="text-xs uppercase tracking-widest font-semibold">Glossário Vazio</p>
                  <p className="text-[11px] text-white/40 mt-1">
                    As palavras que você salvar no Speaking Studio aparecerão listadas aqui para revisão.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedWords.map((vocab, i) => (
                    <div
                      key={i}
                      className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl hover:border-white/10 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-white">{vocab.word}</h3>
                            <span className="text-[9px] px-1.5 py-0.5 bg-white/5 text-white/40 rounded uppercase font-mono">
                              {vocab.pos}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => speakWord(vocab.word)}
                              className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white"
                              title="Pronunciar"
                            >
                              <Volume2 size={12} />
                            </button>
                            <button
                              onClick={() => handleSaveWord(vocab)}
                              className="p-1.5 bg-white/5 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-white/60"
                              title="Delete word"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        <p className="text-[10px] text-white/30 font-mono italic mt-0.5">
                          {vocab.pronunciation} •{' '}
                          <span className="text-amber-300/60 not-italic font-sans">
                            {vocab.translation}
                          </span>
                        </p>
                        <p className="text-xs text-white/60 italic leading-relaxed mt-2 pl-2 border-l border-white/10">
                          "{vocab.example}"
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dictionary Popover/Popup (Absolute layout, rendered on top level of body using fixed portal simulator) */}
      <AnimatePresence>
        {selectedWord && definition && popoverPosition && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            className="fixed z-[200000] w-64 bg-neutral-950/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 text-left font-sans"
            style={{
              left: Math.min(window.innerWidth - 280, Math.max(16, popoverPosition.x - 128)),
              top: Math.min(window.innerHeight - 200, Math.max(80, popoverPosition.y - 190))
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {definition.loading ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <div className="w-5 h-5 border-t border-b border-white/40 rounded-full animate-spin" />
                <span className="text-[10px] font-mono text-white/40 uppercase">Translating word...</span>
              </div>
            ) : definition.error ? (
              <div className="text-center py-4">
                <p className="text-xs text-red-400 font-semibold">Could not load definition</p>
                <button
                  onClick={() => setSelectedWord(null)}
                  className="mt-2 px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] text-white/60 hover:text-white"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs font-bold text-white">{definition.word}</h4>
                      {definition.pos && (
                        <span className="text-[8px] font-mono uppercase bg-white/5 text-white/40 px-1 py-0.2 rounded">
                          {definition.pos}
                        </span>
                      )}
                    </div>
                    {definition.pronunciation && (
                      <span className="text-[9px] font-mono text-white/30 italic">
                        {definition.pronunciation}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => speakWord(definition.word)}
                      className="p-1 bg-white/5 hover:bg-white/10 rounded text-white/60 hover:text-white"
                      title="Pronounce"
                    >
                      <Volume2 size={11} />
                    </button>
                    <button
                      onClick={() => handleSaveWord(definition)}
                      className="p-1 bg-white/5 hover:bg-white/10 rounded text-white/60 hover:text-white"
                      title="Save word"
                    >
                      <Star
                        size={11}
                        className={
                          savedWords.some((w) => w.word.toLowerCase() === definition.word.toLowerCase())
                            ? 'fill-amber-300 text-amber-300'
                            : ''
                        }
                      />
                    </button>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-2 flex flex-col gap-1.5">
                  <div>
                    <span className="text-[8px] uppercase font-mono text-white/30 tracking-wider">
                      Translation
                    </span>
                    <p className="text-xs font-medium text-amber-300/90 capitalize leading-tight">
                      {definition.translation}
                    </p>
                  </div>

                  {definition.example && (
                    <div>
                      <span className="text-[8px] uppercase font-mono text-white/30 tracking-wider">
                        Context Example
                      </span>
                      <p className="text-[11px] text-white/60 leading-normal italic">
                        "{definition.example}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Lesson Modal */}
      {editingLesson && (
        <div className="fixed inset-0 z-[6000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/15 rounded-3xl w-full max-w-xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/80 border-b border-white/5 pb-3 mb-4">
              Edit Saved Speaking Activity
            </h3>

            <div className="flex flex-col gap-4">
              {/* Edit Title */}
              <div>
                <label className="text-[9px] uppercase tracking-wider text-white/40 block mb-1">
                  Activity Title
                </label>
                <input
                  type="text"
                  value={editingLesson.title}
                  onChange={(e) => setEditingLesson({ ...editingLesson, title: e.target.value })}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              {/* Edit Starter Text */}
              <div>
                <label className="text-[9px] uppercase tracking-wider text-white/40 block mb-1">
                  Conversation Starter Text
                </label>
                <textarea
                  value={editingLesson.starter}
                  onChange={(e) => setEditingLesson({ ...editingLesson, starter: e.target.value })}
                  rows={6}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2 text-xs text-white leading-relaxed focus:outline-none"
                />
              </div>

              {/* Edit Grammar Focus */}
              <div>
                <label className="text-[9px] uppercase tracking-wider text-white/40 block mb-1">
                  Grammar Focus
                </label>
                <input
                  type="text"
                  value={editingLesson.grammarFocus}
                  onChange={(e) => setEditingLesson({ ...editingLesson, grammarFocus: e.target.value })}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              {/* Save & Cancel */}
              <div className="flex justify-end gap-2 border-t border-white/5 pt-4 mt-2">
                <button
                  onClick={() => setEditingLesson(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-semibold uppercase tracking-wider text-white/70 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const updated = library.map((item) =>
                      item.id === editingLesson.id ? editingLesson : item
                    );
                    saveLibraryToStorage(updated);
                    if (currentLesson && currentLesson.id === editingLesson.id) {
                      setCurrentLesson(editingLesson);
                    }
                    setEditingLesson(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest text-black flex items-center gap-1.5"
                  style={{ backgroundColor: accentColor }}
                >
                  <Check size={12} />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Presentation Mode Overlay */}
      <AnimatePresence>
        {isFullscreenMeet && currentLesson && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="fixed inset-0 z-[9999] bg-neutral-950/90 backdrop-blur-2xl text-white p-3 sm:p-6 md:p-8 flex flex-col justify-between overflow-hidden select-text"
          >
            {/* Top Floating Controls - No Background Bar, Floating Pills Like Lousa de Horarios */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 shrink-0 z-30 pointer-events-auto">
              <div className="flex items-center gap-2 bg-neutral-950/80 px-3 py-1.5 rounded-full border border-white/15 backdrop-blur-md shadow-md min-w-0">
                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest text-black shadow-sm shrink-0"
                  style={{ backgroundColor: accentColor }}
                >
                  {currentLesson.level}
                </span>
                <div className="min-w-0">
                  <h2 className="text-xs sm:text-sm font-bold text-white tracking-wide truncate max-w-[150px] sm:max-w-md">
                    {currentLesson.title}
                  </h2>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0 hidden sm:inline">
                  Tela Cheia
                </span>
              </div>

              {/* Stopwatch & Close */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex items-center gap-1.5 bg-neutral-950/80 border border-white/15 px-3 py-1.5 rounded-full font-mono text-xs text-white backdrop-blur-md shadow-md">
                  <Clock size={12} className="text-white/40" />
                  <span>{formatTime(time)}</span>
                  <button
                    type="button"
                    onClick={toggleTimer}
                    className="ml-0.5 p-0.5 hover:bg-white/10 rounded text-white/70 hover:text-white cursor-pointer"
                  >
                    {isTimerRunning ? <Pause size={12} /> : <Play size={12} />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsFullscreenMeet(false)}
                  className="px-3.5 py-1.5 bg-neutral-950/80 hover:bg-red-500/20 border border-red-500/30 rounded-full text-xs font-bold uppercase tracking-wider text-red-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-md backdrop-blur-md"
                  title="Sair da Tela Cheia"
                >
                  <X size={14} />
                  <span>Sair</span>
                </button>
              </div>
            </div>

            {/* Center Content: Giant Card */}
            <div className="flex-1 my-8 flex flex-col items-center justify-center max-w-4xl mx-auto w-full">
              {(() => {
                const questions = getStepItems(activeStep);
                if (questions.length === 0) {
                  return (
                    <div className="text-center p-8 md:p-12 bg-white/[0.02] rounded-3xl border border-white/10 max-w-3xl shadow-2xl">
                      <h3 className="text-xs uppercase tracking-widest text-white/40 font-mono mb-4">
                        Conversation Starter Text
                      </h3>
                      <div className="text-lg md:text-2xl text-white/90 leading-relaxed font-medium">
                        {renderInteractiveText(currentLesson.starter)}
                      </div>
                    </div>
                  );
                }

                const safeIdx = Math.min(Math.max(0, currentQuestionIndex), questions.length - 1);
                const currentQ = questions[safeIdx];

                return (
                  <motion.div
                    key={safeIdx}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="w-full bg-gradient-to-b from-neutral-900 to-neutral-950 border border-white/15 rounded-3xl p-8 md:p-14 shadow-2xl flex flex-col items-center justify-between text-center min-h-[360px]"
                  >
                    <div className="w-full flex justify-between items-center text-xs uppercase tracking-widest font-mono text-white/40 border-b border-white/10 pb-4">
                      <span className="font-semibold text-white/60">
                        PERGUNTA {safeIdx + 1} DE {questions.length}
                      </span>
                      
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleTranslateSentence(currentQ, e)}
                          className="p-2 bg-white/5 hover:bg-amber-500/20 text-white/50 hover:text-amber-300 border border-white/10 hover:border-amber-500/30 rounded-xl transition-all cursor-pointer shadow-sm"
                          title="Traduzir pergunta completa em português"
                        >
                          <Languages size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => speakText(currentQ)}
                          className="p-2 bg-white/5 hover:bg-blue-500/20 text-white/50 hover:text-blue-300 border border-white/10 hover:border-blue-500/30 rounded-xl transition-all cursor-pointer shadow-sm"
                          title="Ouvir pronúncia da pergunta em inglês"
                        >
                          <Volume2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="my-8 text-2xl md:text-3xl lg:text-4xl font-medium leading-relaxed text-white max-w-3xl">
                      {renderInteractiveText(currentQ)}
                    </div>
                  </motion.div>
                );
              })()}
            </div>

            {/* Bottom Controls */}
            <div className="flex flex-col md:flex-row justify-end items-center gap-4 border-t border-white/10 pt-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handlePrevQuestion}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-sm font-bold uppercase tracking-wider text-white transition-all flex items-center gap-2 cursor-pointer"
                >
                  <ChevronLeft size={18} />
                  <span>Anterior</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-2xl text-sm font-bold uppercase tracking-wider text-white transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-900/30"
                >
                  <span>Próxima Pergunta</span>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
