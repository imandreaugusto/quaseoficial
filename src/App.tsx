import { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Home } from './components/Home';
import { Dashboard } from './components/Dashboard';
import { GoogleClassroom } from './components/GoogleClassroom';
import { GoogleMeet } from './components/GoogleMeet';
import { ReadClub } from './components/ReadClub';
import { BrazilianBoard } from './components/BrazilianBoard';
import { Settings } from './components/Settings';
import { BrazilianConversation } from './components/BrazilianConversation';
import { BrazilianQuiz } from './components/BrazilianQuiz';
import { BrazilianGames } from './components/BrazilianGames';
import { BrazilianTradutor } from './components/BrazilianTradutor';
import { BiaCompare } from './components/BiaCompare';
import { YouTubeHub } from './components/YouTubeHub';
import { BrazilianPractice } from './components/BrazilianPractice';
import { BrazilianStories, StoryRecordingBar } from './components/BrazilianStories';
import { BrazilianFriends } from './components/BrazilianFriends';
import { StreamStudio } from './components/StreamStudio';
import { AdminSettings } from './components/AdminSettings';
import { AdminFeedbackPanel } from './components/AdminFeedbackPanel';
import { StudentFeedback } from './components/StudentFeedback';
import { AuthModal } from './components/AuthModal';
import { PixPaymentScreen } from './components/PixPaymentScreen';
import { GlobalStreamOverlay } from './components/GlobalStreamOverlay';
import { GlobalFloatingCamera } from './components/GlobalFloatingCamera';
import { PageReveal } from './components/PageReveal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BrazilianLogo } from './components/BrazilianLogo';
import { CleanStudentStage } from './components/CleanStudentStage';
import { ClassItem, ExpenseItem, AppSettings, StoryItem, ReadSession, GlossaryEntry, UserProfile, StudentPermissions } from './types';
import { INITIAL_READ_LIBRARY, SLIDESHOW_IMAGES, US_LANDMARKS } from './data';
import { CEO_EMAIL, logAdminAccessAttempt, isAuthorizedCeoEmail } from './utils/security';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutPositionProvider } from './lib/LayoutPositionContext';
import {
  loadSharedContentFromSupabase,
  loadStudentProgressFromSupabase,
  syncSharedContentToSupabase,
  syncStudentProgressToSupabase,
} from './utils/supabaseClient';
import { Eye, EyeOff, MapPin } from 'lucide-react';
import {
  getSupabaseClient,
  getSubscriptionStatusFromSupabase,
} from './utils/supabaseClient';

const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  prewarnMin: 10,
  clock24h: false,
  autoStart: false,
  confirmDel: true,
  blurValues: true,
  bgEnabled: true,
  bgBright: 'normal',
  accentColor: '#ff8c00',
  readerFont: 22,
  readerFontFamily: 'poppins',
  readerAlign: 'center',
  lang: 'pt',
  uiDensity: 'normal',
  uiScale: 'md',
  showNextClass: true,
  animOn: true,
  menuMode: 'click',
  focusMode: false,
  compactStreamOverlay: false,
  bgInterval: 8,
};

// Dynamic Landmark Controls Subcomponent (Displays current city name automatically)
const LandmarkControlsWidget: React.FC<{
  settings: AppSettings;
  bgIndex: number;
  setBgIndex: React.Dispatch<React.SetStateAction<number>>;
  bgPaused: boolean;
  setBgPaused: React.Dispatch<React.SetStateAction<boolean>>;
}> = ({ settings, bgIndex }) => {
  if (!settings.bgEnabled || !US_LANDMARKS[bgIndex]) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0, right: 'clamp(0.75rem, 2vw, 2rem)' }}
      transition={{ type: 'spring', damping: 25, stiffness: 240 }}
      style={{ position: 'fixed', right: 'clamp(0.75rem, 2vw, 2rem)', bottom: '12px', zIndex: 2500 }}
      className="select-none text-right flex items-center gap-2 p-1.5 px-3 rounded-2xl"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={bgIndex}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-1.5 text-xs font-medium text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]"
        >
          <MapPin size={12} className="text-amber-400 shrink-0" />
          <span className="font-semibold tracking-wide uppercase text-[11px] text-white/90">
            {US_LANDMARKS[bgIndex]?.name}
          </span>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

export default function App() {
  // SAAS Authentication & Access Control States
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [cloudSaveStatus, setCloudSaveStatus] = useState<'saving' | 'saved' | 'error' | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [currentApp, setCurrentApp] = useState<string>('home');
  const [quickTradutorModalOpen, setQuickTradutorModalOpen] = useState(false);
  const [isStudentPreviewMode, setIsStudentPreviewMode] = useState(false);

  // Background Slideshow state
  const [bgIndex, setBgIndex] = useState(0);
  const [bgPaused, setBgPaused] = useState(false);

  // App core persistent databases
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Read Club persistent databases
  const [library, setLibrary] = useState<StoryItem[]>([]);
  const [sessions, setSessions] = useState<ReadSession[]>([]);
  const [glossary, setGlossary] = useState<Record<string, GlossaryEntry>>({});
  const [learnedWords, setLearnedWords] = useState<Record<number, string[]>>({});

  // Global Stream Studio Overlay State
  const [streamActive, setStreamActive] = useState(false);
  const [isFloatingCamActive, setIsFloatingCamActive] = useState(false);
  const [isStoryCamActive, setIsStoryCamActive] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrUrl, setQrUrl] = useState('https://www.youtube.com/@brazilianinaction');
  const [qrTitle, setQrTitle] = useState('Canal YouTube');
  const [showLowerThird, setShowLowerThird] = useState(false);
  const [teacherName, setTeacherName] = useState('Prof. André');
  const [lessonSubject, setLessonSubject] = useState('Brazilian in Action');
  const [showTicker, setShowTicker] = useState(false);
  const [tickerText, setTickerText] = useState(
    'Bem-vindos ao Brazilian in Action! • Inscreva-se no YouTube @brazilianinaction • Dúvidas no chat!'
  );
  const [showBanner, setShowBanner] = useState(false);
  const [bannerText, setBannerText] = useState('DICA DA AULA: Pratique a pronúncia do R caipira e R carioca');
  const [showTimer, setShowTimer] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(300);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const alarmPlayedRef = useRef<Record<string, boolean>>({});
  const platformSyncQueueRef = useRef(Promise.resolve());
  const progressSyncQueueRef = useRef(Promise.resolve());
  const pendingPlatformPayloadRef = useRef<{
    classes: ClassItem[];
    expenses: ExpenseItem[];
    settings: AppSettings;
    library: StoryItem[];
  } | null>(null);
  const progressRef = useRef({ sessions, glossary, learnedWords });
  const pendingProgressRef = useRef<{
    userId: string;
    progress: { sessions: ReadSession[]; glossary: Record<string, GlossaryEntry>; learnedWords: Record<number, string[]> };
  } | null>(null);

  const queuePlatformSync = (payload: {
    classes: ClassItem[];
    expenses: ExpenseItem[];
    settings: AppSettings;
    library: StoryItem[];
  }) => {
    pendingPlatformPayloadRef.current = payload;
    setCloudSaveStatus('saving');
    platformSyncQueueRef.current = platformSyncQueueRef.current
      .catch(() => undefined)
      .then(() => syncSharedContentToSupabase('platform', payload))
      .then(() => {
        if (pendingPlatformPayloadRef.current === payload) {
          pendingPlatformPayloadRef.current = null;
          if (!pendingProgressRef.current) setCloudSaveStatus('saved');
        }
      })
      .catch((error) => {
        console.error('Platform cloud save failed:', error);
        setCloudSaveStatus('error');
      });
  };

  const queueProgressSync = (
    userId: string,
    progress: { sessions: ReadSession[]; glossary: Record<string, GlossaryEntry>; learnedWords: Record<number, string[]> }
  ) => {
    const pending = { userId, progress };
    pendingProgressRef.current = pending;
    setCloudSaveStatus('saving');
    progressSyncQueueRef.current = progressSyncQueueRef.current
      .catch(() => undefined)
      .then(() => syncStudentProgressToSupabase(userId, progress))
      .then(() => {
        if (pendingProgressRef.current === pending) {
          pendingProgressRef.current = null;
          if (!pendingPlatformPayloadRef.current) setCloudSaveStatus('saved');
        }
      })
      .catch((error) => {
        console.error('Read Club progress cloud save failed:', error);
        setCloudSaveStatus('error');
      });
  };

  const retryPendingCloudSaves = () => {
    if (pendingPlatformPayloadRef.current) queuePlatformSync(pendingPlatformPayloadRef.current);
    if (pendingProgressRef.current) {
      queueProgressSync(pendingProgressRef.current.userId, pendingProgressRef.current.progress);
    }
  };

  useEffect(() => {
    window.addEventListener('online', retryPendingCloudSaves);
    return () => window.removeEventListener('online', retryPendingCloudSaves);
  }, []);

  // Initial Auth & Session Verification
  useEffect(() => {
    const savedUserRaw = localStorage.getItem('bia_current_user');
    if (savedUserRaw) {
      try {
        const user: UserProfile = JSON.parse(savedUserRaw);
        
        // HARD ENFORCEMENT: Only the verified CEO Email can hold role 'admin'
        if (user.role === 'admin' && !isAuthorizedCeoEmail(user.email)) {
          logAdminAccessAttempt({
            email: user.email,
            userRole: user.role,
            action: 'ROLE_TAMPERING_DETECTED',
            details: `Inconsistência de privilégio: Usuário ${user.email} tentou carregar sessão como admin. Rebaixado para student.`,
            success: false
          });
          user.role = 'student';
          localStorage.setItem('bia_current_user', JSON.stringify(user));
        }

        // Check expiration for students
        if (user.role !== 'admin' && user.data_expiracao && new Date(user.data_expiracao) < new Date()) {
          user.status = 'expired';
          localStorage.setItem('bia_current_user', JSON.stringify(user));
        }

        void hydrateUserWithCloudSubscription(user)
          .then((hydratedUser) => {
            if (user.email.trim().toLowerCase() === CEO_EMAIL && hydratedUser.status !== 'active') {
              localStorage.removeItem('bia_current_user');
              setCurrentUser(null);
              setIsAuthModalOpen(true);
              return;
            }
            setCurrentUser(hydratedUser);
            setCurrentApp('home');
          })
          .finally(() => setIsBooting(false));
      } catch (e) {
        setIsAuthModalOpen(true);
        setIsBooting(false);
      }
    } else {
      setIsAuthModalOpen(true);
      setIsBooting(false);
    }

    const handleUsersChange = () => {
      const savedUserRaw = localStorage.getItem('bia_current_user');
      const usersDbRaw = localStorage.getItem('bia_users_database');
      if (savedUserRaw && usersDbRaw) {
        try {
          const current: UserProfile = JSON.parse(savedUserRaw);
          const db: UserProfile[] = JSON.parse(usersDbRaw);
          const found = db.find((u) => u.id === current.id || u.email.toLowerCase() === current.email.toLowerCase());
          if (found) {
            // Verify admin privilege integrity
            if (found.role === 'admin' && !isAuthorizedCeoEmail(found.email)) {
              found.role = 'student';
            }
            setCurrentUser(found);
            localStorage.setItem('bia_current_user', JSON.stringify(found));
          }
        } catch (e) {}
      }
    };

    window.addEventListener('bia_users_changed', handleUsersChange);
    return () => {
      window.removeEventListener('bia_users_changed', handleUsersChange);
    };
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    let cancelled = false;
    const loadCloudContent = async () => {
      try {
        const shared = await loadSharedContentFromSupabase<{
          classes?: ClassItem[];
          expenses?: ExpenseItem[];
          settings?: AppSettings;
          library?: StoryItem[];
        }>('platform');
        if (cancelled) return;

        if (shared) {
          if (shared.classes) {
            setClasses(shared.classes);
            const stored = localStorage.getItem('bia_v14_final');
            const parsed = stored ? JSON.parse(stored) : {};
            localStorage.setItem('bia_v14_final', JSON.stringify({ ...parsed, aulas: shared.classes }));
          }
          if (shared.expenses) {
            setExpenses(shared.expenses);
            const stored = localStorage.getItem('bia_v14_final');
            const parsed = stored ? JSON.parse(stored) : {};
            localStorage.setItem('bia_v14_final', JSON.stringify({ ...parsed, desp: shared.expenses }));
          }
          if (shared.settings) {
            const nextSettings = { ...DEFAULT_SETTINGS, ...shared.settings };
            setSettings(nextSettings);
            localStorage.setItem('bia_settings_final', JSON.stringify(nextSettings));
          }
          if (shared.library) {
            setLibrary(shared.library);
            localStorage.setItem('bia_readclub_library', JSON.stringify(shared.library));
          }

          if (
            currentUser.role === 'admin' &&
            isAuthorizedCeoEmail(currentUser.email) &&
            shared.expenses === undefined
          ) {
            const stored = localStorage.getItem('bia_v14_final');
            const localExpenses: ExpenseItem[] = stored ? JSON.parse(stored).desp || [] : [];
            queuePlatformSync({
              classes: shared.classes || classes,
              expenses: localExpenses,
              settings: shared.settings ? { ...DEFAULT_SETTINGS, ...shared.settings } : settings,
              library: shared.library || library,
            });
          }
        } else if (currentUser.role === 'admin' && isAuthorizedCeoEmail(currentUser.email)) {
          const stored = localStorage.getItem('bia_v14_final');
          const localDashboard = stored ? JSON.parse(stored) : {};
          const localSettingsRaw = localStorage.getItem('bia_settings_final');
          const localLibraryRaw = localStorage.getItem('bia_readclub_library');
          queuePlatformSync({
            classes: localDashboard.aulas || classes,
            expenses: localDashboard.desp || [],
            settings: localSettingsRaw ? { ...DEFAULT_SETTINGS, ...JSON.parse(localSettingsRaw) } : settings,
            library: localLibraryRaw ? JSON.parse(localLibraryRaw) : library,
          });
        }

        const authUserId = currentUser.auth_user_id || currentUser.id;
        const progress = await loadStudentProgressFromSupabase(authUserId) as {
          sessions?: ReadSession[];
          glossary?: Record<string, GlossaryEntry>;
          learned_words?: Record<number, string[]>;
        } | null;
        if (cancelled) return;

        if (progress) {
          const nextProgress = {
            sessions: progress.sessions || [],
            glossary: progress.glossary || {},
            learnedWords: progress.learned_words || {},
          };
          progressRef.current = nextProgress;
          setSessions(nextProgress.sessions);
          setGlossary(nextProgress.glossary);
          setLearnedWords(nextProgress.learnedWords);
          localStorage.setItem('bia_readclub_sessions', JSON.stringify(nextProgress.sessions));
          localStorage.setItem('bia_readclub_glossary', JSON.stringify(nextProgress.glossary));
          localStorage.setItem('bia_readclub_learned', JSON.stringify(nextProgress.learnedWords));
        } else {
          const localProgress = {
            sessions: JSON.parse(localStorage.getItem('bia_readclub_sessions') || '[]') as ReadSession[],
            glossary: JSON.parse(localStorage.getItem('bia_readclub_glossary') || '{}') as Record<string, GlossaryEntry>,
            learnedWords: JSON.parse(localStorage.getItem('bia_readclub_learned') || '{}') as Record<number, string[]>,
          };
          progressRef.current = localProgress;
          queueProgressSync(authUserId, localProgress);
        }
      } catch (error) {
        console.error('Could not load cloud-saved platform data:', error);
        if (!cancelled) setCloudSaveStatus('error');
      }
    };

    void loadCloudContent();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  // 1. Initial Load of Local Databases
  useEffect(() => {
    try {
      const storedData = localStorage.getItem('bia_v14_final');
      if (storedData) {
        const parsed = JSON.parse(storedData);
        if (parsed.aulas && parsed.aulas.length > 0) setClasses(parsed.aulas);
        else {
          const defaultAulas: ClassItem[] = [
            { id: 'aula-1', n: 'Turma das 8h (Morning Flow)', tipo: 'turma', h: '08', p: 'AM', d: [0, 2, 4], f: [], notas: 'Grammar & Fluency' },
            { id: 'aula-2', n: 'Turma das 9h (Conversation Pro)', tipo: 'turma', h: '09', p: 'AM', d: [1, 3], f: [], notas: 'Speaking & Pronunciation' },
            { id: 'aula-3', n: 'Turma das 10h (Master Group)', tipo: 'turma', h: '10', p: 'AM', d: [0, 2, 4], f: [], notas: 'Advanced & Business' }
          ];
          setClasses(defaultAulas);
          localStorage.setItem('bia_v14_final', JSON.stringify({ ...parsed, aulas: defaultAulas }));
        }
        if (parsed.desp) setExpenses(parsed.desp);
      } else {
        // Fallback default sample classes: 8h, 9h, 10h
        const defaultAulas: ClassItem[] = [
          { id: 'aula-1', n: 'Turma das 8h (Morning Flow)', tipo: 'turma', h: '08', p: 'AM', d: [0, 2, 4], f: [], notas: 'Grammar & Fluency' },
          { id: 'aula-2', n: 'Turma das 9h (Conversation Pro)', tipo: 'turma', h: '09', p: 'AM', d: [1, 3], f: [], notas: 'Speaking & Pronunciation' },
          { id: 'aula-3', n: 'Turma das 10h (Master Group)', tipo: 'turma', h: '10', p: 'AM', d: [0, 2, 4], f: [], notas: 'Advanced & Business' }
        ];
        setClasses(defaultAulas);
        localStorage.setItem('bia_v14_final', JSON.stringify({ aulas: defaultAulas, desp: [] }));
      }

      const storedSettings = localStorage.getItem('bia_settings_final');
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed, bgEnabled: true });
      } else {
        setSettings(DEFAULT_SETTINGS);
      }

      const storedLib = localStorage.getItem('bia_readclub_library');
      if (storedLib) {
        try {
          const parsedLib: StoryItem[] = JSON.parse(storedLib);
          if (Array.isArray(parsedLib)) {
            setLibrary(parsedLib);
          } else {
            setLibrary(INITIAL_READ_LIBRARY);
            localStorage.setItem('bia_readclub_library', JSON.stringify(INITIAL_READ_LIBRARY));
          }
        } catch (e) {
          setLibrary(INITIAL_READ_LIBRARY);
        }
      } else {
        setLibrary(INITIAL_READ_LIBRARY);
        localStorage.setItem('bia_readclub_library', JSON.stringify(INITIAL_READ_LIBRARY));
      }

      const storedSessions = localStorage.getItem('bia_readclub_sessions');
      if (storedSessions) {
        setSessions(JSON.parse(storedSessions));
      }

      const storedGlossary = localStorage.getItem('bia_readclub_glossary');
      if (storedGlossary) {
        setGlossary(JSON.parse(storedGlossary));
      }

      const storedLearned = localStorage.getItem('bia_readclub_learned');
      if (storedLearned) {
        setLearnedWords(JSON.parse(storedLearned));
      }
    } catch (e) {
      console.error('Error loading initial data:', e);
    }
  }, []);

  // 2. Automated Background Slideshow Rotator (7 seconds per landmark)
  useEffect(() => {
    if (!settings.bgEnabled || bgPaused || SLIDESHOW_IMAGES.length === 0) return;
    
    // Preload next 2 images in sequence for instantaneous transitions
    const nextIdx = (bgIndex + 1) % SLIDESHOW_IMAGES.length;
    const nextNextIdx = (bgIndex + 2) % SLIDESHOW_IMAGES.length;
    const img1 = new Image();
    img1.src = SLIDESHOW_IMAGES[nextIdx];
    const img2 = new Image();
    img2.src = SLIDESHOW_IMAGES[nextNextIdx];

    const slideDuration = (settings.bgInterval && settings.bgInterval > 0 ? settings.bgInterval : 7) * 1000;
    const timer = setTimeout(() => {
      setBgIndex((prev) => (prev + 1) % SLIDESHOW_IMAGES.length);
    }, slideDuration);

    return () => clearTimeout(timer);
  }, [settings.bgEnabled, settings.bgInterval, bgPaused, bgIndex]);

  // Sync state helpers with atomic persistence
  const handleUpdateClasses = (next: ClassItem[]) => {
    setClasses(next);
    queuePlatformSync({ classes: next, expenses, settings, library });
    try {
      const stored = localStorage.getItem('bia_v14_final');
      const parsed = stored ? JSON.parse(stored) : {};
      localStorage.setItem('bia_v14_final', JSON.stringify({ ...parsed, aulas: next, desp: expenses }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateExpenses = (next: ExpenseItem[]) => {
    setExpenses(next);
    queuePlatformSync({ classes, expenses: next, settings, library });
    try {
      const stored = localStorage.getItem('bia_v14_final');
      const parsed = stored ? JSON.parse(stored) : {};
      localStorage.setItem('bia_v14_final', JSON.stringify({ ...parsed, aulas: classes, desp: next }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateSettings = (updated: Partial<AppSettings>) => {
    const next = { ...settings, ...updated };
    setSettings(next);
    queuePlatformSync({ classes, expenses, settings: next, library });
    localStorage.setItem('bia_settings_final', JSON.stringify(next));
  };

  const handleUpdateLibrary = (next: StoryItem[]) => {
    setLibrary(next);
    queuePlatformSync({ classes, expenses, settings, library: next });
    localStorage.setItem('bia_readclub_library', JSON.stringify(next));
  };

  const handleUpdateSessions = (next: ReadSession[]) => {
    setSessions(next);
    const updated = { ...progressRef.current, sessions: next };
    progressRef.current = updated;
    if (currentUser) queueProgressSync(currentUser.auth_user_id || currentUser.id, updated);
    localStorage.setItem('bia_readclub_sessions', JSON.stringify(next));
  };

  const handleUpdateGlossary = (next: Record<string, GlossaryEntry>) => {
    setGlossary(next);
    const updated = { ...progressRef.current, glossary: next };
    progressRef.current = updated;
    if (currentUser) queueProgressSync(currentUser.auth_user_id || currentUser.id, updated);
    localStorage.setItem('bia_readclub_glossary', JSON.stringify(next));
  };

  const handleUpdateLearnedWords = (next: Record<number, string[]>) => {
    setLearnedWords(next);
    const updated = { ...progressRef.current, learnedWords: next };
    progressRef.current = updated;
    if (currentUser) queueProgressSync(currentUser.auth_user_id || currentUser.id, updated);
    localStorage.setItem('bia_readclub_learned', JSON.stringify(next));
  };

  // Class & Expense actions with immediate state reflection
  const handleAddClass = () => {
    const newClass: ClassItem = {
      id: `class_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      n: '',
      tipo: 'individual',
      h: '08',
      p: 'AM',
      d: [0, 2],
      f: [],
      notas: '',
    };
    const next = [...classes, newClass];
    handleUpdateClasses(next);
  };

  const handleUpdateClassItem = (id: string, updated: Partial<ClassItem>) => {
    setClasses((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, ...updated } : c));
      try {
        const stored = localStorage.getItem('bia_v14_final');
        const parsed = stored ? JSON.parse(stored) : {};
        localStorage.setItem('bia_v14_final', JSON.stringify({ ...parsed, aulas: next, desp: expenses }));
      } catch (e) {}
      queuePlatformSync({ classes: next, expenses, settings, library });
      return next;
    });
  };

  const handleDeleteClassItem = (id: string) => {
    setClasses((prev) => {
      const next = prev.filter((c) => c.id !== id);
      try {
        const stored = localStorage.getItem('bia_v14_final');
        const parsed = stored ? JSON.parse(stored) : {};
        localStorage.setItem('bia_v14_final', JSON.stringify({ ...parsed, aulas: next, desp: expenses }));
      } catch (e) {}
      queuePlatformSync({ classes: next, expenses, settings, library });
      return next;
    });
  };

  const handleAddExpense = () => {
    const newExpense: ExpenseItem = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      n: '',
      v: 0,
    };
    const next = [...expenses, newExpense];
    handleUpdateExpenses(next);
  };

  const handleUpdateExpenseItem = (id: string, updated: Partial<ExpenseItem>) => {
    setExpenses((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, ...updated } : e));
      try {
        const stored = localStorage.getItem('bia_v14_final');
        const parsed = stored ? JSON.parse(stored) : {};
        localStorage.setItem('bia_v14_final', JSON.stringify({ ...parsed, aulas: classes, desp: next }));
      } catch (e) {}
      queuePlatformSync({ classes, expenses: next, settings, library });
      return next;
    });
  };

  const handleDeleteExpenseItem = (id: string) => {
    setExpenses((prev) => {
      const next = prev.filter((e) => e.id !== id);
      try {
        const stored = localStorage.getItem('bia_v14_final');
        const parsed = stored ? JSON.parse(stored) : {};
        localStorage.setItem('bia_v14_final', JSON.stringify({ ...parsed, aulas: classes, desp: next }));
      } catch (e) {}
      queuePlatformSync({ classes, expenses: next, settings, library });
      return next;
    });
  };

  // Read Club actions
  const handleAddStory = (story: Omit<StoryItem, 'id'>) => {
    if (!effectiveIsAdmin) return;
    const newStory: StoryItem = { ...story, id: Date.now() };
    handleUpdateLibrary([...library, newStory]);
  };

  const handleUpdateStory = (id: number, updated: Partial<StoryItem>) => {
    if (!effectiveIsAdmin) return;
    handleUpdateLibrary(library.map((item) => (item.id === id ? { ...item, ...updated } : item)));
  };

  const handleDeleteStory = (id: number) => {
    if (!effectiveIsAdmin) return;
    handleUpdateLibrary(library.filter((item) => item.id !== id));
  };

  const handleSaveSession = (session: ReadSession) => {
    const existing = sessions.some((s) => s.key === session.key);
    if (existing) {
      handleUpdateSessions(sessions.map((s) => (s.key === session.key ? session : s)));
    } else {
      handleUpdateSessions([...sessions, session]);
    }
  };

  const handleDeleteSession = (key: string) => {
    handleUpdateSessions(sessions.filter((s) => s.key !== key));
  };

  const handleAddGlossary = (word: string, translation: string, bookId: number | null, bookTitle: string) => {
    const cleanWord = word.toLowerCase();
    const updated = {
      ...glossary,
      [cleanWord]: {
        word: cleanWord,
        translation,
        bookId,
        bookTitle,
        addedAt: Date.now(),
      },
    };
    handleUpdateGlossary(updated);
  };

  const handleRemoveGlossary = (word: string) => {
    const next = { ...glossary };
    delete next[word.toLowerCase()];
    handleUpdateGlossary(next);
  };

  const handleClearGlossary = () => {
    if (window.confirm('Deseja limpar todo o vocabulário salvo no glossário?')) {
      handleUpdateGlossary({});
    }
  };

  const handleToggleLearnedWord = (bookId: number, word: string) => {
    const list = learnedWords[bookId] || [];
    const cleanWord = word.toLowerCase();
    const nextList = list.includes(cleanWord)
      ? list.filter((w) => w !== cleanWord)
      : [...list, cleanWord];

    handleUpdateLearnedWords({
      ...learnedWords,
      [bookId]: nextList,
    });
  };

  const handleExportBackup = () => {
    const payload = {
      dashboard: { classes, expenses },
      settings,
      library,
      sessions,
      glossary,
      learnedWords,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `brazilian-in-action-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const payload: unknown = JSON.parse(String(e.target?.result || ''));
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
          throw new Error('Formato de backup inválido.');
        }
        const backup = payload as {
          dashboard?: { classes?: unknown; expenses?: unknown; aulas?: unknown; desp?: unknown };
          settings?: unknown;
          library?: unknown;
          sessions?: unknown;
          glossary?: unknown;
          learnedWords?: unknown;
        };
        const backupClasses = backup.dashboard?.classes ?? backup.dashboard?.aulas;
        const backupExpenses = backup.dashboard?.expenses ?? backup.dashboard?.desp;
        if (Array.isArray(backupClasses)) handleUpdateClasses(backupClasses as ClassItem[]);
        if (Array.isArray(backupExpenses)) handleUpdateExpenses(backupExpenses as ExpenseItem[]);
        if (backup.settings && typeof backup.settings === 'object' && !Array.isArray(backup.settings)) {
          handleUpdateSettings(backup.settings as Partial<AppSettings>);
        }
        if (Array.isArray(backup.library)) handleUpdateLibrary(backup.library as StoryItem[]);
        if (Array.isArray(backup.sessions)) handleUpdateSessions(backup.sessions as ReadSession[]);
        if (backup.glossary && typeof backup.glossary === 'object' && !Array.isArray(backup.glossary)) {
          handleUpdateGlossary(backup.glossary as Record<string, GlossaryEntry>);
        }
        if (backup.learnedWords && typeof backup.learnedWords === 'object' && !Array.isArray(backup.learnedWords)) {
          handleUpdateLearnedWords(backup.learnedWords as Record<number, string[]>);
        }
        alert('Backup restaurado com sucesso!');
      } catch (err) {
        console.error('Backup import failed:', err);
        alert('Erro ao importar arquivo de backup.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetAll = () => {
    if (window.confirm('Atenção: Todos os dados serão restaurados para o padrão de fábrica. Continuar?')) {
      localStorage.clear();
      setSettings(DEFAULT_SETTINGS);
      setClasses([]);
      setExpenses([]);
      setLibrary(INITIAL_READ_LIBRARY);
      setSessions([]);
      setGlossary({});
      setLearnedWords({});
      window.location.reload();
    }
  };

  const handleLogout = async () => {
    const client = getSupabaseClient();
    if (client) await client.auth.signOut();
    localStorage.removeItem('bia_current_user');
    setCurrentUser(null);
    setIsAuthModalOpen(true);
  };

  const hydrateUserWithCloudSubscription = async (profile: UserProfile): Promise<UserProfile> => {
    const normalizedEmail = profile.email.trim().toLowerCase();
    if (normalizedEmail === CEO_EMAIL) {
      const client = getSupabaseClient();
      if (!client) return { ...profile, status: 'pending', data_expiracao: null };
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || authData.user?.email?.trim().toLowerCase() !== CEO_EMAIL) {
        return { ...profile, status: 'pending', data_expiracao: null };
      }

      const ceoProfile: UserProfile = {
        ...profile,
        email: CEO_EMAIL,
        auth_user_id: authData.user.id,
        full_name: 'CEO André Augusto',
        role: 'admin',
        status: 'active',
        data_expiracao: null,
        email_verified: true,
        updated_at: new Date().toISOString()
      };
      localStorage.setItem('bia_current_user', JSON.stringify(ceoProfile));
      return ceoProfile;
    }

    if (profile.role !== 'admin' && !profile.auth_user_id) {
      return { ...profile, status: 'pending', data_expiracao: null };
    }

    if (profile.auth_user_id) {
      const client = getSupabaseClient();
      if (!client) return { ...profile, status: 'pending', data_expiracao: null };
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || authData.user?.id !== profile.auth_user_id) {
        return { ...profile, status: 'pending', data_expiracao: null };
      }
    }

    const subscription = await getSubscriptionStatusFromSupabase(profile.email);
    if (!subscription) {
      return profile.auth_user_id ? { ...profile, status: 'pending', data_expiracao: null } : profile;
    }

    const nextUser: UserProfile = {
      ...profile,
      status: subscription.status,
      data_expiracao: subscription.subscription_expires_at || null,
      updated_at: new Date().toISOString()
    };

    if (nextUser.status === 'active' && (!nextUser.data_expiracao || new Date(nextUser.data_expiracao) <= new Date())) {
      nextUser.status = 'expired';
    }

    localStorage.setItem('bia_current_user', JSON.stringify(nextUser));
    return nextUser;
  };

  const handleAuthSuccess = async (profile: UserProfile) => {
    const hydrated = await hydrateUserWithCloudSubscription(profile);
    if (profile.email.trim().toLowerCase() === CEO_EMAIL && hydrated.status !== 'active') {
      setCurrentUser(null);
      setIsAuthModalOpen(true);
      return;
    }
    setCurrentUser(hydrated);
    setIsAuthModalOpen(false);
    setCurrentApp('home');
  };

  const handlePaymentSuccess = async () => {
    if (!currentUser?.auth_user_id) return;
    const verified = await hydrateUserWithCloudSubscription(currentUser);
    if (verified.status !== 'active') return;
    setCurrentUser(verified);
    localStorage.setItem('bia_current_user', JSON.stringify(verified));
  };

  const handleRealtimeSubscriptionUpdate = (subscription: { status: string; subscription_expires_at?: string | null }) => {
    if (subscription.status !== 'active' || !subscription.subscription_expires_at || new Date(subscription.subscription_expires_at) <= new Date()) return;
    const expiration = subscription.subscription_expires_at;
    setCurrentUser((previous) => {
      if (!previous) return previous;
      const updated = { ...previous, status: 'active' as const, data_expiracao: expiration };
      localStorage.setItem('bia_current_user', JSON.stringify(updated));
      return updated;
    });
  };

  // Strict RBAC checks - Restricted solely to verified CEO email
  const isAdmin = currentUser?.role === 'admin' && isAuthorizedCeoEmail(currentUser?.email || '');
  const effectiveIsAdmin = isAdmin && !isStudentPreviewMode;
  const isStudent = currentUser?.role === 'student' || !isAdmin;
  const isSubscriptionActive = currentUser?.status === 'active' || isAdmin;

  const lockHomeScroll = Boolean(currentUser && currentApp === 'home' && isSubscriptionActive);

  useEffect(() => {
    document.documentElement.classList.toggle('home-scroll-locked', lockHomeScroll);
    document.body.classList.toggle('home-scroll-locked', lockHomeScroll);

    return () => {
      document.documentElement.classList.remove('home-scroll-locked');
      document.body.classList.remove('home-scroll-locked');
    };
  }, [currentApp, currentUser, effectiveIsAdmin]);

  const perms: StudentPermissions = currentUser?.permissions || {
    friends: true,
    readclub: true,
    board: true,
    quiz: true,
    braziliangames: true,
    biacompare: true,
    conversation: true,
    tradutor: true,
    youtube: true,
    practice: true,
    stories: true
  };

  // Track access to CEO/Admin dashboards
  useEffect(() => {
    if (['dashboard', 'admin_settings', 'streamstudio', 'classroom', 'meet', 'settings'].includes(currentApp)) {
      if (isAdmin) {
        logAdminAccessAttempt({
          email: currentUser?.email || 'unknown',
          userRole: 'admin',
          action: 'ACCESS_GRANTED',
          details: `CEO acessou o módulo executivo: ${currentApp}`,
          success: true
        });
      } else if (currentUser) {
        logAdminAccessAttempt({
          email: currentUser.email,
          userRole: currentUser.role || 'student',
          action: 'ACCESS_BLOCKED',
          details: `Tentativa não autorizada de navegação para ${currentApp}. Redirecionado para Home.`,
          success: false
        });
        setCurrentApp('home');
      }
    }
  }, [currentApp, isAdmin, currentUser]);

  const handleToggleStudentPreview = () => {
    setIsStudentPreviewMode((prev) => {
      const next = !prev;
      setCurrentApp('home');
      return next;
    });
  };

  if (isBooting) {
    return (
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black text-white flex items-center justify-center overflow-hidden"
      >
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex flex-col items-center gap-5 px-8 text-center page-motion"
        >
          <div className="h-14 w-14 rounded-full border border-white/20 border-t-amber-400 animate-spin" />
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-white/60 menu-cinematic-text">Brazilian in Action</p>
            <p className="mt-2 text-sm text-white/40">Preparing your learning space...</p>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <LayoutPositionProvider>
      {/* CLEAN STUDENT STAGE POPOUT MODE (For sharing with Google Meet / OBS) */}
      {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'stage_popout' && (
        <CleanStudentStage />
      )}

      {/* MAIN APPLICATION UI */}
      {!(typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'stage_popout') && (
      <div
        className={`min-h-screen relative text-white selection:bg-amber-500 selection:text-black ${
          settings.uiDensity === 'compact' ? 'compact' : settings.uiDensity === 'spacious' ? 'spacious' : ''
        } scale-${settings.uiScale}`}
      >
        {/* Dynamic Background Image Layers with smooth crossfade */}
        {settings.bgEnabled && (
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-neutral-950">
            {SLIDESHOW_IMAGES.map((imgUrl, idx) => (
              <div
                key={idx}
                className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
                  idx === bgIndex ? 'opacity-100' : 'opacity-0'
                }`}
                style={{
                  backgroundImage: `url(${imgUrl})`,
                  filter:
                    settings.bgBright === 'darker'
                      ? 'brightness(0.45) saturate(1.1)'
                      : settings.bgBright === 'lighter'
                      ? 'brightness(0.92) saturate(1.15)'
                      : 'brightness(0.78) saturate(1.2)',
                }}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/10 to-black/55 pointer-events-none" />
          </div>
        )}

        {/* Global Navigation Header with RBAC filtering (Floating islands when logged in) */}
        <Sidebar
          currentApp={currentApp}
          onNavigate={setCurrentApp}
          accentColor={settings.accentColor}
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenQuickTradutor={() => setQuickTradutorModalOpen(true)}
          isFloatingCamActive={isFloatingCamActive}
          onToggleFloatingCam={() => setIsFloatingCamActive((prev) => !prev)}
          isStudentPreviewMode={isStudentPreviewMode}
          onToggleStudentPreview={handleToggleStudentPreview}
        />

        {cloudSaveStatus && currentUser && isSubscriptionActive && (
          <div
            role="status"
            aria-live="polite"
            className={`fixed bottom-4 left-4 z-[3000] flex max-w-[min(92vw,28rem)] items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-xl backdrop-blur ${
              cloudSaveStatus === 'error'
                ? 'border-red-300/30 bg-red-950/90 text-red-100'
                : cloudSaveStatus === 'saved'
                  ? 'border-emerald-300/30 bg-emerald-950/90 text-emerald-100'
                  : 'border-amber-300/30 bg-neutral-950/90 text-amber-100'
            }`}
          >
            <span>
              {cloudSaveStatus === 'saving' && 'Salvando alterações na nuvem…'}
              {cloudSaveStatus === 'saved' && 'Alterações salvas na nuvem.'}
              {cloudSaveStatus === 'error' && 'Não foi possível sincronizar. Os dados locais foram mantidos.'}
            </span>
            {cloudSaveStatus === 'error' && (
              <button
                type="button"
                className="shrink-0 font-semibold underline underline-offset-2"
                onClick={() => {
                  if (pendingPlatformPayloadRef.current || pendingProgressRef.current) retryPendingCloudSaves();
                  else window.location.reload();
                }}
              >
                Tentar novamente
              </button>
            )}
          </div>
        )}

        {/* Dynamic Floating US Landmark & Background Slideshow Controls (Always active when background is enabled) */}
        {settings.bgEnabled && (
          <LandmarkControlsWidget
            settings={settings}
            bgIndex={bgIndex}
            setBgIndex={setBgIndex}
            bgPaused={bgPaused}
            setBgPaused={setBgPaused}
          />
        )}

        {/* Main View Port Routing */}
        <main className={`relative z-10 ${currentUser ? 'pt-18 sm:pt-20' : 'pt-24 pb-8'} ${
          currentUser && isStudent && !isSubscriptionActive ? 'pb-0' : currentUser ? 'pb-12' : ''
        } ${lockHomeScroll ? 'h-screen box-border overflow-hidden overscroll-none' : 'min-h-[90vh]'}`}>
          {/* 1. AUTH MODAL (Unified Login/Cadastro + 17-Click Easter Egg) */}
          <AuthModal
            isOpen={isAuthModalOpen || !currentUser}
            onAuthSuccess={handleAuthSuccess}
          />

          {/* 2. PIX PAYMENT SCREEN (For Students with pending or expired subscriptions) */}
          {currentUser && isStudent && !isSubscriptionActive && (
            <PixPaymentScreen
              user={currentUser}
              onPaymentSuccess={handlePaymentSuccess}
              onSubscriptionUpdate={handleRealtimeSubscriptionUpdate}
              onLogout={handleLogout}
            />
          )}

          {/* 3. PROTECTED PLATFORM CONTENT (Strictly Rendered only when authenticated & active) */}
          {currentUser && isSubscriptionActive && (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentApp}
                initial={settings.animOn ? { opacity: 0, x: 14, scale: 0.995 } : { opacity: 1, x: 0, scale: 1 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={settings.animOn ? { opacity: 0, x: -14, scale: 0.995 } : { opacity: 1, x: 0, scale: 1 }}
                transition={{ 
                  duration: settings.animOn ? 0.42 : 0, 
                  ease: [0.16, 1, 0.3, 1] 
                }}
                className="w-full h-full page-motion"
              >
                <ErrorBoundary fallbackTitle="Erro ao carregar este módulo">
                  <PageReveal enabled={settings.animOn} glassSkin={['quiz', 'conversation', 'tradutor', 'youtube', 'biacompare', 'board', 'dashboard', 'admin_settings', 'feedback', 'settings'].includes(currentApp)}>
                  {/* HOME TAB - Accessible to all authenticated users */}
                  {currentApp === 'home' && (
                    <Home
                      classes={classes}
                      clock24h={settings.clock24h}
                      accentColor={settings.accentColor}
                      showNextClass={settings.showNextClass}
                      onNavigate={setCurrentApp}
                      currentUser={currentUser}
                      isAdmin={effectiveIsAdmin}
                      showWorkspace={!effectiveIsAdmin ? true : false}
                    />
                  )}

                  {effectiveIsAdmin && currentApp === 'work' && (
                    <Home
                      classes={classes}
                      clock24h={settings.clock24h}
                      accentColor={settings.accentColor}
                      showNextClass={settings.showNextClass}
                      onNavigate={setCurrentApp}
                      currentUser={currentUser}
                      isAdmin={true}
                      showWorkspace={true}
                    />
                  )}

                  {effectiveIsAdmin && currentApp === 'dashboard' && (
                    <Dashboard
                      classes={classes}
                      expenses={expenses}
                      onAddClass={handleAddClass}
                      onUpdateClass={handleUpdateClassItem}
                      onDeleteClass={handleDeleteClassItem}
                      onAddExpense={handleAddExpense}
                      onUpdateExpense={handleUpdateExpenseItem}
                      onDeleteExpense={handleDeleteExpenseItem}
                      confirmDel={settings.confirmDel}
                      blurValues={settings.blurValues}
                      accentColor={settings.accentColor}
                    />
                  )}

                  {effectiveIsAdmin && currentApp === 'admin_settings' && (
                    <AdminSettings
                      accentColor={settings.accentColor}
                      classes={classes}
                      expenses={expenses}
                      currentUser={currentUser}
                    />
                  )}

                  {effectiveIsAdmin && currentApp === 'feedback' && (
                    <div className="mx-auto max-w-5xl px-4 py-8">
                      <AdminFeedbackPanel />
                    </div>
                  )}

                  {currentUser && currentApp === 'feedback' && (!isAdmin || isStudentPreviewMode) && (
                    <StudentFeedback currentUser={currentUser} accentColor={settings.accentColor} />
                  )}

                  {effectiveIsAdmin && currentApp === 'classroom' && (
                    <GoogleClassroom accentColor={settings.accentColor} />
                  )}

                  {effectiveIsAdmin && currentApp === 'meet' && (
                    <GoogleMeet accentColor={settings.accentColor} />
                  )}

                  {effectiveIsAdmin && currentApp === 'streamstudio' && (
                    <StreamStudio
                      accentColor={settings.accentColor}
                      streamActive={streamActive}
                      setStreamActive={setStreamActive}
                      isFloatingCamActive={isFloatingCamActive}
                      setIsFloatingCamActive={setIsFloatingCamActive}
                      showQr={showQr}
                      setShowQr={setShowQr}
                      qrUrl={qrUrl}
                      setQrUrl={setQrUrl}
                      qrTitle={qrTitle}
                      setQrTitle={setQrTitle}
                      showLowerThird={showLowerThird}
                      setShowLowerThird={setShowLowerThird}
                      teacherName={teacherName}
                      setTeacherName={setTeacherName}
                      lessonSubject={lessonSubject}
                      setLessonSubject={setLessonSubject}
                      showTicker={showTicker}
                      setShowTicker={setShowTicker}
                      tickerText={tickerText}
                      setTickerText={setTickerText}
                      showBanner={showBanner}
                      setShowBanner={setShowBanner}
                      bannerText={bannerText}
                      setBannerText={setBannerText}
                      library={library}
                      onAddStory={handleAddStory}
                      onUpdateStory={handleUpdateStory}
                      onDeleteStory={handleDeleteStory}
                      sessions={sessions}
                      onSaveSession={handleSaveSession}
                      onDeleteSession={handleDeleteSession}
                      glossary={glossary}
                      onAddGlossary={handleAddGlossary}
                      onRemoveGlossary={handleRemoveGlossary}
                      onClearGlossary={handleClearGlossary}
                      learnedWords={learnedWords}
                      onToggleLearnedWord={handleToggleLearnedWord}
                    />
                  )}

                  {effectiveIsAdmin && currentApp === 'settings' && (
                    <Settings
                      settings={settings}
                      onUpdateSettings={handleUpdateSettings}
                      onExportBackup={handleExportBackup}
                      onImportBackup={handleImportBackup}
                      onResetAll={handleResetAll}
                    />
                  )}

                  {/* STUDENT & ADMIN SHARED PRACTICAL TABS */}
                  {currentApp === 'readclub' && (isAdmin || perms.readclub) && (
                    <ReadClub
                      library={library}
                      canManageLibrary={effectiveIsAdmin}
                      onAddStory={handleAddStory}
                      onUpdateStory={handleUpdateStory}
                      onDeleteStory={handleDeleteStory}
                      sessions={sessions}
                      onSaveSession={handleSaveSession}
                      onDeleteSession={handleDeleteSession}
                      glossary={glossary}
                      onAddGlossary={handleAddGlossary}
                      onRemoveGlossary={handleRemoveGlossary}
                      onClearGlossary={handleClearGlossary}
                      learnedWords={learnedWords}
                      onToggleLearnedWord={handleToggleLearnedWord}
                      onUpdateLearnedWords={handleUpdateLearnedWords}
                      heightClass="h-[calc(100dvh-7.5rem)] sm:h-[calc(100dvh-8rem)]"
                      accentColor={settings.accentColor}
                    />
                  )}

                  {currentApp === 'board' && (isAdmin || perms.board) && (
                    <BrazilianBoard accentColor={settings.accentColor} />
                  )}

                  {currentApp === 'quiz' && (isAdmin || perms.quiz) && (
                    <BrazilianQuiz accentColor={settings.accentColor} />
                  )}

                  {currentApp === 'braziliangames' && (isAdmin || perms.braziliangames !== false) && (
                    <BrazilianGames />
                  )}

                  {currentApp === 'tradutor' && (isAdmin || perms.tradutor) && (
                    <BrazilianTradutor accentColor={settings.accentColor} />
                  )}

                  {currentApp === 'biacompare' && (isAdmin || perms.biacompare) && (
                    <BiaCompare accentColor={settings.accentColor} onNavigate={setCurrentApp} />
                  )}

                  {currentApp === 'conversation' && (isAdmin || perms.conversation) && (
                    <BrazilianConversation accentColor={settings.accentColor} />
                  )}

                  {currentApp === 'youtube' && (isAdmin || perms.youtube) && (
                    <YouTubeHub accentColor={settings.accentColor} canEdit={effectiveIsAdmin} />
                  )}

                  {currentApp === 'practice' && (isAdmin || perms.practice !== false) && (
                    <BrazilianPractice accentColor={settings.accentColor} />
                  )}

                  {currentApp === 'stories' && (isAdmin || perms.stories !== false) && (
                    <BrazilianStories 
                      currentUser={currentUser} 
                      isAdmin={effectiveIsAdmin} 
                      accentColor={settings.accentColor} 
                      onShowFloatingCamera={setIsStoryCamActive}
                    />
                  )}

                  {currentApp === 'brazilianfriends' && (isAdmin || perms.friends !== false) && (
                    <BrazilianFriends
                      currentUser={currentUser}
                      accentColor={settings.accentColor}
                    />
                  )}
                  </PageReveal>
                </ErrorBoundary>
              </motion.div>
            </AnimatePresence>
          )}
        </main>

        {/* QUICK TRADUTOR MODAL (ACCESSIBLE FROM ANY APP) */}
        <AnimatePresence>
          {quickTradutorModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/55 backdrop-blur-md overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="bg-slate-950/50 border border-white/25 backdrop-blur-2xl rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl relative p-2 sm:p-4 my-auto"
              >
                <BrazilianTradutor
                  accentColor={settings.accentColor}
                  isModal={true}
                  onCloseModal={() => setQuickTradutorModalOpen(false)}
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Global Stream Studio Overlay & Floating Control Dock (Only for Admin when not in student simulation) */}
        {effectiveIsAdmin && (
          <GlobalStreamOverlay
            streamActive={streamActive}
            setStreamActive={setStreamActive}
            isFloatingCamActive={isFloatingCamActive}
            setIsFloatingCamActive={setIsFloatingCamActive}
            showQr={showQr}
            setShowQr={setShowQr}
            qrUrl={qrUrl}
            setQrUrl={setQrUrl}
            qrTitle={qrTitle}
            setQrTitle={setQrTitle}
            showLowerThird={showLowerThird}
            setShowLowerThird={setShowLowerThird}
            teacherName={teacherName}
            setTeacherName={setTeacherName}
            lessonSubject={lessonSubject}
            setLessonSubject={setLessonSubject}
            showTicker={showTicker}
            setShowTicker={setShowTicker}
            tickerText={tickerText}
            setTickerText={setTickerText}
            showBanner={showBanner}
            setShowBanner={setShowBanner}
            bannerText={bannerText}
            setBannerText={setBannerText}
            showTimer={showTimer}
            setShowTimer={setShowTimer}
            timerSeconds={timerSeconds}
            setTimerSeconds={setTimerSeconds}
            isTimerRunning={isTimerRunning}
            setIsTimerRunning={setIsTimerRunning}
            currentApp={currentApp}
            onNavigate={setCurrentApp}
            compactMode={settings.compactStreamOverlay}
          />
        )}

        {/* Floating camera bubble: admin/CEO anytime; students only while recording a Brazilian Post story */}
        <GlobalFloatingCamera
          isActive={((isFloatingCamActive && effectiveIsAdmin) || isStoryCamActive) && !isAuthModalOpen && Boolean(currentUser)}
          onClose={() => {
            setIsFloatingCamActive(false);
            setIsStoryCamActive(false);
          }}
        />
        <StoryRecordingBar onFinished={() => setCurrentApp('stories')} />
      </div>
      )}
    </LayoutPositionProvider>
  );
}
