import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
const Home = lazy(() => import('./components/Home').then(({ Home }) => ({ default: Home })));
const Dashboard = lazy(() => import('./components/Dashboard').then(({ Dashboard }) => ({ default: Dashboard })));
const GoogleClassroom = lazy(() => import('./components/GoogleClassroom').then(({ GoogleClassroom }) => ({ default: GoogleClassroom })));
const GoogleMeet = lazy(() => import('./components/GoogleMeet').then(({ GoogleMeet }) => ({ default: GoogleMeet })));
const ReadClub = lazy(() => import('./components/ReadClub').then(({ ReadClub }) => ({ default: ReadClub })));
const BrazilianBoard = lazy(() => import('./components/BrazilianBoard').then(({ BrazilianBoard }) => ({ default: BrazilianBoard })));
const Settings = lazy(() => import('./components/Settings').then(({ Settings }) => ({ default: Settings })));
const BrazilianConversation = lazy(() => import('./components/BrazilianConversation').then(({ BrazilianConversation }) => ({ default: BrazilianConversation })));
const BrazilianQuiz = lazy(() => import('./components/BrazilianQuiz').then(({ BrazilianQuiz }) => ({ default: BrazilianQuiz })));
const BrazilianGames = lazy(() => import('./components/BrazilianGames').then(({ BrazilianGames }) => ({ default: BrazilianGames })));
const BrazilianTradutor = lazy(() => import('./components/BrazilianTradutor').then(({ BrazilianTradutor }) => ({ default: BrazilianTradutor })));
const BiaCompare = lazy(() => import('./components/BiaCompare').then(({ BiaCompare }) => ({ default: BiaCompare })));
const YouTubeHub = lazy(() => import('./components/YouTubeHub').then(({ YouTubeHub }) => ({ default: YouTubeHub })));
const BrazilianPractice = lazy(() => import('./components/BrazilianPractice').then(({ BrazilianPractice }) => ({ default: BrazilianPractice })));
const BrazilianStories = lazy(() => import('./components/BrazilianStories').then(({ BrazilianStories }) => ({ default: BrazilianStories })));
const BrazilianHQ = lazy(() => import('./components/BrazilianHQ').then(({ BrazilianHQ }) => ({ default: BrazilianHQ })));
const BrazilianFriends = lazy(() => import('./components/BrazilianFriends').then(({ BrazilianFriends }) => ({ default: BrazilianFriends })));
const BrazilianSpace = lazy(() => import('./components/BrazilianSpace').then(({ BrazilianSpace }) => ({ default: BrazilianSpace })));
const StreamStudio = lazy(() => import('./components/StreamStudio').then(({ StreamStudio }) => ({ default: StreamStudio })));
const AdminSettings = lazy(() => import('./components/AdminSettings').then(({ AdminSettings }) => ({ default: AdminSettings })));
const AdminFeedbackPanel = lazy(() => import('./components/AdminFeedbackPanel').then(({ AdminFeedbackPanel }) => ({ default: AdminFeedbackPanel })));
const StudentFeedback = lazy(() => import('./components/StudentFeedback').then(({ StudentFeedback }) => ({ default: StudentFeedback })));
const PixPaymentScreen = lazy(() => import('./components/PixPaymentScreen').then(({ PixPaymentScreen }) => ({ default: PixPaymentScreen })));
import { DEFAULT_YOUTUBE_LIBRARY, type YouTubeLibraryItem } from './youtubeLibrary';
import { StoryRecordingBar } from './components/StoryRecordingBar';
import { StudentFeedbackNotifications } from './components/StudentFeedbackNotifications';
import { BrazilianFriendsGlobalStatus } from './components/BrazilianFriendsGlobalStatus';
import { BrazilianSpaceMomentInsight } from './components/BrazilianSpaceMomentInsight';
import { AuthModal } from './components/AuthModal';
import { StudentProfileOnboarding } from './components/StudentProfileOnboarding';
import { GlobalStreamOverlay } from './components/GlobalStreamOverlay';
import { GlobalFloatingCamera } from './components/GlobalFloatingCamera';
import { PageReveal } from './components/PageReveal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BrazilianLogo } from './components/BrazilianLogo';
import { BackgroundSlideshow } from './components/BackgroundSlideshow';
import { CleanStudentStage } from './components/CleanStudentStage';
import { SiteLegalFooter } from './components/SiteLegalFooter';
import { ClassItem, ExpenseItem, AppSettings, StudentPreferences, StoryItem, ReadSession, GlossaryEntry, UserProfile } from './types';
import { INITIAL_READ_LIBRARY } from './data';
import { formatLyricsLibrary, formatStoryLibrary } from './lib/storyFormatting';
import { CEO_EMAIL, logAdminAccessAttempt, isAuthorizedCeoEmail } from './utils/security';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutPositionProvider } from './lib/LayoutPositionContext';
import {
  fetchAdminSubscribers,
  loadSharedContentFromSupabase,
  loadStudentProgressFromSupabase,
  removeCurrentDevicePrivatePushSubscription,
  syncSharedContentToSupabase,
  syncStudentPreferencesToSupabase,
  syncStudentProgressToSupabase,
} from './utils/supabaseClient';
import { setNotificationSoundsEnabled } from './lib/menuSounds';
import { Eye, EyeOff } from 'lucide-react';
import {
  getSupabaseClient,
  getSubscriptionStatusFromSupabase,
} from './utils/supabaseClient';
import { isActiveSubscription } from './lib/subscriptionStatus';

const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  menuSoundsEnabled: true,
  notificationSoundsEnabled: true,
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

const DEFAULT_STUDENT_PREFERENCES: StudentPreferences = {
  menuSoundsEnabled: true,
  notificationSoundsEnabled: true,
  dailyMotivationEnabled: true,
  bgEnabled: true,
  bgBright: 'normal',
  accentColor: '#ff8c00',
  readerFont: 22,
  readerFontFamily: 'poppins',
  readerAlign: 'center',
  clock24h: false,
  uiDensity: 'normal',
  uiScale: 'md',
  showNextClass: true,
  animOn: true,
};

const STUDENT_PREFERENCES_CACHE_KEY = (userId: string) =>
  `bia_student_preferences_${encodeURIComponent(userId)}`;

const normalizeStudentPreferences = (value: unknown): StudentPreferences => {
  const preferences = value && typeof value === 'object'
    ? value as Partial<StudentPreferences>
    : {};
  const validAccents = ['#ff8c00', '#3b82f6', '#10b981', '#e10600', '#a855f7'];

  return {
    menuSoundsEnabled: typeof preferences.menuSoundsEnabled === 'boolean'
      ? preferences.menuSoundsEnabled
      : DEFAULT_STUDENT_PREFERENCES.menuSoundsEnabled,
    notificationSoundsEnabled: typeof preferences.notificationSoundsEnabled === 'boolean'
      ? preferences.notificationSoundsEnabled
      : DEFAULT_STUDENT_PREFERENCES.notificationSoundsEnabled,
    dailyMotivationEnabled: typeof preferences.dailyMotivationEnabled === 'boolean'
      ? preferences.dailyMotivationEnabled
      : DEFAULT_STUDENT_PREFERENCES.dailyMotivationEnabled,
    bgEnabled: typeof preferences.bgEnabled === 'boolean' ? preferences.bgEnabled : DEFAULT_STUDENT_PREFERENCES.bgEnabled,
    bgBright: ['darker', 'normal', 'lighter'].includes(preferences.bgBright || '')
      ? preferences.bgBright as StudentPreferences['bgBright']
      : DEFAULT_STUDENT_PREFERENCES.bgBright,
    accentColor: validAccents.includes(preferences.accentColor || '')
      ? preferences.accentColor as string
      : DEFAULT_STUDENT_PREFERENCES.accentColor,
    readerFont: typeof preferences.readerFont === 'number' && Number.isFinite(preferences.readerFont)
      ? Math.min(36, Math.max(14, preferences.readerFont))
      : DEFAULT_STUDENT_PREFERENCES.readerFont,
    readerFontFamily: ['poppins', 'lora', 'crimson'].includes(preferences.readerFontFamily || '')
      ? preferences.readerFontFamily as StudentPreferences['readerFontFamily']
      : DEFAULT_STUDENT_PREFERENCES.readerFontFamily,
    readerAlign: preferences.readerAlign === 'justify' ? 'justify' : 'center',
    clock24h: typeof preferences.clock24h === 'boolean' ? preferences.clock24h : DEFAULT_STUDENT_PREFERENCES.clock24h,
    uiDensity: ['normal', 'compact', 'spacious'].includes(preferences.uiDensity || '')
      ? preferences.uiDensity as StudentPreferences['uiDensity']
      : DEFAULT_STUDENT_PREFERENCES.uiDensity,
    uiScale: ['sm', 'md', 'lg'].includes(preferences.uiScale || '')
      ? preferences.uiScale as StudentPreferences['uiScale']
      : DEFAULT_STUDENT_PREFERENCES.uiScale,
    showNextClass: typeof preferences.showNextClass === 'boolean'
      ? preferences.showNextClass
      : DEFAULT_STUDENT_PREFERENCES.showNextClass,
    animOn: typeof preferences.animOn === 'boolean' ? preferences.animOn : DEFAULT_STUDENT_PREFERENCES.animOn,
  };
};

const getRequestedStartupApp = () =>
  new URLSearchParams(window.location.search).get('open') === 'space'
    ? 'brazilianspace'
    : new URLSearchParams(window.location.search).get('open') === 'friends' ? 'friends' : 'home';

type ReadClubProgress = {
  sessions: ReadSession[];
  glossary: Record<string, GlossaryEntry>;
  learnedWords: Record<number, string[]>;
};

const createEmptyReadClubProgress = (): ReadClubProgress => ({
  sessions: [],
  glossary: {},
  learnedWords: {},
});

const getReadClubProgressCacheKey = (userId: string) =>
  `bia_readclub_progress_${encodeURIComponent(userId)}`;

export default function App() {
  // SAAS Authentication & Access Control States
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [cloudSaveStatus, setCloudSaveStatus] = useState<'saving' | 'saved' | 'error' | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [currentApp, setCurrentApp] = useState<string>(getRequestedStartupApp);
  const [spaceDraftSeed, setSpaceDraftSeed] = useState('');
  const [spaceFocusRequest, setSpaceFocusRequest] = useState(0);
  const [quickTradutorModalOpen, setQuickTradutorModalOpen] = useState(false);
  const [isStudentPreviewMode, setIsStudentPreviewMode] = useState(false);
  const [liveActiveSubscriberCount, setLiveActiveSubscriberCount] = useState<number | null>(null);
  const [newActiveSubscriberCount, setNewActiveSubscriberCount] = useState(0);
  const [subscriberCountUnavailable, setSubscriberCountUnavailable] = useState(false);

  // Background Slideshow state
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
  const [readClubProgressUserId, setReadClubProgressUserId] = useState<string | null>(null);

  // YouTube Hub persistent database (separate from ReadClub)
  const [youtubeLibrary, setYoutubeLibrary] = useState<YouTubeLibraryItem[]>([]);
  const [isYoutubeLibraryLoaded, setIsYoutubeLibraryLoaded] = useState(false);

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
  const youtubeSyncQueueRef = useRef(Promise.resolve());
  const pendingPlatformPayloadRef = useRef<{
    classes: ClassItem[];
    expenses: ExpenseItem[];
    settings: AppSettings;
    library: StoryItem[];
  } | null>(null);
  const progressRef = useRef<ReadClubProgress>(createEmptyReadClubProgress());
  const pendingProgressRef = useRef<{
    userId: string;
    progress: ReadClubProgress;
  } | null>(null);
  const pendingYoutubeLibraryRef = useRef<YouTubeLibraryItem[] | null>(null);
  const studentPreferencesRef = useRef<StudentPreferences>(DEFAULT_STUDENT_PREFERENCES);
  const studentPreferencesSyncTimerRef = useRef<number | null>(null);
  const adminSettingsBeforePreviewRef = useRef<AppSettings | null>(null);
  const sharedReadClubLibrarySnapshotRef = useRef('');
  const sharedYoutubeLibrarySnapshotRef = useRef('');
  const liveActiveSubscriberCountRef = useRef<number | null>(null);

  const queueStudentPreferencesSync = (userId: string, preferences: StudentPreferences) => {
    if (studentPreferencesSyncTimerRef.current !== null) {
      window.clearTimeout(studentPreferencesSyncTimerRef.current);
    }
    setCloudSaveStatus('saving');
    studentPreferencesSyncTimerRef.current = window.setTimeout(() => {
      studentPreferencesSyncTimerRef.current = null;
      void syncStudentPreferencesToSupabase(userId, preferences)
        .then(() => setCloudSaveStatus('saved'))
        .catch((error) => {
          console.error('Could not save this student’s preferences:', error);
          setCloudSaveStatus('error');
        });
    }, 500);
  };

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

  const queueYoutubeLibrarySync = (nextLibrary: YouTubeLibraryItem[]) => {
    pendingYoutubeLibraryRef.current = nextLibrary;
    setCloudSaveStatus('saving');
    youtubeSyncQueueRef.current = youtubeSyncQueueRef.current
      .catch(() => undefined)
      .then(() => syncSharedContentToSupabase('youtube_library', { youtube_library: nextLibrary }))
      .then(() => {
        if (pendingYoutubeLibraryRef.current === nextLibrary) {
          pendingYoutubeLibraryRef.current = null;
          if (!pendingPlatformPayloadRef.current && !pendingProgressRef.current) setCloudSaveStatus('saved');
        }
      })
      .catch((error) => {
        console.error('Brazilian Music library cloud save failed:', error);
        setCloudSaveStatus('error');
      });
  };

  const retryPendingCloudSaves = () => {
    if (pendingPlatformPayloadRef.current) queuePlatformSync(pendingPlatformPayloadRef.current);
    if (pendingProgressRef.current) {
      queueProgressSync(pendingProgressRef.current.userId, pendingProgressRef.current.progress);
    }
    if (pendingYoutubeLibraryRef.current) queueYoutubeLibrarySync(pendingYoutubeLibraryRef.current);
  };

  useEffect(() => {
    window.addEventListener('online', retryPendingCloudSaves);
    return () => window.removeEventListener('online', retryPendingCloudSaves);
  }, []);

  useEffect(() => {
    setNotificationSoundsEnabled(settings.notificationSoundsEnabled);
  }, [settings.notificationSoundsEnabled]);

  useEffect(() => () => {
    if (studentPreferencesSyncTimerRef.current !== null) {
      window.clearTimeout(studentPreferencesSyncTimerRef.current);
    }
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
            setCurrentApp(getRequestedStartupApp());
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
    const authUserId = currentUser.auth_user_id || currentUser.id;
    const isStudentAccount = currentUser.role !== 'admin' || !isAuthorizedCeoEmail(currentUser.email);
    if (isStudentAccount) {
      studentPreferencesRef.current = DEFAULT_STUDENT_PREFERENCES;
      setSettings((previous) => ({ ...previous, ...DEFAULT_STUDENT_PREFERENCES }));
    } else {
      const storedSettings = localStorage.getItem('bia_settings_final');
      if (storedSettings) {
        try {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) });
        } catch (error) {
          console.warn('Saved administrator settings are invalid:', error);
          setSettings(DEFAULT_SETTINGS);
        }
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
    }
    setReadClubProgressUserId(null);
    const emptyProgress = createEmptyReadClubProgress();
    progressRef.current = emptyProgress;
    setSessions(emptyProgress.sessions);
    setGlossary(emptyProgress.glossary);
    setLearnedWords(emptyProgress.learnedWords);

    const loadCloudContent = async () => {
      try {
        let progress: {
          sessions?: ReadSession[] | null;
          glossary?: Record<string, GlossaryEntry> | null;
          learned_words?: Record<number, string[]> | null;
          preferences?: unknown;
        } | null = null;
        let progressLoadFailed = false;
        try {
          progress = await loadStudentProgressFromSupabase(authUserId);
        } catch (error) {
          progressLoadFailed = true;
          console.error('Could not load this user’s Read Club progress:', error);
        }
        if (cancelled) return;

        if (isStudentAccount) {
          let cachedPreferences: unknown = null;
          const cachedPreferencesRaw = localStorage.getItem(STUDENT_PREFERENCES_CACHE_KEY(authUserId));
          if (cachedPreferencesRaw) {
            try {
              cachedPreferences = JSON.parse(cachedPreferencesRaw);
            } catch (error) {
              console.warn('This user’s local preferences cache is invalid:', error);
            }
          }
          const cloudPreferences = progress?.preferences;
          const hasCloudPreferences = cloudPreferences && typeof cloudPreferences === 'object'
            && Object.keys(cloudPreferences).length > 0;
          const nextPreferences = normalizeStudentPreferences(
            hasCloudPreferences ? cloudPreferences : cachedPreferences
          );
          studentPreferencesRef.current = nextPreferences;
          setSettings((previous) => ({ ...previous, ...nextPreferences }));
          localStorage.setItem(STUDENT_PREFERENCES_CACHE_KEY(authUserId), JSON.stringify(nextPreferences));
        }

        const progressCacheKey = getReadClubProgressCacheKey(authUserId);
        let cachedProgress: ReadClubProgress | null = null;
        const cachedProgressRaw = localStorage.getItem(progressCacheKey);
        if (cachedProgressRaw) {
          try {
            const parsed = JSON.parse(cachedProgressRaw) as Partial<ReadClubProgress>;
            cachedProgress = {
              sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
              glossary: parsed.glossary && typeof parsed.glossary === 'object' ? parsed.glossary : {},
              learnedWords: parsed.learnedWords && typeof parsed.learnedWords === 'object' ? parsed.learnedWords : {},
            };
          } catch (error) {
            console.warn('This user’s local Read Club progress cache is invalid:', error);
          }
        }

        const nextProgress: ReadClubProgress = progress
          ? {
              sessions: progress.sessions || [],
              glossary: progress.glossary || {},
              learnedWords: progress.learned_words || {},
            }
          : cachedProgress || createEmptyReadClubProgress();
        progressRef.current = nextProgress;
        setSessions(nextProgress.sessions);
        setGlossary(nextProgress.glossary);
        setLearnedWords(nextProgress.learnedWords);
        localStorage.setItem(progressCacheKey, JSON.stringify(nextProgress));
        setReadClubProgressUserId(authUserId);
        if (!progress && cachedProgress) queueProgressSync(authUserId, nextProgress);
        if (progressLoadFailed) setCloudSaveStatus('error');

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
            const nextSettings = {
              ...DEFAULT_SETTINGS,
              ...shared.settings,
              ...(isStudentAccount
                ? { ...DEFAULT_STUDENT_PREFERENCES, ...studentPreferencesRef.current }
                : {}),
            };
            setSettings(nextSettings);
            if (!isStudentAccount) {
              localStorage.setItem('bia_settings_final', JSON.stringify(nextSettings));
            }
          }
          if (shared.library) {
            const formattedLibrary = formatStoryLibrary(shared.library);
            setLibrary(formattedLibrary);
            sharedReadClubLibrarySnapshotRef.current = JSON.stringify(shared.library);
            localStorage.setItem('bia_readclub_library', JSON.stringify(formattedLibrary));
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

      } catch (error) {
        console.error('Could not load cloud-saved platform data:', error);
        if (!cancelled) setCloudSaveStatus('error');
      }
    };

    void loadCloudContent();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.auth_user_id, currentUser?.id, currentUser?.role, currentUser?.email]);

  useEffect(() => {
    if (!currentUser) return;

    let cancelled = false;
    setIsYoutubeLibraryLoaded(false);
    const loadYoutubeLibrary = async () => {
      let nextLibrary = formatLyricsLibrary(DEFAULT_YOUTUBE_LIBRARY);
      let shouldSaveLocalFallback = false;
      try {
        const shared = await loadSharedContentFromSupabase<{ youtube_library?: YouTubeLibraryItem[] }>('youtube_library');
        if (cancelled) return;
        if (shared && Array.isArray(shared.youtube_library)) {
          nextLibrary = formatLyricsLibrary(shared.youtube_library);
          sharedYoutubeLibrarySnapshotRef.current = JSON.stringify(nextLibrary);
        } else {
          const cachedRaw = localStorage.getItem('bia_youtube_library');
          if (cachedRaw) {
            const cached: unknown = JSON.parse(cachedRaw);
            if (!Array.isArray(cached)) throw new Error('A biblioteca local de músicas está inválida.');
            nextLibrary = formatLyricsLibrary(cached as YouTubeLibraryItem[]);
            shouldSaveLocalFallback = true;
          }
        }
      } catch (error) {
        console.error('Could not load the Brazilian Music library from Supabase:', error);
        setCloudSaveStatus('error');
        const cachedRaw = localStorage.getItem('bia_youtube_library');
        if (cachedRaw) {
          try {
            const cached: unknown = JSON.parse(cachedRaw);
            if (!Array.isArray(cached)) throw new Error('A biblioteca local de músicas está inválida.');
            nextLibrary = formatLyricsLibrary(cached as YouTubeLibraryItem[]);
          } catch (cacheError) {
            console.error('Could not restore the local Brazilian Music library:', cacheError);
          }
        }
      }

      if (cancelled) return;
      const formattedLibrary = formatLyricsLibrary(nextLibrary);
      setYoutubeLibrary(formattedLibrary);
      localStorage.setItem('bia_youtube_library', JSON.stringify(formattedLibrary));
      setIsYoutubeLibraryLoaded(true);
      if (
        shouldSaveLocalFallback &&
        currentUser.role === 'admin' &&
        isAuthorizedCeoEmail(currentUser.email)
      ) {
        sharedYoutubeLibrarySnapshotRef.current = JSON.stringify(formattedLibrary);
        queueYoutubeLibrarySync(formattedLibrary);
      }
    };

    void loadYoutubeLibrary();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.auth_user_id, currentUser?.id]);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client || !currentUser) return;

    let cancelled = false;
    let refreshInProgress = false;
    const refreshSharedLibraries = async () => {
      if (cancelled || refreshInProgress) return;
      refreshInProgress = true;
      try {
        const [platform, music] = await Promise.all([
          loadSharedContentFromSupabase<{ library?: StoryItem[] }>('platform'),
          loadSharedContentFromSupabase<{ youtube_library?: YouTubeLibraryItem[] }>('youtube_library')
        ]);
        if (cancelled) return;

        if (Array.isArray(platform?.library) && !pendingPlatformPayloadRef.current) {
          const snapshot = JSON.stringify(platform.library);
          if (snapshot !== sharedReadClubLibrarySnapshotRef.current) {
            sharedReadClubLibrarySnapshotRef.current = snapshot;
            const formattedLibrary = formatStoryLibrary(platform.library);
            setLibrary(formattedLibrary);
            localStorage.setItem('bia_readclub_library', JSON.stringify(formattedLibrary));
          }
        }

        if (Array.isArray(music?.youtube_library) && !pendingYoutubeLibraryRef.current) {
          const snapshot = JSON.stringify(music.youtube_library);
          if (snapshot !== sharedYoutubeLibrarySnapshotRef.current) {
            sharedYoutubeLibrarySnapshotRef.current = snapshot;
            const formattedLibrary = formatLyricsLibrary(music.youtube_library);
            setYoutubeLibrary(formattedLibrary);
            localStorage.setItem('bia_youtube_library', JSON.stringify(formattedLibrary));
          }
        }
      } catch (error) {
        console.error('Could not refresh shared learning libraries:', error);
      } finally {
        refreshInProgress = false;
      }
    };

    const channel = client
      .channel('shared-learning-libraries')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bia_shared_content', filter: 'content_key=eq.platform' },
        () => void refreshSharedLibraries()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bia_shared_content', filter: 'content_key=eq.youtube_library' },
        () => void refreshSharedLibraries()
      )
      .subscribe((status, error) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Realtime library updates are unavailable; periodic refresh remains active.', error);
        }
      });

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshSharedLibraries();
    }, 15_000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refreshSharedLibraries();
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      void client.removeChannel(channel);
    };
  }, [currentUser?.auth_user_id, currentUser?.id]);

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
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } else {
        setSettings(DEFAULT_SETTINGS);
      }

      const storedLib = localStorage.getItem('bia_readclub_library');
      if (storedLib) {
        try {
          const parsedLib: StoryItem[] = JSON.parse(storedLib);
          if (Array.isArray(parsedLib)) {
            const formattedLibrary = formatStoryLibrary(parsedLib);
            setLibrary(formattedLibrary);
            if (formattedLibrary !== parsedLib) {
              localStorage.setItem('bia_readclub_library', JSON.stringify(formattedLibrary));
            }
          } else {
            const initialLibrary = formatStoryLibrary(INITIAL_READ_LIBRARY);
            setLibrary(initialLibrary);
            localStorage.setItem('bia_readclub_library', JSON.stringify(initialLibrary));
          }
        } catch (e) {
          setLibrary(formatStoryLibrary(INITIAL_READ_LIBRARY));
        }
      } else {
        const initialLibrary = formatStoryLibrary(INITIAL_READ_LIBRARY);
        setLibrary(initialLibrary);
        localStorage.setItem('bia_readclub_library', JSON.stringify(initialLibrary));
      }

    } catch (e) {
      console.error('Error loading initial data:', e);
    }
  }, []);

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
    if (isStudentPreviewMode) return;

    const studentUserId = currentUser && !(currentUser.role === 'admin' && isAuthorizedCeoEmail(currentUser.email))
      ? currentUser.auth_user_id || currentUser.id
      : null;
    if (studentUserId) {
      const nextPreferences = normalizeStudentPreferences({
        ...studentPreferencesRef.current,
        ...updated,
      });
      studentPreferencesRef.current = nextPreferences;
      localStorage.setItem(STUDENT_PREFERENCES_CACHE_KEY(studentUserId), JSON.stringify(nextPreferences));
      queueStudentPreferencesSync(studentUserId, nextPreferences);
      return;
    }

    queuePlatformSync({ classes, expenses, settings: next, library });
    localStorage.setItem('bia_settings_final', JSON.stringify(next));
  };

  const handleResetStudentSettings = () => {
    if (isStudentPreviewMode) {
      setSettings((current) => ({ ...current, ...DEFAULT_STUDENT_PREFERENCES }));
      return;
    }
    const userId = currentUser && !(currentUser.role === 'admin' && isAuthorizedCeoEmail(currentUser.email))
      ? currentUser.auth_user_id || currentUser.id
      : null;
    if (!userId) return;
    studentPreferencesRef.current = DEFAULT_STUDENT_PREFERENCES;
    setSettings((current) => ({ ...current, ...DEFAULT_STUDENT_PREFERENCES }));
    localStorage.setItem(STUDENT_PREFERENCES_CACHE_KEY(userId), JSON.stringify(DEFAULT_STUDENT_PREFERENCES));
    queueStudentPreferencesSync(userId, DEFAULT_STUDENT_PREFERENCES);
  };

  const handleUpdateLibrary = (next: StoryItem[]) => {
    const formattedLibrary = formatStoryLibrary(next);
    setLibrary(formattedLibrary);
    sharedReadClubLibrarySnapshotRef.current = JSON.stringify(formattedLibrary);
    queuePlatformSync({ classes, expenses, settings, library: formattedLibrary });
    localStorage.setItem('bia_readclub_library', JSON.stringify(formattedLibrary));
  };

  const handleUpdateYouTubeLibrary = (next: YouTubeLibraryItem[]) => {
    const formattedLibrary = formatLyricsLibrary(next);
    setYoutubeLibrary(formattedLibrary);
    sharedYoutubeLibrarySnapshotRef.current = JSON.stringify(formattedLibrary);
    localStorage.setItem('bia_youtube_library', JSON.stringify(formattedLibrary));
    queueYoutubeLibrarySync(formattedLibrary);
  };

  const handleUpdateSessions = (next: ReadSession[]) => {
    const userId = currentUser?.auth_user_id || currentUser?.id;
    if (!userId || readClubProgressUserId !== userId) return;
    setSessions(next);
    const updated = { ...progressRef.current, sessions: next };
    progressRef.current = updated;
    queueProgressSync(userId, updated);
    localStorage.setItem(getReadClubProgressCacheKey(userId), JSON.stringify(updated));
  };

  const handleUpdateGlossary = (next: Record<string, GlossaryEntry>) => {
    const userId = currentUser?.auth_user_id || currentUser?.id;
    if (!userId || readClubProgressUserId !== userId) return;
    setGlossary(next);
    const updated = { ...progressRef.current, glossary: next };
    progressRef.current = updated;
    queueProgressSync(userId, updated);
    localStorage.setItem(getReadClubProgressCacheKey(userId), JSON.stringify(updated));
  };

  const handleUpdateLearnedWords = (next: Record<number, string[]>) => {
    const userId = currentUser?.auth_user_id || currentUser?.id;
    if (!userId || readClubProgressUserId !== userId) return;
    setLearnedWords(next);
    const updated = { ...progressRef.current, learnedWords: next };
    progressRef.current = updated;
    queueProgressSync(userId, updated);
    localStorage.setItem(getReadClubProgressCacheKey(userId), JSON.stringify(updated));
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
    if (client) {
      try {
        await removeCurrentDevicePrivatePushSubscription();
      } catch (error) {
        console.error('Could not remove private push subscription during logout:', error);
      }
      await client.auth.signOut();
    }
    localStorage.removeItem('bia_current_user');
    setReadClubProgressUserId(null);
    progressRef.current = createEmptyReadClubProgress();
    setSessions([]);
    setGlossary({});
    setLearnedWords({});
    setCurrentUser(null);
    setIsAuthModalOpen(true);
  };

  const isAccessExpired = (user: Pick<UserProfile, 'status' | 'data_expiracao'> | null | undefined) => {
    if (!user || user.status !== 'active') return false;
    return !user.data_expiracao || new Date(user.data_expiracao) <= new Date();
  };

  useEffect(() => {
    if (!currentUser || (currentUser.role === 'admin' && isAuthorizedCeoEmail(currentUser.email || ''))) return;
    if (isAccessExpired(currentUser)) {
      const expiredUser: UserProfile = {
        ...currentUser,
        status: 'expired',
        updated_at: new Date().toISOString()
      };
      setCurrentUser(expiredUser);
      localStorage.setItem('bia_current_user', JSON.stringify(expiredUser));
    }
  }, [currentUser]);

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
    setCurrentApp(getRequestedStartupApp());
  };

  const handlePaymentSuccess = async () => {
    if (!currentUser?.auth_user_id) return;
    const verified = await hydrateUserWithCloudSubscription(currentUser);
    if (verified.status !== 'active') return;
    setCurrentUser(verified);
    localStorage.setItem('bia_current_user', JSON.stringify(verified));
  };

  const handleStudentProfileSaved = (profile: UserProfile) => {
    localStorage.setItem('bia_current_user', JSON.stringify(profile));
    const usersRaw = localStorage.getItem('bia_users_database');
    if (usersRaw) {
      try {
        const users = JSON.parse(usersRaw) as UserProfile[];
        const userIndex = users.findIndex((user) => user.email.toLowerCase() === profile.email.toLowerCase());
        if (userIndex >= 0) {
          users[userIndex] = { ...users[userIndex], ...profile };
          localStorage.setItem('bia_users_database', JSON.stringify(users));
        }
      } catch (error) {
        console.error('Could not update the local user profile cache:', error);
      }
    }
    setCurrentUser(profile);
  };

  const handleRealtimeSubscriptionUpdate = (subscription: { status: string; subscription_expires_at?: string | null }) => {
    setCurrentUser((previous) => {
      if (!previous) return previous;

      if (subscription.status !== 'active' || !subscription.subscription_expires_at || new Date(subscription.subscription_expires_at) <= new Date()) {
        const expiredUser: UserProfile = {
          ...previous,
          status: 'expired',
          data_expiracao: subscription.subscription_expires_at || previous.data_expiracao || null,
          updated_at: new Date().toISOString()
        };
        localStorage.setItem('bia_current_user', JSON.stringify(expiredUser));
        return expiredUser;
      }

      const expiration = subscription.subscription_expires_at;
      const updated = { ...previous, status: 'active' as const, data_expiracao: expiration };
      localStorage.setItem('bia_current_user', JSON.stringify(updated));
      return updated;
    });
  };

  // Strict RBAC checks - Restricted solely to verified CEO email
  const isAdmin = currentUser?.role === 'admin' && isAuthorizedCeoEmail(currentUser?.email || '');
  const effectiveIsAdmin = isAdmin && !isStudentPreviewMode;
  const isStudent = currentUser?.role === 'student' || !isAdmin;
  const isSubscriptionActive = isAdmin || (currentUser?.status === 'active' && !isAccessExpired(currentUser));
  const needsStudentProfile = Boolean(
    currentUser &&
    isSubscriptionActive &&
    !isAdmin &&
    (
      !currentUser.first_name?.trim() ||
      !currentUser.last_name?.trim() ||
      !currentUser.profile_state?.trim() ||
      !currentUser.profile_city?.trim() ||
      !currentUser.profile_country?.trim()
    )
  );

  useEffect(() => {
    if (!isAdmin || !currentUser) {
      liveActiveSubscriberCountRef.current = null;
      setLiveActiveSubscriberCount(null);
      setNewActiveSubscriberCount(0);
      setSubscriberCountUnavailable(false);
      return;
    }

    let isMounted = true;
    const refreshActiveSubscribers = async () => {
      try {
        const subscribers = await fetchAdminSubscribers();
        if (!isMounted) return;

        const activeCount = subscribers.filter((subscriber) =>
          isActiveSubscription(subscriber.status, subscriber.data_expiracao)
        ).length;
        const previousCount = liveActiveSubscriberCountRef.current;
        if (previousCount !== null && activeCount > previousCount) {
          setNewActiveSubscriberCount((count) => count + activeCount - previousCount);
        }
        liveActiveSubscriberCountRef.current = activeCount;
        setLiveActiveSubscriberCount(activeCount);
        setSubscriberCountUnavailable(false);
      } catch (error) {
        console.error('Não foi possível atualizar o total de assinantes ativos.', error);
        if (isMounted) setSubscriberCountUnavailable(true);
      }
    };

    void refreshActiveSubscribers();
    const intervalId = window.setInterval(() => void refreshActiveSubscribers(), 30_000);
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [isAdmin, currentUser?.id, currentUser?.auth_user_id]);
  const activeReadClubUserId = currentUser?.auth_user_id || currentUser?.id || null;
  const isReadClubProgressReady = Boolean(
    activeReadClubUserId && readClubProgressUserId === activeReadClubUserId
  );

  const lockHomeScroll = Boolean(currentUser && currentApp === 'home' && isSubscriptionActive);

  useEffect(() => {
    document.documentElement.classList.toggle('home-scroll-locked', lockHomeScroll);
    document.body.classList.toggle('home-scroll-locked', lockHomeScroll);

    return () => {
      document.documentElement.classList.remove('home-scroll-locked');
      document.body.classList.remove('home-scroll-locked');
    };
  }, [currentApp, currentUser, effectiveIsAdmin]);

  // Track access to CEO/Admin dashboards
  useEffect(() => {
    if (['dashboard', 'admin_settings', 'streamstudio', 'classroom', 'meet'].includes(currentApp)) {
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
    if (isStudentPreviewMode) {
      if (adminSettingsBeforePreviewRef.current) setSettings(adminSettingsBeforePreviewRef.current);
      adminSettingsBeforePreviewRef.current = null;
    } else {
      adminSettingsBeforePreviewRef.current = settings;
      setSettings((current) => ({ ...current, ...DEFAULT_STUDENT_PREFERENCES }));
    }
    setIsStudentPreviewMode((previous) => !previous);
    setCurrentApp('home');
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
            <p className="text-[11px] uppercase tracking-[0.35em] text-white/60 menu-cinematic-text notranslate" translate="no">Brazilian in Action</p>
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
        <BackgroundSlideshow settings={settings} paused={bgPaused} />

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
          menuSoundsEnabled={settings.menuSoundsEnabled}
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

        {/* Main View Port Routing */}
        <main className={`relative z-10 ${currentUser ? 'pt-18 sm:pt-20' : 'pt-24 pb-8'} ${
          currentUser && isStudent && !isSubscriptionActive ? 'pb-0' : currentUser ? 'pb-12' : ''
        } ${lockHomeScroll ? 'h-screen box-border overflow-hidden overscroll-none' : 'min-h-[90vh]'}`}>
          {/* 1. AUTH MODAL (Unified Login/Cadastro + 17-Click Easter Egg) */}
          <AuthModal
            isOpen={isAuthModalOpen || !currentUser}
            onAuthSuccess={handleAuthSuccess}
          />

          {currentUser && isSubscriptionActive && needsStudentProfile && (
            <StudentProfileOnboarding user={currentUser} onSaved={handleStudentProfileSaved} />
          )}

          {currentUser && isSubscriptionActive && !needsStudentProfile && (
            <BrazilianFriendsGlobalStatus
              user={currentUser}
              currentApp={currentApp}
              onOpenFriends={(friendId) => {
                const url = new URL(window.location.href);
                url.searchParams.set('open', 'friends');
                if (friendId) url.searchParams.set('friend', friendId);
                else url.searchParams.delete('friend');
                window.history.replaceState({}, '', url);
                setCurrentApp('brazilianfriends');
              }}
              onOpenHome={() => setCurrentApp('home')}
            />
          )}

          {currentUser && isSubscriptionActive && !isAdmin && !needsStudentProfile && (
            <StudentFeedbackNotifications
              user={currentUser}
              isFeedbackOpen={currentApp === 'feedback'}
              onOpenFeedback={() => setCurrentApp('feedback')}
            />
          )}

          {/* 2. PIX PAYMENT SCREEN (For Students with pending or expired subscriptions) */}
          {currentUser && isStudent && !isSubscriptionActive && (
            <Suspense fallback={<div className="flex min-h-64 items-center justify-center text-sm text-white/70">Carregando pagamento...</div>}>
              <PixPaymentScreen
                user={currentUser}
                onPaymentSuccess={handlePaymentSuccess}
                onSubscriptionUpdate={handleRealtimeSubscriptionUpdate}
                onLogout={handleLogout}
              />
            </Suspense>
          )}

          {/* 3. PROTECTED PLATFORM CONTENT (Strictly Rendered only when authenticated & active) */}
          {currentUser && isSubscriptionActive && !needsStudentProfile && (
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
                  <Suspense fallback={<div className="flex min-h-64 items-center justify-center text-sm text-white/70">Carregando módulo...</div>}>
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
                      isCeo={isAdmin}
                      liveActiveSubscriberCount={liveActiveSubscriberCount}
                      newActiveSubscriberCount={newActiveSubscriberCount}
                      subscriberCountUnavailable={subscriberCountUnavailable}
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
                      isCeo={isAdmin}
                      liveActiveSubscriberCount={liveActiveSubscriberCount}
                      newActiveSubscriberCount={newActiveSubscriberCount}
                      subscriberCountUnavailable={subscriberCountUnavailable}
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

                  {!effectiveIsAdmin && currentApp === 'settings' && (
                    <Settings
                      settings={settings}
                      onUpdateSettings={handleUpdateSettings}
                      onExportBackup={handleExportBackup}
                      onImportBackup={handleImportBackup}
                      onResetAll={handleResetAll}
                      isStudent
                      onResetStudentSettings={handleResetStudentSettings}
                    />
                  )}

                  {/* STUDENT & ADMIN SHARED PRACTICAL TABS */}
                  {currentApp === 'readclub' && (
                    isReadClubProgressReady ? (
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
                    ) : (
                      <div className="flex h-[calc(100dvh-8rem)] items-center justify-center text-sm text-white/70">
                        Carregando seu progresso individual...
                      </div>
                    )
                  )}

                  {currentApp === 'brazilianhq' && (
                    <BrazilianHQ
                      learnedWords={learnedWords}
                      onUpdateLearnedWords={handleUpdateLearnedWords}
                    />
                  )}

                  {currentApp === 'board' && (
                    <BrazilianBoard accentColor={settings.accentColor} />
                  )}

                  {currentApp === 'quiz' && (
                    <BrazilianQuiz accentColor={settings.accentColor} />
                  )}

                  {currentApp === 'braziliangames' && (
                    <BrazilianGames />
                  )}

                  {currentApp === 'tradutor' && (
                    <BrazilianTradutor accentColor={settings.accentColor} />
                  )}

                  {currentApp === 'biacompare' && (
                    <BiaCompare accentColor={settings.accentColor} onNavigate={setCurrentApp} />
                  )}

                  {currentApp === 'conversation' && (
                    <BrazilianConversation accentColor={settings.accentColor} />
                  )}

                  {(currentApp === 'youtube' || currentApp === 'studytime') && (
                    isYoutubeLibraryLoaded
                      ? (
                        <YouTubeHub
                          accentColor={settings.accentColor}
                          displayMode={currentApp === 'studytime' ? 'study' : 'music'}
                          canEdit={currentApp === 'youtube'
                            ? effectiveIsAdmin || (isSubscriptionActive && (currentUser?.role === 'student' || isStudentPreviewMode))
                            : effectiveIsAdmin}
                          canDelete={effectiveIsAdmin}
                          onLibraryUpdate={handleUpdateYouTubeLibrary}
                          initialLibrary={youtubeLibrary}
                        />
                      )
                      : <div className="flex min-h-64 items-center justify-center text-sm text-white/70">Carregando <span className="notranslate" translate="no">{currentApp === 'studytime' ? 'Study Time' : 'Brazilian Music'}</span>...</div>
                  )}

                  {currentApp === 'practice' && (
                    <BrazilianPractice accentColor={settings.accentColor} />
                  )}

                  {currentApp === 'stories' && (
                    <BrazilianStories 
                      currentUser={currentUser} 
                      isAdmin={effectiveIsAdmin} 
                      accentColor={settings.accentColor} 
                      onShowFloatingCamera={setIsStoryCamActive}
                    />
                  )}

                  {currentApp === 'brazilianfriends' && (
                    <BrazilianFriends
                      currentUser={currentUser}
                      accentColor={settings.accentColor}
                    />
                  )}
                  {currentApp === 'brazilianspace' && (
                    <BrazilianSpace
                      user={currentUser}
                      initialDraft={spaceDraftSeed}
                      focusRequestId={spaceFocusRequest}
                    />
                  )}
                  </Suspense>
                  </PageReveal>
                </ErrorBoundary>
              </motion.div>
            </AnimatePresence>
          )}
        </main>
        {currentUser && isSubscriptionActive && (
          <SiteLegalFooter />
        )}

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
                <Suspense fallback={<div className="flex min-h-64 items-center justify-center text-sm text-white/70">Carregando tradutor...</div>}>
                  <BrazilianTradutor
                    accentColor={settings.accentColor}
                    isModal={true}
                    onCloseModal={() => setQuickTradutorModalOpen(false)}
                  />
                </Suspense>
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
          isActive={((isFloatingCamActive && isAdmin) || isStoryCamActive) && !isAuthModalOpen && Boolean(currentUser)}
          onClose={() => {
            setIsFloatingCamActive(false);
            setIsStoryCamActive(false);
          }}
        />
        <StoryRecordingBar onFinished={() => setCurrentApp('stories')} />
        <BrazilianSpaceMomentInsight
          onOpenSpace={(draft) => {
            setSpaceDraftSeed(draft);
            setSpaceFocusRequest((request) => request + 1);
            setCurrentApp('brazilianspace');
          }}
        />
      </div>
      )}
    </LayoutPositionProvider>
  );
}
