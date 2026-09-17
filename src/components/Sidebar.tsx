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
  Instagram
} from 'lucide-react';
import { UserProfile, GlobalAppConfig } from '../types';
import { BrazilianLogo } from './BrazilianLogo';
import { SocialLinksBar } from './SocialLinksBar';

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
  { id: 'biacompare', label: 'BIA Compare', icon: Sparkles, permKey: 'biacompare' as const },
  { id: 'conversation', label: 'Conversação IA', icon: Mic, permKey: 'conversation' as const },
  { id: 'tradutor', label: 'Tradutor Cultural', icon: Languages, permKey: 'tradutor' as const },
  { id: 'youtube', label: 'Brazilian Music', icon: Music, permKey: 'youtube' as const }
];

type NavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>;
};

const NavButton: React.FC<{
  item: NavItem;
  isActive: boolean;
  accentColor: string;
  onClick: () => void;
}> = ({ item, isActive, accentColor, onClick }) => {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const iconRef = useRef<HTMLSpanElement | null>(null);
  const dotRef = useRef<HTMLSpanElement | null>(null);

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

    // Acende a bolinha indicadora
    if (dotRef.current) {
      gsap.to(dotRef.current, {
        scale: 1.5,
        opacity: 1,
        duration: 0.2,
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

    if (dotRef.current) {
      gsap.to(dotRef.current, {
        scale: 1,
        opacity: isActive ? 1 : 0.4,
        duration: 0.2,
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
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      className="w-full flex items-center gap-3.5 px-2 py-2.5 bg-transparent select-none cursor-pointer drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]"
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
        className="text-sm tracking-wide flex-1 text-left font-semibold menu-cinematic-text"
        style={{
          color: isActive ? '#ffffff' : 'rgba(255,255,255,0.82)',
          fontWeight: isActive ? 800 : 600,
        }}
      >
        {item.label}
      </span>
      <span
        ref={dotRef}
        className="w-1.5 h-1.5 rounded-full"
        style={{
          backgroundImage: `linear-gradient(135deg, #fff, ${accentColor})`,
          opacity: isActive ? 1 : 0.35,
        }}
      />
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
  { id: 'biacompare', label: 'BIA Compare', icon: Sparkles },
  { id: 'conversation', label: 'Brazilian Conversation', icon: Mic },
  { id: 'tradutor', label: 'Brazilian Tradutor', icon: Languages },
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
  const [appConfig, setAppConfig] = useState<GlobalAppConfig>({
    studentAppOrder: ['home', 'brazilianfriends', 'stories', 'practice', 'readclub', 'board', 'quiz', 'biacompare', 'conversation', 'tradutor', 'youtube'],
    adminAppOrder: ['home', 'work', 'brazilianfriends', 'stories', 'practice', 'dashboard', 'admin_settings', 'readclub', 'board', 'streamstudio', 'classroom', 'meet', 'quiz', 'biacompare', 'conversation', 'tradutor', 'settings'],
    studentGlobalEnabled: {
      brazilianfriends: true,
      stories: true,
      practice: true,
      readclub: true,
      board: true,
      quiz: true,
      biacompare: true,
      conversation: true,
      tradutor: true,
      youtube: true
    }
  });

  // Load custom app order and maintenance states from storage
  useEffect(() => {
    const loadConfig = () => {
      const savedConfig = localStorage.getItem('bia_global_app_config');
      if (savedConfig) {
        try {
          const parsed = JSON.parse(savedConfig) as GlobalAppConfig;
          const studentAppOrder = parsed.studentAppOrder.includes('brazilianfriends')
            ? parsed.studentAppOrder
            : ['brazilianfriends', ...parsed.studentAppOrder];
          const adminAppOrder = parsed.adminAppOrder.includes('brazilianfriends')
            ? parsed.adminAppOrder
            : ['brazilianfriends', ...parsed.adminAppOrder];
          setAppConfig({
            ...parsed,
            studentAppOrder,
            adminAppOrder,
            studentGlobalEnabled: {
              brazilianfriends: true,
              ...parsed.studentGlobalEnabled
            }
          });
        } catch (e) {}
      }
    };
    loadConfig();

    const handleConfigChange = () => loadConfig();
    window.addEventListener('bia_app_config_changed', handleConfigChange);
    return () => window.removeEventListener('bia_app_config_changed', handleConfigChange);
  }, []);

  // STRICT RBAC MENU DEFINITION
  const isActualAdmin = currentUser?.role === 'admin';
  const isAdmin = isActualAdmin && !isStudentPreviewMode;
  const perms = currentUser?.permissions || {
    readclub: true,
    board: true,
    quiz: true,
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
      const isPermittedForUser = perms[item.permKey] !== false;
      return isGloballyActive && isPermittedForUser;
    });

  // Build Ordered Admin Items
  const adminItems = appConfig.adminAppOrder
    .map((appId) => ALL_ADMIN_ITEMS.find((item) => item.id === appId))
    .filter((item): item is typeof ALL_ADMIN_ITEMS[number] => Boolean(item));

  // Strictly filter menu items based on active role & student preview simulation
  const menuItems = isAdmin ? adminItems : studentItems;

  const currentItem = menuItems.find((m) => m.id === currentApp) || { label: 'Brazilian in Action' };

  // If user is not authenticated, do not show top navigation bar or menu
  if (!currentUser) {
    return null;
  }

  const handleNavigate = (id: string) => {
    onNavigate(id);
    setIsOpen(false);
  };

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
      <div className="fixed top-3 left-0 right-0 z-[3200] px-3 sm:px-5 flex items-center justify-between select-none pointer-events-none">
        {/* Left Floating Island: Hamburger & Brand Logo */}
        <div className="flex items-center gap-2 shrink-0 pointer-events-auto">
          <button
            id="hamburger-btn"
            onClick={() => {
              playMenuSelectSound(0.18);
              setIsOpen(!isOpen);
            }}
            className="p-2 sm:p-2.5 bg-transparent border-0 hover:scale-110 transition-transform cursor-pointer drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] active:scale-95"
            style={{ color: isOpen ? accentColor : '#ffffff' }}
            title="Abrir Menu de Navegação"
          >
            {isOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {/* Automatic Brand Logo */}
          <div
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 cursor-pointer hover:scale-[1.02] transition-transform bg-transparent px-1 py-1 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]"
            title="Brazilian in Action"
          >
            <BrazilianLogo size="sm" />
          </div>
        </div>

        {/* Center Floating Island: Current Module Indicator Badge (Clean without Admin badge) */}
        <div className="hidden md:flex items-center gap-2 px-1 py-1 bg-transparent font-mono text-xs pointer-events-auto drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundImage: `linear-gradient(135deg, #34d399, ${accentColor})` }}
          />
          <span className="font-extrabold uppercase tracking-wider menu-cinematic-text" style={{ color: '#fff' }}>
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
              className={`flex items-center justify-center p-2 bg-transparent border-0 transition-all cursor-pointer group active:scale-95 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] ${
                isStudentPreviewMode ? 'text-white' : 'text-white/80 hover:text-white'
              }`}
              title={isStudentPreviewMode ? "Sair da Visão de Aluno e retornar ao Modo CEO" : "Visualizar como Aluno (Simulação)"}
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
                className={`flex items-center gap-1.5 p-2 bg-transparent border-0 text-xs font-extrabold transition-all cursor-pointer group active:scale-95 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] ${
                isFloatingCamActive ? 'text-white' : 'text-white/80 hover:text-white'
              }`}
              title="Ativar / Ocultar Câmera Bolinha (B Cam Flutuante do CEO)"
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
                  className="p-1 bg-transparent text-white/70 hover:text-red-400 transition-all cursor-pointer ml-0.5"
                  title="Sair da Conta"
                >
                  <LogOut size={14} />
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[3300] bg-transparent"
            />

            {/* Sidebar Menu Panel */}
            <motion.nav
              variants={navContainerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed top-0 left-0 bottom-0 w-72 z-[3400] bg-black/72 backdrop-blur-md border-r border-white/10 p-4 pt-18 flex flex-col justify-between select-none shadow-[30px_0_90px_rgba(0,0,0,0.55)]"
            >
              <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar pr-1">
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
              </div>

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
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
