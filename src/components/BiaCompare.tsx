import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { translateText, lookupDictionary } from '../lib/translator';
import { auth, listenToAuth, syncToCloud } from '../lib/cloudSync';
import { subscribeToUserDataFromCloud } from '../lib/firebase';
import { compressImage } from '../lib/imageUtils';
import {
  Sparkles, Plus, Save, Copy, Star, Settings as SettingsIcon,
  Play, Search, Trash2, Edit2, ChevronLeft, ChevronRight,
  Maximize2, RotateCcw, ZoomIn, ZoomOut, Move, Volume2,
  VolumeX, Clock, FileUp, RefreshCw, Eye, EyeOff, LayoutGrid,
  Download, Upload, Check, AlertCircle, Info, Keyboard, X, PlayCircle, PauseCircle, Languages, Link
} from 'lucide-react';

interface CompareActivity {
  id: string;
  title: string;
  topic: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  objective: string;
  instructions: string;
  picAUrl: string;
  picBUrl: string;
  picALabel: string;
  picBLabel: string;
  questions: string[];
  teacherNotes: string;
  favorite: boolean;
  createdAt: number;
}

// Preset default activities to seed the database
const DEFAULT_ACTIVITIES: CompareActivity[] = [
  {
    id: 'seed-1',
    title: 'Urban vs. Rural Lifestyles',
    topic: 'Quality of Life & Environment',
    level: 'B2',
    objective: 'Compare the advantages and challenges of living in a busy metropolis versus a quiet countryside town.',
    instructions: 'Observe both pictures carefully. Compare and contrast the lifestyles shown. Consider job opportunities, daily stress levels, connection with nature, and social interactions.',
    picAUrl: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?q=80&w=600&auto=format&fit=crop', // Times Square
    picBUrl: 'https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?q=80&w=600&auto=format&fit=crop', // Countryside
    picALabel: 'Picture A (City Life)',
    picBLabel: 'Picture B (Rural Life)',
    questions: [
      'What are the main visual contrasts between these two environments?',
      'How does daily stress differ for residents in each of these places?',
      'What are the positive aspects of raising children in both settings?',
      'In which environment do you think people feel a stronger sense of community?',
      'If you had to live in one of these places for the next ten years, which would you choose and why?'
    ],
    teacherNotes: 'Vocabulary to elicit: fast-paced, high cost of living, congestion, serenity, isolated, rustic, connection to nature, hustle and bustle.',
    favorite: true,
    createdAt: Date.now() - 3600000 * 2,
  },
  {
    id: 'seed-2',
    title: 'Modern Learning Methods',
    topic: 'Education & Technology',
    level: 'B1',
    objective: 'Contrast traditional brick-and-mortar classrooms with independent online or remote learning.',
    instructions: 'Describe what the individuals are doing. Compare the social aspect and the level of distraction in both educational settings.',
    picAUrl: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?q=80&w=600&auto=format&fit=crop', // Classroom
    picBUrl: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?q=80&w=600&auto=format&fit=crop', // Home studying
    picALabel: 'Traditional Classroom',
    picBLabel: 'Remote Self-Study',
    questions: [
      'In what ways does physical presence in a classroom benefit learning?',
      'What are the major distractions a student faces when studying from home?',
      'Which type of learning requires more personal discipline and time-management?',
      'How has technology changed the role of the teacher in modern times?'
    ],
    teacherNotes: 'Elicit: self-motivated, peer-to-peer interaction, interactive whiteboards, distraction-free, blended learning.',
    favorite: false,
    createdAt: Date.now() - 3600000,
  }
];

export const BiaCompare: React.FC<{ accentColor: string; onNavigate?: (app: string) => void }> = ({ accentColor, onNavigate }) => {
  // State for activities
  const [activities, setActivities] = useState<CompareActivity[]>(() => {
    const saved = localStorage.getItem('bia_compare_activities');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading compare activities', e);
      }
    }
    return DEFAULT_ACTIVITIES;
  });

  const [selectedActivityId, setSelectedActivityId] = useState<string>(() => {
    return activities[0]?.id || 'seed-1';
  });

  // UI state filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  // Presentation State
  const [isPresenting, setIsPresenting] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [showQuestionsInPresentation, setShowQuestionsInPresentation] = useState(true);

  // Focus and Zoom Image states
  const [focusedImage, setFocusedImage] = useState<'A' | 'B' | null>(null);
  const [zoomA, setZoomA] = useState(1);
  const [zoomB, setZoomB] = useState(1);
  const [panA, setPanA] = useState({ x: 0, y: 0 });
  const [panB, setPanB] = useState({ x: 0, y: 0 });
  const [isDraggingA, setIsDraggingA] = useState(false);
  const [isDraggingB, setIsDraggingB] = useState(false);
  const dragStartA = useRef({ x: 0, y: 0 });
  const dragStartB = useRef({ x: 0, y: 0 });

  // Options settings toggle
  const [showLabels, setShowLabels] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);

  // Word Click & Definition Popup State
  const [activeWordDef, setActiveWordDef] = useState<{
    word: string;
    pos: string;
    pronunciation: string;
    translation: string;
    example: string;
  } | null>(null);
  const [isDefiningWord, setIsDefiningWord] = useState(false);

  // Done Activity Modal & Session Timer State
  const [isDoneModalOpen, setIsDoneModalOpen] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [isSessionTimerRunning, setIsSessionTimerRunning] = useState(true);

  // Image compression & local save lock
  const [isCompressingImage, setIsCompressingImage] = useState<'A' | 'B' | null>(null);
  const lastLocalSaveTimeRef = useRef<number>(0);

  // Session Stopwatch Ticker
  useEffect(() => {
    let interval: any = null;
    if (isSessionTimerRunning) {
      interval = setInterval(() => {
        setSessionSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isSessionTimerRunning]);

  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.88;
    window.speechSynthesis.speak(utterance);
  };

  const handleWordClick = async (word: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanWord = word.trim().replace(/[^a-zA-Z]/g, '');
    if (!cleanWord) return;

    speakText(cleanWord);
    setIsDefiningWord(true);
    setActiveWordDef(null);

    try {
      const res = await fetch('/api/define-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: cleanWord })
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.data && json.data.translation && json.data.translation !== 'Tradução rápida') {
          setActiveWordDef({
            word: cleanWord,
            pos: json.data.pos || 'palavra',
            pronunciation: json.data.pronunciation || `/${cleanWord}/`,
            translation: json.data.translation,
            example: json.data.example || `Exemplo com "${cleanWord}".`
          });
          setIsDefiningWord(false);
          return;
        }
      }
    } catch (err) {
      console.warn('api define-word error in BiaCompare, trying /api/translate fallback');
    }

    // Secondary fallback: translateText multi-tiered service
    try {
      const translation = await translateText(cleanWord);
      if (translation) {
        setActiveWordDef({
          word: cleanWord,
          pos: 'palavra',
          pronunciation: `/${cleanWord}/`,
          translation: translation,
          example: `Word: "${cleanWord}"`
        });
        setIsDefiningWord(false);
        return;
      }
    } catch (err) {
      console.warn('translateText failed in BiaCompare', err);
    }

    const dictMatch = lookupDictionary(cleanWord.toLowerCase());
    setActiveWordDef({
      word: cleanWord,
      pos: 'palavra',
      pronunciation: `/${cleanWord}/`,
      translation: dictMatch || cleanWord,
      example: `Word: "${cleanWord}"`
    });
    setIsDefiningWord(false);
  };

  const handleSentenceTranslate = async (fullText: string) => {
    if (!fullText) return;
    setIsDefiningWord(true);
    setActiveWordDef(null);

    try {
      const translation = await translateText(fullText);
      if (translation && translation.toLowerCase() !== fullText.toLowerCase()) {
        setActiveWordDef({
          word: 'Tradução da Pergunta',
          pos: 'frase',
          pronunciation: '',
          translation: translation,
          example: `"${fullText}"`
        });
        setIsDefiningWord(false);
        return;
      }
    } catch (e) {
      console.warn('Sentence translation failed', e);
    }

    setActiveWordDef({
      word: 'Tradução da Pergunta',
      pos: 'frase',
      pronunciation: '',
      translation: 'Não foi possível obter a tradução desta frase.',
      example: `"${fullText}"`
    });
    setIsDefiningWord(false);
  };

  const renderInteractiveText = (text: string) => {
    if (!text) return null;
    const tokens = text.split(/(\s+)/);
    return tokens.map((token, idx) => {
      if (/^\s+$/.test(token)) return token;
      const match = token.match(/^([a-zA-Z0-9'’-]+)(.*)$/);
      if (match) {
        const word = match[1];
        const punctuation = match[2];
        return (
          <React.Fragment key={idx}>
            <span
              onClick={(e) => handleWordClick(word, e)}
              className="cursor-pointer transition-all rounded px-0.5 hover:text-amber-300 hover:bg-amber-400/20 underline decoration-amber-400/40 underline-offset-4"
              title="Clique para pronunciar e ver a tradução instantânea"
            >
              {word}
            </span>
            {punctuation}
          </React.Fragment>
        );
      }
      return token;
    });
  };

  const handleFinishActivity = () => {
    setIsSessionTimerRunning(false);
    setIsDoneModalOpen(true);
    if (soundOn) playBuzzer();
  };

  // Timer State
  const [timerDuration, setTimerDuration] = useState<number | null>(null); // In minutes
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Keyboard Shortcuts overlay state
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Tooltip helper
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Currently open / active activity object
  const activeActivity = useMemo(() => {
    return activities.find(a => a.id === selectedActivityId) || activities[0] || null;
  }, [activities, selectedActivityId]);

  // Sync to LocalStorage & Cloud
  const saveActivities = (nextList: CompareActivity[]) => {
    setActivities(nextList);
    lastLocalSaveTimeRef.current = Date.now();

    const jsonStr = JSON.stringify(nextList);
    try {
      localStorage.setItem('bia_compare_activities', jsonStr);
    } catch (e) {
      console.warn('LocalStorage quota warning in BiaCompare:', e);
    }

    if (auth.currentUser) {
      if (jsonStr.length < 950000) {
        syncToCloud(auth.currentUser.uid, 'bia_compare_activities', nextList);
      } else {
        console.warn('Payload exceeds 950KB Firestore document safety threshold. Local copy preserved.');
      }
    }
  };

  // Real-time Cloud Sync Listener
  useEffect(() => {
    const unsubAuth = listenToAuth((user) => {
      if (!user) return;
      const unsubCloud = subscribeToUserDataFromCloud(
        user.uid,
        'bia_compare_activities',
        (data) => {
          if (data && Array.isArray(data) && data.length > 0) {
            // Prevent late remote snapshots from overwriting fresh local edits
            if (Date.now() - lastLocalSaveTimeRef.current < 3000) {
              return;
            }
            setActivities(data);
            try {
              localStorage.setItem('bia_compare_activities', JSON.stringify(data));
            } catch (e) {
              console.warn('Failed to update localStorage from cloud:', e);
            }
          }
        },
        () => {
          const stored = localStorage.getItem('bia_compare_activities');
          const payload = stored ? JSON.parse(stored) : activities;
          if (payload && payload.length > 0) {
            syncToCloud(user.uid, 'bia_compare_activities', payload);
          }
        }
      );
      return () => unsubCloud();
    });
    return () => unsubAuth();
  }, []);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in inputs or textareas
      const tagName = (e.target as HTMLElement).tagName;
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) {
        return;
      }

      const key = e.key.toLowerCase();

      switch (key) {
        case 'm':
          e.preventDefault();
          setIsPresenting(prev => !prev);
          break;
        case 'f':
          e.preventDefault();
          // Cycle through focus image
          setFocusedImage(prev => {
            if (prev === null) return 'A';
            if (prev === 'A') return 'B';
            return null;
          });
          break;
        case 'q':
          e.preventDefault();
          if (isPresenting) {
            setShowQuestionsInPresentation(prev => !prev);
          }
          break;
        case 'n':
          e.preventDefault();
          if (isPresenting && activeActivity && activeActivity.questions.length > 0) {
            setCurrentQuestionIdx(prev => Math.min(activeActivity.questions.length - 1, prev + 1));
          }
          break;
        case 'p':
          e.preventDefault();
          if (isPresenting) {
            setCurrentQuestionIdx(prev => Math.max(0, prev - 1));
          }
          break;
        case 's':
          e.preventDefault();
          handleExportActivity();
          break;
        case 'z':
          e.preventDefault();
          // Reset zoom/pan
          setZoomA(1);
          setZoomB(1);
          setPanA({ x: 0, y: 0 });
          setPanB({ x: 0, y: 0 });
          break;
        case 'escape':
          if (isPresenting) {
            e.preventDefault();
            setIsPresenting(false);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPresenting, activeActivity]);

  // Timer tick effect
  useEffect(() => {
    if (timerActive && timerSecondsLeft > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSecondsLeft(prev => {
          if (prev <= 1) {
            setTimerActive(false);
            playBuzzer();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerActive, timerSecondsLeft]);

  // Audio synthesizer beep
  const playBuzzer = () => {
    if (!soundOn) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      // Fun pleasant success notification chord
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration + 0.1);
      };

      playTone(523.25, 0, 0.35); // C5
      playTone(659.25, 0.12, 0.35); // E5
      playTone(783.99, 0.24, 0.6); // G5
    } catch (e) {
      console.error(e);
    }
  };

  // Timer controls
  const handleStartTimer = (mins: number) => {
    setTimerDuration(mins);
    setTimerSecondsLeft(mins * 60);
    setTimerActive(true);
  };

  const handleToggleTimerPlay = () => {
    setTimerActive(prev => !prev);
  };

  const handleResetTimer = () => {
    setTimerActive(false);
    setTimerDuration(null);
    setTimerSecondsLeft(0);
  };

  // Create New Empty Activity
  const handleCreateNewActivity = () => {
    const newAct: CompareActivity = {
      id: String(Date.now()),
      title: 'New Picture Comparison',
      topic: 'Speaking Practice',
      level: 'B1',
      objective: 'Compare and contrast the two images using descriptive language.',
      instructions: 'Look at both images carefully. Compare the main elements, discuss similarities and differences, and answer the questions below.',
      picAUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop',
      picBUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop',
      picALabel: 'Picture A',
      picBLabel: 'Picture B',
      questions: [
        'What are the main similarities and differences between Picture A and Picture B?',
        'How do these two situations or objects impact people\'s daily lives?',
        'Which of these two options would you personally prefer, and why?'
      ],
      teacherNotes: 'Target vocabulary: whereas, in contrast, on the other hand, similar to, both pictures show...',
      favorite: false,
      createdAt: Date.now()
    };
    const nextList = [newAct, ...activities];
    saveActivities(nextList);
    setSelectedActivityId(newAct.id);
  };

  // Update field of current active activity
  const handleUpdateField = (field: keyof CompareActivity, value: any) => {
    if (!activeActivity) return;
    const nextList = activities.map(a => {
      if (a.id === activeActivity.id) {
        return { ...a, [field]: value };
      }
      return a;
    });
    saveActivities(nextList);
  };

  // Duplicate current active activity
  const handleDuplicateActivity = () => {
    if (!activeActivity) return;
    const dup: CompareActivity = {
      ...activeActivity,
      id: String(Date.now()),
      title: `${activeActivity.title} (Cópia)`,
      favorite: false,
      createdAt: Date.now()
    };
    const nextList = [dup, ...activities];
    saveActivities(nextList);
    setSelectedActivityId(dup.id);
  };

  // Delete activity
  const handleDeleteActivity = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (activities.length <= 1) {
      alert('Você precisa manter pelo menos uma atividade na biblioteca.');
      return;
    }
    if (window.confirm('Tem certeza que deseja remover esta atividade?')) {
      const remaining = activities.filter(a => a.id !== id);
      saveActivities(remaining);
      if (selectedActivityId === id) {
        setSelectedActivityId(remaining[0].id);
      }
    }
  };

  // Toggle favorite state
  const handleToggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextList = activities.map(a => {
      if (a.id === id) {
        return { ...a, favorite: !a.favorite };
      }
      return a;
    });
    saveActivities(nextList);
  };

  // Swap Images Picture A and Picture B
  const handleSwapImages = () => {
    if (!activeActivity) return;
    const oldAUrl = activeActivity.picAUrl;
    const oldBUrl = activeActivity.picBUrl;
    const oldALabel = activeActivity.picALabel;
    const oldBLabel = activeActivity.picBLabel;

    const nextList = activities.map(a => {
      if (a.id === activeActivity.id) {
        return {
          ...a,
          picAUrl: oldBUrl,
          picBUrl: oldAUrl,
          picALabel: oldBLabel,
          picBLabel: oldALabel
        };
      }
      return a;
    });

    // Also swap zoom & pan states smoothly
    const tempZoom = zoomA;
    setZoomA(zoomB);
    setZoomB(tempZoom);

    const tempPan = panA;
    setPanA(panB);
    setPanB(tempPan);

    saveActivities(nextList);
  };

  // Image zoom shortcuts
  const handleZoomIn = (type: 'A' | 'B') => {
    if (type === 'A') setZoomA(prev => Math.min(4, prev + 0.25));
    if (type === 'B') setZoomB(prev => Math.min(4, prev + 0.25));
  };

  const handleZoomOut = (type: 'A' | 'B') => {
    if (type === 'A') {
      setZoomA(prev => {
        const next = Math.max(1, prev - 0.25);
        if (next === 1) setPanA({ x: 0, y: 0 });
        return next;
      });
    }
    if (type === 'B') {
      setZoomB(prev => {
        const next = Math.max(1, prev - 0.25);
        if (next === 1) setPanB({ x: 0, y: 0 });
        return next;
      });
    }
  };

  const handleResetZoom = (type: 'A' | 'B') => {
    if (type === 'A') {
      setZoomA(1);
      setPanA({ x: 0, y: 0 });
    }
    if (type === 'B') {
      setZoomB(1);
      setPanB({ x: 0, y: 0 });
    }
  };

  // Image Dragging to Pan logic
  const startDrag = (type: 'A' | 'B', e: React.MouseEvent) => {
    e.preventDefault();
    const zoom = type === 'A' ? zoomA : zoomB;
    if (zoom <= 1) return; // Only allow panning when zoomed in

    if (type === 'A') {
      setIsDraggingA(true);
      dragStartA.current = { x: e.clientX - panA.x, y: e.clientY - panA.y };
    } else {
      setIsDraggingB(true);
      dragStartB.current = { x: e.clientX - panB.x, y: e.clientY - panB.y };
    }
  };

  const onDrag = (e: React.MouseEvent) => {
    if (isDraggingA) {
      setPanA({
        x: e.clientX - dragStartA.current.x,
        y: e.clientY - dragStartA.current.y
      });
    } else if (isDraggingB) {
      setPanB({
        x: e.clientX - dragStartB.current.x,
        y: e.clientY - dragStartB.current.y
      });
    }
  };

  const endDrag = () => {
    setIsDraggingA(false);
    setIsDraggingB(false);
  };

  // Image compression & update pipeline
  const processAndSetImage = async (type: 'A' | 'B', fileOrUrl: File | string) => {
    setIsCompressingImage(type);
    try {
      const compressedUrl = await compressImage(fileOrUrl, 1000, 1000, 0.8);
      handleUpdateField(type === 'A' ? 'picAUrl' : 'picBUrl', compressedUrl);
    } catch (err) {
      console.error('Error processing image:', err);
      alert('Não foi possível processar a imagem. Tente novamente com outro arquivo.');
    } finally {
      setIsCompressingImage(null);
    }
  };

  // Image uploads
  const handleImageUpload = (type: 'A' | 'B', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processAndSetImage(type, file);
    e.target.value = '';
  };

  // Drag over drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (type: 'A' | 'B', e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processAndSetImage(type, file);
    } else {
      const textUrl = e.dataTransfer.getData('text/plain');
      if (textUrl && textUrl.startsWith('http')) {
        processAndSetImage(type, textUrl);
      }
    }
  };

  // Questions manipulation
  const handleAddQuestion = () => {
    if (!activeActivity) return;
    const updated = [...activeActivity.questions, 'Nova pergunta a ser formulada...'];
    handleUpdateField('questions', updated);
  };

  const handleUpdateQuestion = (index: number, text: string) => {
    if (!activeActivity) return;
    const updated = activeActivity.questions.map((q, i) => i === index ? text : q);
    handleUpdateField('questions', updated);
  };

  const handleDuplicateQuestion = (index: number) => {
    if (!activeActivity) return;
    const target = activeActivity.questions[index];
    const updated = [...activeActivity.questions];
    updated.splice(index + 1, 0, `${target} (Cópia)`);
    handleUpdateField('questions', updated);
  };

  const handleDeleteQuestion = (index: number) => {
    if (!activeActivity) return;
    const updated = activeActivity.questions.filter((_, i) => i !== index);
    handleUpdateField('questions', updated);
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if (!activeActivity) return;
    const updated = [...activeActivity.questions];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= updated.length) return;

    // Swap elements
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;

    handleUpdateField('questions', updated);
  };

  // Export JSON file of active activity
  const handleExportActivity = () => {
    if (!activeActivity) return;
    const dataStr = JSON.stringify(activeActivity, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bia-compare-${activeActivity.title.toLowerCase().replace(/\s+/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON activity file
  const handleImportActivity = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported.title && imported.questions) {
          const newAct: CompareActivity = {
            ...imported,
            id: String(Date.now()), // new ID to prevent collision
            createdAt: Date.now()
          };
          const nextList = [newAct, ...activities];
          saveActivities(nextList);
          setSelectedActivityId(newAct.id);
          alert(`Atividade "${newAct.title}" importada com sucesso!`);
        } else {
          alert('Arquivo JSON inválido. Verifique o formato.');
        }
      } catch (err) {
        alert('Erro ao ler JSON.');
      }
    };
    reader.readAsText(file);
  };

  // Filter & Search activities
  const filteredActivitiesList = useMemo(() => {
    return activities
      .filter(a => {
        const matchesQuery = a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.level.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesLevel = selectedLevel ? a.level === selectedLevel : true;
        return matchesQuery && matchesLevel;
      })
      .sort((a, b) => {
        // Favorites first, then newest
        if (a.favorite && !b.favorite) return -1;
        if (!a.favorite && b.favorite) return 1;
        return b.createdAt - a.createdAt;
      });
  }, [activities, searchQuery, selectedLevel]);

  const [aiGenModal, setAiGenModal] = useState<{
    isOpen: boolean;
    target: 'A' | 'B' | 'BOTH';
    prompt: string;
    isGenerating: boolean;
  }>({
    isOpen: false,
    target: 'A',
    prompt: '',
    isGenerating: false,
  });

  const PRESET_COMPARISONS = [
    { label: 'Praia vs Montanha', promptA: 'Tropical beach with golden sand, palm trees and blue ocean in Miami Beach, bright day', promptB: 'Serene mountain range with pine forest and mist, majestic peak' },
    { label: 'Cidade vs Campo', promptA: 'Modern city skyline with skyscrapers and busy urban street', promptB: 'Cozy countryside farm house with green hills and wooden fence' },
    { label: 'Escritório vs Home Office', promptA: 'Modern corporate office with people working at desks in suits', promptB: 'Cozy home office desk with laptop, plant and coffee mug' },
    { label: 'Café vs Chá', promptA: 'Freshly brewed Brazilian espresso coffee cup with coffee beans on rustic table', promptB: 'Aesthetic cup of green tea with lemon slices and herbal leaves' },
    { label: 'Futebol vs Basquete', promptA: 'Packed soccer stadium pitch under bright floodlights', promptB: 'Outdoor urban basketball court with hoop at golden hour sunset' },
    { label: 'Comida Saudável vs Fast Food', promptA: 'Colorful fresh Mediterranean salad bowl with avocado and cherry tomatoes', promptB: 'Gourmet double cheeseburger with crispy french fries' }
  ];

  const handleGenerateAiImage = (promptText: string, targetOverride?: 'A' | 'B' | 'BOTH') => {
    const target = targetOverride || aiGenModal.target;
    if (!promptText.trim()) return;

    setAiGenModal(prev => ({ ...prev, isGenerating: true }));

    setTimeout(() => {
      if (target === 'A') {
        const urlA = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}?width=800&height=600&nologo=true&seed=${Math.floor(Math.random() * 100000)}`;
        handleUpdateField('picAUrl', urlA);
      } else if (target === 'B') {
        const urlB = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}?width=800&height=600&nologo=true&seed=${Math.floor(Math.random() * 100000)}`;
        handleUpdateField('picBUrl', urlB);
      } else if (target === 'BOTH') {
        // Find matching preset
        const matched = PRESET_COMPARISONS.find(p => p.label === promptText);
        if (matched) {
          const urlA = `https://image.pollinations.ai/prompt/${encodeURIComponent(matched.promptA)}?width=800&height=600&nologo=true&seed=${Math.floor(Math.random() * 100000)}`;
          const urlB = `https://image.pollinations.ai/prompt/${encodeURIComponent(matched.promptB)}?width=800&height=600&nologo=true&seed=${Math.floor(Math.random() * 100000)}`;
          handleUpdateField('picAUrl', urlA);
          handleUpdateField('picBUrl', urlB);
          if (activeActivity) {
            handleUpdateField('picALabel', matched.label.split(' vs ')[0] || 'Imagem A');
            handleUpdateField('picBLabel', matched.label.split(' vs ')[1] || 'Imagem B');
          }
        }
      }

      setAiGenModal({ isOpen: false, target: 'A', prompt: '', isGenerating: false });
    }, 800);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 pb-32 md:pb-40 text-white flex flex-col font-sans relative antialiased selection:bg-blue-500/30 selection:text-white">
      
      {/* GLORIOUS RADIAL AMBIENT GLOWS - DARK CANVAS */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* RENDER PRESENTATION MODE IF ACTIVE */}
      <AnimatePresence>
        {isPresenting && activeActivity && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-neutral-950/90 backdrop-blur-2xl z-[5000] flex flex-col p-2 sm:p-4 md:p-6 overflow-hidden select-none"
            onMouseMove={onDrag}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
          >
            {/* PRESENTATION FLOATING HEADER (No background bar, floating pills like Lousa de Horarios) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 shrink-0 z-30 pointer-events-auto">
              <div className="flex items-center gap-1.5 sm:gap-2 bg-neutral-950/80 px-3 py-1.5 rounded-full border border-white/15 backdrop-blur-md shadow-md min-w-0">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest text-white bg-blue-600 shadow-sm shrink-0">
                  Tela Cheia
                </span>
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-xs text-white/90 font-bold font-mono tracking-wider truncate max-w-[120px] sm:max-w-[200px]">
                    {activeActivity.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSentenceTranslate(activeActivity.title)}
                    className="p-1 rounded-full hover:bg-white/10 text-white/40 hover:text-amber-300 transition-all cursor-pointer shrink-0"
                    title="Traduzir título da atividade"
                  >
                    <Languages size={12} />
                  </button>
                </div>
                <span className="px-1.5 py-0.2 text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full font-bold font-mono shrink-0">
                  {activeActivity.level}
                </span>
              </div>

              {/* TIMERS & CONTROLS - FLOATING PILLS */}
              <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto max-w-full py-0.5 custom-scrollbar">
                {/* Done Button in Presentation Mode */}
                <button
                  type="button"
                  onClick={handleFinishActivity}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-full text-xs uppercase tracking-wider transition-all flex items-center gap-1 shadow-lg shadow-emerald-950/30 cursor-pointer backdrop-blur-md"
                >
                  <Check size={13} />
                  <span>Done</span>
                </button>

                {/* Micro Timer block */}
                {timerDuration ? (
                  <div className="flex items-center gap-1.5 bg-neutral-950/80 border border-white/15 px-2.5 py-1 rounded-full font-mono backdrop-blur-md shadow-md">
                    <Clock size={12} className={timerActive ? "text-emerald-400 animate-pulse" : "text-white/40"} />
                    <span className="text-xs font-bold text-white/90">
                      {Math.floor(timerSecondsLeft / 60)}:{(timerSecondsLeft % 60).toString().padStart(2, '0')}
                    </span>
                    <button
                      onClick={handleToggleTimerPlay}
                      className="p-0.5 text-white/60 hover:text-white transition-colors"
                      title={timerActive ? "Pausar" : "Iniciar"}
                    >
                      {timerActive ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
                    </button>
                    <button
                      onClick={handleResetTimer}
                      className="p-0.5 text-red-400 hover:text-red-300 transition-colors"
                      title="Resetar"
                    >
                      <RotateCcw size={11} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 bg-neutral-950/80 rounded-full p-0.5 border border-white/15 backdrop-blur-md shadow-md">
                    <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider px-1.5">Timer:</span>
                    {[1, 2, 3, 5].map(m => (
                      <button
                        key={m}
                        onClick={() => handleStartTimer(m)}
                        className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-white/5 hover:bg-blue-500/20 text-white/70 hover:text-white transition-all cursor-pointer"
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                )}

                {/* Sound toggle */}
                <button
                  onClick={() => setSoundOn(!soundOn)}
                  className="p-1.5 px-2 bg-neutral-950/80 border border-white/15 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-all backdrop-blur-md shadow-md cursor-pointer"
                  title={soundOn ? "Sons ativados" : "Sons desativados"}
                >
                  {soundOn ? <Volume2 size={13} /> : <VolumeX size={13} />}
                </button>

                {/* Labels toggle */}
                <button
                  onClick={() => setShowLabels(!showLabels)}
                  className="p-1.5 px-2 bg-neutral-950/80 border border-white/15 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-all flex items-center gap-1 text-xs font-semibold backdrop-blur-md shadow-md cursor-pointer"
                  title="Mostrar/Ocultar Rótulos"
                >
                  {showLabels ? <Eye size={13} /> : <EyeOff size={13} />}
                  <span className="hidden sm:inline text-[11px]">Legendas</span>
                </button>

                {/* Activity Switcher in Presentation Mode */}
                {filteredActivitiesList.length > 0 && (
                  <div className="flex items-center gap-1 bg-neutral-950/80 border border-white/15 p-0.5 rounded-full backdrop-blur-md shadow-md">
                    <button
                      onClick={() => {
                        const currIdx = filteredActivitiesList.findIndex(a => a.id === selectedActivityId);
                        if (currIdx > 0) {
                          setSelectedActivityId(filteredActivitiesList[currIdx - 1].id);
                          setCurrentQuestionIdx(0);
                        }
                      }}
                      disabled={filteredActivitiesList.findIndex(a => a.id === selectedActivityId) <= 0}
                      className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded-full hover:bg-white/10 disabled:opacity-20 text-white cursor-pointer flex items-center"
                      title="Atividade Anterior"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <span className="text-[10px] font-mono text-white/50 px-1">
                      {Math.max(1, filteredActivitiesList.findIndex(a => a.id === selectedActivityId) + 1)}/{filteredActivitiesList.length}
                    </span>
                    <button
                      onClick={() => {
                        const currIdx = filteredActivitiesList.findIndex(a => a.id === selectedActivityId);
                        if (currIdx >= 0 && currIdx < filteredActivitiesList.length - 1) {
                          setSelectedActivityId(filteredActivitiesList[currIdx + 1].id);
                          setCurrentQuestionIdx(0);
                        }
                      }}
                      disabled={
                        filteredActivitiesList.findIndex(a => a.id === selectedActivityId) < 0 ||
                        filteredActivitiesList.findIndex(a => a.id === selectedActivityId) >= filteredActivitiesList.length - 1
                      }
                      className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded-full bg-blue-600/90 hover:bg-blue-600 disabled:opacity-20 text-white cursor-pointer flex items-center"
                      title="Próxima Atividade"
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>
                )}

                {/* Exit presentation button */}
                <button
                  onClick={() => setIsPresenting(false)}
                  className="px-3 py-1 bg-neutral-950/80 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-bold rounded-full transition-all flex items-center gap-1 cursor-pointer shadow-md backdrop-blur-md"
                  title="Sair da Tela Cheia"
                >
                  <X size={13} />
                  <span>Sair</span>
                </button>
              </div>
            </div>

            {/* PRESENTATION IMAGES WORKSPACE WITH CENTER GLASS QUESTION OVERLAY */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-center justify-center p-2 relative my-auto">
              
              {/* PICTURE A CARD */}
              <motion.div
                layout
                onClick={() => setFocusedImage(focusedImage === 'A' ? null : 'A')}
                className={`relative h-[320px] md:h-[500px] rounded-2xl border overflow-hidden cursor-pointer transition-all duration-300 shadow-2xl group ${
                  focusedImage === 'A' 
                    ? 'md:col-span-2 md:absolute md:inset-0 md:z-40 border-blue-500 bg-black/95' 
                    : focusedImage === 'B' 
                    ? 'opacity-20 scale-95 pointer-events-none' 
                    : 'border-white/10 bg-neutral-900/40'
                }`}
              >
                {/* Labels tag */}
                {showLabels && (
                  <div className="absolute top-4 left-4 z-50 px-3.5 py-1.5 bg-black/80 border border-white/15 rounded-lg backdrop-blur-md">
                    <span className="text-xs font-bold tracking-wide text-white/90">
                      {activeActivity.picALabel || 'Picture A'}
                    </span>
                  </div>
                )}

                {/* Individual zoom HUD in picture card */}
                <div 
                  className="absolute bottom-4 left-4 z-50 flex items-center gap-1 bg-black/80 border border-white/15 p-1.5 rounded-lg backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button onClick={() => handleZoomIn('A')} className="p-1 hover:bg-white/10 rounded text-white/80"><ZoomIn size={14} /></button>
                  <button onClick={() => handleZoomOut('A')} className="p-1 hover:bg-white/10 rounded text-white/80"><ZoomOut size={14} /></button>
                  <button onClick={() => handleResetZoom('A')} className="p-1 hover:bg-white/10 rounded text-white/80"><RotateCcw size={14} /></button>
                  {zoomA > 1 && (
                    <span className="text-[9px] font-mono font-bold text-blue-400 px-1">{zoomA.toFixed(1)}x</span>
                  )}
                </div>

                <div 
                  className="w-full h-full overflow-hidden flex items-center justify-center p-2"
                  onMouseDown={(e) => startDrag('A', e)}
                >
                  <img
                    src={activeActivity.picAUrl}
                    alt="Compare A"
                    referrerPolicy="no-referrer"
                    draggable={false}
                    className="object-contain w-full h-full select-none transition-transform duration-100 ease-out rounded-xl"
                    style={{
                      transform: `scale(${zoomA}) translate(${panA.x / zoomA}px, ${panA.y / zoomA}px)`,
                      cursor: zoomA > 1 ? (isDraggingA ? 'grabbing' : 'grab') : 'pointer'
                    }}
                  />
                </div>
              </motion.div>

              {/* PICTURE B CARD */}
              <motion.div
                layout
                onClick={() => setFocusedImage(focusedImage === 'B' ? null : 'B')}
                className={`relative h-[320px] md:h-[500px] rounded-2xl border overflow-hidden cursor-pointer transition-all duration-300 shadow-2xl group ${
                  focusedImage === 'B' 
                    ? 'md:col-span-2 md:absolute md:inset-0 md:z-40 border-emerald-500 bg-black/95' 
                    : focusedImage === 'A' 
                    ? 'opacity-20 scale-95 pointer-events-none' 
                    : 'border-white/10 bg-neutral-900/40'
                }`}
              >
                {/* Labels tag */}
                {showLabels && (
                  <div className="absolute top-4 left-4 z-50 px-3.5 py-1.5 bg-black/80 border border-white/15 rounded-lg backdrop-blur-md">
                    <span className="text-xs font-bold tracking-wide text-white/90">
                      {activeActivity.picBLabel || 'Picture B'}
                    </span>
                  </div>
                )}

                {/* Individual zoom HUD in picture card */}
                <div 
                  className="absolute bottom-4 left-4 z-50 flex items-center gap-1 bg-black/80 border border-white/15 p-1.5 rounded-lg backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button onClick={() => handleZoomIn('B')} className="p-1 hover:bg-white/10 rounded text-white/80"><ZoomIn size={14} /></button>
                  <button onClick={() => handleZoomOut('B')} className="p-1 hover:bg-white/10 rounded text-white/80"><ZoomOut size={14} /></button>
                  <button onClick={() => handleResetZoom('B')} className="p-1 hover:bg-white/10 rounded text-white/80"><RotateCcw size={14} /></button>
                  {zoomB > 1 && (
                    <span className="text-[9px] font-mono font-bold text-emerald-400 px-1">{zoomB.toFixed(1)}x</span>
                  )}
                </div>

                <div 
                  className="w-full h-full overflow-hidden flex items-center justify-center p-2"
                  onMouseDown={(e) => startDrag('B', e)}
                >
                  <img
                    src={activeActivity.picBUrl}
                    alt="Compare B"
                    referrerPolicy="no-referrer"
                    draggable={false}
                    className="object-contain w-full h-full select-none transition-transform duration-100 ease-out rounded-xl"
                    style={{
                      transform: `scale(${zoomB}) translate(${panB.x / zoomB}px, ${panB.y / zoomB}px)`,
                      cursor: zoomB > 1 ? (isDraggingB ? 'grabbing' : 'grab') : 'pointer'
                    }}
                  />
                </div>
              </motion.div>

              {/* CENTER FLOATING GLASS QUESTION CARD (OVERLAID ON TOP OF IMAGES) */}
              {showQuestionsInPresentation && activeActivity.questions.length > 0 && !focusedImage && (
                <div className="absolute left-1/2 bottom-6 -translate-x-1/2 z-30 max-w-3xl w-[92%] bg-neutral-900/85 border border-white/20 p-5 md:p-6 rounded-3xl backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-center flex flex-col items-center gap-3">
                  <div className="flex items-center justify-between w-full border-b border-white/10 pb-2.5">
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider">
                      Pergunta {currentQuestionIdx + 1} de {activeActivity.questions.length}
                    </span>
                    <span className="text-[10px] text-amber-300/80 font-mono flex items-center gap-1">
                      <span>Clique numa palavra para ver a tradução</span>
                    </span>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentQuestionIdx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-base sm:text-xl font-bold text-white/95 leading-relaxed tracking-tight py-1"
                    >
                      {renderInteractiveText(activeActivity.questions[currentQuestionIdx])}
                    </motion.div>
                  </AnimatePresence>

                  <div className="flex items-center justify-between w-full pt-2">
                    <button
                      onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))}
                      disabled={currentQuestionIdx === 0}
                      className="px-4 py-2 bg-white/10 border border-white/15 rounded-xl hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1.5 text-xs font-bold text-white cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                      <span>Anterior</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSentenceTranslate(activeActivity.questions[currentQuestionIdx])}
                        className="p-2 bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/30 rounded-xl text-white/50 hover:text-emerald-300 transition-all cursor-pointer"
                        title="Traduzir pergunta completa em português"
                      >
                        <Languages size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => speakText(activeActivity.questions[currentQuestionIdx])}
                        className="p-2 bg-white/5 hover:bg-blue-500/20 border border-white/10 hover:border-blue-500/30 rounded-xl text-white/50 hover:text-blue-300 transition-all cursor-pointer"
                        title="Ouvir pronúncia do enunciado em inglês"
                      >
                        <Volume2 size={15} />
                      </button>
                    </div>

                    {currentQuestionIdx < activeActivity.questions.length - 1 ? (
                      <button
                        onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                        className="px-4 py-2 bg-blue-600 border border-blue-400/30 rounded-xl hover:bg-blue-500 transition-all flex items-center gap-1.5 text-xs font-bold text-white cursor-pointer shadow-lg shadow-blue-950/40"
                      >
                        <span>Próxima Pergunta</span>
                        <ChevronRight size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          const currIdx = filteredActivitiesList.findIndex(a => a.id === selectedActivityId);
                          if (currIdx >= 0 && currIdx < filteredActivitiesList.length - 1) {
                            setSelectedActivityId(filteredActivitiesList[currIdx + 1].id);
                            setCurrentQuestionIdx(0);
                          } else {
                            setCurrentQuestionIdx(0);
                          }
                        }}
                        className="px-4 py-2 bg-emerald-600 border border-emerald-400/30 rounded-xl hover:bg-emerald-500 transition-all flex items-center gap-1.5 text-xs font-bold text-white cursor-pointer shadow-lg shadow-emerald-950/40"
                        title="Ir para a próxima atividade da biblioteca"
                      >
                        <span>Próxima Atividade</span>
                        <ChevronRight size={16} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* QUICK HOTKEY INDICATOR */}
            <div className="absolute bottom-2 right-4 text-[9px] text-white/30 font-mono pointer-events-none hidden md:block">
              Setas ⇄ / N, P: Navegar | Q: Ocultar card de perguntas | ESC: Sair
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REGULAR PROFESSOR CONFIGURATION & PLANNING WORKSPACE */}
      
      {/* HEADER SECTION */}
      <header className="sticky top-0 z-30 bg-neutral-950/80 border border-white/10 backdrop-blur-2xl px-4 sm:px-6 py-3.5 flex flex-col md:flex-row justify-between items-center gap-3 rounded-2xl mb-6 shadow-2xl pl-24 sm:pl-28 md:pl-6">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-400/30 text-blue-400 shrink-0 shadow-inner">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-light tracking-wider text-white">
                BIA <span className="font-semibold text-blue-400">Compare</span>
              </h1>
            </div>
          </div>
        </div>

        {/* QUICK CORE ACTION HUD */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* DONE BUTTON IN MAIN VIEW */}
          <button
            type="button"
            onClick={handleFinishActivity}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/40 hover:scale-[1.02] active:scale-95"
            title="Concluir atividade e congelar tempo da sessão"
          >
            <Check size={15} />
            <span>Concluir (Done)</span>
          </button>
          
          <button
            onClick={handleCreateNewActivity}
            className="px-3.5 py-2 bg-blue-600/90 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-950/30 hover:scale-[1.02] active:scale-95"
          >
            <Plus size={15} />
            <span>Nova Atividade</span>
          </button>

          <button
            onClick={() => {
              setCurrentQuestionIdx(0);
              setIsPresenting(true);
            }}
            className="px-3.5 py-2 bg-neutral-950/80 hover:bg-neutral-900 text-blue-300 font-bold rounded-full text-xs transition-all flex items-center gap-1.5 cursor-pointer border border-blue-500/30 shadow-md backdrop-blur-md hover:scale-[1.02] active:scale-95"
            title="Iniciar em Tela Cheia"
          >
            <Maximize2 size={14} className="text-blue-300" />
            <span className="hidden sm:inline">Tela Cheia</span>
          </button>

          {/* Combined Settings & More Actions Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
              className="p-2 px-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
              title="Mais Opções e Ferramentas"
            >
              <SettingsIcon size={15} />
              <span className="text-xs hidden sm:inline font-semibold">Opções</span>
            </button>
            
            <AnimatePresence>
              {showSettingsDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-64 bg-neutral-900/95 border border-white/15 rounded-2xl p-3.5 shadow-2xl backdrop-blur-2xl z-50 space-y-2.5 text-xs"
                >
                  <div className="font-bold border-b border-white/10 pb-2 text-white/60 text-[10px] uppercase tracking-wider flex justify-between items-center">
                    <span>Ferramentas & Exportação</span>
                    <button onClick={() => setShowSettingsDropdown(false)} className="text-white/40 hover:text-white cursor-pointer p-0.5 rounded hover:bg-white/10">
                      <X size={13} />
                    </button>
                  </div>

                  {activeActivity && (
                    <button
                      onClick={() => {
                        handleToggleFavorite(activeActivity.id);
                        setShowSettingsDropdown(false);
                      }}
                      className="w-full text-left py-2 px-2.5 hover:bg-white/10 rounded-xl flex items-center gap-2 text-white/80 transition-colors cursor-pointer"
                    >
                      <Star size={14} className={activeActivity.favorite ? "text-amber-400" : "text-white/40"} fill={activeActivity.favorite ? "currentColor" : "none"} />
                      <span>{activeActivity.favorite ? 'Remover dos Favoritos' : 'Favoritar Atividade'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      handleDuplicateActivity();
                      setShowSettingsDropdown(false);
                    }}
                    className="w-full text-left py-2 px-2.5 hover:bg-white/10 rounded-xl flex items-center gap-2 text-white/80 transition-colors cursor-pointer"
                  >
                    <Copy size={14} />
                    <span>Duplicar Atividade</span>
                  </button>

                  <button
                    onClick={() => {
                      handleExportActivity();
                      setShowSettingsDropdown(false);
                    }}
                    className="w-full text-left py-2 px-2.5 hover:bg-white/10 rounded-xl flex items-center gap-2 text-white/80 transition-colors cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Exportar Atividade (JSON)</span>
                  </button>

                  <label className="w-full text-left py-2 px-2.5 hover:bg-white/10 rounded-xl flex items-center gap-2 text-white/80 transition-colors cursor-pointer">
                    <Upload size={14} />
                    <span>Importar Atividade (JSON)</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        handleImportActivity(e);
                        setShowSettingsDropdown(false);
                      }}
                      className="hidden"
                    />
                  </label>

                  <div className="border-t border-white/10 pt-2.5 flex flex-col gap-2">
                    <label className="flex items-center justify-between cursor-pointer text-white/80 px-1">
                      <span>Efeitos Sonoros</span>
                      <input
                        type="checkbox"
                        checked={soundOn}
                        onChange={() => setSoundOn(!soundOn)}
                        className="rounded bg-black border-white/20 text-blue-500 focus:ring-0 cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer text-white/80 px-1">
                      <span>Mostrar Legendas nas Fotos</span>
                      <input
                        type="checkbox"
                        checked={showLabels}
                        onChange={() => setShowLabels(!showLabels)}
                        className="rounded bg-black border-white/20 text-blue-500 focus:ring-0 cursor-pointer"
                      />
                    </label>
                    <button
                      onClick={() => {
                        setShowShortcutsModal(true);
                        setShowSettingsDropdown(false);
                      }}
                      className="w-full text-left py-1.5 px-1 text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1.5 cursor-pointer mt-1"
                    >
                      <Keyboard size={13} />
                      Ver Atalhos de Teclado
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* CORE SPLIT SCREEN LAYOUT */}
      <div className="flex-1 max-w-[1600px] mx-auto w-full px-2 sm:px-4 md:px-6 py-2 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT SIDEBAR: ACTIVITY DIRECTORY */}
        <div className="lg:col-span-3 flex flex-col gap-3.5 bg-neutral-900/60 border border-white/10 rounded-2xl p-4 backdrop-blur-2xl shadow-xl">
          <div className="flex justify-between items-center border-b border-white/10 pb-2.5 px-0.5">
            <span className="text-[11px] font-bold tracking-widest text-white/60 uppercase font-mono flex items-center gap-1.5">
              <span>Biblioteca</span>
            </span>
            <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold">
              {filteredActivitiesList.length} Atividades
            </span>
          </div>

          {/* SEARCH BAR */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-white/40" size={14} />
            <input
              type="text"
              placeholder="Pesquisar por título ou tema..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-neutral-950/80 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all"
            />
          </div>

          {/* CEFR LEVEL FILTERS */}
          <div className="flex flex-wrap gap-1 bg-neutral-950/60 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setSelectedLevel(null)}
              className={`flex-1 py-1 rounded-lg text-[9px] font-mono font-bold transition-all cursor-pointer ${
                selectedLevel === null
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              TODOS
            </button>
            {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(lvl => (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(selectedLevel === lvl ? null : lvl)}
                className={`px-2 py-1 rounded-lg text-[9px] font-mono font-bold transition-all cursor-pointer ${
                  selectedLevel === lvl
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* ACTIVITIES CARDS GRID */}
          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1 custom-scrollbar">
            {filteredActivitiesList.length === 0 ? (
              <div className="text-center py-12 text-white/40 text-xs font-light">
                Nenhuma atividade encontrada.
              </div>
            ) : (
              filteredActivitiesList.map(act => {
                const isSelected = act.id === selectedActivityId;
                return (
                  <div
                    key={act.id}
                    onClick={() => setSelectedActivityId(act.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer relative group ${
                      isSelected
                        ? 'bg-blue-500/10 border-blue-500/60 shadow-[0_0_20px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/30'
                        : 'bg-neutral-950/40 border-white/5 hover:border-white/20 hover:bg-neutral-900/80'
                    }`}
                  >
                    {/* Favorite marker */}
                    <button
                      onClick={(e) => handleToggleFavorite(act.id, e)}
                      className="absolute top-3.5 right-3.5 opacity-70 group-hover:opacity-100 transition-opacity cursor-pointer p-0.5"
                    >
                      <Star
                        size={13}
                        className={act.favorite ? "text-amber-400" : "text-white/20 hover:text-white"}
                        fill={act.favorite ? "currentColor" : "none"}
                      />
                    </button>

                    <div className="flex items-center gap-1.5 mb-1 pr-6">
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[9px] uppercase tracking-wider font-bold font-mono">
                        {act.level}
                      </span>
                      <span className="text-[10px] text-white/50 font-medium truncate max-w-[120px]">
                        {act.topic}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white/95 truncate pr-5">
                      {act.title}
                    </h4>

                    {/* Metadata details */}
                    <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-white/5 text-[10px] text-white/40">
                      <span className="font-mono">{act.questions.length} perguntas</span>
                      <button
                        onClick={(e) => handleDeleteActivity(act.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-all cursor-pointer"
                        title="Deletar atividade"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT AREA: DETAILED ACTIVITY EDITOR */}
        <div className="lg:col-span-9 flex flex-col gap-6">
          
          {activeActivity ? (
            <>
              {/* SECTION A: ACTIVITY HEADER DETAILS (Glass block) */}
              <div className="p-5 sm:p-6 rounded-2xl bg-neutral-900/60 border border-white/10 backdrop-blur-2xl space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-white/60 font-mono flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    <span>Configuração da Atividade</span>
                  </span>
                  <span className="text-[10px] text-white/40 font-mono">
                    ID: {activeActivity.id.slice(0, 8)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Title */}
                  <div className="md:col-span-6 space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest text-white/50 font-mono font-bold">Título da Atividade</label>
                    <input
                      type="text"
                      value={activeActivity.title}
                      onChange={(e) => handleUpdateField('title', e.target.value)}
                      className="w-full bg-neutral-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 font-semibold transition-all"
                    />
                  </div>

                  {/* Topic */}
                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest text-white/50 font-mono font-bold">Tema / Tópico</label>
                    <input
                      type="text"
                      value={activeActivity.topic}
                      onChange={(e) => handleUpdateField('topic', e.target.value)}
                      className="w-full bg-neutral-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all"
                    />
                  </div>

                  {/* Level dropdown */}
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest text-white/50 font-mono font-bold">Nível CEFR</label>
                    <select
                      value={activeActivity.level}
                      onChange={(e) => handleUpdateField('level', e.target.value)}
                      className="w-full bg-neutral-950/80 border border-white/10 rounded-xl px-2.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 font-mono font-bold cursor-pointer transition-all"
                    >
                      {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => (
                        <option key={l} value={l} className="bg-neutral-900">{l}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Objective */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest text-white/50 font-mono font-bold">Objetivo Didático</label>
                    <textarea
                      rows={2}
                      value={activeActivity.objective}
                      onChange={(e) => handleUpdateField('objective', e.target.value)}
                      placeholder="Ex: Desenvolver vocabulário sobre vida urbana e rústica..."
                      className="w-full bg-neutral-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 resize-none font-light leading-relaxed transition-all"
                    />
                  </div>

                  {/* Instructions */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest text-white/50 font-mono font-bold">Instruções para os Alunos</label>
                    <textarea
                      rows={2}
                      value={activeActivity.instructions}
                      onChange={(e) => handleUpdateField('instructions', e.target.value)}
                      placeholder="Ex: Compare as imagens enfocando nos aspectos do dia a dia..."
                      className="w-full bg-neutral-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 resize-none font-light leading-relaxed transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION B: DUAL IMAGE EDITOR SPACE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch justify-center relative">
                
                {/* PICTURE A WORKSPACE */}
                <div 
                  className="rounded-2xl border border-white/10 bg-neutral-900/60 p-4.5 flex flex-col gap-3.5 backdrop-blur-2xl relative shadow-xl"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop('A', e)}
                >
                  <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
                      <span className="text-xs font-extrabold tracking-wider text-white font-mono uppercase">
                        Picture A
                      </span>
                    </div>
                    {/* Picture Label editor */}
                    <input
                      type="text"
                      value={activeActivity.picALabel}
                      onChange={(e) => handleUpdateField('picALabel', e.target.value)}
                      className="text-xs font-mono text-blue-300 text-right bg-neutral-950/50 border border-white/10 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500/50 max-w-[130px]"
                      placeholder="Etiqueta A"
                    />
                  </div>

                  {/* Image Display & Dropzone Frame */}
                  <div className="relative h-64 rounded-xl bg-black/60 border border-dashed border-white/20 overflow-hidden flex items-center justify-center group shadow-inner">
                    <img
                      src={activeActivity.picAUrl}
                      alt="Compare A Preview"
                      referrerPolicy="no-referrer"
                      className="object-contain w-full h-full select-none"
                    />

                    {/* Image compression loading overlay */}
                    {isCompressingImage === 'A' && (
                      <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-center gap-2 rounded-xl text-white">
                        <div className="w-7 h-7 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-bold text-blue-300">Otimizando e salvando imagem...</span>
                      </div>
                    )}

                    {/* Overlay info / tools */}
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center pointer-events-none p-4 text-center">
                      <span className="text-xs text-white/90 bg-black/80 px-3 py-1.5 rounded-xl border border-white/15 backdrop-blur-md">
                        Arraste uma foto aqui para trocar
                      </span>
                    </div>
                  </div>

                  {/* Traditional Upload, AI Generator & URL controls */}
                  <div className="grid grid-cols-3 gap-2">
                    <label className="py-2 px-2.5 bg-blue-600/90 hover:bg-blue-500 text-white font-bold rounded-xl text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-blue-950/30 hover:scale-[1.02] active:scale-95">
                      <FileUp size={14} />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/jpeg, image/jpg, image/png, image/webp"
                        onChange={(e) => handleImageUpload('A', e)}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => setAiGenModal({ isOpen: true, target: 'A', prompt: '', isGenerating: false })}
                      className="py-2 px-2.5 bg-neutral-900/80 hover:bg-neutral-800 border border-amber-500/50 text-amber-300 font-extrabold rounded-xl text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.2)] hover:shadow-[0_0_18px_rgba(245,158,11,0.4)] backdrop-blur-md hover:scale-[1.02] active:scale-95"
                    >
                      <Sparkles size={14} className="text-amber-400" />
                      <span>Gerar IA</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        const url = prompt('Cole o link (URL) da imagem desejada para a Imagem A:', activeActivity.picAUrl);
                        if (url) await processAndSetImage('A', url);
                      }}
                      className="py-2 px-2.5 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl text-white font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-95"
                    >
                      <Link size={13} />
                      <span>URL</span>
                    </button>
                  </div>

                  {/* Zoom controls HUD */}
                  <div className="flex items-center justify-between text-xs bg-black/40 border border-white/10 rounded-xl p-2 font-mono">
                    <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Ajustar Lente:</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleZoomOut('A')} className="p-1 hover:bg-white/10 rounded text-white/80 cursor-pointer" title="Zoom Out"><ZoomOut size={13} /></button>
                      <button onClick={() => handleZoomIn('A')} className="p-1 hover:bg-white/10 rounded text-white/80 cursor-pointer" title="Zoom In"><ZoomIn size={13} /></button>
                      <button onClick={() => handleResetZoom('A')} className="p-1 hover:bg-white/10 rounded text-white/80 cursor-pointer" title="Resetar Lente"><RotateCcw size={13} /></button>
                    </div>
                  </div>
                </div>

                {/* SWAP IMAGES FLOATING BUTTON IN THE CENTER SPLIT */}
                <div className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 z-20 hidden md:block">
                  <button
                    onClick={handleSwapImages}
                    className="p-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-all border border-blue-400/30 shadow-2xl shadow-blue-950/80 hover:scale-110 cursor-pointer active:scale-95"
                    title="Inverter Picture A e B"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>

                {/* PICTURE B WORKSPACE */}
                <div 
                  className="rounded-2xl border border-white/10 bg-neutral-900/60 p-4.5 flex flex-col gap-3.5 backdrop-blur-2xl relative shadow-xl"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop('B', e)}
                >
                  <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                      <span className="text-xs font-extrabold tracking-wider text-white font-mono uppercase">
                        Picture B
                      </span>
                    </div>
                    {/* Picture Label editor */}
                    <input
                      type="text"
                      value={activeActivity.picBLabel}
                      onChange={(e) => handleUpdateField('picBLabel', e.target.value)}
                      className="text-xs font-mono text-emerald-300 text-right bg-neutral-950/50 border border-white/10 rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-500/50 max-w-[130px]"
                      placeholder="Etiqueta B"
                    />
                  </div>

                  {/* Image Display & Dropzone Frame */}
                  <div className="relative h-64 rounded-xl bg-black/60 border border-dashed border-white/20 overflow-hidden flex items-center justify-center group shadow-inner">
                    <img
                      src={activeActivity.picBUrl}
                      alt="Compare B Preview"
                      referrerPolicy="no-referrer"
                      className="object-contain w-full h-full select-none"
                    />

                    {/* Image compression loading overlay */}
                    {isCompressingImage === 'B' && (
                      <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-center gap-2 rounded-xl text-white">
                        <div className="w-7 h-7 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-bold text-emerald-300">Otimizando e salvando imagem...</span>
                      </div>
                    )}

                    {/* Overlay info / tools */}
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center pointer-events-none p-4 text-center">
                      <span className="text-xs text-white/90 bg-black/80 px-3 py-1.5 rounded-xl border border-white/15 backdrop-blur-md">
                        Arraste uma foto aqui para trocar
                      </span>
                    </div>
                  </div>

                  {/* Traditional Upload, AI Generator & URL controls */}
                  <div className="grid grid-cols-3 gap-2">
                    <label className="py-2 px-2.5 bg-blue-600/90 hover:bg-blue-500 text-white font-bold rounded-xl text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-blue-950/30 hover:scale-[1.02] active:scale-95">
                      <FileUp size={14} />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/jpeg, image/jpg, image/png, image/webp"
                        onChange={(e) => handleImageUpload('B', e)}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => setAiGenModal({ isOpen: true, target: 'B', prompt: '', isGenerating: false })}
                      className="py-2 px-2.5 bg-neutral-900/80 hover:bg-neutral-800 border border-amber-500/50 text-amber-300 font-extrabold rounded-xl text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.2)] hover:shadow-[0_0_18px_rgba(245,158,11,0.4)] backdrop-blur-md hover:scale-[1.02] active:scale-95"
                    >
                      <Sparkles size={14} className="text-amber-400" />
                      <span>Gerar IA</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        const url = prompt('Cole o link (URL) da imagem desejada para a Imagem B:', activeActivity.picBUrl);
                        if (url) await processAndSetImage('B', url);
                      }}
                      className="py-2 px-2.5 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl text-white font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-95"
                    >
                      <Link size={13} />
                      <span>URL</span>
                    </button>
                  </div>

                  {/* Zoom controls HUD */}
                  <div className="flex items-center justify-between text-xs bg-black/40 border border-white/10 rounded-xl p-2 font-mono">
                    <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Ajustar Lente:</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleZoomOut('B')} className="p-1 hover:bg-white/10 rounded text-white/80 cursor-pointer" title="Zoom Out"><ZoomOut size={13} /></button>
                      <button onClick={() => handleZoomIn('B')} className="p-1 hover:bg-white/10 rounded text-white/80 cursor-pointer" title="Zoom In"><ZoomIn size={13} /></button>
                      <button onClick={() => handleResetZoom('B')} className="p-1 hover:bg-white/10 rounded text-white/80 cursor-pointer" title="Resetar Lente"><RotateCcw size={13} /></button>
                    </div>
                  </div>
                </div>

              </div>

              {/* MOBILE SWAP TRIGGERS */}
              <div className="flex justify-center md:hidden shrink-0">
                <button
                  onClick={handleSwapImages}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-lg cursor-pointer active:scale-95"
                >
                  <RefreshCw size={14} />
                  <span>⇄ Inverter Foto A / Foto B</span>
                </button>
              </div>

              {/* SECTION C: QUESTIONS & CONVERSATION PANEL */}
              <div className="p-5 sm:p-6 rounded-2xl bg-neutral-900/60 border border-white/10 backdrop-blur-2xl shadow-xl space-y-4">
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-extrabold tracking-widest text-white uppercase font-mono">
                      Perguntas de Conversação (Speaking)
                    </span>
                    <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] rounded-full font-mono font-bold">
                      {activeActivity.questions.length} Cadastradas
                    </span>
                  </div>

                  <button
                    onClick={handleAddQuestion}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-950/40 hover:scale-[1.02] active:scale-95"
                  >
                    <Plus size={14} />
                    <span>Nova Pergunta</span>
                  </button>
                </div>

                {/* QUESTIONS CARDS LIST */}
                <div className="space-y-3">
                  {activeActivity.questions.map((q, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 bg-neutral-950/70 border border-white/10 hover:border-white/20 rounded-xl transition-all focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/30"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <span className="w-7 h-7 rounded-lg bg-white/10 text-xs font-mono font-bold text-white/80 flex items-center justify-center shrink-0 border border-white/10">
                          {idx + 1}
                        </span>
                        
                        <input
                          type="text"
                          value={q}
                          onChange={(e) => handleUpdateQuestion(idx, e.target.value)}
                          className="flex-1 bg-transparent border-none text-xs text-white placeholder-white/30 focus:outline-none focus:ring-0 font-medium"
                          placeholder="Digite a pergunta para a aula..."
                        />
                      </div>

                      {/* Toolbars of question actions */}
                      <div className="flex items-center justify-end gap-1.5 shrink-0 border-t border-white/10 pt-2 md:pt-0 md:border-none">
                        <button
                          onClick={() => handleMoveQuestion(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer"
                          title="Mover para cima"
                        >
                          <ChevronLeft size={14} className="rotate-90" />
                        </button>
                        <button
                          onClick={() => handleMoveQuestion(idx, 'down')}
                          disabled={idx === activeActivity.questions.length - 1}
                          className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer"
                          title="Mover para baixo"
                        >
                          <ChevronLeft size={14} className="-rotate-90" />
                        </button>
                        <button
                          onClick={() => handleDuplicateQuestion(idx)}
                          className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all cursor-pointer"
                          title="Duplicar pergunta"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(idx)}
                          className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 hover:text-red-300 transition-all cursor-pointer"
                          title="Remover pergunta"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION D: PRIVATE TEACHER NOTES */}
              <div className="p-5 sm:p-6 rounded-2xl bg-neutral-900/60 border border-blue-500/20 backdrop-blur-2xl shadow-xl space-y-2">
                <div className="flex items-center gap-2 text-blue-400">
                  <Info size={16} />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider">Teacher Notes (Notas Privadas do Professor)</span>
                </div>
                <p className="text-[11px] text-white/50 leading-relaxed font-light">
                  Lembretes de vocabulário, estruturas gramaticais ou dicas de aula que permanecem ocultas dos alunos durante a apresentação.
                </p>
                <textarea
                  rows={2}
                  value={activeActivity.teacherNotes}
                  onChange={(e) => handleUpdateField('teacherNotes', e.target.value)}
                  placeholder="Ex: Reforçar o uso das expressões de contraste como 'while', 'whereas', 'on the other hand'..."
                  className="w-full bg-neutral-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white/90 placeholder-white/30 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 resize-none font-light leading-relaxed mt-2 transition-all"
                />
              </div>

              {/* DYNAMIC BACKUP & RESTORE / KEYBOARD SHORTCUT QUICK CARD */}
              <div className="flex justify-between items-center text-[10px] text-white/50 font-mono px-1">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  <Check size={11} />
                  <span>Sincronização em Tempo Real Ativa</span>
                </span>
                
                <button
                  onClick={() => setShowShortcutsModal(true)}
                  className="flex items-center gap-1.5 hover:text-white transition-all cursor-pointer"
                >
                  <Keyboard size={13} />
                  <span>Atalhos de Teclado (F, M, Q, N, P, S)</span>
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-20 bg-neutral-900/60 border border-white/10 rounded-2xl">
              <p className="text-white/50 text-sm font-light">Selecione ou crie uma nova atividade para começar.</p>
            </div>
          )}

        </div>

      </div>

      {/* WORD DEFINITION POPOVER - COMPACT MINI BALLOON */}
      <AnimatePresence>
        {(activeWordDef || isDefiningWord) && (
          <div className="fixed inset-0 z-[200000] flex items-start justify-center pt-20 md:pt-28 p-4 pointer-events-none">
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: -10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: -10 }}
              className="pointer-events-auto relative z-10 bg-neutral-900/95 border border-amber-400/40 rounded-2xl p-4 max-w-[300px] w-full shadow-2xl backdrop-blur-xl text-left"
            >
              <button
                onClick={() => {
                  setActiveWordDef(null);
                  setIsDefiningWord(false);
                }}
                className="absolute top-3 right-3 p-1 text-white/40 hover:text-white transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>

              {isDefiningWord ? (
                <div className="flex items-center gap-2.5 py-2">
                  <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-[11px] text-white/70 font-mono">Buscando tradução...</p>
                </div>
              ) : activeWordDef && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2 pr-5">
                    <div>
                      <h3 className="text-sm font-extrabold text-white tracking-tight capitalize">
                        {activeWordDef.word}
                      </h3>
                      <p className="text-[10px] text-amber-400 font-mono">
                        {activeWordDef.pronunciation} • {activeWordDef.pos}
                      </p>
                    </div>
                    <button
                      onClick={() => speakText(activeWordDef.word)}
                      className="p-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 rounded-lg transition-all cursor-pointer"
                      title="Ouvir pronúncia"
                    >
                      <Volume2 size={14} />
                    </button>
                  </div>

                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5">
                    <span className="text-[9px] uppercase font-bold text-emerald-400/80 tracking-wider font-mono block">
                      Tradução
                    </span>
                    <p className="text-sm font-extrabold text-emerald-300 capitalize mt-0.5">
                      {activeWordDef.translation}
                    </p>
                  </div>

                  {activeWordDef.example && (
                    <p className="text-[10.5px] text-white/70 italic font-light leading-snug pt-0.5">
                      "{activeWordDef.example}"
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DONE ACTIVITY CELEBRATION MODAL WITH AM/PM CLOCK */}
      <AnimatePresence>
        {isDoneModalOpen && (
          <div className="fixed inset-0 z-[8000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 20 }}
              className="relative z-10 bg-neutral-900 border border-emerald-500/40 rounded-3xl p-6 md:p-8 max-w-md w-full text-center shadow-2xl space-y-6"
            >
              <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/50">
                <Check size={32} />
              </div>

              <div>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-mono font-bold uppercase tracking-widest">
                  Atividade Concluída!
                </span>
                <h2 className="text-xl md:text-2xl font-extrabold text-white mt-3">
                  Parabéns! Excelente trabalho.
                </h2>
                <p className="text-xs text-white/60 font-light mt-1">
                  O tempo foi congelado e você pode retornar ao relógio principal da tela inicial.
                </p>
              </div>

              {/* AM / PM CLOCK & DURATION DISPLAY */}
              <div className="grid grid-cols-2 gap-3 bg-neutral-950/80 border border-white/10 p-4 rounded-2xl">
                <div className="flex flex-col items-center justify-center border-r border-white/10 pr-2">
                  <span className="text-[10px] text-white/40 uppercase font-mono font-bold">Horário de Conclusão</span>
                  <span className="text-base md:text-lg font-extrabold text-amber-300 font-mono mt-1">
                    {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center pl-2">
                  <span className="text-[10px] text-white/40 uppercase font-mono font-bold">Duração da Sessão</span>
                  <span className="text-base md:text-lg font-extrabold text-emerald-400 font-mono mt-1">
                    {Math.floor(sessionSeconds / 60)}m {sessionSeconds % 60}s
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                <button
                  onClick={() => {
                    setIsDoneModalOpen(false);
                    if (onNavigate) {
                      onNavigate('home');
                    }
                  }}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Clock size={16} />
                  <span>Ir para Relógio Principal (Início)</span>
                </button>

                <button
                  onClick={() => {
                    setIsDoneModalOpen(false);
                    setSessionSeconds(0);
                    setIsSessionTimerRunning(true);
                  }}
                  className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer border border-white/15"
                >
                  Nova Atividade
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI IMAGE GENERATOR MODAL */}
      <AnimatePresence>
        {aiGenModal.isOpen && (
          <div className="fixed inset-0 z-[8000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setAiGenModal(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 15 }}
              className="relative z-10 bg-neutral-900/95 border border-amber-500/30 rounded-3xl p-6 max-w-lg w-full shadow-2xl backdrop-blur-2xl text-left space-y-5"
            >
              <button
                onClick={() => setAiGenModal(prev => ({ ...prev, isOpen: false }))}
                className="absolute top-4 right-4 p-1 text-white/40 hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-300">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">
                    Gerador de Imagens para Comparação
                  </h3>
                  <p className="text-xs text-white/50">
                    Gerando imagem para <span className="font-bold text-amber-400">Picture {aiGenModal.target}</span>
                  </p>
                </div>
              </div>

              {/* 1-CLICK COMPARISON PRESETS */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-mono font-bold text-white/40 tracking-wider">
                  Presets de Comparação Prontos (1-Clique para Imagem A e B)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_COMPARISONS.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => handleGenerateAiImage(preset.label, 'BOTH')}
                      disabled={aiGenModal.isGenerating}
                      className="p-2.5 bg-white/5 hover:bg-amber-500/10 border border-white/10 hover:border-amber-400/40 rounded-xl text-xs text-white/80 hover:text-white text-left transition-all cursor-pointer font-medium"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* CUSTOM PROMPT INPUT */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <label className="text-[10px] uppercase font-mono font-bold text-white/40 tracking-wider">
                  Ou digite a descrição da imagem (Português ou Inglês):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiGenModal.prompt}
                    onChange={(e) => setAiGenModal(prev => ({ ...prev, prompt: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleGenerateAiImage(aiGenModal.prompt);
                    }}
                    placeholder="Ex: Pessoas tomand o café da manhã na sacada com vista para o mar..."
                    className="flex-1 bg-black/50 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-400/60"
                  />
                  <button
                    type="button"
                    onClick={() => handleGenerateAiImage(aiGenModal.prompt)}
                    disabled={aiGenModal.isGenerating || !aiGenModal.prompt.trim()}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-amber-500/20"
                  >
                    {aiGenModal.isGenerating ? 'Gerando...' : 'Gerar'}
                  </button>
                </div>
              </div>

              {aiGenModal.isGenerating && (
                <div className="flex items-center justify-center gap-2 py-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-300 text-xs font-mono">
                  <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <span>Gerando imagem em alta definição...</span>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* KEYBOARD SHORTCUTS INFORMATIVE MODAL */}
      <AnimatePresence>
        {showShortcutsModal && (
          <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShortcutsModal(false)}
              className="absolute inset-0 bg-black/85"
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-white/10 rounded-3xl p-6 max-w-md w-full relative z-10 shadow-2xl backdrop-blur-xl"
            >
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-2 mb-4 text-blue-400">
                <Keyboard size={18} />
                <h3 className="text-sm font-extrabold uppercase tracking-wider font-mono">Atalhos de Teclado</h3>
              </div>

              <div className="space-y-2.5 font-mono text-xs">
                {[
                  { key: 'M', desc: 'Ativar / desativar Modo Apresentação' },
                  { key: 'F', desc: 'Alternar foco de imagem individual (A, B, normal)' },
                  { key: 'Q', desc: 'Mostrar / ocultar painel de perguntas' },
                  { key: 'N', desc: 'Próxima pergunta' },
                  { key: 'P', desc: 'Pergunta anterior' },
                  { key: 'S', desc: 'Exportar atividade para JSON' },
                  { key: 'Z', desc: 'Resetar zoom de ambas as lentes' },
                  { key: 'ESC', desc: 'Sair do Modo Apresentação' }
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1.5 border-b border-white/5">
                    <span className="text-white/50">{item.desc}</span>
                    <span className="px-2 py-0.5 bg-white/10 border border-white/10 text-white rounded font-bold">{item.key}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
