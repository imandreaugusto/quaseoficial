import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'motion/react';
import gsap from 'gsap';
import { playHoverSound, playMenuSelectSound } from '../lib/menuSounds';
import { 
  Menu, 
  X, 
  Home, 
  LayoutDashboard, 
  GraduationCap, 
  Video, 
  BookOpen, 
  Presentation, 
  Settings as SettingsIcon, 
  Sparkles, 
  HelpCircle, 
  Languages, 
  Mic, 
  LogOut,
  Users,
  Radio,
  Music,
  LayoutGrid,
  Eye,
  EyeOff,
  Globe,
  Instagram,
  Gamepad2,
  MessageSquareText,
  Download,
  Share,
  Plus
} from 'lucide-react';
import { UserProfile, GlobalAppConfig } from '../types';
import { BrazilianLogo } from './BrazilianLogo';
import { SocialLinksBar } from './SocialLinksBar';
import { getSupabaseClient, loadSharedContentFromSupabase } from '../utils/supabaseClient';

interface SidebarProps {
  currentApp: string;
  onNavigate: (app: string) => void;
  accentColor: string;
  currentUser?: UserProfile | null;
  onLogout?: () => void;
  onOpenQuickTradutor?: () => void;
  isFloatingCamActive?: boolean;
  onToggleFloatingCam?: () => void;
  isStudentPreviewMode?: boolean;
  onToggleStudentPreview?: () => void;
}

const ALL_STUDENT_ITEMS = [
  { id: 'home', label: 'Home', icon: Home, permKey: 'readclub' as const },
  { id: 'brazilianfriends', label: 'Brazilian Friends', icon: Users, permKey: 'friends' as const },
  { id: 'stories', label: 'Brazilian Post', icon: Instagram, permKey: 'stories' as const },
  { id: 'practice', label: 'Brazilian Practice', icon: Globe, permKey: 'practice' as const },
  { id: 'readclub', label: 'Read Club', icon: BookOpen, permKey: 'readclub' as const },
  { id: 'board', label: 'Blackboard', icon: Presentation, permKey: 'board' as const },
  { id: 'quiz', label: 'Brazilian Quiz', icon: HelpCircle, permKey: 'quiz' as const },
  { id: 'braziliangames', label: 'Brazilian Games', icon: Gamepad2, permKey: 'braziliangames' as const },
  { id: 'biacompare', label: 'BIA Compare', icon: Sparkles, permKey: 'biacompare' as const },
  { id: 'conversation', label: 'Conversação IA', icon: Mic, permKey: 'conversation' as const },
  { id: 'tradutor', label: 'Tradutor Cultural', icon: Languages, permKey: 'tradutor' as const },
  { id: 'youtube', label: 'Brazilian Music', icon: Music, permKey: 'youtube' as const },
  { id: 'feedback', label: 'Feedback', icon: MessageSquareText, permKey: 'readclub' as const }
];

type NavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>;
};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const isAppInstalled = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));

const NavButton: React.FC<{
  item: NavItem;
  isActive: boolean;
  accentColor: string;
  onClick: () => void;
}> = ({ item, isActive, accentColor, onClick }) => {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const iconRef = useRef<HTMLSpanElement | null>(null);
  const isPlatformBrand = item.label.startsWith('Brazilian ') || item.label === 'Read Club' || item.label === 'BIA Compare';

  // 1. Ao passar o mouse: toca o som e aciona o GSAP
  const handleMouseEnter = () => {
    playHoverSound(0.15); // Dispara o som sintetizado

    if (!btnRef.current) return;

    // Desloca o botão para a direita e aumenta levemente o tamanho
    gsap.to(btnRef.current, {
      x: 6,
      scale: 1.02,
      duration: 0.25,
      ease: 'power2.out',
      overwrite: 'auto',
    });

    // Dá uma leve rotação de 8° no ícone com efeito elástico
    if (iconRef.current) {
      gsap.to(iconRef.current, {
        scale: 1.15,
        rotation: 8,
        duration: 0.3,
        ease: 'back.out(2)',
        overwrite: 'auto',
      });
    }

  };

  // 2. Ao tirar o mouse: volta para o estado normal suavemente
  const handleMouseLeave = () => {
    if (!btnRef.current) return;

    gsap.to(btnRef.current, {
      x: 0,
      scale: 1,
      duration: 0.3,
      ease: 'power2.out',
      overwrite: 'auto',
    });

    if (iconRef.current) {
      gsap.to(iconRef.current, {
        scale: 1,
        rotation: 0,
        duration: 0.25,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }

  };

  // 3. Ao pressionar o mouse: efeito de clique físico (afunda)
  const handleMouseDown = () => {
    if (!btnRef.current) return;
    gsap.to(btnRef.current, {
      scale: 0.96,
      duration: 0.1,
      ease: 'power1.out',
    });
  };

  const handleMouseUp = () => {
    if (!btnRef.current) return;
    gsap.to(btnRef.current, {
      scale: 1.02,
      duration: 0.15,
      ease: 'back.out(2)',
    });
  };

  const handleClick = () => {
    playMenuSelectSound(0.18); // Toca o som de seleção
    onClick();
  };

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      aria-current={isActive ? 'page' : undefined}
      className={`min-h-11 w-full flex items-center gap-3.5 px-3 py-2.5 rounded-2xl border select-none cursor-pointer ${
        isActive ? 'border-white/25 bg-white/10 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.25)]' : 'border-transparent bg-transparent'
      }`}
    >
      <span ref={iconRef} className="shrink-0 flex items-center justify-center">
        <item.icon
          size={20}
          style={{
            color: isActive ? accentColor : 'rgba(255,255,255,0.82)',
          }}
        />
      </span>
      <span
        className={`text-sm tracking-wide flex-1 text-left font-semibold menu-cinematic-text ${isPlatformBrand ? 'notranslate' : ''}`}
        style={{
          color: isActive ? '#ffffff' : 'rgba(255,255,255,0.82)',
          fontWeight: isActive ? 800 : 600,
        }}
        translate={isPlatformBrand ? 'no' : undefined}
      >
        {item.label}
      </span>
    </button>
  );
};

const ALL_ADMIN_ITEMS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'work', label: 'Work', icon: LayoutGrid },
  { id: 'brazilianfriends', label: 'Brazilian Friends', icon: Users },
  { id: 'stories', label: 'Brazilian Post', icon: Instagram },
  { id: 'practice', label: 'Brazilian Practice', icon: Globe },
  { id: 'dashboard', label: 'Controle Financeiro', icon: LayoutDashboard },
  { id: 'admin_settings', label: 'Painel do CEO', icon: Users },
  { id: 'readclub', label: 'Read Club', icon: BookOpen },
  { id: 'board', label: 'Brazilian Board', icon: Presentation },
  { id: 'streamstudio', label: 'Brazilian LIVE', icon: Radio },
  { id: 'classroom', label: 'Google Classroom', icon: GraduationCap },
  { id: 'meet', label: 'Google Meet', icon: Video },
  { id: 'quiz', label: 'Brazilian Quiz', icon: HelpCircle },
  { id: 'braziliangames', label: 'Brazilian Games', icon: Gamepad2 },
  { id: 'biacompare', label: 'BIA Compare', icon: Sparkles },
  { id: 'conversation', label: 'Brazilian Conversation', icon: Mic },
  { id: 'tradutor', label: 'Brazilian Tradutor', icon: Languages },
  { id: 'youtube', label: 'Brazilian Music', icon: Music },
  { id: 'feedback', label: 'Feedback dos alunos', icon: MessageSquareText },
  { id: 'settings', label: 'Configurações', icon: SettingsIcon },
];

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentApp, 
  onNavigate, 
  accentColor, 
  currentUser,
  onLogout,
  onOpenQuickTradutor,
  isFloatingCamActive,
  onToggleFloatingCam,
  isStudentPreviewMode = false,
  onToggleStudentPreview
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuToggleRef = useRef<HTMLButtonElement | null>(null);
  const menuPanelRef = useRef<HTMLDivElement | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIosInstallAvailable, setIsIosInstallAvailable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [installError, setInstallError] = useState('');
  const [appConfig, setAppConfig] = useState<GlobalAppConfig>({
    studentAppOrder: ['home', 'brazilianfriends', 'stories', 'practice', 'readclub', 'board', 'quiz', 'braziliangames', 'biacompare', 'conversation', 'tradutor', 'youtube', 'feedback'],
    adminAppOrder: ['home', 'work', 'brazilianfriends', 'stories', 'practice', 'dashboard', 'admin_settings', 'feedback', 'readclub', 'board', 'streamstudio', 'classroom', 'meet', 'quiz', 'braziliangames', 'biacompare', 'conversation', 'tradutor', 'youtube', 'settings'],
    studentGlobalEnabled: {
      brazilianfriends: true,
      stories: true,
      practice: true,
      readclub: true,
      board: true,
      quiz: true,
      braziliangames: true,
      biacompare: true,
      conversation: true,
      tradutor: true,
      youtube: true,
      feedback: true
    }
  });

  useEffect(() => {
    const updateInstalledState = () => setIsInstalled(isAppInstalled());
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };
    const isIosDevice =
      /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const standaloneQuery = window.matchMedia('(display-mode: standalone)');

    updateInstalledState();
    setIsIosInstallAvailable(isIosDevice && !isAppInstalled());
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    standaloneQuery.addEventListener('change', updateInstalledState);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      standaloneQuery.removeEventListener('change', updateInstalledState);
    };
  }, []);

  // The CEO's app visibility/order configuration is shared across subscriber devices.
  useEffect(() => {
    let cancelled = false;
    let refreshInProgress = false;

    const applyConfig = (parsed: GlobalAppConfig | null) => {
      if (!parsed || !Array.isArray(parsed.studentAppOrder) || !Array.isArray(parsed.adminAppOrder)) return;
      const studentAppOrder = parsed.studentAppOrder.includes('brazilianfriends')
        ? parsed.studentAppOrder
        : ['brazilianfriends', ...parsed.studentAppOrder];
      if (!studentAppOrder.includes('feedback')) studentAppOrder.push('feedback');
      const adminAppOrder = parsed.adminAppOrder.includes('brazilianfriends')
        ? parsed.adminAppOrder
        : ['brazilianfriends', ...parsed.adminAppOrder];
      if (!studentAppOrder.includes('braziliangames')) studentAppOrder.push('braziliangames');
      if (!adminAppOrder.includes('braziliangames')) adminAppOrder.push('braziliangames');
      if (!adminAppOrder.includes('youtube')) adminAppOrder.push('youtube');
      if (!adminAppOrder.includes('feedback')) adminAppOrder.push('feedback');
      const normalized: GlobalAppConfig = {
        ...parsed,
        studentAppOrder,
        adminAppOrder,
        studentGlobalEnabled: {
          brazilianfriends: true,
          braziliangames: true,
          feedback: true,
          ...parsed.studentGlobalEnabled
        }
      };
      setAppConfig(normalized);
      localStorage.setItem('bia_global_app_config', JSON.stringify(normalized));
      if (
        (currentUser?.role !== 'admin' || isStudentPreviewMode) &&
        currentApp !== 'home' &&
        normalized.studentGlobalEnabled[currentApp] === false
      ) {
        onNavigate('home');
      }
    };

    const loadConfig = () => {
      const savedConfig = localStorage.getItem('bia_global_app_config');
      if (savedConfig) {
        try {
          applyConfig(JSON.parse(savedConfig) as GlobalAppConfig);
        } catch (error) {
          console.error('Saved app menu configuration is invalid:', error);
        }
      }
    };
    loadConfig();

    const handleConfigChange = () => loadConfig();
    window.addEventListener('bia_app_config_changed', handleConfigChange);
    const canReadSharedConfig = currentUser?.role === 'admin' || currentUser?.status === 'active';
    const client = canReadSharedConfig ? getSupabaseClient() : null;
    if (!client) {
      return () => {
        cancelled = true;
        window.removeEventListener('bia_app_config_changed', handleConfigChange);
      };
    }

    const refreshSharedConfig = async () => {
      if (refreshInProgress) return;
      refreshInProgress = true;
      try {
        const sharedConfig = await loadSharedContentFromSupabase<GlobalAppConfig>('global_app_config');
        if (!cancelled) applyConfig(sharedConfig);
      } catch (error) {
        console.error('Could not load shared student app visibility settings:', error);
      } finally {
        refreshInProgress = false;
      }
    };

    void refreshSharedConfig();
    const channel = client
      .channel(`shared-app-config-${currentUser?.auth_user_id || currentUser?.id || 'user'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bia_shared_content', filter: 'content_key=eq.global_app_config' },
        () => void refreshSharedConfig()
      )
      .subscribe((status, error) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Realtime app menu updates are unavailable; periodic refresh remains active.', error);
        }
      });
    const refreshInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshSharedConfig();
    }, 15_000);

    return () => {
      cancelled = true;
      window.clearInterval(refreshInterval);
      window.removeEventListener('bia_app_config_changed', handleConfigChange);
      void client.removeChannel(channel);
    };
  }, [currentUser?.auth_user_id, currentUser?.id, currentUser?.role, currentUser?.status, currentApp, isStudentPreviewMode, onNavigate]);

  // STRICT RBAC MENU DEFINITION
  const isActualAdmin = currentUser?.role === 'admin';
  const isAdmin = isActualAdmin && !isStudentPreviewMode;
  const perms = currentUser?.permissions || {
    readclub: true,
    board: true,
    quiz: true,
    braziliangames: true,
    biacompare: true,
    conversation: true,
    tradutor: true,
    youtube: true
  };

  // Build Ordered & Filtered Student Items
  const effectiveStudentOrder = appConfig.studentAppOrder.includes('home')
    ? appConfig.studentAppOrder
    : ['home', ...appConfig.studentAppOrder];

  const studentItems = effectiveStudentOrder
    .map((appId) => ALL_STUDENT_ITEMS.find((item) => item.id === appId))
    .filter((item): item is typeof ALL_STUDENT_ITEMS[number] => {
      if (!item) return false;
      if (item.id === 'home') return true;
      const isGloballyActive = appConfig.studentGlobalEnabled[item.id] !== false;
      const isPermittedForUser = item.id === 'feedback' || perms[item.permKey] !== false;
      return isGloballyActive && isPermittedForUser;
    });

  // Build Ordered Admin Items
  const adminItems = appConfig.adminAppOrder
    .map((appId) => ALL_ADMIN_ITEMS.find((item) => item.id === appId))
    .filter((item): item is typeof ALL_ADMIN_ITEMS[number] => Boolean(item));
  if (!adminItems.some((item) => item.id === 'feedback')) {
    const feedbackItem = ALL_ADMIN_ITEMS.find((item) => item.id === 'feedback');
    if (feedbackItem) adminItems.push(feedbackItem);
  }

  // Strictly filter menu items based on active role & student preview simulation
  const menuItems = isAdmin ? adminItems : studentItems;

  const currentItem = menuItems.find((m) => m.id === currentApp) || { label: 'Brazilian in Action' };

  // If user is not authenticated, do not show top navigation bar or menu
  if (!currentUser) {
    return null;
  }

  const handleNavigate = (id: string) => {
    onNavigate(id);
    closeMenu();
  };

  const handleInstallApp = async () => {
    if (!installPrompt) {
      setShowInstallHelp(true);
      return;
    }

    setInstallError('');
    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') setInstallPrompt(null);
    } catch (error) {
      console.error('Não foi possível iniciar a instalação do app:', error);
      setInstallError('Não foi possível abrir a instalação agora. Tente novamente pelo menu do navegador.');
    }
  };

  const closeMenu = () => {
    setIsOpen(false);
    requestAnimationFrame(() => menuToggleRef.current?.focus());
  };

  useEffect(() => {
    if (!isOpen) return;

    const panel = menuPanelRef.current;
    const getFocusableItems = () => panel?.querySelectorAll<HTMLElement>(
      'a[href], button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])'
    ) || [];
    getFocusableItems()[0]?.focus();

    const handleMenuKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusableItems = getFocusableItems();
      const first = focusableItems[0];
      const last = focusableItems[focusableItems.length - 1];
      if (!first || !last) {
        event.preventDefault();
        return;
      }
      if (!panel?.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleMenuKeyDown);
    return () => document.removeEventListener('keydown', handleMenuKeyDown);
  }, [isOpen]);

  const navContainerVariants: Variants = {
    hidden: { x: '-100%', opacity: 0.8 },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        damping: 26,
        stiffness: 210,
        staggerChildren: 0.035,
        delayChildren: 0.08,
      },
    },
    exit: {
      x: '-100%',
      opacity: 0,
      transition: {
        duration: 0.32,
        ease: [0.4, 0, 1, 1],
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, x: -18 },
    visible: { 
      opacity: 1, 
      x: 0, 
      transition: { type: 'spring', damping: 22, stiffness: 240 } 
    },
  };

  return (
    <>
      {/* FLOATING TOP NAVIGATION ISLANDS (No full-width dark background strip) */}
      <div className="app-top-navigation fixed left-0 right-0 z-[3200] flex items-center justify-between select-none pointer-events-none">
        {/* Left Floating Island: Hamburger & Brand Logo */}
        <div className="flex items-center gap-2 shrink-0 pointer-events-auto">
          <button
            ref={menuToggleRef}
            type="button"
            id="hamburger-btn"
            onClick={() => {
              playMenuSelectSound(0.18);
              setIsOpen(!isOpen);
            }}
            aria-label={isOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
            aria-expanded={isOpen}
            aria-controls="app-navigation-menu"
            className="app-top-navigation-control flex h-11 w-11 items-center justify-center bg-transparent border-0 hover:scale-110 transition-transform cursor-pointer drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] active:scale-95"
            style={{ color: isOpen ? accentColor : '#ffffff' }}
          >
            {isOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>

          {/* Automatic Brand Logo */}
          <button
            type="button"
            onClick={() => onNavigate('home')}
            aria-label="Brazilian in Action - ir para Home"
            className="flex min-h-11 items-center gap-2 cursor-pointer hover:scale-[1.02] transition-transform bg-transparent border-0 px-1 py-1 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]"
          >
            <BrazilianLogo size="sm" />
          </button>
        </div>

        {/* Center Floating Island: Current Module Indicator Badge (Clean without Admin badge) */}
        <div className="hidden md:flex items-center gap-2 px-1 py-1 bg-transparent font-mono text-xs pointer-events-auto drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundImage: `linear-gradient(135deg, #34d399, ${accentColor})` }}
          />
          <span className="notranslate font-extrabold uppercase tracking-wider" translate="no" style={{ color: '#fff' }}>
            {currentItem.label}
          </span>
        </div>

        {/* Right Floating Island: Social Links & User Profile & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 pointer-events-auto">
          {/* Social Channels (YouTube, TikTok, Instagram, WhatsApp) - Soltos & Separados */}
          <div className="hidden xs:flex items-center">
            <SocialLinksBar size="sm" variant="plain" />
          </div>

          {/* Ver como Aluno (Simulação de Visão do Aluno) - EXCLUSIVO PARA O CEO - Apenas Ícone */}
          {isActualAdmin && onToggleStudentPreview && (
            <button
              type="button"
              onClick={onToggleStudentPreview}
              aria-label={isStudentPreviewMode ? 'Sair da visão de aluno e retornar ao modo CEO' : 'Visualizar como aluno'}
              className={`app-top-navigation-control flex h-11 w-11 items-center justify-center bg-transparent border-0 transition-all cursor-pointer group active:scale-95 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] ${
                isStudentPreviewMode ? 'text-white' : 'text-white/80 hover:text-white'
              }`}
            >
              {isStudentPreviewMode ? (
                <EyeOff size={16} />
              ) : (
                <Eye size={16} className="text-white group-hover:scale-110 transition-transform" />
              )}
            </button>
          )}

          {/* B Cam (Camera Bolinha Flutuante) Button - STRICTLY FOR ADMIN/CEO ONLY (Hidden in Student Preview) */}
          {isActualAdmin && !isStudentPreviewMode && onToggleFloatingCam && (
            <button
              type="button"
              onClick={onToggleFloatingCam}
              aria-label={isFloatingCamActive ? 'Ocultar câmera flutuante do CEO' : 'Mostrar câmera flutuante do CEO'}
              aria-pressed={Boolean(isFloatingCamActive)}
              className={`app-top-navigation-control flex h-11 w-11 items-center justify-center bg-transparent border-0 text-xs font-extrabold transition-all cursor-pointer group active:scale-95 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] ${
                isFloatingCamActive ? 'text-white' : 'text-white/80 hover:text-white'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Video size={14} className="text-white group-hover:scale-110 transition-transform" />
                {isFloatingCamActive && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                )}
              </div>
            </button>
          )}

          {currentUser && (
            <div className="flex items-center gap-1 bg-transparent p-1 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  aria-label="Sair da conta"
                  className="app-top-navigation-control flex h-11 w-11 items-center justify-center bg-transparent text-white/70 hover:text-red-400 transition-all cursor-pointer ml-0.5"
                >
                  <LogOut size={18} aria-hidden="true" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Slide-out Navigation Drawer (Strictly filtered DOM) */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              onClick={closeMenu}
              aria-hidden="true"
              tabIndex={-1}
              className="fixed inset-0 z-[3300] border-0 bg-transparent"
            />

            {/* Sidebar Menu Panel */}
            <motion.div
              ref={menuPanelRef}
              id="app-navigation-menu"
              role="dialog"
              aria-modal="true"
              aria-label="Menu de navegação"
              variants={navContainerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="menu-cinematic-panel fixed top-0 left-0 bottom-0 z-[3400] flex w-[min(18rem,calc(100vw-1.5rem))] flex-col justify-between bg-transparent p-4 pt-18 select-none"
            >
              <nav aria-label={isAdmin ? 'Módulos do CEO' : 'Módulos do aluno'} className="flex flex-col gap-1 overflow-y-auto custom-scrollbar pr-1">
                <div
                  className="px-2 py-2 text-[10px] font-bold uppercase tracking-widest font-mono menu-cinematic-text text-white/75"
                >
                  {isAdmin ? 'Painel do CEO André Augusto' : 'Módulos Práticos do Aluno'}
                </div>

                {menuItems.map((item) => {
                  const isActive = currentApp === item.id;

                  return (
                    <motion.div key={item.id} variants={itemVariants}>
                      <NavButton
                        item={item}
                        isActive={isActive}
                        accentColor={accentColor}
                        onClick={() => handleNavigate(item.id)}
                      />
                    </motion.div>
                  );
                })}
                {!isInstalled && (isIosInstallAvailable || installPrompt) && (
                  <motion.div variants={itemVariants} className="pt-2">
                    <button
                      type="button"
                      onClick={() => void handleInstallApp()}
                      className="min-h-11 w-full flex items-center gap-3.5 px-3 py-2.5 rounded-2xl border border-white/10 bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors"
                    >
                      <Download size={18} className="shrink-0" />
                      <span className="text-sm tracking-wide font-medium">Instalar app</span>
                    </button>
                    {installError && (
                      <p role="status" className="px-3 pt-2 text-xs text-amber-200/90">
                        {installError}
                      </p>
                    )}
                  </motion.div>
                )}
              </nav>

              {/* Drawer Footer info & Social Media */}
              <div className="pt-4 text-center flex flex-col items-center gap-2.5 text-[11px] drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
                <SocialLinksBar size="sm" variant="plain" />
                <div className="flex flex-col items-center gap-0.5">
                  <span className="font-semibold menu-cinematic-text text-white/90">
                    Brazilian in Action Platform
                  </span>
                  <span className="menu-cinematic-text text-white/60">
                    {isAdmin ? 'Modo CEO & Gestão Total' : 'Ambiente do Aluno'}
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInstallHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowInstallHelp(false)}
            className="fixed inset-0 z-[3600] flex items-center justify-center bg-black/55 px-5 backdrop-blur-sm"
          >
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="install-help-title"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-white/15 bg-slate-950/95 p-5 text-white shadow-2xl"
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white/90">
                  <Share size={19} />
                </span>
                <h2 id="install-help-title" className="text-base font-semibold">
                  Adicionar à Tela de Início
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-white/75">
                No Safari, toque em <Share size={14} className="mx-0.5 inline-block align-[-2px]" /> Compartilhar
                e depois em <span className="font-medium text-white">Adicionar à Tela de Início</span>.
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-white/55">
                <Plus size={14} />
                <span>O app ficará disponível junto aos outros apps do iPhone.</span>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallHelp(false)}
                className="mt-5 w-full rounded-xl border border-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                Fechar
              </button>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
