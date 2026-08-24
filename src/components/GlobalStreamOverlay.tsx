import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLayoutPosition } from '../lib/LayoutPositionContext';
import {
  Radio,
  QrCode,
  Type,
  Clock,
  Sparkles,
  EyeOff,
  ChevronUp,
  ChevronDown,
  X,
  Volume2,
  SlidersHorizontal,
  Minimize2,
  Maximize2,
  Layout,
  BookOpen,
  Presentation,
  Check,
  Camera
} from 'lucide-react';

interface GlobalStreamOverlayProps {
  // Shared state for stream overlay elements
  streamActive: boolean;
  setStreamActive: (v: boolean) => void;

  isFloatingCamActive?: boolean;
  setIsFloatingCamActive?: (v: boolean) => void;

  showQr: boolean;
  setShowQr: (v: boolean) => void;
  qrUrl: string;
  setQrUrl: (v: string) => void;
  qrTitle: string;
  setQrTitle: (v: string) => void;

  showLowerThird: boolean;
  setShowLowerThird: (v: boolean) => void;
  teacherName: string;
  setTeacherName: (v: string) => void;
  lessonSubject: string;
  setLessonSubject: (v: string) => void;

  showTicker: boolean;
  setShowTicker: (v: boolean) => void;
  tickerText: string;
  setTickerText: (v: string) => void;

  showBanner: boolean;
  setShowBanner: (v: boolean) => void;
  bannerText: string;
  setBannerText: (v: string) => void;

  showTimer: boolean;
  setShowTimer: (v: boolean) => void;
  timerSeconds: number;
  setTimerSeconds: React.Dispatch<React.SetStateAction<number>>;
  isTimerRunning: boolean;
  setIsTimerRunning: (v: boolean) => void;

  currentApp: string;
  onNavigate: (app: string) => void;
  compactMode?: boolean;
}

export const GlobalStreamOverlay: React.FC<GlobalStreamOverlayProps> = ({
  streamActive,
  setStreamActive,
  isFloatingCamActive = false,
  setIsFloatingCamActive,
  showQr,
  setShowQr,
  qrUrl,
  setQrUrl,
  qrTitle,
  setQrTitle,
  showLowerThird,
  setShowLowerThird,
  teacherName,
  setTeacherName,
  lessonSubject,
  setLessonSubject,
  showTicker,
  setShowTicker,
  tickerText,
  setTickerText,
  showBanner,
  setShowBanner,
  bannerText,
  setBannerText,
  showTimer,
  setShowTimer,
  timerSeconds,
  setTimerSeconds,
  isTimerRunning,
  setIsTimerRunning,
  currentApp,
  onNavigate,
  compactMode = false,
}) => {
  const { isBLiveDockOpen: isDockOpen, setIsBLiveDockOpen: setIsDockOpen, landmarkRightOffset } = useLayoutPosition();
  const [activeTab, setActiveTab] = useState<'presets' | 'qr' | 'lower' | 'ticker' | 'timer'>('presets');
  const [showBroadcastBadge, setShowBroadcastBadge] = useState(false); // Discreet by default

  // Format Timer
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Sound FX player
  const playSoundEffect = (type: 'correct' | 'chime') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'correct') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === 'chime') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch (e) {
      console.warn('Audio FX error', e);
    }
  };

  // --- PRESETS (PREVENT VISUAL POLLUTION) ---
  const applyPresetClean = () => {
    setShowQr(false);
    setShowLowerThird(false);
    setShowTicker(false);
    setShowBanner(false);
    setShowTimer(false);
  };

  const applyPresetQrOnly = () => {
    setShowQr(true);
    setShowLowerThird(false);
    setShowTicker(false);
    setShowBanner(false);
    setShowTimer(false);
  };

  const applyPresetReadClub = () => {
    setShowQr(true);
    setShowLowerThird(true);
    setShowTicker(false);
    setShowBanner(false);
    setShowTimer(false);
  };

  const applyPresetLessonHighlight = () => {
    setShowQr(true);
    setShowLowerThird(false);
    setShowTicker(false);
    setShowBanner(true);
    setShowTimer(false);
  };

  // QR Code Image Generator URL
  const getQrImageUrl = (dataUrl: string) => {
    const encoded = encodeURIComponent(dataUrl || 'https://www.youtube.com/@brazilianinaction');
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}&color=ffffff&bgcolor=0a0a0a&margin=2`;
  };

  // Map current app to user-friendly label
  const appLabels: Record<string, string> = {
    home: 'Início',
    agenda: 'Agenda',
    dashboard: 'Dashboard',
    readclub: 'Read Club',
    streamstudio: 'Brazilian LIVE',
    youtube: 'Brazilian Music',
    classroom: 'Classroom',
    meet: 'Google Meet',
    slides: 'Lousa/Slides',
    materials: 'Materiais',
    conversation: 'BIA Conversa',
    biacompare: 'BIA Compare',
    board: 'Brazilian Board',
    settings: 'Ajustes',
  };

  const currentAppLabel = appLabels[currentApp] || 'App';

  return (
    <>
      {/* ========================================================= */}
      {/* 1. OVERLAY ELEMENTS ON SCREEN (VISIBLE WHEN streamActive) */}
      {/* ========================================================= */}
      {streamActive && (
        <div className="fixed inset-0 pointer-events-none z-[3100] overflow-hidden select-none">
          {/* ULTRA DISCREET TOP BADGE (OPTIONAL / TOGGLEABLE) */}
          {showBroadcastBadge && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="pointer-events-auto absolute top-3 right-16 z-30 flex items-center gap-1.5 bg-neutral-950/80 border border-white/10 px-2 py-0.5 rounded-full backdrop-blur-md shadow-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span className="text-[9px] font-mono font-medium text-neutral-300 uppercase tracking-wider">
                B LIVE • {currentAppLabel}
              </span>
            </motion.div>
          )}

          {/* TOP RIGHT ZONE: QR CODE (SAFE MARGIN, NEVER CUT OFF AT TOP) */}
          {showQr && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="pointer-events-auto absolute top-16 right-4 md:right-6 z-30 bg-neutral-950/90 border border-amber-500/40 p-2 rounded-2xl shadow-xl backdrop-blur-md flex flex-col items-center gap-1 max-w-[120px] md:max-w-[130px] shrink-0"
            >
              <img
                src={getQrImageUrl(qrUrl)}
                alt="QR Code"
                className="w-18 h-18 md:w-22 md:h-22 rounded-lg border border-white/10 object-contain bg-black"
              />
              {qrTitle && (
                <span className="text-[9px] font-bold text-white text-center leading-tight line-clamp-1 px-1">
                  {qrTitle}
                </span>
              )}
            </motion.div>
          )}

          {/* TOP LEFT ZONE: HIGHLIGHT BANNER (CLEAN & NON-OVERLAPPING) */}
          {showBanner && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="pointer-events-auto absolute top-16 left-4 md:left-20 z-30 bg-neutral-950/90 border-l-3 border-amber-500 border-y border-r border-white/10 px-3 py-1.5 rounded-r-xl max-w-xs shadow-lg backdrop-blur-md"
            >
              <div className="flex items-center gap-1 text-[9px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                <Sparkles size={10} /> Destaque
              </div>
              <p className="text-[11px] font-medium text-white/90 leading-tight mt-0.5">
                {bannerText}
              </p>
            </motion.div>
          )}

          {/* TOP CENTER ZONE: TIMER OVERLAY */}
          {showTimer && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="pointer-events-auto absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-black/85 border border-amber-500/40 px-3 py-1 rounded-full backdrop-blur-md shadow-lg flex items-center gap-1.5 text-amber-400 font-mono font-bold text-xs"
            >
              <Clock size={13} className="text-amber-400" />
              <span>{formatTime(timerSeconds)}</span>
            </motion.div>
          )}

          {/* BOTTOM LEFT ZONE: LOWER THIRD (POSITIONS ABOVE TICKER IF BOTH ACTIVE) */}
          {showLowerThird && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className={`pointer-events-auto absolute left-4 md:left-20 z-30 bg-neutral-950/90 border border-white/15 p-2 rounded-xl backdrop-blur-md shadow-lg flex items-center gap-2 max-w-xs ${
                showTicker ? 'bottom-10' : 'bottom-4'
              }`}
            >
              <div className="px-1.5 py-0.5 bg-amber-500 text-neutral-950 font-black rounded text-[9px]">
                BIA
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-white tracking-wide truncate">
                  {teacherName}
                </h4>
                <p className="text-[9px] text-amber-400/90 font-mono truncate">
                  {lessonSubject}
                </p>
              </div>
            </motion.div>
          )}

          {/* BOTTOM TICKER MARQUEE (DYNAMIC CONFLICT-FREE REPOSITIONING) */}
          {showTicker && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, right: landmarkRightOffset + 16 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              style={{ position: 'absolute', bottom: '8px', left: '16px' }}
              className="pointer-events-auto z-20 bg-neutral-950/90 border border-red-500/30 rounded-lg px-2.5 py-1 overflow-hidden flex items-center gap-2 backdrop-blur-md"
            >
              <span className="px-1.5 py-0.2 rounded bg-red-600 text-white font-mono text-[8px] font-bold uppercase tracking-wider shrink-0">
                AO VIVO
              </span>
              <div className="whitespace-nowrap overflow-hidden text-[11px] font-mono text-white/90 animate-marquee">
                {tickerText}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. FLOATING TEACHER CONTROL DOCK (ONLY SEEN BY TEACHER)   */}
      {/* ========================================================= */}
      <div className="fixed bottom-3 right-3 z-[4000] flex flex-col items-end gap-2 select-none pointer-events-auto">
        {/* Expanded Controls Panel */}
        <AnimatePresence>
          {isDockOpen && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-neutral-950/95 border border-white/20 rounded-2xl p-3.5 shadow-2xl backdrop-blur-2xl w-72 md:w-80 flex flex-col gap-2.5 text-white max-h-[80vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 bg-amber-500 rounded text-neutral-950 font-bold">
                    <SlidersHorizontal size={12} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white uppercase tracking-wider block leading-none">
                        Painel do Professor
                      </span>
                      {compactMode && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[8px] font-mono font-bold uppercase">
                          Compacto
                        </span>
                      )}
                    </div>
                    {!compactMode && (
                      <span className="text-[9px] text-amber-400/80 font-mono">
                        (Controles Privados B LIVE)
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDockOpen(false)}
                  className="text-white/40 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-white/10"
                  title="Minimizar Painel do Professor"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Preset Cards (Instant Anti-Pollution) */}
              <div className="flex flex-col gap-1 bg-white/5 border border-white/10 p-2 rounded-xl">
                <span className="text-[10px] font-mono text-white/60 font-semibold">
                  Modos Rápidos Sem Poluição:
                </span>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={applyPresetClean}
                    className="py-1 px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 font-medium text-white/80 flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <EyeOff size={11} className="text-amber-400" />
                    <span>100% Limpo</span>
                  </button>

                  <button
                    type="button"
                    onClick={applyPresetQrOnly}
                    className="py-1 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 font-medium text-amber-300 flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <QrCode size={11} />
                    <span>Apenas QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={applyPresetReadClub}
                    className="py-1 px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 font-medium text-white/80 flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <BookOpen size={11} className="text-blue-400" />
                    <span>Modo Leitura</span>
                  </button>

                  <button
                    type="button"
                    onClick={applyPresetLessonHighlight}
                    className="py-1 px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 font-medium text-white/80 flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Sparkles size={11} className="text-amber-400" />
                    <span>Destaque</span>
                  </button>
                </div>
              </div>

              {/* Master Stream Toggle */}
              <div className="flex items-center justify-between bg-white/5 border border-white/10 p-2 rounded-xl text-xs">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${streamActive ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'}`} />
                  <span className="font-bold text-white/90 text-[11px]">
                    {streamActive ? 'Modo B LIVE Ativo' : 'Modo B LIVE Desativado'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !streamActive;
                    setStreamActive(next);
                    if (next) {
                      // When turning on, default to QR only to keep screen clean!
                      applyPresetQrOnly();
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    streamActive
                      ? 'bg-red-600 hover:bg-red-500 text-white shadow-md'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {streamActive ? 'Desativar' : 'Ligar Transmissão'}
                </button>
              </div>

              {/* Customization Tabs */}
              <div className="flex items-center gap-1 border-b border-white/10 pb-1">
                {[
                  { id: 'qr', label: 'QR', icon: QrCode },
                  { id: 'lower', label: 'Tarja', icon: Type },
                  { id: 'ticker', label: 'Aviso', icon: Sparkles },
                  { id: 'timer', label: 'Timer', icon: Clock },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id as any)}
                    className={`flex-1 py-1 px-1 rounded-lg text-[9px] font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      activeTab === t.id
                        ? 'bg-amber-500 text-neutral-950'
                        : 'bg-white/5 text-white/60 hover:text-white'
                    }`}
                  >
                    <t.icon size={10} />
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>

              {/* TAB CONTENT: QR CODE */}
              {activeTab === 'qr' && (
                <div className="flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/70">Exibir QR Code:</span>
                    <button
                      type="button"
                      onClick={() => setShowQr(!showQr)}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        showQr ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/10 text-white/40'
                      }`}
                    >
                      {showQr ? 'Exibindo' : 'Oculto'}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={qrUrl}
                    onChange={(e) => setQrUrl(e.target.value)}
                    placeholder="Link do QR Code..."
                    className="w-full px-2 py-1 rounded-lg bg-white/5 border border-white/15 text-[11px] text-white font-mono"
                  />
                  <input
                    type="text"
                    value={qrTitle}
                    onChange={(e) => setQrTitle(e.target.value)}
                    placeholder="Título do QR Code..."
                    className="w-full px-2 py-1 rounded-lg bg-white/5 border border-white/15 text-[11px] text-white"
                  />
                </div>
              )}

              {/* TAB CONTENT: LOWER THIRDS */}
              {activeTab === 'lower' && (
                <div className="flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/70">Exibir Nome & Matéria:</span>
                    <button
                      type="button"
                      onClick={() => setShowLowerThird(!showLowerThird)}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        showLowerThird ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-white/10 text-white/40'
                      }`}
                    >
                      {showLowerThird ? 'Exibindo' : 'Oculto'}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="Nome do Professor"
                    className="w-full px-2 py-1 rounded-lg bg-white/5 border border-white/15 text-[11px] text-white"
                  />
                  <input
                    type="text"
                    value={lessonSubject}
                    onChange={(e) => setLessonSubject(e.target.value)}
                    placeholder="Tema da Aula"
                    className="w-full px-2 py-1 rounded-lg bg-white/5 border border-white/15 text-[11px] text-white"
                  />
                </div>
              )}

              {/* TAB CONTENT: TICKER */}
              {activeTab === 'ticker' && (
                <div className="flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/70">Letreiro Passante:</span>
                    <button
                      type="button"
                      onClick={() => setShowTicker(!showTicker)}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        showTicker ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-white/10 text-white/40'
                      }`}
                    >
                      {showTicker ? 'Exibindo' : 'Oculto'}
                    </button>
                  </div>
                  <textarea
                    value={tickerText}
                    onChange={(e) => setTickerText(e.target.value)}
                    rows={2}
                    className="w-full px-2 py-1 rounded-lg bg-white/5 border border-white/15 text-[11px] text-white font-mono"
                  />
                </div>
              )}

              {/* TAB CONTENT: TIMER */}
              {activeTab === 'timer' && (
                <div className="flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/70">Cronômetro de Aula:</span>
                    <button
                      type="button"
                      onClick={() => setShowTimer(!showTimer)}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        showTimer ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/10 text-white/40'
                      }`}
                    >
                      {showTimer ? 'Exibindo' : 'Oculto'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between bg-black/60 p-1.5 rounded-lg border border-white/10">
                    <span className="text-base font-mono font-bold text-amber-400">
                      {formatTime(timerSeconds)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setIsTimerRunning(!isTimerRunning)}
                        className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold cursor-pointer"
                      >
                        {isTimerRunning ? 'Pausar' : 'Iniciar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsTimerRunning(false);
                          setTimerSeconds(300);
                        }}
                        className="px-1.5 py-0.5 rounded bg-white/10 text-white text-[10px] cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Sound Effects & Discrete Tag Toggle */}
              <div className="flex items-center justify-between border-t border-white/10 pt-1.5 text-[9px] text-white/50">
                <button
                  type="button"
                  onClick={() => setShowBroadcastBadge(!showBroadcastBadge)}
                  className="hover:text-white cursor-pointer underline"
                >
                  {showBroadcastBadge ? 'Ocultar Tag B LIVE' : 'Exibir Tag B LIVE'}
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => playSoundEffect('correct')}
                    className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-pointer"
                  >
                    Som Acerto
                  </button>
                  <button
                    type="button"
                    onClick={() => playSoundEffect('chime')}
                    className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 cursor-pointer"
                  >
                    Som Sinal
                  </button>
                </div>
              </div>

              {/* Camera Bubble & Studio Hub Links */}
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsFloatingCamActive && setIsFloatingCamActive(!isFloatingCamActive)}
                  className={`py-1.5 px-2 rounded-lg border text-[10px] font-black uppercase transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    isFloatingCamActive
                      ? 'bg-amber-400 text-neutral-950 border-amber-300 font-extrabold shadow'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-amber-300 border border-amber-500/30'
                  }`}
                  title="Ativar/Desativar Câmera Circular Flutuante que te acompanha em qualquer tela do App"
                >
                  <Camera size={12} />
                  <span>{isFloatingCamActive ? 'Câmera Bolinha ON' : 'Câmera Bolinha'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onNavigate('streamstudio');
                    setIsDockOpen(false);
                  }}
                  className="py-1.5 px-2 rounded-lg bg-gradient-to-r from-red-600/40 to-amber-600/40 hover:from-red-600/60 hover:to-amber-600/60 border border-amber-500/40 text-[10px] font-black text-amber-300 transition-all cursor-pointer text-center flex items-center justify-center gap-1"
                >
                  <Radio size={12} className="animate-pulse text-red-400" />
                  <span>Estúdio ↗</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trigger Floating Button (Dynamically adapts to Compact Mode) */}
        <motion.button
          type="button"
          layout
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsDockOpen(!isDockOpen)}
          className={`rounded-full border shadow-2xl backdrop-blur-md flex items-center cursor-pointer transition-colors ${
            compactMode ? 'p-2.5 gap-1' : 'p-2.5 gap-1.5'
          } ${
            streamActive
              ? 'bg-neutral-950/90 text-amber-400 border-amber-500/50 hover:border-amber-400'
              : 'bg-neutral-950/85 text-white/60 border-white/15 hover:border-white/30'
          }`}
          title={compactMode ? 'Painel B LIVE (Modo Compacto)' : 'Painel de Controle do Professor (Brazilian LIVE)'}
        >
          <Radio size={15} className={streamActive ? 'text-amber-400 animate-pulse' : 'text-amber-400/70'} />
          <AnimatePresence mode="wait">
            {!compactMode && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="text-[10px] font-mono font-bold hidden sm:inline text-white/90 whitespace-nowrap overflow-hidden"
              >
                B LIVE
              </motion.span>
            )}
          </AnimatePresence>
          {isDockOpen ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
        </motion.button>
      </div>
    </>
  );
};
