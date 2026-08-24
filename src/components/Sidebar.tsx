import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'motion/react';
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

const ALL_ADMIN_ITEMS = [
  { id: 'home', label: 'Home', icon: Home },
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
    adminAppOrder: ['home', 'brazilianfriends', 'stories', 'practice', 'dashboard', 'admin_settings', 'readclub', 'board', 'streamstudio', 'classroom', 'meet', 'quiz', 'biacompare', 'conversation', 'tradutor', 'settings'],
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
        stiffness: 260,
        staggerChildren: 0.035,
        delayChildren: 0.05,
      },
    },
    exit: {
      x: '-100%',
      opacity: 0,
      transition: {
        duration: 0.22,
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
      {/* Invisible Hover Zone on the left to show the hamburger easily */}
      <div 
        className="fixed top-0 left-0 w-6 h-full z-[3000]"
        onMouseEnter={() => setIsOpen(true)}
      />

      {/* FLOATING TOP NAVIGATION ISLANDS (No full-width dark background strip) */}
      <div className="fixed top-3 left-0 right-0 z-[3200] px-3 sm:px-5 flex items-center justify-between select-none pointer-events-none">
        {/* Left Floating Island: Hamburger & Brand Logo */}
        <div className="flex items-center gap-2 shrink-0 pointer-events-auto">
          <button
            id="hamburger-btn"
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 sm:p-2.5 rounded-2xl bg-neutral-900/80 hover:bg-neutral-800 border border-white/15 hover:border-white/30 text-white/90 hover:text-white transition-all cursor-pointer backdrop-blur-xl shadow-2xl active:scale-95"
            style={{ color: isOpen ? accentColor : undefined }}
            title="Abrir Menu de Navegação"
          >
            {isOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {/* Automatic Brand Logo */}
          <div
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 cursor-pointer hover:scale-[1.02] transition-transform bg-neutral-900/80 hover:bg-neutral-800 border border-white/15 px-3 py-1.5 rounded-2xl backdrop-blur-xl shadow-2xl"
            title="Brazilian in Action"
          >
            <BrazilianLogo size="sm" />
          </div>
        </div>

        {/* Center Floating Island: Current Module Indicator Badge (Clean without Admin badge) */}
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-neutral-900/80 border border-white/15 rounded-full font-mono text-xs text-white/90 backdrop-blur-xl shadow-2xl pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-white/90 uppercase tracking-wider">{currentItem.label}</span>
        </div>

        {/* Right Floating Island: Social Links & User Profile & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 pointer-events-auto">
          {/* Social Channels (YouTube, TikTok, Instagram, WhatsApp) - Soltos & Separados */}
          <div className="hidden xs:flex items-center">
            <SocialLinksBar size="sm" />
          </div>

          {/* Ver como Aluno (Simulação de Visão do Aluno) - EXCLUSIVO PARA O CEO - Apenas Ícone */}
          {isActualAdmin && onToggleStudentPreview && (
            <button
              type="button"
              onClick={onToggleStudentPreview}
              className={`flex items-center justify-center p-2.5 rounded-2xl backdrop-blur-xl shadow-2xl transition-all cursor-pointer group active:scale-95 ${
                isStudentPreviewMode
                  ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                  : 'bg-neutral-900/80 hover:bg-neutral-800 border border-amber-500/50 hover:border-amber-400 text-amber-300 hover:text-white shadow-[0_0_12px_rgba(245,158,11,0.2)]'
              }`}
              title={isStudentPreviewMode ? "Sair da Visão de Aluno e retornar ao Modo CEO" : "Visualizar como Aluno (Simulação)"}
            >
              {isStudentPreviewMode ? (
                <EyeOff size={16} />
              ) : (
                <Eye size={16} className="text-amber-400 group-hover:scale-110 transition-transform" />
              )}
            </button>
          )}

          {/* B Cam (Camera Bolinha Flutuante) Button - STRICTLY FOR ADMIN/CEO ONLY (Hidden in Student Preview) */}
          {isActualAdmin && !isStudentPreviewMode && onToggleFloatingCam && (
            <button
              type="button"
              onClick={onToggleFloatingCam}
              className={`flex items-center gap-1.5 p-2 px-3 rounded-2xl backdrop-blur-xl shadow-2xl text-xs font-extrabold transition-all cursor-pointer group active:scale-95 ${
                isFloatingCamActive
                  ? 'bg-rose-950/85 hover:bg-rose-900 border border-rose-500/60 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                  : 'bg-neutral-900/80 hover:bg-neutral-800 border border-purple-500/50 hover:border-purple-400 text-purple-300 hover:text-white shadow-[0_0_12px_rgba(168,85,247,0.2)]'
              }`}
              title="Ativar / Ocultar Câmera Bolinha (B Cam Flutuante do CEO)"
            >
              <div className="relative flex items-center justify-center">
                <Video size={14} className="text-purple-400 group-hover:scale-110 transition-transform" />
                {isFloatingCamActive && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                )}
              </div>
              <span className="hidden sm:inline">B Cam</span>
            </button>
          )}

          {currentUser && (
            <div className="flex items-center gap-2 bg-neutral-900/80 border border-white/15 p-1.5 px-3 rounded-2xl backdrop-blur-xl shadow-2xl">
              <div className="w-6 h-6 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[10px] font-bold text-amber-300 shrink-0">
                {currentUser.full_name?.charAt(0).toUpperCase() || currentUser.email.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-white truncate max-w-[90px] xs:max-w-[120px] sm:max-w-[160px]">
                {currentUser.full_name || currentUser.email.split('@')[0]}
              </span>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1 hover:bg-white/10 rounded-xl text-white/50 hover:text-red-400 transition-all cursor-pointer ml-0.5"
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
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[3300] bg-black/60 backdrop-blur-sm"
            />

            {/* Sidebar Menu Panel */}
            <motion.nav
              variants={navContainerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed top-0 left-0 bottom-0 w-72 z-[3400] glass-modal border-r border-white/15 p-4 pt-18 flex flex-col justify-between select-none shadow-2xl"
            >
              <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar pr-1">
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/40 font-mono">
                  {isAdmin ? 'Painel do CEO André Augusto' : 'Módulos Práticos do Aluno'}
                </div>

                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentApp === item.id;

                  return (
                    <motion.button
                      key={item.id}
                      variants={itemVariants}
                      onClick={() => handleNavigate(item.id)}
                      className={`flex items-center gap-3 w-full px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all text-left cursor-pointer group ${
                        isActive
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/10'
                          : 'text-white/70 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <Icon
                        size={17}
                        className={`transition-transform duration-200 group-hover:scale-110 ${
                          isActive ? 'text-amber-400' : 'text-white/50 group-hover:text-white'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Drawer Footer info & Social Media */}
              <div className="pt-4 border-t border-white/10 text-center flex flex-col items-center gap-2.5 text-[11px] text-white/40">
                <SocialLinksBar size="sm" />
                <div className="flex flex-col items-center gap-0.5">
                  <span className="font-semibold text-white/60">Brazilian in Action Platform</span>
                  <span>{isAdmin ? 'Modo CEO & Gestão Total' : 'Ambiente do Aluno'}</span>
                </div>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
