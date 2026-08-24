import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Tv,
  QrCode,
  Radio,
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Sparkles,
  Volume2,
  Eye,
  EyeOff,
  Layers,
  Clock,
  MessageSquare,
  Flame,
  Globe,
  Youtube,
  Share2,
  Settings,
  Type,
  Layout,
  ExternalLink,
  Award,
  Bell,
  BookOpen,
  Monitor,
  Video,
  Camera,
  Laptop,
  HelpCircle,
  Info,
  SlidersHorizontal,
  LogOut,
  Zap,
  Megaphone,
  Film,
  Wind,
  Grid,
  Crosshair,
  AppWindow,
  Mic,
  Headphones,
  PenTool,
  Coffee,
  Edit2,
  Trash2,
  Plus,
  Upload,
  FolderPlus,
  Sliders,
  Newspaper,
  Move,
  Save,
  Lock,
  Unlock,
  CheckCircle2,
  Key,
  Scissors,
  Palette,
  ChevronDown,
  ChevronUp,
  Crop,
  Smartphone,
  Languages
} from 'lucide-react';
import { BrazilianLogo } from './BrazilianLogo';
import { ReadClub } from './ReadClub';
import { BrazilianConversation } from './BrazilianConversation';
import { BiaCompare } from './BiaCompare';
import { BrazilianBoard } from './BrazilianBoard';
import { BrazilianTradutor } from './BrazilianTradutor';
import { BrazilianQuiz } from './BrazilianQuiz';
import { YouTubeHub } from './YouTubeHub';
import { INITIAL_READ_LIBRARY } from '../data';
import { StoryItem, ReadSession, GlossaryEntry } from '../types';

interface QrPreset {
  id: string;
  title: string;
  url: string;
  iconType?: 'youtube' | 'instagram' | 'tiktok' | 'ebook' | 'whatsapp' | 'aula' | 'custom';
}

const DEFAULT_QR_PRESETS: QrPreset[] = [
  { id: 'yt', title: ' Canal YouTube', url: 'https://www.youtube.com/@brazilianinaction', iconType: 'youtube' },
  { id: 'insta', title: ' Instagram @brazilianinaction', url: 'https://www.instagram.com/brazilianinaction', iconType: 'instagram' },
  { id: 'tiktok', title: ' TikTok @brazilianinaction', url: 'https://www.tiktok.com/@brazilianinaction', iconType: 'tiktok' },
  { id: 'ebook', title: ' Baixar E-Book e Material', url: 'https://brazilianinaction.com/ebook', iconType: 'ebook' },
  { id: 'wa', title: ' Comunidade VIP B.I.A.', url: 'https://brazilianinaction.com/comunidade', iconType: 'aula' },
  { id: 'aula', title: ' Agendar Aula Experimental', url: 'https://brazilianinaction.com/aula', iconType: 'aula' },
];

interface TickerPreset {
  id: string;
  label: string;
  text: string;
}

const DEFAULT_TICKER_PRESETS: TickerPreset[] = [
  {
    id: 'tp_1',
    label: ' Boas-Vindas',
    text: ' BEM-VINDOS AO BRAZILIAN IN ACTION • DEIXE SUA PERGUNTA NO CHAT • AULA AO VIVO AO REDOR DO MUNDO ',
  },
  {
    id: 'tp_2',
    label: ' Dica Pronúncia',
    text: ' DICA B.I.A.: No Brasil, "Pois não" significa "Como posso ajudar?". Pratique no chat ao vivo!',
  },
  {
    id: 'tp_3',
    label: ' E-Book Material',
    text: ' MATERIAL DIDÁTICO: Baixe a apostila e e-book oficial de conversação apontando para o QR Code!',
  },
  {
    id: 'tp_4',
    label: ' Notícia / Turma',
    text: ' URGENTE: Matrículas Abertas para Novas Turmas de Português do Brasil! Inscreva-se pelo QR Code.',
  },
  {
    id: 'tp_5',
    label: ' Siga Redes',
    text: ' SIGA @brazilianinaction NO INSTAGRAM E TIKTOK PARA DICAS DIÁRIAS DE PORTUGUÊS!',
  },
];

const PopoutVideoFeed = ({
  stream,
  style,
  visible
}: {
  stream: MediaStream | null;
  style: React.CSSProperties;
  visible: boolean;
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream, visible]);

  if (!visible || !stream) return null;

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={style}
      className="absolute inset-0 w-full h-full object-contain pointer-events-none z-0"
    />
  );
};

const PopoutPipCamera = ({
  stream,
  posClass,
  sizeClass,
  shapeClass
}: {
  stream: MediaStream | null;
  posClass: string;
  sizeClass: string;
  shapeClass: string;
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  if (!stream) return null;

  return (
    <div className={`absolute z-30 transition-all duration-300 ${posClass}`}>
      <div className={`${sizeClass} ${shapeClass}`}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
};

interface StreamStudioProps {
  accentColor?: string;
  streamActive?: boolean;
  setStreamActive?: (v: boolean) => void;
  isFloatingCamActive?: boolean;
  setIsFloatingCamActive?: (v: boolean) => void;
  showQr?: boolean;
  setShowQr?: (v: boolean) => void;
  qrUrl?: string;
  setQrUrl?: (v: string) => void;
  qrTitle?: string;
  setQrTitle?: (v: string) => void;
  showLowerThird?: boolean;
  setShowLowerThird?: (v: boolean) => void;
  teacherName?: string;
  setTeacherName?: (v: string) => void;
  lessonSubject?: string;
  setLessonSubject?: (v: string) => void;
  showTicker?: boolean;
  setShowTicker?: (v: boolean) => void;
  tickerText?: string;
  setTickerText?: (v: string) => void;
  showBanner?: boolean;
  setShowBanner?: (v: boolean) => void;
  bannerText?: string;
  setBannerText?: (v: string) => void;

  // Real ReadClub ecosystem persistence props
  library?: StoryItem[];
  onAddStory?: (story: Omit<StoryItem, 'id'>) => void;
  onUpdateStory?: (id: number, updated: Partial<StoryItem>) => void;
  onDeleteStory?: (id: number) => void;
  sessions?: ReadSession[];
  onSaveSession?: (session: ReadSession) => void;
  onDeleteSession?: (key: string) => void;
  glossary?: Record<string, GlossaryEntry>;
  onAddGlossary?: (word: string, translation: string, bookId: number | null, bookTitle: string) => void;
  onRemoveGlossary?: (word: string) => void;
  onClearGlossary?: () => void;
  learnedWords?: Record<number, string[]>;
  onToggleLearnedWord?: (bookId: number, word: string) => void;
}

export const StreamStudio: React.FC<StreamStudioProps> = ({
  accentColor = '#3b82f6',
  streamActive: extStreamActive,
  setStreamActive: extSetStreamActive,
  isFloatingCamActive = false,
  setIsFloatingCamActive,
  showQr: extShowQr,
  setShowQr: extSetShowQr,
  qrUrl: extQrUrl,
  setQrUrl: extSetQrUrl,
  qrTitle: extQrTitle,
  setQrTitle: extSetQrTitle,
  showLowerThird: extShowLowerThird,
  setShowLowerThird: extSetShowLowerThird,
  teacherName: extTeacherName,
  setTeacherName: extSetTeacherName,
  lessonSubject: extLessonSubject,
  setLessonSubject: extSetLessonSubject,
  showTicker: extShowTicker,
  setShowTicker: extSetShowTicker,
  tickerText: extTickerText,
  setTickerText: extSetTickerText,
  showBanner: extShowBanner,
  setShowBanner: extSetShowBanner,
  bannerText: extBannerText,
  setBannerText: extSetBannerText,
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
}) => {
  // --- SCENE & VIDEO CAPTURE STATE ---
  const [activeScene, setActiveScene] = useState<'starting' | 'live' | 'break' | 'reading' | 'ending' | 'custom'>('live');
  const [streamSource, setStreamSource] = useState<'scene' | 'screen' | 'webcam' | 'pip' | 'internal_app'>('scene');
  const [internalAppModule, setInternalAppModule] = useState<'readclub' | 'conversation' | 'biacompare' | 'board' | 'tradutor' | 'quiz' | 'youtube'>('readclub');
  const [isVertical916, setIsVertical916] = useState(false);
  const [isScreenCapturing, setIsScreenCapturing] = useState(false);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [showEpisodenGuide, setShowEpisodenGuide] = useState(false);
  const [showFrameGuide, setShowFrameGuide] = useState(false);

  // --- STINGER SCENE TRANSITION & HUD STATE ---
  const [isStingerActive, setIsStingerActive] = useState(false);
  const [activeStingerType, setActiveStingerType] = useState<'wind' | 'promo' | 'conversation' | 'cyber' | 'socials' | 'academy' | 'custom'>('wind');
  const [isHudCollapsed, setIsHudCollapsed] = useState(false);
  const [isStealthPresentation, setIsStealthPresentation] = useState(false);
  const [isFullscreenMeet, setIsFullscreenMeet] = useState(false);

  // --- SAVED QR PRESETS WITH LOCALSTORAGE PERSISTENCE ---
  const [savedQrPresets, setSavedQrPresets] = useState<QrPreset[]>(() => {
    try {
      const stored = localStorage.getItem('bia_saved_qr_presets');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_QR_PRESETS;
  });

  const [editingQrPreset, setEditingQrPreset] = useState<QrPreset | null>(null);

  const handleSaveCurrentQrPreset = () => {
    if (!qrUrl.trim() || !qrTitle.trim()) return;
    const newPreset: QrPreset = {
      id: 'preset_' + Date.now(),
      title: qrTitle,
      url: qrUrl,
      iconType: 'custom',
    };
    const updated = [...savedQrPresets, newPreset];
    setSavedQrPresets(updated);
    try {
      localStorage.setItem('bia_saved_qr_presets', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleSaveEditedQrPreset = () => {
    if (!editingQrPreset || !editingQrPreset.title.trim() || !editingQrPreset.url.trim()) return;
    const updated = savedQrPresets.map((p) => (p.id === editingQrPreset.id ? editingQrPreset : p));
    setSavedQrPresets(updated);
    try {
      localStorage.setItem('bia_saved_qr_presets', JSON.stringify(updated));
    } catch (e) {}
    setEditingQrPreset(null);
  };

  const handleDeleteQrPreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedQrPresets.filter((p) => p.id !== id);
    setSavedQrPresets(updated);
    try {
      localStorage.setItem('bia_saved_qr_presets', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleResetQrPresets = () => {
    setSavedQrPresets(DEFAULT_QR_PRESETS);
    try {
      localStorage.setItem('bia_saved_qr_presets', JSON.stringify(DEFAULT_QR_PRESETS));
    } catch (e) {}
  };

  const handleApplyQrPreset = (preset: QrPreset) => {
    setQrUrl(preset.url);
    setQrTitle(preset.title);
    setShowQr(true);
  };

  // --- SAVED TICKER PRESETS WITH LOCALSTORAGE PERSISTENCE ---
  const [savedTickerPresets, setSavedTickerPresets] = useState<TickerPreset[]>(() => {
    try {
      const stored = localStorage.getItem('bia_saved_ticker_presets');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_TICKER_PRESETS;
  });

  const [editingTickerPreset, setEditingTickerPreset] = useState<TickerPreset | null>(null);

  const handleSaveCurrentTickerPreset = () => {
    if (!tickerText.trim()) return;
    const newPreset: TickerPreset = {
      id: 'tp_' + Date.now(),
      label: tickerText.slice(0, 18) + '...',
      text: tickerText,
    };
    const updated = [...savedTickerPresets, newPreset];
    setSavedTickerPresets(updated);
    try {
      localStorage.setItem('bia_saved_ticker_presets', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleSaveEditedTickerPreset = () => {
    if (!editingTickerPreset || !editingTickerPreset.label.trim() || !editingTickerPreset.text.trim()) return;
    const updated = savedTickerPresets.map((tp) => (tp.id === editingTickerPreset.id ? editingTickerPreset : tp));
    setSavedTickerPresets(updated);
    try {
      localStorage.setItem('bia_saved_ticker_presets', JSON.stringify(updated));
    } catch (e) {}
    setEditingTickerPreset(null);
  };

  const handleDeleteTickerPreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedTickerPresets.filter((tp) => tp.id !== id);
    setSavedTickerPresets(updated);
    try {
      localStorage.setItem('bia_saved_ticker_presets', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleResetTickerPresets = () => {
    setSavedTickerPresets(DEFAULT_TICKER_PRESETS);
    try {
      localStorage.setItem('bia_saved_ticker_presets', JSON.stringify(DEFAULT_TICKER_PRESETS));
    } catch (e) {}
  };

  // --- KEYBOARD SHORTCUTS FOR TEACHER IN LIVE MODE ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Stealth Mode with 'H' or 'h'
      if (isFullscreenMeet && (e.key === 'h' || e.key === 'H')) {
        setIsStealthPresentation((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreenMeet]);

  // --- POPOUT CLEAN STAGE WINDOW FOR STUDENT SCREEN SHARING ---
  const [popoutWindow, setPopoutWindow] = useState<Window | null>(null);

  const handleOpenPopoutStage = () => {
    if (popoutWindow && !popoutWindow.closed) {
      popoutWindow.focus();
      return;
    }
    const pop = window.open('', 'BIA_Clean_Stage', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no,resizable=yes');
    if (pop) {
      pop.document.title = 'Brazilian LIVE - Palco Limpo do Aluno';
      pop.document.body.style.margin = '0';
      pop.document.body.style.padding = '0';
      pop.document.body.style.backgroundColor = '#09090b';
      pop.document.body.style.color = '#ffffff';
      pop.document.body.style.overflow = 'hidden';
      pop.document.body.style.fontFamily = 'system-ui, -apple-system, sans-serif';

      // Clone stylesheets into popout document
      const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
      styles.forEach((style) => {
        try {
          pop.document.head.appendChild(style.cloneNode(true));
        } catch (e) {
          // ignore
        }
      });

      pop.onbeforeunload = () => {
        setPopoutWindow(null);
      };

      setPopoutWindow(pop);
    }
  };

  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [activeControlTab, setActiveControlTab] = useState<'news' | 'qr' | 'camera' | 'rtmp'>('news');
  const [controlHubViewMode, setControlHubViewMode] = useState<'tabs' | 'all'>('tabs');

  // --- RÉGUA DE CORTE (SCREEN CROP) & COR DO FUNDO DO ESTÚDIO ---
  const [cropTop, setCropTop] = useState(0); // 0 to 50%
  const [cropBottom, setCropBottom] = useState(0); // 0 to 50%
  const [cropLeft, setCropLeft] = useState(0); // 0 to 50%
  const [cropRight, setCropRight] = useState(0); // 0 to 50%
  const [cropZoom, setCropZoom] = useState(1.0); // 1.0x to 2.5x
  const [isCropActive, setIsCropActive] = useState(false);
  const [stageBgColor, setStageBgColor] = useState('#000000');

  // --- ACCORDION CONTROL TILE DECK STATE ---
  const [expandedAccordionBlock, setExpandedAccordionBlock] = useState<string | null>(null);

  const getCroppedVideoStyle = (): React.CSSProperties => {
    if (!isCropActive) {
      return {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        transition: 'all 0.2s ease-out',
      };
    }
    return {
      clipPath: `inset(${cropTop}% ${cropRight}% ${cropBottom}% ${cropLeft}%)`,
      transform: `scale(${cropZoom})`,
      transformOrigin: 'center center',
      width: '100%',
      height: '100%',
      objectFit: 'contain',
      transition: 'all 0.15s ease-out',
    };
  };

  // --- DRAGGABLE CROP RULERS ON STAGE ---
  const handleCropMouseDown = (edge: 'top' | 'bottom' | 'left' | 'right', e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!stageRef.current) return;
      const rect = stageRef.current.getBoundingClientRect();
      
      if (edge === 'top') {
        const val = Math.min(45, Math.max(0, Math.round(((moveEvent.clientY - rect.top) / rect.height) * 100)));
        setCropTop(val);
      } else if (edge === 'bottom') {
        const val = Math.min(45, Math.max(0, Math.round(((rect.bottom - moveEvent.clientY) / rect.height) * 100)));
        setCropBottom(val);
      } else if (edge === 'left') {
        const val = Math.min(45, Math.max(0, Math.round(((moveEvent.clientX - rect.left) / rect.width) * 100)));
        setCropLeft(val);
      } else if (edge === 'right') {
        const val = Math.min(45, Math.max(0, Math.round(((rect.right - moveEvent.clientX) / rect.width) * 100)));
        setCropRight(val);
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // --- DIRECT RTMP & YOUTUBE LIVE TRANSMISSION STATE WITH LOCALSTORAGE PERSISTENCE ---
  const [streamTargetPlatform, setStreamTargetPlatform] = useState<'youtube' | 'instagram' | 'custom'>('youtube');
  const [streamServerUrl, setStreamServerUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('bia_stream_server_url') || 'rtmp://a.rtmp.youtube.com/live2';
    } catch (e) {
      return 'rtmp://a.rtmp.youtube.com/live2';
    }
  });
  const [streamKey, setStreamKey] = useState<string>(() => {
    try {
      return localStorage.getItem('bia_stream_key') || '';
    } catch (e) {
      return '';
    }
  });
  const [showStreamKeySecret, setShowStreamKeySecret] = useState(false);
  const [streamConfigSavedToast, setStreamConfigSavedToast] = useState(false);
  const [isStreamKeyApplied, setIsStreamKeyApplied] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bia_stream_key_applied') === 'true' || !!localStorage.getItem('bia_stream_key');
    } catch (e) {
      return false;
    }
  });
  const [isLiveBroadcasting, setIsLiveBroadcasting] = useState(false);
  const [liveBroadcastDurationSec, setLiveBroadcastDurationSec] = useState(0);
  const [streamStatusMessage, setStreamStatusMessage] = useState<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const startRtmpStreaming = async () => {
    try {
      setStreamStatusMessage('⏳ Conectando ao ponte de transmissão FFmpeg...');

      let mediaStream: MediaStream | null = null;

      if (screenVideoRef.current && screenVideoRef.current.srcObject) {
        mediaStream = screenVideoRef.current.srcObject as MediaStream;
      } else if (webcamVideoRef.current && webcamVideoRef.current.srcObject) {
        mediaStream = webcamVideoRef.current.srcObject as MediaStream;
      } else {
        // Request window/screen capture directly for live broadcast
        try {
          mediaStream = await navigator.mediaDevices.getDisplayMedia({
            video: { width: 1280, height: 720, frameRate: 30 },
            audio: true
          });
        } catch (captureErr) {
          console.warn('User canceled or failed screen selection:', captureErr);
        }
      }

      if (!mediaStream) {
        alert('Selecione uma tela, janela do aluno ou ligue a câmera para transmitir.');
        setIsLiveBroadcasting(false);
        setStreamStatusMessage('');
        return;
      }

      // Ensure audio track exists so FFmpeg audio encoder does not fail on RTMP ingest
      if (mediaStream.getAudioTracks().length === 0) {
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const dst = ctx.createMediaStreamDestination();
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.0001, ctx.currentTime);
            osc.connect(gain);
            gain.connect(dst);
            osc.start();
            const silentAudioTrack = dst.stream.getAudioTracks()[0];
            if (silentAudioTrack) {
              mediaStream.addTrack(silentAudioTrack);
            }
          }
        } catch (e) {
          console.warn('Could not inject fallback silent audio track:', e);
        }
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/rtmp-stream?serverUrl=${encodeURIComponent(streamServerUrl)}&streamKey=${encodeURIComponent(streamKey)}`;

      console.log('Connecting RTMP WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket RTMP connection opened');
        setStreamStatusMessage(' Conectado ao YouTube! Transmitindo imagem e som ao vivo...');

        let mimeType = 'video/webm;codecs=h264,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm;codecs=vp8,opus';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/webm';
          }
        }

        try {
          const recorder = new MediaRecorder(mediaStream!, {
            mimeType,
            videoBitsPerSecond: 2500000 // 2.5 Mbps
          });
          mediaRecorderRef.current = recorder;

          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
              ws.send(e.data);
            }
          };

          recorder.start(250); // Send slice every 250ms
        } catch (recorderErr: any) {
          console.error('MediaRecorder error:', recorderErr);
          setStreamStatusMessage(` Erro no gravador de mídia: ${recorderErr.message || recorderErr}`);
        }
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'status') {
            setStreamStatusMessage(parsed.message);
          } else if (parsed.type === 'error') {
            setStreamStatusMessage(` ${parsed.message}`);
          }
        } catch (e) {}
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setStreamStatusMessage(' Erro na conexão com o servidor de transmissão');
      };

      ws.onclose = () => {
        console.log('WebSocket RTMP connection closed');
      };
    } catch (err: any) {
      console.error('Failed to start RTMP stream:', err);
      alert(`Erro ao iniciar transmissão: ${err?.message || err}`);
      setIsLiveBroadcasting(false);
      setStreamStatusMessage('');
    }
  };

  const stopRtmpStreaming = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (socketRef.current) {
      if (socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'stop' }));
      }
      socketRef.current.close();
    }
    mediaRecorderRef.current = null;
    socketRef.current = null;
    setStreamStatusMessage(' Transmissão encerrada.');
    setTimeout(() => setStreamStatusMessage(''), 4000);
  };

  const handleCopyText = (text: string, label: string) => {
    if (!text) {
      alert(`Nenhum(a) ${label} disponível para copiar.`);
      return;
    }
    navigator.clipboard.writeText(text);
    alert(` ${label} copiado(a) para a área de transferência!`);
  };

  const handleSaveStreamConfig = (url: string, key: string) => {
    setStreamServerUrl(url);
    setStreamKey(key);
    try {
      localStorage.setItem('bia_stream_server_url', url);
      localStorage.setItem('bia_stream_key', key);
      localStorage.setItem('bia_stream_key_applied', 'true');
    } catch (e) {}
    setIsStreamKeyApplied(true);
    setStreamConfigSavedToast(true);
    setTimeout(() => setStreamConfigSavedToast(false), 3000);
  };

  const handleApplyStreamKey = () => {
    if (!streamKey.trim()) {
      alert('Por favor, cole a sua Chave de Transmissão do YouTube antes de aplicar!');
      return;
    }
    handleSaveStreamConfig(streamServerUrl, streamKey);
    playSoundEffect('chime');
    if (!isLiveBroadcasting) {
      setIsLiveBroadcasting(true);
      setIsStreamKeyApplied(true);
      playSoundEffect('correct');
      startRtmpStreaming();
    }
  };

  const handleToggleLiveBroadcast = () => {
    if (!isLiveBroadcasting) {
      if (!streamKey.trim()) {
        alert('Insira e salve a sua Chave de Transmissão do YouTube antes de iniciar a Live!');
        return;
      }
      setIsLiveBroadcasting(true);
      setIsStreamKeyApplied(true);
      playSoundEffect('correct');
      startRtmpStreaming();
    } else {
      setIsLiveBroadcasting(false);
      playSoundEffect('buzzer');
      stopRtmpStreaming();
    }
  };

  useEffect(() => {
    let interval: any = null;
    if (isLiveBroadcasting) {
      interval = setInterval(() => {
        setLiveBroadcastDurationSec((prev) => prev + 1);
      }, 1000);
    } else {
      setLiveBroadcastDurationSec(0);
    }
    return () => clearInterval(interval);
  }, [isLiveBroadcasting]);

  // --- SAFE VIDEO STREAM ATTACHMENT HELPERS ---
  const attachScreenStream = (el: HTMLVideoElement | null) => {
    if (el && screenVideoRef.current && screenVideoRef.current.srcObject) {
      if (el.srcObject !== screenVideoRef.current.srcObject) {
        el.srcObject = screenVideoRef.current.srcObject;
        el.play().catch(() => {});
      }
    }
  };

  const attachWebcamStream = (el: HTMLVideoElement | null) => {
    if (el && webcamVideoRef.current && webcamVideoRef.current.srcObject) {
      if (el.srcObject !== webcamVideoRef.current.srcObject) {
        el.srcObject = webcamVideoRef.current.srcObject;
        el.play().catch(() => {});
      }
    }
  };

  // --- LOCAL FALLBACK OR SHARED STATE ---
  const [localQrUrl, setLocalQrUrl] = useState('https://www.youtube.com/@brazilianinaction');
  const [localQrTitle, setLocalQrTitle] = useState('Escaneie para acessar o Canal!');
  const [localShowQr, setLocalShowQr] = useState(false);

  const qrUrl = extQrUrl !== undefined ? extQrUrl : localQrUrl;
  const setQrUrl = extSetQrUrl || setLocalQrUrl;

  const qrTitle = extQrTitle !== undefined ? extQrTitle : localQrTitle;
  const setQrTitle = extSetQrTitle || setLocalQrTitle;

  const showQr = extShowQr !== undefined ? extShowQr : localShowQr;
  const setShowQr = extSetShowQr || setLocalShowQr;

  const [qrPosition, setQrPosition] = useState<'tr' | 'br' | 'bl' | 'tl'>('tr');
  const [qrSize, setQrSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');

  // --- LOWER THIRD & TICKER STATE ---
  const [localShowLowerThird, setLocalShowLowerThird] = useState(false);
  const [localTeacherName, setLocalTeacherName] = useState('Prof. André');
  const [localLessonSubject, setLocalLessonSubject] = useState('Aula Prática de Português do Brasil');
  const [localShowTicker, setLocalShowTicker] = useState(false);
  const [localTickerText, setLocalTickerText] = useState(
    ' Bem-vindos ao Brazilian in Action! • Inscreva-se no YouTube @brazilianinaction • Deixe suas dúvidas e respostas no chat ao vivo!'
  );

  const showLowerThird = extShowLowerThird !== undefined ? extShowLowerThird : localShowLowerThird;
  const setShowLowerThird = extSetShowLowerThird || setLocalShowLowerThird;

  const teacherName = extTeacherName !== undefined ? extTeacherName : localTeacherName;
  const setTeacherName = extSetTeacherName || setLocalTeacherName;

  const lessonSubject = extLessonSubject !== undefined ? extLessonSubject : localLessonSubject;
  const setLessonSubject = extSetLessonSubject || setLocalLessonSubject;

  const showTicker = extShowTicker !== undefined ? extShowTicker : localShowTicker;
  const setShowTicker = extSetShowTicker || setLocalShowTicker;

  const tickerText = extTickerText !== undefined ? extTickerText : localTickerText;
  const setTickerText = extSetTickerText || setLocalTickerText;

  // --- LIVE TIMER STATE ---
  const [timerSeconds, setTimerSeconds] = useState(300); // 5 min default
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showTimer, setShowTimer] = useState(false);

  // --- FLOATING PIP CAMERA STATE & HELPERS ---
  const [showPipCamera, setShowPipCamera] = useState(false);
  const [pipCameraShape, setPipCameraShape] = useState<'circle' | 'square' | 'badge_bia' | 'badge_b'>('circle');
  const [pipCameraPos, setPipCameraPos] = useState<'br' | 'bl' | 'tr' | 'tl'>('br');
  const [pipCameraSize, setPipCameraSize] = useState<'sm' | 'md' | 'lg'>('md');

  const getPipPositionClass = (pos: 'tr' | 'tl' | 'br' | 'bl') => {
    switch (pos) {
      case 'tl': return 'top-6 left-6';
      case 'tr': return 'top-6 right-6';
      case 'bl': return 'bottom-20 left-6';
      case 'br': return 'bottom-20 right-6';
      default: return 'bottom-20 right-6';
    }
  };

  const getPipSizeClass = (size: 'sm' | 'md' | 'lg') => {
    switch (size) {
      case 'sm': return 'w-28 h-28 md:w-36 md:h-36';
      case 'md': return 'w-36 h-36 md:w-48 md:h-48';
      case 'lg': return 'w-48 h-48 md:w-64 md:h-64';
      default: return 'w-36 h-36 md:w-48 md:h-48';
    }
  };

  const getPipShapeClass = (shape: 'circle' | 'square' | 'badge_bia' | 'badge_b') => {
    switch (shape) {
      case 'circle':
        return 'rounded-full border-2 border-amber-400 shadow-[0_12px_40px_rgba(0,0,0,0.95)] overflow-hidden bg-neutral-950 ring-2 ring-black/80 relative';
      case 'square':
        return 'rounded-2xl border-2 border-amber-400 shadow-[0_12px_40px_rgba(0,0,0,0.95)] overflow-hidden bg-neutral-950 ring-2 ring-black/80 relative';
      case 'badge_bia':
        return 'rounded-2xl border-2 border-red-500 shadow-[0_12px_40px_rgba(0,0,0,0.95)] overflow-hidden bg-neutral-950 ring-2 ring-black/80 relative';
      case 'badge_b':
        return 'rounded-full border-2 border-emerald-400 shadow-[0_12px_40px_rgba(0,0,0,0.95)] overflow-hidden bg-neutral-950 ring-2 ring-black/80 relative';
      default:
        return 'rounded-full border-2 border-amber-400 shadow-[0_12px_40px_rgba(0,0,0,0.95)] overflow-hidden bg-neutral-950 ring-2 ring-black/80 relative';
    }
  };

  // --- STREAM MODE OVERLAY & FOX NEWS / JOVEM PAN BROADCAST OVERLAY STATE ---
  const [customBannerText, setCustomBannerText] = useState('DICA DA AULA: Pratique a pronúncia do R caipira e R carioca');
  const [showCustomBanner, setShowCustomBanner] = useState(false);

  const [showNewsHeadline, setShowNewsHeadline] = useState(false);
  const [newsCategoryTag, setNewsCategoryTag] = useState('URGENTE');
  const [newsHeadlineText, setNewsHeadlineText] = useState('AULA AO VIVO: Dicas Práticas de Pronúncia e Conversação em Português do Brasil');
  const [newsLogoStyle, setNewsLogoStyle] = useState<'jovem_pan' | 'fox_news' | 'brazilian_news' | 'bia_live' | 'none'>('jovem_pan');
  const [showLiveClock, setShowLiveClock] = useState(false);

  // Live ticking clock state
  const [liveClockTime, setLiveClockTime] = useState<Date>(new Date());
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setLiveClockTime(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  const formattedClockTime = liveClockTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formattedClockDate = liveClockTime.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase();

  // News Headline Presets
  const [newsHeadlinePresets, setNewsHeadlinePresets] = useState([
    { id: '1', tag: 'URGENTE', text: 'AULA AO VIVO: Prof. André ensinando vocabulário e expressões do dia a dia no Brasil!' },
    { id: '2', tag: 'ÚLTIMA HORA', text: 'READ CLUB EM AÇÃO: Leitura guiada e tirando dúvidas de pronúncia ao vivo no chat!' },
    { id: '3', tag: 'DESTAQUE', text: 'DICA DE OURO: Como diferenciar o R caipira e R carioca sem travar na conversa' },
    { id: '4', tag: 'AO VIVO', text: 'CANAL BRAZILIAN IN ACTION: Inscreva-se e ative o sininho no YouTube!' },
  ]);

  // --- PROGRAM LIVE STATE (SYNCHRONIZED TO STUDENT STAGE WHEN "PRODUZIR" IS CLICKED) ---
  const [programState, setProgramState] = useState({
    showQr: false,
    qrUrl: 'https://www.youtube.com/@brazilianinaction',
    qrTitle: 'Escaneie para acessar o Canal!',
    qrPosition: 'tr' as 'tr' | 'tl' | 'br' | 'bl',
    qrSize: 'md' as 'sm' | 'md' | 'lg' | 'xl',
    showLowerThird: false,
    teacherName: 'Prof. André',
    lessonSubject: 'Aula Prática de Português do Brasil',
    showTicker: false,
    tickerText: ' Bem-vindos ao Brazilian in Action! • Inscreva-se no YouTube @brazilianinaction • Deixe suas dúvidas e respostas no chat ao vivo!',
    activeScene: 'live' as 'live' | 'starting' | 'reading' | 'break' | 'ending' | 'custom',
    customSceneBgUrl: null as string | null,
    showCustomBanner: false,
    customBannerText: 'DICA DA AULA: Pratique a pronúncia do R caipira e R carioca',
    showPipCamera: false,
    pipCameraShape: 'circle' as 'circle' | 'square' | 'badge_bia' | 'badge_b',
    pipCameraPos: 'br' as 'br' | 'bl' | 'tr' | 'tl',
    pipCameraSize: 'md' as 'sm' | 'md' | 'lg',
    showNewsHeadline: false,
    newsCategoryTag: 'URGENTE',
    newsHeadlineText: 'AULA AO VIVO: Dicas Práticas de Pronúncia e Conversação em Português do Brasil',
    newsLogoStyle: 'jovem_pan' as 'jovem_pan' | 'fox_news' | 'brazilian_news' | 'bia_live' | 'none',
    showLiveClock: false,
  });

  // Ensure stage / return screen is completely clean & empty whenever StreamStudio mounts
  useEffect(() => {
    setShowQr(false);
    setShowLowerThird(false);
    setShowTicker(false);
    setShowCustomBanner(false);
    setShowNewsHeadline(false);
    setShowLiveClock(false);
    setShowPipCamera(false);
  }, []);

  const [hasUnproducedChanges, setHasUnproducedChanges] = useState(false);
  const [lastProducedToast, setLastProducedToast] = useState(false);

  const handleProduceToProgram = () => {
    setProgramState({
      showQr,
      qrUrl,
      qrTitle,
      qrPosition,
      qrSize,
      showLowerThird,
      teacherName,
      lessonSubject,
      showTicker,
      tickerText,
      activeScene: activeScene as any,
      customSceneBgUrl,
      showCustomBanner,
      customBannerText,
      showPipCamera,
      pipCameraShape,
      pipCameraPos,
      pipCameraSize,
      showNewsHeadline,
      newsCategoryTag,
      newsHeadlineText,
      newsLogoStyle,
      showLiveClock,
    });
    setHasUnproducedChanges(false);
    setLastProducedToast(true);
    setTimeout(() => setLastProducedToast(false), 3000);
    playSoundEffect('chime');
  };

  // Helper render method for Fox News / Jovem Pan style broadcast overlay
  const renderNewsBroadcastOverlay = (isPopoutProgram: boolean = false) => {
    const isNewsHeadlineOn = isPopoutProgram ? programState.showNewsHeadline : showNewsHeadline;
    const categoryTag = isPopoutProgram ? programState.newsCategoryTag : newsCategoryTag;
    const headlineText = isPopoutProgram ? programState.newsHeadlineText : newsHeadlineText;
    const logoStyle = isPopoutProgram ? programState.newsLogoStyle : newsLogoStyle;
    const isClockOn = isPopoutProgram ? programState.showLiveClock : showLiveClock;
    const isTickerOn = isPopoutProgram ? programState.showTicker : showTicker;
    const currentTickerText = isPopoutProgram ? programState.tickerText : tickerText;

    if (!isNewsHeadlineOn && !isTickerOn) return null;

    return (
      <div className="w-full flex flex-col font-['Outfit',sans-serif] select-none drop-shadow-2xl z-30 transition-all duration-300 pointer-events-none">
        {/* 1. TOP NEWS HEADLINE BAND (GLOBO NEWS / CNN / JOVEM PAN TV STYLE) */}
        {isNewsHeadlineOn && (
          <div className="flex items-stretch bg-gradient-to-r from-slate-950 via-neutral-950 to-slate-950 border-t-2 border-red-600 shadow-[0_15px_40px_rgba(0,0,0,0.95)] overflow-hidden rounded-t-lg relative">
            {/* NETWORK / CHANNEL LOGO BADGE */}
            {logoStyle === 'jovem_pan' && (
              <div className="bg-gradient-to-b from-red-600 via-red-700 to-red-900 px-4 py-2 flex items-center justify-center border-r-2 border-amber-400 shrink-0 font-black tracking-tighter text-white font-['Outfit'] text-xs md:text-base shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-white/20 pointer-events-none" />
                <span className="text-amber-300 font-black mr-1 text-sm md:text-lg drop-shadow">JP</span>
                <span className="text-white font-black drop-shadow">NEWS BIA</span>
              </div>
            )}
            {logoStyle === 'fox_news' && (
              <div className="bg-gradient-to-b from-red-700 via-red-800 to-red-950 px-4 py-2 flex flex-col items-center justify-center border-r-2 border-white/80 shrink-0 font-black text-white leading-none font-['Oswald'] shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-white/20 pointer-events-none" />
                <span className="text-[10px] md:text-[11px] text-amber-300 tracking-widest font-extrabold uppercase">CNN</span>
                <span className="text-[11px] md:text-[13px] text-white tracking-tighter font-black uppercase">BIA INT</span>
              </div>
            )}
            {logoStyle === 'brazilian_news' && (
              <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-blue-950 px-4 py-2 flex items-center gap-1.5 border-r-2 border-amber-400 shrink-0 text-white font-black font-['Outfit'] text-xs md:text-sm shadow-lg relative">
                <span className="text-sm md:text-base"></span>
                <span className="text-amber-400 font-black tracking-tight">GLOBO</span>
                <span className="text-white font-black">NEWS</span>
              </div>
            )}
            {logoStyle === 'bia_live' && (
              <div className="bg-gradient-to-b from-amber-500 via-yellow-400 to-amber-600 px-4 py-2 flex items-center gap-1.5 border-r-2 border-neutral-900 shrink-0 text-neutral-950 font-black font-['Outfit'] text-xs md:text-sm shadow-lg">
                <Sparkles size={15} className="text-neutral-950 fill-neutral-950" />
                <span className="tracking-tight font-black">BIA TV</span>
              </div>
            )}

            {/* CATEGORY TAG BADGE (URGENTE / ÚLTIMA HORA) */}
            {categoryTag && (
              <div className="bg-gradient-to-b from-red-600 to-red-800 px-3.5 py-2 flex items-center justify-center font-['Outfit'] text-xs md:text-sm text-white font-black tracking-widest uppercase border-r border-white/20 shrink-0 shadow-inner">
                <span className="animate-pulse flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,1)] inline-block" />
                  {categoryTag}
                </span>
              </div>
            )}

            {/* ANIMATED HEADLINE TEXT WITH FRAMER MOTION */}
            <div className="flex-1 px-3 md:px-5 py-2 flex items-center overflow-hidden bg-slate-950/90 backdrop-blur-md border-y border-white/10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={headlineText}
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -16, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="text-white font-black text-xs md:text-sm lg:text-base tracking-wide font-['Outfit'] leading-tight drop-shadow truncate"
                >
                  {headlineText}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* LIVE CLOCK & DATE WIDGET */}
            {isClockOn && (
              <div className="bg-slate-950 border-l border-white/20 px-3.5 py-1.5 flex flex-col justify-center items-end shrink-0 font-['Oswald'] text-white shadow-inner">
                <div className="flex items-center gap-1.5 text-amber-400 font-extrabold text-xs md:text-sm tracking-wider leading-none">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping mr-0.5" />
                  {formattedClockTime}
                </div>
                <div className="text-[8px] md:text-[9px] text-white/70 tracking-widest uppercase font-mono font-bold leading-none mt-0.5">
                  {formattedClockDate} • BRT
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. BOTTOM TICKER / MARQUEE BAND */}
        {isTickerOn && (
          <div className="w-full bg-gradient-to-r from-slate-950 via-neutral-900 to-slate-950 border-t border-b border-red-500/60 py-1 px-3 flex items-center gap-2.5 overflow-hidden backdrop-blur-md shadow-2xl">
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-2.5 py-0.5 rounded text-white font-['Outfit'] text-[11px] tracking-wider uppercase font-black shrink-0 flex items-center gap-1 shadow">
              <Radio size={12} className="animate-pulse" /> NOTÍCIAS AO VIVO
            </div>
            <div className="whitespace-nowrap overflow-hidden text-xs md:text-sm font-['Montserrat'] font-extrabold text-white tracking-wide animate-marquee flex items-center gap-10">
              <span>{currentTickerText}</span>
              <span className="text-amber-400 font-black"> BRAZILIAN IN ACTION LIVE </span>
              <span>{currentTickerText}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- REAL-TIME AUDIO VU METER (WEB AUDIO API) ---
  const [isAudioMetering, setIsAudioMetering] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const startAudioMeter = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((average / 90) * 100));
        setAudioLevel(normalized);
        animFrameRef.current = requestAnimationFrame(updateMeter);
      };

      updateMeter();
      setIsAudioMetering(true);
    } catch (err) {
      console.warn('Microphone permission or audio context error:', err);
    }
  };

  const stopAudioMeter = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }
    setIsAudioMetering(false);
    setAudioLevel(0);
  };

  // --- TIKTOK LIVE GUIDE MODAL STATE ---
  const [showTikTokGuideModal, setShowTikTokGuideModal] = useState(false);

  // --- YOUTUBE & INSTAGRAM DIRECT RTMP STREAMING GUIDE MODAL STATE ---
  const [showDirectStreamGuideModal, setShowDirectStreamGuideModal] = useState(false);

  // --- CUSTOM SCENE BACKGROUND & STINGER FILE UPLOADS ---
  const [customSceneBgUrl, setCustomSceneBgUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem('bia_custom_scene_bg');
    } catch (e) {}
    return null;
  });

  const [customStingerMediaUrl, setCustomStingerMediaUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem('bia_custom_stinger_media');
    } catch (e) {}
    return null;
  });

  const sceneFileInputRef = useRef<HTMLInputElement | null>(null);
  const stingerFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSceneFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const res = evt.target?.result as string;
        setCustomSceneBgUrl(res);
        setActiveScene('custom' as any);
        setStreamSource('scene');
        setHasUnproducedChanges(true);
        try {
          localStorage.setItem('bia_custom_scene_bg', res);
        } catch (err) {}
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStingerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const res = evt.target?.result as string;
        setCustomStingerMediaUrl(res);
        try {
          localStorage.setItem('bia_custom_stinger_media', res);
        } catch (err) {}
        triggerStingerTransition(undefined, 'custom' as any);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- QR CODE POSITION & SIZE CLASS HELPERS ---
  const getQrPositionClass = (pos: 'tr' | 'tl' | 'br' | 'bl') => {
    switch (pos) {
      case 'tl':
        return 'top-4 left-4';
      case 'tr':
        return 'top-4 right-4';
      case 'bl':
        return 'bottom-16 left-4';
      case 'br':
        return 'bottom-16 right-4';
      default:
        return 'top-4 right-4';
    }
  };

  const getQrSizeClass = (size: 'sm' | 'md' | 'lg' | 'xl') => {
    switch (size) {
      case 'sm':
        return { img: 'w-16 h-16 md:w-20 md:h-20', container: 'p-2 max-w-[130px]' };
      case 'md':
        return { img: 'w-24 h-24 md:w-28 md:h-28', container: 'p-3 max-w-[160px]' };
      case 'lg':
        return { img: 'w-32 h-32 md:w-36 md:h-36', container: 'p-3.5 max-w-[200px]' };
      case 'xl':
        return { img: 'w-40 h-40 md:w-44 md:h-44', container: 'p-4 max-w-[240px]' };
      default:
        return { img: 'w-24 h-24 md:w-28 md:h-28', container: 'p-3 max-w-[160px]' };
    }
  };

  // --- SCREEN & WEBCAM CAPTURE HANDLERS ---
  const handleStartScreenCapture = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      alert('Seu navegador não suporta a captura de tela direta ou está restrito dentro do preview. Por favor, abra o aplicativo em uma Nova Aba!');
      return;
    }
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' } as any,
          audio: true,
        });
      } catch (audioErr) {
        console.warn('Fallback to video-only display capture:', audioErr);
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      }

      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
        screenVideoRef.current.play().catch(() => {});
      }
      setIsScreenCapturing(true);
      setStreamSource('screen');

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          setIsScreenCapturing(false);
          setStreamSource('scene');
        };
      }
    } catch (err: any) {
      console.warn('Screen capture cancelled or not allowed:', err);
      if (err?.name !== 'NotAllowedError' && err?.name !== 'AbortError') {
        alert(
          '️ Não foi possível iniciar a captura de tela.\n\n' +
          'Dica: Se você estiver usando o visualizador interno do painel, clique no botão "Nova Aba" no topo da tela para abrir o estúdio fora do iframe!'
        );
      }
    }
  };

  const handleStartWebcam = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Acesso à câmera não suportado ou bloqueado no navegador. Abra o aplicativo em uma Nova Aba!');
      return;
    }
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
      } catch (audioErr) {
        console.warn('Fallback to video-only webcam capture:', audioErr);
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
        webcamVideoRef.current.play().catch(() => {});
      }
      setIsWebcamActive(true);
      if (streamSource === 'scene') {
        setStreamSource('webcam');
      }
    } catch (err: any) {
      console.warn('Webcam permission denied or error:', err);
      alert(
        '️ Não foi possível acessar a sua Câmera.\n\n' +
        '1. Permita o acesso à câmera e microfone nas configurações do seu navegador.\n' +
        '2. Caso esteja usando o preview do estúdio, abra em uma Nova Aba pelo ícone no canto superior direito.'
      );
    }
  };

  const handleStopCaptures = () => {
    if (screenVideoRef.current && screenVideoRef.current.srcObject) {
      const stream = screenVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      screenVideoRef.current.srcObject = null;
    }
    if (webcamVideoRef.current && webcamVideoRef.current.srcObject) {
      const stream = webcamVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      webcamVideoRef.current.srcObject = null;
    }
    setIsScreenCapturing(false);
    setIsWebcamActive(false);
    setStreamSource('scene');
  };

  // --- TIMER EFFECT ---
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Web Audio Sound FX Generator
  const playSoundEffect = (type: 'applause' | 'correct' | 'chime' | 'countdown' | 'taDa' | 'buzzer') => {
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
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'chime') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } else if (type === 'countdown') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'applause') {
        for (let i = 0; i < 7; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(280 + Math.random() * 450, ctx.currentTime + i * 0.08);
          gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.08);
          osc.stop(ctx.currentTime + i * 0.08 + 0.35);
        }
      } else if (type === 'taDa') {
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
          gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.6);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.1);
          osc.stop(ctx.currentTime + idx * 0.1 + 0.6);
        });
      } else if (type === 'buzzer') {
        [0, 0.14].forEach((delay) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(130, ctx.currentTime + delay);
          gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + 0.12);
        });
      }
    } catch (e) {
      console.warn('Audio FX context not available', e);
    }
  };

  // --- STINGER AUDIO SYNTHESIS ENGINE (2.8s WIND & B.I.A. SOUND EFFECTS) ---
  const playStingerAudio = (type: 'wind' | 'promo' | 'conversation' | 'cyber' | 'socials' | 'academy' | 'custom') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Master 2.8s Wind Sweep Generator (White Noise + Sweeping Biquad Bandpass Filter)
      const duration = 2.8;
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(140, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 1.2);
      filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 2.7);
      filter.Q.value = 2.8;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 1.2);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2.75);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
      noise.stop(ctx.currentTime + 2.75);

      // Add harmonic melodic accents based on B.I.A. Stinger Type
      if (type === 'promo') {
        // Golden chime notes for E-Book offer
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + 0.5 + idx * 0.15);
          oscGain.gain.setValueAtTime(0.01, ctx.currentTime + 0.5 + idx * 0.15);
          oscGain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.7 + idx * 0.15);
          oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.2);
          osc.connect(oscGain);
          oscGain.connect(ctx.destination);
          osc.start(ctx.currentTime + 0.5 + idx * 0.15);
          osc.stop(ctx.currentTime + 2.2);
        });
      } else if (type === 'conversation') {
        // Uplifting warm brass chords for Brazilian Conversation
        [329.63, 392.00, 493.88, 659.25].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + 0.6 + idx * 0.12);
          oscGain.gain.setValueAtTime(0.01, ctx.currentTime + 0.6 + idx * 0.12);
          oscGain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.8 + idx * 0.12);
          oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.4);
          osc.connect(oscGain);
          oscGain.connect(ctx.destination);
          osc.start(ctx.currentTime + 0.6 + idx * 0.12);
          osc.stop(ctx.currentTime + 2.4);
        });
      } else if (type === 'cyber') {
        // High energy sonic flash
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.4);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 1.2);
        oscGain.gain.setValueAtTime(0.25, ctx.currentTime);
        oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.3);
        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.3);
      } else if (type === 'socials') {
        // Pop arpeggio for Social Media
        [440, 554.37, 659.25, 880].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + 0.4 + idx * 0.1);
          oscGain.gain.setValueAtTime(0.2, ctx.currentTime + 0.4 + idx * 0.1);
          oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);
          osc.connect(oscGain);
          oscGain.connect(ctx.destination);
          osc.start(ctx.currentTime + 0.4 + idx * 0.1);
          osc.stop(ctx.currentTime + 1.8);
        });
      } else if (type === 'academy') {
        // Executive brass fanfare
        [261.63, 329.63, 392.00, 523.25].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + 0.5 + idx * 0.15);
          oscGain.gain.setValueAtTime(0.22, ctx.currentTime + 0.5 + idx * 0.15);
          oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);
          osc.connect(oscGain);
          oscGain.connect(ctx.destination);
          osc.start(ctx.currentTime + 0.5 + idx * 0.15);
          osc.stop(ctx.currentTime + 2.5);
        });
      }
    } catch (e) {
      console.warn('Audio synthesis error:', e);
    }
  };

  // --- STINGER OBS-STYLE TRANSITION TRIGGER (2.8 Seconds Total) ---
  const triggerStingerTransition = (
    targetScene?: 'starting' | 'live' | 'break' | 'reading' | 'ending' | 'custom',
    overrideType?: 'wind' | 'promo' | 'conversation' | 'cyber' | 'socials' | 'academy' | 'custom'
  ) => {
    const stype = overrideType || activeStingerType;
    setActiveStingerType(stype);
    setIsStingerActive(true);
    playStingerAudio(stype);

    // Switch active scene / source right at peak sweep (1.3 seconds)
    setTimeout(() => {
      if (targetScene) {
        setActiveScene(targetScene);
        if (targetScene !== 'live') {
          setStreamSource('scene');
        }
      }
    }, 1350);

    // End overlay animation at 2.8 seconds so viewers can read and see the graphics
    setTimeout(() => {
      setIsStingerActive(false);
    }, 2800);
  };

  const getQrImageUrl = (dataUrl: string, sizePx: number = 300) => {
    const encoded = encodeURIComponent(dataUrl || 'https://www.youtube.com/@brazilianinaction');
    return `https://api.qrserver.com/v1/create-qr-code/?size=${sizePx}x${sizePx}&data=${encoded}&color=ffffff&bgcolor=0a0a0a&margin=2`;
  };

  const handlePresetQr = (url: string, title: string) => {
    setQrUrl(url);
    setQrTitle(title);
    setShowQr(true);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col gap-4">

      {/* MAIN TWO-COLUMN STUDIO LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: OBS PREVIEW STAGE (8 COLS) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* RETORNO EDITÁVEL CONTROL BAR & REAL-TIME AUDIO VU METER */}
          <div className="bg-neutral-950/90 border-2 border-amber-500/40 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-2xl">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs font-extrabold uppercase">
                <Sliders size={14} /> ESTÚDIO RETORNO (PRÉ-VISUALIZAÇÃO)
              </span>
              {hasUnproducedChanges && (
                <span className="px-2.5 py-1 rounded-xl bg-amber-500 text-neutral-950 font-black text-[10px] uppercase animate-pulse shadow">
                  ● ALTERAÇÕES PENDENTES
                </span>
              )}
              {lastProducedToast && (
                <span className="px-2.5 py-1 rounded-xl bg-emerald-500 text-neutral-950 font-black text-[10px] uppercase shadow animate-bounce">
                   TRANSIÇÃO ENVIADA AO VIVO!
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Audio VU Meter */}
              <div className="flex items-center gap-1.5 bg-black/60 border border-white/15 px-2.5 py-1 rounded-xl">
                <button
                  type="button"
                  onClick={isAudioMetering ? stopAudioMeter : startAudioMeter}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1 ${
                    isAudioMetering
                      ? 'bg-emerald-500 text-neutral-950 font-black shadow'
                      : 'bg-white/10 text-white/70 hover:text-white'
                  }`}
                  title="Monitorar Frequência e Volume do Microfone em Tempo Real"
                >
                  <Volume2 size={13} className={isAudioMetering ? 'animate-bounce text-neutral-950' : ''} />
                  <span>{isAudioMetering ? 'MIC ON' : ' Monitorar Áudio'}</span>
                </button>

                {isAudioMetering && (
                  <div className="flex items-center gap-1">
                    <div className="w-20 h-2.5 bg-black/90 rounded-full border border-white/20 p-0.5 flex items-center gap-0.5 overflow-hidden">
                      {[...Array(10)].map((_, i) => {
                        const threshold = ((i + 1) / 10) * 100;
                        const isActive = audioLevel >= threshold;
                        const isRed = i >= 8;
                        const isYellow = i >= 5 && i < 8;
                        return (
                          <div
                            key={i}
                            className={`h-full flex-1 rounded-sm transition-all duration-75 ${
                              isActive
                                ? isRed
                                  ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]'
                                  : isYellow
                                  ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]'
                                  : 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                                : 'bg-white/10'
                            }`}
                          />
                        );
                      })}
                    </div>
                    <span className="text-[9px] font-mono font-bold text-emerald-400">{audioLevel}%</span>
                  </div>
                )}
              </div>

              {/* PRODUCE TO PROGRAM BUTTON */}
              <button
                type="button"
                onClick={handleProduceToProgram}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1.5 shadow-2xl ${
                  hasUnproducedChanges
                    ? 'bg-amber-500 text-neutral-950 hover:bg-amber-400 animate-pulse border-2 border-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/50'
                }`}
                title="Atualizar Palco do Aluno e Segunda Tela com as alterações do Retorno"
              >
                <Play size={13} className="fill-current" />
                <span>{hasUnproducedChanges ? 'PRODUZIR TRANSIÇÃO (AO VIVO)' : 'PALCO SINCRONIZADO'}</span>
              </button>
            </div>
          </div>

          {/* VIDEO INPUT CAPTURE BAR */}
          <div className="bg-neutral-950/80 border border-white/10 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Monitor size={16} className="text-amber-400" />
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Fonte de Vídeo do Palco:
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setStreamSource('internal_app')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  streamSource === 'internal_app'
                    ? 'bg-amber-500 text-neutral-950 font-black shadow-lg shadow-amber-950/50'
                    : 'bg-white/5 hover:bg-white/10 text-white/80 border border-white/10'
                }`}
              >
                <AppWindow size={13} />
                <span>App Interno</span>
              </button>

              <button
                type="button"
                onClick={handleStartScreenCapture}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  streamSource === 'screen' || streamSource === 'pip'
                    ? 'bg-amber-500 text-neutral-950 shadow-lg font-mono'
                    : 'bg-white/5 hover:bg-white/10 text-white/80 border border-white/10'
                }`}
              >
                <Monitor size={13} />
                <span>{isScreenCapturing ? 'Tela Conectada' : 'Capturar Tela'}</span>
              </button>

              <button
                type="button"
                onClick={handleStartWebcam}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  streamSource === 'webcam'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-white/5 hover:bg-white/10 text-white/80 border border-white/10'
                }`}
              >
                <Camera size={13} />
                <span>{isWebcamActive ? 'Câmera Ativa' : 'Minha Câmera'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsVertical916(!isVertical916);
                  if (setIsFloatingCamActive) {
                    setIsFloatingCamActive(!isFloatingCamActive);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md ${
                  isVertical916 || isFloatingCamActive
                    ? 'bg-amber-500 text-neutral-950 font-bold border border-amber-400 shadow-amber-500/20'
                    : 'bg-neutral-900/80 hover:bg-neutral-800 text-white/80 hover:text-white border border-white/15'
                }`}
                title="Ativar/Desativar Câmera Bolinha Flutuante"
              >
                <Smartphone size={14} />
                <span>{isFloatingCamActive || isVertical916 ? 'Câmera Bolinha ON' : 'Câmera Bolinha'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowFrameGuide(!showFrameGuide)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  showFrameGuide
                    ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 shadow-lg'
                    : 'bg-white/5 hover:bg-white/10 text-white/80 border border-white/10'
                }`}
                title="Ativar/Desativar Grade de Regra dos 3 Terços para Enquadramento Perfeito"
              >
                <Grid size={13} />
                <span>{showFrameGuide ? 'Enquadramento ON' : 'Guia Enquadramento'}</span>
              </button>

              {(isScreenCapturing && isWebcamActive) && (
                <button
                  type="button"
                  onClick={() => setStreamSource(streamSource === 'pip' ? 'screen' : 'pip')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    streamSource === 'pip'
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-white/5 hover:bg-white/10 text-white/80 border border-white/10'
                  }`}
                >
                  <Layout size={13} />
                  <span>Modo PIP (Câmera + Tela)</span>
                </button>
              )}

              {(isScreenCapturing || isWebcamActive) && (
                <button
                  type="button"
                  onClick={handleStopCaptures}
                  className="px-2.5 py-1.5 rounded-xl bg-red-600/30 hover:bg-red-600/50 text-red-300 border border-red-500/40 text-xs font-bold cursor-pointer"
                  title="Encerrar Capturas de Vídeo"
                >
                  Interromper
                </button>
              )}
            </div>
          </div>

          {/* OBS STAGE CANVAS (16:9 HORIZONTAL OR 9:16 VERTICAL SMARTPHONE) */}
          <div
            ref={stageRef}
            style={{ backgroundColor: stageBgColor }}
            className={`relative transition-all duration-300 select-none flex flex-col justify-between overflow-hidden ${
              isVertical916
                ? 'w-full max-w-[390px] aspect-[9/16] mx-auto rounded-[38px] border-4 border-amber-400 shadow-[0_25px_60px_rgba(251,191,36,0.35)] p-4 sm:p-5 ring-4 ring-black/90'
                : 'w-full aspect-video rounded-3xl border-2 border-white/15 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)]'
            }`}
          >
            {/* LIVE SCREEN CAPTURE VIDEO FEED */}
            <video
              ref={screenVideoRef}
              autoPlay
              playsInline
              muted
              style={getCroppedVideoStyle()}
              className={`absolute inset-0 z-0 ${
                (streamSource === 'screen' || streamSource === 'pip') && isScreenCapturing ? 'block' : 'hidden'
              }`}
            />

            {/* INTERACTIVE DRAGGABLE CROP RULERS OVERLAY ON STAGE */}
            {isCropActive && (
              <div className="absolute inset-0 pointer-events-none z-35">
                {/* Top shaded out box */}
                <div 
                  style={{ height: `${cropTop}%` }} 
                  className="absolute top-0 left-0 right-0 bg-black/65 border-b-2 border-dashed border-amber-400 pointer-events-none flex items-center justify-center transition-all duration-75"
                >
                  <span className="text-[9px] font-mono font-bold text-amber-300 bg-neutral-950/90 border border-amber-500/40 px-2 py-0.5 rounded-full shadow">
                    ️ Topo: {cropTop}%
                  </span>
                </div>

                {/* Bottom shaded out box */}
                <div 
                  style={{ height: `${cropBottom}%` }} 
                  className="absolute bottom-0 left-0 right-0 bg-black/65 border-t-2 border-dashed border-amber-400 pointer-events-none flex items-center justify-center transition-all duration-75"
                >
                  <span className="text-[9px] font-mono font-bold text-amber-300 bg-neutral-950/90 border border-amber-500/40 px-2 py-0.5 rounded-full shadow">
                    ️ Base: {cropBottom}%
                  </span>
                </div>

                {/* Left shaded out box */}
                <div 
                  style={{ left: 0, top: `${cropTop}%`, bottom: `${cropBottom}%`, width: `${cropLeft}%` }} 
                  className="absolute bg-black/65 border-r-2 border-dashed border-amber-400 pointer-events-none flex items-center justify-center transition-all duration-75"
                >
                  <span className="text-[8px] font-mono font-bold text-amber-300 bg-neutral-950/90 border border-amber-500/40 px-1.5 py-0.5 rounded shadow rotate-90">
                    {cropLeft}%
                  </span>
                </div>

                {/* Right shaded out box */}
                <div 
                  style={{ right: 0, top: `${cropTop}%`, bottom: `${cropBottom}%`, width: `${cropRight}%` }} 
                  className="absolute bg-black/65 border-l-2 border-dashed border-amber-400 pointer-events-none flex items-center justify-center transition-all duration-75"
                >
                  <span className="text-[8px] font-mono font-bold text-amber-300 bg-neutral-950/90 border border-amber-500/40 px-1.5 py-0.5 rounded shadow -rotate-90">
                    {cropRight}%
                  </span>
                </div>

                {/* Interactive Draggable Handle - TOP EDGE */}
                <div
                  onMouseDown={(e) => handleCropMouseDown('top', e)}
                  style={{ top: `${cropTop}%` }}
                  className="absolute left-0 right-0 h-6 -mt-3 cursor-ns-resize z-50 pointer-events-auto flex items-center justify-center group"
                  title="Arraste para ajustar o corte Superior"
                >
                  <div className="w-28 h-2.5 bg-amber-400 group-hover:bg-amber-300 rounded-full shadow-[0_0_15px_rgba(251,191,36,0.9)] flex items-center justify-center transition-transform group-hover:scale-110">
                    <div className="w-8 h-1 bg-neutral-950 rounded-full" />
                  </div>
                </div>

                {/* Interactive Draggable Handle - BOTTOM EDGE */}
                <div
                  onMouseDown={(e) => handleCropMouseDown('bottom', e)}
                  style={{ bottom: `${cropBottom}%` }}
                  className="absolute left-0 right-0 h-6 -mb-3 cursor-ns-resize z-50 pointer-events-auto flex items-center justify-center group"
                  title="Arraste para ajustar o corte Inferior"
                >
                  <div className="w-28 h-2.5 bg-amber-400 group-hover:bg-amber-300 rounded-full shadow-[0_0_15px_rgba(251,191,36,0.9)] flex items-center justify-center transition-transform group-hover:scale-110">
                    <div className="w-8 h-1 bg-neutral-950 rounded-full" />
                  </div>
                </div>

                {/* Interactive Draggable Handle - LEFT EDGE */}
                <div
                  onMouseDown={(e) => handleCropMouseDown('left', e)}
                  style={{ left: `${cropLeft}%` }}
                  className="absolute top-0 bottom-0 w-6 -ml-3 cursor-ew-resize z-50 pointer-events-auto flex items-center justify-center group"
                  title="Arraste para ajustar o corte Esquerdo"
                >
                  <div className="h-28 w-2.5 bg-amber-400 group-hover:bg-amber-300 rounded-full shadow-[0_0_15px_rgba(251,191,36,0.9)] flex items-center justify-center transition-transform group-hover:scale-110">
                    <div className="h-8 w-1 bg-neutral-950 rounded-full" />
                  </div>
                </div>

                {/* Interactive Draggable Handle - RIGHT EDGE */}
                <div
                  onMouseDown={(e) => handleCropMouseDown('right', e)}
                  style={{ right: `${cropRight}%` }}
                  className="absolute top-0 bottom-0 w-6 -mr-3 cursor-ew-resize z-50 pointer-events-auto flex items-center justify-center group"
                  title="Arraste para ajustar o corte Direito"
                >
                  <div className="h-28 w-2.5 bg-amber-400 group-hover:bg-amber-300 rounded-full shadow-[0_0_15px_rgba(251,191,36,0.9)] flex items-center justify-center transition-transform group-hover:scale-110">
                    <div className="h-8 w-1 bg-neutral-950 rounded-full" />
                  </div>
                </div>
              </div>
            )}

            {/* LIVE WEBCAM VIDEO FEED */}
            <video
              ref={webcamVideoRef}
              autoPlay
              playsInline
              muted
              className={`z-10 bg-black ${
                streamSource === 'webcam'
                  ? 'absolute inset-0 w-full h-full object-cover'
                  : streamSource === 'pip' && isWebcamActive
                  ? 'absolute bottom-16 right-6 w-48 h-36 rounded-2xl border-2 border-amber-400 shadow-2xl object-cover'
                  : 'hidden'
              }`}
            />

            {/* INTERNAL APP MODULE LIVE STAGE SOURCE */}
            {streamSource === 'internal_app' && (
              <div className="absolute inset-0 z-10 bg-neutral-950 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-amber-500/40 flex flex-col gap-2">
                <div className="flex items-center justify-between bg-neutral-900 border border-white/10 p-2 rounded-xl shrink-0 z-20">
                  <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AppWindow size={14} className="text-amber-400" /> Transmitindo Módulo Interno do App:
                  </span>
                  <div className="flex items-center gap-1 bg-black/50 p-1 rounded-lg border border-white/10 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setInternalAppModule('readclub')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1 ${
                        internalAppModule === 'readclub'
                          ? 'bg-amber-500 text-neutral-950 font-black shadow'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <BookOpen size={12} /> Read Club
                    </button>
                    <button
                      type="button"
                      onClick={() => setInternalAppModule('conversation')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1 ${
                        internalAppModule === 'conversation'
                          ? 'bg-amber-500 text-neutral-950 font-black shadow'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Mic size={12} /> Conversação
                    </button>
                    <button
                      type="button"
                      onClick={() => setInternalAppModule('quiz')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1 ${
                        internalAppModule === 'quiz'
                          ? 'bg-amber-500 text-neutral-950 font-black shadow'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <HelpCircle size={12} /> Quiz
                    </button>
                    <button
                      type="button"
                      onClick={() => setInternalAppModule('youtube')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1 ${
                        internalAppModule === 'youtube'
                          ? 'bg-amber-500 text-neutral-950 font-black shadow'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Youtube size={12} /> Music / YouTube
                    </button>
                    <button
                      type="button"
                      onClick={() => setInternalAppModule('biacompare')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1 ${
                        internalAppModule === 'biacompare'
                          ? 'bg-amber-500 text-neutral-950 font-black shadow'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Sparkles size={12} /> BIA Compare
                    </button>
                    <button
                      type="button"
                      onClick={() => setInternalAppModule('board')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1 ${
                        internalAppModule === 'board'
                          ? 'bg-amber-500 text-neutral-950 font-black shadow'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <PenTool size={12} /> Brazilian Board
                    </button>
                    <button
                      type="button"
                      onClick={() => setInternalAppModule('tradutor')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1 ${
                        internalAppModule === 'tradutor'
                          ? 'bg-amber-500 text-neutral-950 font-black shadow'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Languages size={12} /> Tradutor
                    </button>
                  </div>
                </div>

                <div className="flex-1 w-full overflow-y-auto rounded-xl bg-black border border-white/10 p-2">
                  {internalAppModule === 'readclub' && (
                    <ReadClub
                      library={library || INITIAL_READ_LIBRARY}
                      onAddStory={onAddStory || (() => {})}
                      onUpdateStory={onUpdateStory || (() => {})}
                      onDeleteStory={onDeleteStory || (() => {})}
                      sessions={sessions || []}
                      onSaveSession={onSaveSession || (() => {})}
                      onDeleteSession={onDeleteSession || (() => {})}
                      glossary={glossary || {}}
                      onAddGlossary={onAddGlossary || (() => {})}
                      onRemoveGlossary={onRemoveGlossary || (() => {})}
                      onClearGlossary={onClearGlossary || (() => {})}
                      learnedWords={learnedWords || {}}
                      onToggleLearnedWord={onToggleLearnedWord || (() => {})}
                      accentColor={accentColor}
                    />
                  )}

                  {internalAppModule === 'conversation' && (
                    <BrazilianConversation accentColor={accentColor} />
                  )}

                  {internalAppModule === 'quiz' && (
                    <BrazilianQuiz accentColor={accentColor} />
                  )}

                  {internalAppModule === 'youtube' && (
                    <YouTubeHub accentColor={accentColor} />
                  )}

                  {internalAppModule === 'biacompare' && (
                    <BiaCompare accentColor={accentColor} />
                  )}

                  {internalAppModule === 'board' && (
                    <BrazilianBoard accentColor={accentColor} />
                  )}

                  {internalAppModule === 'tradutor' && (
                    <BrazilianTradutor accentColor={accentColor} />
                  )}
                </div>
              </div>
            )}

            {/* 16:9 ENQUADRAMENTO SAFE AREA & RULE OF THIRDS GRID OVERLAY */}
            {showFrameGuide && (
              <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between p-4 border-2 border-dashed border-amber-400/80 rounded-2xl bg-black/10">
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-30">
                  <div className="border-r border-b border-amber-300" />
                  <div className="border-r border-b border-amber-300" />
                  <div className="border-b border-amber-300" />
                  <div className="border-r border-b border-amber-300" />
                  <div className="border-r border-b border-amber-300" />
                  <div className="border-b border-amber-300" />
                  <div className="border-r border-amber-300" />
                  <div className="border-r border-amber-300" />
                  <div />
                </div>

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                  <div className="w-16 h-[1px] bg-amber-400" />
                  <div className="h-16 w-[1px] bg-amber-400 absolute" />
                  <div className="w-8 h-8 rounded-full border-2 border-amber-400 absolute" />
                </div>

                <div className="flex justify-between items-center text-[10px] font-mono font-black text-amber-300 bg-neutral-950/90 px-3 py-1 rounded-lg border border-amber-500/50 backdrop-blur-md self-start">
                  <span className="flex items-center gap-1.5">
                    <Grid size={13} className="text-amber-400" />
                     ENQUADRAMENTO 16:9 • REGRA DOS 3 TERÇOS
                  </span>
                  <span className="text-emerald-400 font-bold ml-3 animate-pulse">● ENQUADRADO</span>
                </div>

                <div className="flex justify-between items-center text-[9px] font-mono font-bold text-amber-300/90 bg-neutral-950/80 px-2.5 py-1 rounded-lg border border-amber-500/30">
                  <span>[  CENTRALIZAR ROSTO / MATÉRIA ]</span>
                  <span>[  1080p BROADCAST SAFE ]</span>
                </div>
              </div>
            )}

            {/* STAGE BACKGROUND SCENE STYLES (When no video feed active) */}
            {streamSource === 'scene' && activeScene === 'starting' && (
              <div className="absolute inset-0 z-0 bg-gradient-to-br from-red-950 via-neutral-950 to-neutral-900 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-24 h-24 mb-4 animate-bounce">
                  <BrazilianLogo size="xl" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-mono uppercase tracking-widest bg-red-500/20 text-red-300 border border-red-500/30 mb-2">
                  Transmissão ao Vivo
                </span>
                <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight">
                  A AULA VAI COMESAR EM BREVE!
                </h2>
                <p className="text-xs md:text-sm text-white/60 max-w-md mt-2 font-light">
                  Prepare seu caderno, água e ligue seu áudio. Estamos nos preparando para iniciar a aula!
                </p>
                {showTimer && (
                  <div className="mt-6 px-6 py-3 rounded-2xl bg-black/60 border border-amber-500/40 text-3xl font-mono font-bold text-amber-400 shadow-2xl">
                    {formatTime(timerSeconds)}
                  </div>
                )}
              </div>
            )}

            {streamSource === 'scene' && activeScene === 'break' && (
              <div className="absolute inset-0 z-0 bg-gradient-to-br from-amber-950/80 via-neutral-950 to-neutral-900 flex flex-col items-center justify-center p-8 text-center">
                <Clock size={48} className="text-amber-400 mb-3 animate-spin" />
                <h2 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-wider">
                  INTERVALO DA AULA
                </h2>
                <p className="text-xs text-white/60 mt-1">
                  Voltamos em instantes! Continue conectado.
                </p>
                {showTimer && (
                  <div className="mt-4 px-5 py-2.5 rounded-2xl bg-black/60 border border-amber-500/40 text-2xl font-mono font-bold text-amber-300">
                    {formatTime(timerSeconds)}
                  </div>
                )}
              </div>
            )}

            {streamSource === 'scene' && activeScene === 'reading' && (
              <div className="absolute inset-0 z-0 bg-neutral-950 overflow-y-auto p-3 flex flex-col">
                <ReadClub
                  library={library || INITIAL_READ_LIBRARY}
                  onAddStory={onAddStory || (() => {})}
                  onUpdateStory={onUpdateStory || (() => {})}
                  onDeleteStory={onDeleteStory || (() => {})}
                  sessions={sessions || []}
                  onSaveSession={onSaveSession || (() => {})}
                  onDeleteSession={onDeleteSession || (() => {})}
                  glossary={glossary || {}}
                  onAddGlossary={onAddGlossary || (() => {})}
                  onRemoveGlossary={onRemoveGlossary || (() => {})}
                  onClearGlossary={onClearGlossary || (() => {})}
                  learnedWords={learnedWords || {}}
                  onToggleLearnedWord={onToggleLearnedWord || (() => {})}
                  accentColor={accentColor}
                />
              </div>
            )}

            {streamSource === 'scene' && activeScene === 'ending' && (
              <div className="absolute inset-0 z-0 bg-gradient-to-br from-neutral-950 via-red-950/60 to-black flex flex-col items-center justify-center p-8 text-center">
                <BrazilianLogo size="lg" />
                <h2 className="text-2xl md:text-3xl font-bold text-white mt-4 uppercase">
                  MUITO OBRIGADO PELA AULA!
                </h2>
                <p className="text-xs text-white/60 mt-1">
                  Inscreva-se no canal e nos vemos na próxima transmissão!
                </p>
                <div className="mt-4 px-4 py-2 bg-red-600 text-white font-bold text-xs uppercase rounded-xl flex items-center gap-2">
                  <Youtube size={16} /> @brazilianinaction
                </div>
              </div>
            )}

            {streamSource === 'scene' && activeScene === 'custom' && customSceneBgUrl && (
              <div className="absolute inset-0 z-0 bg-black flex items-center justify-center overflow-hidden">
                {customSceneBgUrl.startsWith('data:video') || customSceneBgUrl.endsWith('.mp4') ? (
                  <video src={customSceneBgUrl} autoPlay loop muted className="w-full h-full object-cover" />
                ) : (
                  <img src={customSceneBgUrl} alt="Cena Customizada" className="w-full h-full object-cover" />
                )}
              </div>
            )}

            {/* STAGE OVERLAYS (QR CODE, LOWER THIRDS, TICKER) */}
            
            {/* Top Bar Indicators inside Canvas */}
            <div className="relative z-20 flex justify-between items-start pointer-events-none flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-black/70 border border-white/15 px-3 py-1.5 rounded-2xl backdrop-blur-md">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white">
                    {streamSource === 'screen' ? 'EPISODEN / TELA COMPARTILHADA' : 'AO VIVO • B LIVE / MEET'}
                  </span>
                </div>

                {isLiveBroadcasting && (
                  <div className="flex items-center gap-2 bg-red-600 border border-red-400 px-3 py-1.5 rounded-2xl shadow-xl backdrop-blur-md animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-white inline-block animate-ping" />
                    <span className="text-[10px] font-mono font-black uppercase text-white tracking-wide">
                       AO VIVO NO YOUTUBE ({formatTime(liveBroadcastDurationSec)})
                    </span>
                  </div>
                )}
              </div>

              {/* DYNAMIC QR CODE OVERLAY ON STAGE (REAL TV GRAPHIC CARD - DRAGGABLE) */}
              {showQr && (
                <motion.div
                  drag
                  dragConstraints={stageRef}
                  dragElastic={0.05}
                  dragMomentum={false}
                  className={`cursor-grab active:cursor-grabbing absolute z-30 group bg-slate-950/95 border-2 border-amber-400/80 rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.9)] backdrop-blur-2xl flex flex-col items-center gap-1.5 pointer-events-auto overflow-hidden ${getQrPositionClass(
                    qrPosition
                  )} ${getQrSizeClass(qrSize).container}`}
                >
                  <div className="absolute -top-3 opacity-0 group-hover:opacity-100 transition-opacity bg-amber-500 text-neutral-950 font-black text-[8px] px-1.5 py-0.5 rounded-full uppercase shadow pointer-events-none z-50">
                    Arraste QR Code
                  </div>
                  <div className="w-full bg-gradient-to-r from-red-600 via-red-700 to-red-800 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 text-center flex items-center justify-center gap-1 shadow">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    <span>ESCANEIE NA TELA</span>
                  </div>
                  <div className="p-1 bg-white rounded-xl shadow-inner border border-neutral-200">
                    <img
                      src={getQrImageUrl(qrUrl, 250)}
                      alt="QR Code da Transmissão"
                      className={`rounded-lg ${getQrSizeClass(qrSize).img}`}
                    />
                  </div>
                  {qrTitle && (
                    <span className="text-[9px] font-extrabold text-white text-center line-clamp-2 leading-tight px-1 font-['Outfit']">
                      {qrTitle}
                    </span>
                  )}
                  <span className="text-[8px] font-mono text-amber-300 font-bold uppercase tracking-wider pb-0.5">
                    INTERATIVIDADE TV
                  </span>
                </motion.div>
              )}
            </div>

            {/* Middle Banner / Dica da Aula (DRAGGABLE) */}
            {showCustomBanner && activeScene === 'live' && (
              <motion.div
                drag
                dragConstraints={stageRef}
                dragElastic={0.05}
                dragMomentum={false}
                className="cursor-grab active:cursor-grabbing absolute z-30 group my-auto self-start bg-slate-950/95 border-l-4 border-amber-400 border-y border-r border-white/20 px-4 py-2.5 rounded-r-2xl max-w-lg backdrop-blur-xl shadow-[0_15px_35px_rgba(0,0,0,0.9)] pointer-events-auto"
              >
                <div className="absolute -top-3 left-2 opacity-0 group-hover:opacity-100 transition-opacity bg-amber-500 text-neutral-950 font-black text-[8px] px-1.5 py-0.5 rounded-full uppercase shadow pointer-events-none">
                  Arraste Dica
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-black text-amber-300 uppercase tracking-wider">
                  <Sparkles size={12} /> DESTAQUE DA TRANSMISSÃO
                </div>
                <div className="text-xs md:text-sm font-bold text-white mt-0.5 font-['Outfit']">
                  {customBannerText}
                </div>
              </motion.div>
            )}

            {/* Bottom Section: Teacher Lower Third + Fox News/Jovem Pan Overlay */}
            <div className="relative z-20 flex flex-col gap-2 mt-auto">
              {/* Teacher Identification Badge (GLOBO NEWS / CNN PRESENTER LOWER THIRD - DRAGGABLE) */}
              {showLowerThird && (
                <motion.div
                  drag
                  dragConstraints={stageRef}
                  dragElastic={0.05}
                  dragMomentum={false}
                  className="cursor-grab active:cursor-grabbing self-start bg-slate-950/95 border-l-4 border-amber-400 border-y border-r border-white/20 px-4 py-2.5 rounded-r-2xl backdrop-blur-xl shadow-[0_15px_35px_rgba(0,0,0,0.9)] flex items-center gap-3.5 group relative pointer-events-auto"
                >
                  <div className="absolute -top-3 left-2 opacity-0 group-hover:opacity-100 transition-opacity bg-amber-500 text-neutral-950 font-black text-[8px] px-1.5 py-0.5 rounded-full uppercase shadow pointer-events-none">
                    Arraste Crachá Prof.
                  </div>
                  <div className="px-2.5 py-1.5 bg-gradient-to-br from-amber-400 to-yellow-500 text-neutral-950 font-black rounded-xl text-xs font-['Outfit'] shadow-md flex flex-col items-center leading-none">
                    <span className="text-[9px] font-mono tracking-tighter uppercase font-extrabold">ESTÚDIO</span>
                    <span className="text-xs font-black">B.I.A.</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono font-bold text-amber-300 uppercase tracking-widest block leading-none mb-0.5">
                      APRESENTADOR / PROFESSOR
                    </span>
                    <h4 className="text-xs md:text-sm font-black text-white tracking-wide font-['Outfit'] leading-tight">
                      {teacherName}
                    </h4>
                    <p className="text-[10px] md:text-[11px] text-white/80 font-mono font-medium">
                      {lessonSubject}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Fox News / Jovem Pan News Broadcast Overlay */}
              {renderNewsBroadcastOverlay(false)}
            </div>

            {/* FLOATING CAMERA PIP OVERLAY (PREVIEW STAGE - DRAGGABLE) */}
            {showPipCamera && (
              <motion.div
                drag
                dragConstraints={stageRef}
                dragElastic={0.05}
                dragMomentum={false}
                className={`absolute z-35 transition-all duration-300 flex flex-col items-center cursor-grab active:cursor-grabbing pointer-events-auto group ${getPipPositionClass(
                  pipCameraPos
                )}`}
              >
                <div className="absolute -top-3 opacity-0 group-hover:opacity-100 transition-opacity bg-amber-500 text-neutral-950 font-black text-[8px] px-1.5 py-0.5 rounded-full uppercase shadow z-40 pointer-events-none">
                  Arraste Câmera
                </div>
                <div
                  className={`relative flex items-center justify-center transition-all ${getPipShapeClass(
                    pipCameraShape
                  )} ${getPipSizeClass(pipCameraSize)}`}
                >
                  <video
                    ref={attachWebcamStream}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${
                      pipCameraShape === 'circle' || pipCameraShape === 'badge_b'
                        ? 'rounded-full'
                        : 'rounded-2xl'
                    }`}
                  />

                  {!isWebcamActive && (
                    <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-2 text-center text-white">
                      <Camera size={22} className="text-amber-400 mb-1 animate-pulse" />
                      <span className="text-[9px] font-bold text-amber-300 uppercase leading-tight">
                        Câmera Prof.
                      </span>
                      <button
                        type="button"
                        onClick={handleStartWebcam}
                        className="mt-1 px-2 py-0.5 bg-amber-500 text-neutral-950 font-black text-[8px] rounded uppercase hover:bg-amber-400 cursor-pointer"
                      >
                        Ligar Câmera
                      </button>
                    </div>
                  )}

                  {pipCameraShape === 'badge_b' && (
                    <div className="absolute -bottom-1 -right-1 bg-neutral-950 border-2 border-emerald-400 p-1 rounded-full shadow-2xl flex items-center justify-center">
                      <BrazilianLogo size="sm" />
                    </div>
                  )}
                </div>

                {pipCameraShape === 'badge_bia' && (
                  <div className="mt-1.5 px-3 py-1 bg-gradient-to-r from-emerald-600 via-amber-500 to-blue-600 border border-white/30 rounded-full text-[10px] font-black text-white uppercase tracking-wider shadow-2xl flex items-center gap-1.5 whitespace-nowrap">
                    <span></span> Brazilian in Action
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* SCENE QUICK SELECTOR BAR */}
          <div className="bg-neutral-950/80 border border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-mono font-bold text-white/60 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={14} className="text-amber-400" /> Cenas B LIVE:
            </span>

            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'live', label: 'Aula ao Vivo', icon: Tv },
                { id: 'starting', label: 'Em Breve', icon: Radio },
                { id: 'reading', label: 'Leitura', icon: BookOpen },
                { id: 'break', label: 'Intervalo', icon: Clock },
                { id: 'ending', label: 'Encerramento', icon: Youtube },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setActiveScene(s.id as any);
                    if (s.id !== 'live') {
                      setStreamSource('scene');
                    }
                    setHasUnproducedChanges(true);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeScene === s.id && streamSource === 'scene'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-950/50 border border-red-500/40'
                      : 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10'
                  }`}
                >
                  <s.icon size={13} />
                  <span>{s.label}</span>
                </button>
              ))}

              {/* Upload Custom Scene Button */}
              <button
                type="button"
                onClick={() => sceneFileInputRef.current?.click()}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeScene === 'custom' && streamSource === 'scene'
                    ? 'bg-amber-500 text-neutral-950 shadow-lg font-black'
                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
                title="Upload de Imagem ou Vídeo para Fundo de Cena Customizado"
              >
                <Upload size={13} />
                <span>{customSceneBgUrl ? '️ Cena Upload' : ' + Upload Cena'}</span>
              </button>
              <input
                ref={sceneFileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleSceneFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* OBS STINGER SCENE TRANSITIONS PANEL */}
          <div className="bg-neutral-950/80 border border-amber-500/30 rounded-2xl p-4 flex flex-col gap-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-400" /> Vinhetas & Transições com Vento (OBS Stinger):
              </span>
              <span className="text-[10px] text-white/50 font-mono">
                Animação + Som em tempo real
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => triggerStingerTransition(undefined, 'wind')}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer text-left flex flex-col gap-1 ${
                  activeStingerType === 'wind'
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-lg'
                    : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-black">
                  <Wind size={14} className="text-amber-400" />
                  <span>️ Vento B.I.A.</span>
                </div>
                <span className="text-[10px] text-white/50 font-mono">
                  Faixa Tricolor + Vento
                </span>
              </button>

              <button
                type="button"
                onClick={() => triggerStingerTransition(undefined, 'promo')}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer text-left flex flex-col gap-1 ${
                  activeStingerType === 'promo'
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-lg'
                    : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-black">
                  <BookOpen size={14} className="text-amber-300" />
                  <span>Material Didático</span>
                </div>
                <span className="text-[10px] text-white/50 font-mono">
                  Oferta do Livro B.I.A. + QR
                </span>
              </button>

              <button
                type="button"
                onClick={() => triggerStingerTransition(undefined, 'conversation')}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer text-left flex flex-col gap-1 ${
                  activeStingerType === 'conversation'
                    ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-lg'
                    : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-black">
                  <Mic size={14} className="text-emerald-400" />
                  <span>Conversação B.I.A.</span>
                </div>
                <span className="text-[10px] text-white/50 font-mono">
                  Onda Verde Pronúncia
                </span>
              </button>

              <button
                type="button"
                onClick={() => triggerStingerTransition(undefined, 'cyber')}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer text-left flex flex-col gap-1 ${
                  activeStingerType === 'cyber'
                    ? 'bg-yellow-500/20 border-yellow-500/60 text-yellow-300 shadow-lg'
                    : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-black">
                  <Zap size={14} className="text-yellow-400" />
                  <span>Flash Tópico</span>
                </div>
                <span className="text-[10px] text-white/50 font-mono">
                  Impacto Sônico Dica
                </span>
              </button>

              <button
                type="button"
                onClick={() => triggerStingerTransition(undefined, 'socials')}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer text-left flex flex-col gap-1 ${
                  activeStingerType === 'socials'
                    ? 'bg-pink-500/20 border-pink-500/60 text-pink-300 shadow-lg'
                    : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-black">
                  <Share2 size={14} className="text-pink-400" />
                  <span>Redes Sociais</span>
                </div>
                <span className="text-[10px] text-white/50 font-mono">
                  Instagram & TikTok Reveal
                </span>
              </button>

              <button
                type="button"
                onClick={() => triggerStingerTransition(undefined, 'academy')}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer text-left flex flex-col gap-1 ${
                  activeStingerType === 'academy'
                    ? 'bg-blue-500/20 border-blue-500/60 text-blue-300 shadow-lg'
                    : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-black">
                  <Award size={14} className="text-blue-400" />
                  <span> Youbecome / VIP</span>
                </div>
                <span className="text-[10px] text-white/50 font-mono">
                  Lâminas Azuis Executivas
                </span>
              </button>

              {/* Upload Custom Stinger / Vinheta Button */}
              <button
                type="button"
                onClick={() => stingerFileInputRef.current?.click()}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer text-left flex flex-col gap-1 ${
                  activeStingerType === 'custom'
                    ? 'bg-amber-500/30 border-amber-400 text-amber-200 shadow-lg'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                }`}
                title="Upload de Vinheta em Imagem/Vídeo para Transição"
              >
                <div className="flex items-center gap-1.5 text-xs font-black">
                  <Upload size={14} className="text-amber-400" />
                  <span>{customStingerMediaUrl ? ' Vinheta Upload' : ' + Upload Vinheta'}</span>
                </div>
                <span className="text-[10px] text-white/50 font-mono">
                  {customStingerMediaUrl ? 'Sua Vinheta Própria' : 'Upload MP4 ou PNG'}
                </span>
              </button>
              <input
                ref={stingerFileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleStingerFileUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: COMPACT ACCORDION BALLOON DECK (EXPANDS FULLY ON CLICK) */}
        <div className="lg:col-span-4 self-start shrink-0 w-full z-20 pointer-events-auto flex flex-col gap-2.5 pb-12">
          
          {/* HEADER BADGE */}
          <div className="flex items-center justify-between px-3 py-2 bg-neutral-950/90 border border-white/10 rounded-2xl shadow-xl">
            <span className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <SlidersHorizontal size={13} className="text-amber-400" />
              <span>Painel de Opções em Balões</span>
            </span>
            <span className="text-[10px] font-mono text-white/50">
              Clique no balão para abrir
            </span>
          </div>

          {/* ACCORDION BALLOON 1: RÉGUA DE CORTE & COR DO FUNDO */}
          <div className="bg-neutral-950/90 border border-amber-500/40 rounded-2xl overflow-hidden shadow-xl transition-all">
            <button
              type="button"
              onClick={() => setExpandedAccordionBlock(expandedAccordionBlock === 'crop' ? null : 'crop')}
              className={`w-full p-3 flex items-center justify-between cursor-pointer transition-colors ${
                expandedAccordionBlock === 'crop' ? 'bg-amber-500/15 text-amber-300' : 'bg-white/5 hover:bg-white/10 text-white/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  <Scissors size={16} />
                </div>
                <div className="flex flex-col items-start text-left">
                  <span className="text-xs font-bold font-['Outfit'] uppercase tracking-wide">
                    Régua de Corte & Fundo
                  </span>
                  <span className="text-[10px] text-white/50 font-mono">
                    {isCropActive ? '️ Corte Ativo' : ' Tela Inteira'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full border border-white/30 shadow-inner"
                  style={{ backgroundColor: stageBgColor }}
                  title={`Cor do Fundo: ${stageBgColor}`}
                />
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                  isCropActive ? 'bg-amber-500 text-neutral-950' : 'bg-white/10 text-white/60'
                }`}>
                  {isCropActive ? 'Ativo' : 'Normal'}
                </span>
                {expandedAccordionBlock === 'crop' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </button>

            {expandedAccordionBlock === 'crop' && (
              <div className="p-3.5 border-t border-white/10 flex flex-col gap-3 bg-black/40 text-xs animate-fade-in">
                {/* TOGGLE CROP ACTIVE */}
                <div className="flex items-center justify-between bg-neutral-900 p-2.5 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2">
                    <Crop size={16} className="text-amber-400" />
                    <span className="font-bold text-white text-xs">Ativar Régua de Corte:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCropActive(!isCropActive)}
                    className={`px-3 py-1 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all ${
                      isCropActive ? 'bg-amber-500 text-neutral-950 shadow-md font-black' : 'bg-white/10 text-white/40'
                    }`}
                  >
                    {isCropActive ? 'LIGADO' : 'DESLIGADO'}
                  </button>
                </div>

                {/* CROP SLIDERS (GRID 2x2) */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex flex-col gap-1 bg-neutral-900/80 p-2 rounded-xl border border-white/10">
                    <div className="flex justify-between text-[10px] font-mono text-white/80">
                      <span>Corte Topo:</span>
                      <span className="text-amber-300 font-bold">{cropTop}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={cropTop}
                      onChange={(e) => {
                        setCropTop(Number(e.target.value));
                        setIsCropActive(true);
                      }}
                      className="w-full accent-amber-400 cursor-pointer h-1.5 rounded bg-neutral-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1 bg-neutral-900/80 p-2 rounded-xl border border-white/10">
                    <div className="flex justify-between text-[10px] font-mono text-white/80">
                      <span>Corte Base:</span>
                      <span className="text-amber-300 font-bold">{cropBottom}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={cropBottom}
                      onChange={(e) => {
                        setCropBottom(Number(e.target.value));
                        setIsCropActive(true);
                      }}
                      className="w-full accent-amber-400 cursor-pointer h-1.5 rounded bg-neutral-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1 bg-neutral-900/80 p-2 rounded-xl border border-white/10">
                    <div className="flex justify-between text-[10px] font-mono text-white/80">
                      <span>Corte Esquerda:</span>
                      <span className="text-amber-300 font-bold">{cropLeft}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={cropLeft}
                      onChange={(e) => {
                        setCropLeft(Number(e.target.value));
                        setIsCropActive(true);
                      }}
                      className="w-full accent-amber-400 cursor-pointer h-1.5 rounded bg-neutral-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1 bg-neutral-900/80 p-2 rounded-xl border border-white/10">
                    <div className="flex justify-between text-[10px] font-mono text-white/80">
                      <span>Corte Direita:</span>
                      <span className="text-amber-300 font-bold">{cropRight}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={cropRight}
                      onChange={(e) => {
                        setCropRight(Number(e.target.value));
                        setIsCropActive(true);
                      }}
                      className="w-full accent-amber-400 cursor-pointer h-1.5 rounded bg-neutral-800"
                    />
                  </div>
                </div>

                {/* CROP ZOOM SLIDER */}
                <div className="flex flex-col gap-1 bg-neutral-900/80 p-2.5 rounded-xl border border-white/10">
                  <div className="flex justify-between text-[10px] font-mono text-white/80">
                    <span>Zoom da Área Cortada:</span>
                    <span className="text-amber-300 font-bold">{cropZoom.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="2.5"
                    step="0.1"
                    value={cropZoom}
                    onChange={(e) => {
                      setCropZoom(Number(e.target.value));
                      setIsCropActive(true);
                    }}
                    className="w-full accent-amber-400 cursor-pointer h-1.5 rounded bg-neutral-800"
                  />
                </div>

                {/* COR DO FUNDO DO ESTÚDIO */}
                <div className="flex flex-col gap-1.5 border-t border-white/10 pt-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-white/90 font-bold flex items-center gap-1">
                      <Palette size={14} className="text-amber-400" /> Cor do Fundo do Estúdio:
                    </span>
                    <input
                      type="color"
                      value={stageBgColor}
                      onChange={(e) => setStageBgColor(e.target.value)}
                      className="w-6 h-6 rounded border border-white/20 bg-transparent cursor-pointer"
                      title="Escolher cor personalizada"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { color: '#000000', label: 'Preto' },
                      { color: '#0f172a', label: 'Slate' },
                      { color: '#00ff00', label: 'Chroma' },
                      { color: '#1e1b4b', label: 'Roxo' },
                      { color: '#311212', label: 'Vinho' },
                      { color: '#022c22', label: 'Verde' },
                    ].map((bg) => (
                      <button
                        key={bg.color}
                        type="button"
                        onClick={() => setStageBgColor(bg.color)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 border cursor-pointer ${
                          stageBgColor === bg.color ? 'border-amber-400 bg-amber-500/20 text-amber-300' : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full border border-white/30" style={{ backgroundColor: bg.color }} />
                        <span>{bg.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* RESET CROP BUTTON */}
                <button
                  type="button"
                  onClick={() => {
                    setCropTop(0);
                    setCropBottom(0);
                    setCropLeft(0);
                    setCropRight(0);
                    setCropZoom(1.0);
                    setIsCropActive(false);
                  }}
                  className="py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-[10px] font-mono font-bold border border-white/10 cursor-pointer"
                >
                   Resetar Corte para Tela Inteira
                </button>
              </div>
            )}
          </div>

          {/* ACCORDION BALLOON 2: MANCHETES & STICKER ROTATIVO */}
          <div className="bg-neutral-950/90 border border-red-500/40 rounded-2xl overflow-hidden shadow-xl transition-all">
            <button
              type="button"
              onClick={() => setExpandedAccordionBlock(expandedAccordionBlock === 'news' ? null : 'news')}
              className={`w-full p-3 flex items-center justify-between cursor-pointer transition-colors ${
                expandedAccordionBlock === 'news' ? 'bg-red-500/15 text-red-300' : 'bg-white/5 hover:bg-white/10 text-white/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-xl bg-red-600/20 text-red-400 border border-red-500/40">
                  <Newspaper size={16} />
                </div>
                <div className="flex flex-col items-start text-left">
                  <span className="text-xs font-bold font-['Outfit'] uppercase tracking-wide">
                    Manchetes & Sticker
                  </span>
                  <span className="text-[10px] text-white/50 font-mono">
                    {showNewsHeadline || showTicker ? ' Exibindo na Tela' : ' Ocultos'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                  showNewsHeadline || showTicker ? 'bg-red-600 text-white' : 'bg-white/10 text-white/60'
                }`}>
                  {(showNewsHeadline ? 1 : 0) + (showTicker ? 1 : 0)} ON
                </span>
                {expandedAccordionBlock === 'news' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </button>

            {expandedAccordionBlock === 'news' && (
              <div className="p-3.5 border-t border-white/10 flex flex-col gap-3 bg-black/40 text-xs animate-fade-in">
                {/* QUICK TOGGLES ROW */}
                <div className="flex items-center justify-between bg-neutral-900 p-2 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowNewsHeadline(!showNewsHeadline)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold cursor-pointer ${
                      showNewsHeadline ? 'bg-red-600 text-white font-black' : 'bg-white/5 text-white/40'
                    }`}
                  >
                    Manchete {showNewsHeadline ? 'ON' : 'OFF'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowTicker(!showTicker)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold cursor-pointer ${
                      showTicker ? 'bg-amber-500 text-neutral-950 font-black' : 'bg-white/5 text-white/40'
                    }`}
                  >
                    Sticker {showTicker ? 'ON' : 'OFF'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowLiveClock(!showLiveClock)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold cursor-pointer ${
                      showLiveClock ? 'bg-blue-600 text-white font-black' : 'bg-white/5 text-white/40'
                    }`}
                  >
                    Relógio {showLiveClock ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* EMISSORA / LOGO STYLE */}
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-mono text-white/80 font-bold">Estilo da Emissora:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'jovem_pan', label: 'JP BIA NEWS', bg: 'bg-red-700' },
                      { id: 'fox_news', label: 'FOX BIA NEWS', bg: 'bg-blue-900' },
                      { id: 'brazilian_news', label: ' BRASIL LIVE', bg: 'bg-emerald-800' },
                      { id: 'bia_live', label: ' BIA GOLD', bg: 'bg-amber-600' },
                    ].map((logo) => (
                      <button
                        key={logo.id}
                        type="button"
                        onClick={() => setNewsLogoStyle(logo.id as any)}
                        className={`p-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${
                          newsLogoStyle === logo.id
                            ? `${logo.bg} text-white border-amber-400 font-black shadow`
                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                        }`}
                      >
                        {logo.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* MANCHETE PRINCIPAL */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-mono text-white/80 font-bold">Texto da Manchete:</span>
                  <textarea
                    value={newsHeadlineText}
                    onChange={(e) => setNewsHeadlineText(e.target.value)}
                    rows={2}
                    placeholder="Digite a notícia principal..."
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/15 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* STICKER LETREIRO */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-mono text-white/80 font-bold">Texto do Sticker Rotativo:</span>
                  <textarea
                    value={tickerText}
                    onChange={(e) => setTickerText(e.target.value)}
                    rows={2}
                    placeholder="Texto do letreiro inferior..."
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ACCORDION BALLOON 3: QR CODE PIX & LINKS */}
          <div className="bg-neutral-950/90 border border-amber-500/40 rounded-2xl overflow-hidden shadow-xl transition-all">
            <button
              type="button"
              onClick={() => setExpandedAccordionBlock(expandedAccordionBlock === 'qr' ? null : 'qr')}
              className={`w-full p-3 flex items-center justify-between cursor-pointer transition-colors ${
                expandedAccordionBlock === 'qr' ? 'bg-amber-500/15 text-amber-300' : 'bg-white/5 hover:bg-white/10 text-white/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  <QrCode size={16} />
                </div>
                <div className="flex flex-col items-start text-left">
                  <span className="text-xs font-bold font-['Outfit'] uppercase tracking-wide">
                    QR Code Pix
                  </span>
                  <span className="text-[10px] text-white/50 font-mono">
                    {showQr ? ' Exibindo no Canto' : ' Oculto'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                  showQr ? 'bg-amber-500 text-neutral-950' : 'bg-white/10 text-white/60'
                }`}>
                  {showQr ? 'ON' : 'OFF'}
                </span>
                {expandedAccordionBlock === 'qr' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </button>

            {expandedAccordionBlock === 'qr' && (
              <div className="p-3.5 border-t border-white/10 flex flex-col gap-3 bg-black/40 text-xs animate-fade-in">
                <div className="flex items-center justify-between bg-neutral-900 p-2.5 rounded-xl border border-white/10">
                  <span className="font-bold text-white text-xs">Exibir QR Code na Tela:</span>
                  <button
                    type="button"
                    onClick={() => setShowQr(!showQr)}
                    className={`px-3 py-1 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all ${
                      showQr ? 'bg-amber-500 text-neutral-950 font-black' : 'bg-white/10 text-white/40'
                    }`}
                  >
                    {showQr ? 'EXIBINDO' : 'OCULTO'}
                  </button>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-mono text-white/80 font-bold">URL / Chave Pix:</span>
                  <input
                    type="text"
                    value={qrUrl}
                    onChange={(e) => setQrUrl(e.target.value)}
                    placeholder="https://suapagina.com ou chave pix..."
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* QR PRESETS SHORTCUTS */}
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-mono text-white/80 font-bold">Atalhos do QR Code:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {savedQrPresets.map((qp) => (
                      <button
                        key={qp.id}
                        type="button"
                        onClick={() => {
                          setQrUrl(qp.url);
                          setShowQr(true);
                        }}
                        className={`p-2 rounded-xl text-xs font-bold border cursor-pointer text-left truncate transition-all ${
                          qrUrl === qp.url && showQr
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-black'
                            : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                        }`}
                        title={qp.url}
                      >
                        <span className="block truncate font-['Outfit']">{qp.title || 'Atalho'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ACCORDION BALLOON 4: CÂMERA FLUTUANTE PIP */}
          <div className="bg-neutral-950/90 border border-emerald-500/40 rounded-2xl overflow-hidden shadow-xl transition-all">
            <button
              type="button"
              onClick={() => setExpandedAccordionBlock(expandedAccordionBlock === 'camera' ? null : 'camera')}
              className={`w-full p-3 flex items-center justify-between cursor-pointer transition-colors ${
                expandedAccordionBlock === 'camera' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 hover:bg-white/10 text-white/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  <Camera size={16} />
                </div>
                <div className="flex flex-col items-start text-left">
                  <span className="text-xs font-bold font-['Outfit'] uppercase tracking-wide">
                    Câmera Flutuante (PiP)
                  </span>
                  <span className="text-[10px] text-white/50 font-mono">
                    {showPipCamera ? ' Ativa na Tela' : ' Desativada'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                  showPipCamera ? 'bg-emerald-500 text-neutral-950' : 'bg-white/10 text-white/60'
                }`}>
                  {showPipCamera ? 'ON' : 'OFF'}
                </span>
                {expandedAccordionBlock === 'camera' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </button>

            {expandedAccordionBlock === 'camera' && (
              <div className="p-3.5 border-t border-white/10 flex flex-col gap-3 bg-black/40 text-xs animate-fade-in">
                <div className="flex items-center justify-between bg-neutral-900 p-2.5 rounded-xl border border-white/10">
                  <span className="font-bold text-white text-xs">Ativar Câmera Flutuante:</span>
                  <button
                    type="button"
                    onClick={() => setShowPipCamera(!showPipCamera)}
                    className={`px-3 py-1 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all ${
                      showPipCamera ? 'bg-emerald-500 text-neutral-950 font-black' : 'bg-white/10 text-white/40'
                    }`}
                  >
                    {showPipCamera ? 'LIGADA' : 'DESLIGADA'}
                  </button>
                </div>

                {!isWebcamActive && showPipCamera && (
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-amber-300">
                      ️ Webcam desligada.
                    </span>
                    <button
                      type="button"
                      onClick={handleStartWebcam}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-[10px] rounded-lg cursor-pointer transition-all uppercase"
                    >
                      Ligar Câmera
                    </button>
                  </div>
                )}

                {/* SHAPE SELECTOR */}
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-mono text-white/80 font-bold">Formato da Moldura:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'circle', label: 'Círculo' },
                      { id: 'square', label: 'Quadrada' },
                      { id: 'badge_bia', label: 'Badge B.I.A.' },
                      { id: 'badge_b', label: 'Logo B' },
                    ].map((shape) => (
                      <button
                        key={shape.id}
                        type="button"
                        onClick={() => setPipCameraShape(shape.id as any)}
                        className={`p-1.5 rounded-lg border text-xs font-bold font-['Outfit'] cursor-pointer transition-all ${
                          pipCameraShape === shape.id
                            ? 'bg-emerald-600 text-white border-white/40 font-black shadow'
                            : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        {shape.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SIZE SELECTOR */}
                <div className="flex items-center justify-between border-t border-white/10 pt-2">
                  <span className="text-[11px] font-mono text-white/80 font-bold">Tamanho da Câmera:</span>
                  <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                    {(['sm', 'md', 'lg'] as const).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setPipCameraSize(sz)}
                        className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase cursor-pointer transition-all ${
                          pipCameraSize === sz
                            ? 'bg-emerald-500 text-neutral-950 shadow'
                            : 'text-white/60 hover:text-white'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ACCORDION BALLOON 5: TRANSMISSÃO & YOUTUBE LIVE */}
          <div className="bg-neutral-950/90 border border-blue-500/40 rounded-2xl overflow-hidden shadow-xl transition-all">
            <button
              type="button"
              onClick={() => setExpandedAccordionBlock(expandedAccordionBlock === 'rtmp' ? null : 'rtmp')}
              className={`w-full p-3 flex items-center justify-between cursor-pointer transition-colors ${
                expandedAccordionBlock === 'rtmp' ? 'bg-blue-500/15 text-blue-300' : 'bg-white/5 hover:bg-white/10 text-white/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/40">
                  <Tv size={16} />
                </div>
                <div className="flex flex-col items-start text-left">
                  <span className="text-xs font-bold font-['Outfit'] uppercase tracking-wide">
                    Live & YouTube Studio
                  </span>
                  <span className="text-[10px] text-white/50 font-mono">
                    {isLiveBroadcasting ? ' AO VIVO NO AR' : streamKey ? ' Chave Configurada' : '️ Configurar Chave'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                  isLiveBroadcasting ? 'bg-red-600 text-white animate-pulse' : streamKey ? 'bg-emerald-500 text-neutral-950' : 'bg-white/10 text-white/60'
                }`}>
                  {isLiveBroadcasting ? 'LIVE' : streamKey ? 'PRONTO' : 'CONFIG'}
                </span>
                {expandedAccordionBlock === 'rtmp' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </button>

            {expandedAccordionBlock === 'rtmp' && (
              <div className="p-3.5 border-t border-white/10 flex flex-col gap-3 bg-black/40 text-xs animate-fade-in">
                {/* OPEN POPOUT STAGE BUTTON */}
                <button
                  type="button"
                  onClick={handleOpenPopoutStage}
                  className={`w-full py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow ${
                    popoutWindow && !popoutWindow.closed
                      ? 'bg-emerald-500 text-neutral-950'
                      : 'bg-blue-600 text-white hover:bg-blue-500'
                  }`}
                >
                  <ExternalLink size={14} />
                  <span>{popoutWindow && !popoutWindow.closed ? 'JANELA DO ALUNO ON' : 'ABRIR JANELA DO ALUNO'}</span>
                </button>

                {/* PLATFORM SELECTOR */}
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-mono text-white/80 font-bold">Plataforma:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setStreamTargetPlatform('youtube');
                        setStreamServerUrl('rtmp://a.rtmp.youtube.com/live2');
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border cursor-pointer flex items-center justify-center gap-1 ${
                        streamTargetPlatform === 'youtube' ? 'bg-red-600 text-white border-red-400 font-black shadow' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      <Youtube size={14} /> YouTube
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStreamTargetPlatform('instagram');
                        setStreamServerUrl('rtmps://live-upload.instagram.com:443/rtmp/');
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border cursor-pointer flex items-center justify-center gap-1 ${
                        streamTargetPlatform === 'instagram' ? 'bg-pink-600 text-white border-pink-400 font-black shadow' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      <span> Instagram</span>
                    </button>
                  </div>
                </div>

                {/* STREAM KEY INPUT & SAVE */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-amber-300 font-bold flex items-center gap-1">
                      <Key size={12} /> Chave de Transmissão:
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowStreamKeySecret(!showStreamKeySecret)}
                      className="text-[10px] text-white/60 hover:text-white flex items-center gap-1 cursor-pointer font-mono"
                    >
                      {showStreamKeySecret ? <EyeOff size={11} /> : <Eye size={11} />}
                      <span>{showStreamKeySecret ? 'Ocultar' : 'Mostrar'}</span>
                    </button>
                  </div>

                  <input
                    type={showStreamKeySecret ? 'text' : 'password'}
                    value={streamKey}
                    onChange={(e) => {
                      setStreamKey(e.target.value);
                      setIsStreamKeyApplied(false);
                    }}
                    placeholder="Cole sua Chave do YouTube Studio..."
                    className="w-full px-2.5 py-1.5 rounded-xl bg-neutral-900 border border-amber-500/60 text-xs text-amber-300 font-mono focus:outline-none"
                  />

                  <div className="grid grid-cols-2 gap-1.5 mt-1">
                    <button
                      type="button"
                      onClick={() => handleSaveStreamConfig(streamServerUrl, streamKey)}
                      className="py-1.5 px-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Save size={12} className="text-amber-400" /> Save
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyStreamKey}
                      className="py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-black text-[11px] flex items-center justify-center gap-1 cursor-pointer uppercase shadow"
                    >
                      <CheckCircle2 size={12} /> Aplicar
                    </button>
                  </div>
                </div>

                {/* STREAM STATUS MESSAGE BADGE */}
                {streamStatusMessage && (
                  <div className="p-2.5 rounded-xl bg-neutral-900 border border-blue-500/40 text-[11px] font-mono text-blue-300 font-bold flex items-center gap-2 animate-fade-in shadow">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping shrink-0" />
                    <span>{streamStatusMessage}</span>
                  </div>
                )}

                {/* LIVE BROADCAST BUTTON */}
                <button
                  type="button"
                  onClick={handleToggleLiveBroadcast}
                  className={`w-full py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-lg transition-all ${
                    isLiveBroadcasting
                      ? 'bg-red-600 text-white border border-amber-400 animate-pulse'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 border border-emerald-300'
                  }`}
                >
                  <Radio size={16} className={isLiveBroadcasting ? 'animate-spin' : ''} />
                  <span>
                    {isLiveBroadcasting
                      ? `ENCERRAR LIVE (${formatTime(liveBroadcastDurationSec)})`
                      : 'IR PRO AR (INICIAR TRANSMISSÃO)'}
                  </span>
                </button>

                {/* DIRECT YOUTUBE LINK */}
                <div className="p-2.5 bg-neutral-900 border border-amber-500/30 rounded-xl flex items-center justify-between gap-2">
                  <span className="text-[10px] text-white/80 font-mono">Transmissão Direta sem OBS:</span>
                  <a
                    href="https://studio.youtube.com/live"
                    target="_blank"
                    rel="noreferrer"
                    className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold rounded-lg cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Youtube size={12} /> YouTube Live
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MEET & OBS FULLSCREEN STREAM OVERLAY MODAL ("ENTRAR NO AR") */}
      <AnimatePresence>
        {isFullscreenMeet && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="fixed inset-0 z-[100000] bg-neutral-950 p-2 sm:p-4 md:p-6 flex flex-col justify-between overflow-y-auto max-h-screen select-none"
          >
            {/* Top Minimalist Header */}
            <div className={`flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2 z-30 transition-all duration-300 ${isStealthPresentation ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-red-600 rounded-xl text-white animate-pulse">
                  <Radio size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-mono font-bold text-[10px] uppercase border border-red-500/30">
                      NO AR • BRAZILIAN LIVE
                    </span>
                    <span className="text-xs font-bold text-white hidden sm:inline">
                      Estúdio Limpo (Transmissão para Aluno)
                    </span>
                  </div>
                  <p className="text-[10px] text-amber-400 font-mono mt-0.5 hidden sm:block">
                    Fonte Atual: {streamSource === 'internal_app' ? 'App Interno' : streamSource === 'screen' ? 'Tela / Episoden' : streamSource === 'webcam' ? 'Câmera' : streamSource === 'pip' ? 'PIP' : 'Cena'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsStealthPresentation(!isStealthPresentation)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isStealthPresentation
                      ? 'bg-amber-500 text-neutral-950 font-black shadow-lg shadow-amber-950/50'
                      : 'bg-white/10 hover:bg-white/20 text-white/80'
                  }`}
                  title="Ocultar todas as barras e ações para o aluno não ver o professor mexendo"
                >
                  <EyeOff size={14} />
                  <span>{isStealthPresentation ? 'Modo Sigiloso (Ativo)' : 'Ocultar Ações do Aluno'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenPopoutStage}
                  className="px-3 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  title="Abrir janela separada contendo apenas o palco para compartilhar na aula (Brazilian Class)"
                >
                  <ExternalLink size={14} />
                  <span className="hidden md:inline">Janela Limpa Aluno</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsHudCollapsed(!isHudCollapsed)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <SlidersHorizontal size={14} />
                  <span>{isHudCollapsed ? 'Exibir Controles' : 'Ocultar Painel'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsFullscreenMeet(false)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow-lg shadow-red-950/60 flex items-center gap-1.5"
                >
                  <LogOut size={14} />
                  <span>SAIR DO AR</span>
                </button>
              </div>
            </div>

            {/* Main Stage Clean Canvas (16:9) */}
            <div className="flex-1 my-1 md:my-2 flex flex-col items-center justify-center relative w-full overflow-hidden">
              <div className="relative w-full max-w-5xl max-h-[48vh] sm:max-h-[55vh] md:max-h-[60vh] aspect-video rounded-3xl bg-neutral-950 border-2 border-amber-500/30 shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col justify-between p-4 md:p-6 mx-auto shrink-0 transition-all duration-300">
                {/* VIDEO FEEDS IN CLEAN MODE */}
                {isScreenCapturing && (streamSource === 'screen' || streamSource === 'pip') && (
                  <video
                    ref={attachScreenStream}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-contain bg-black z-0"
                  />
                )}

                {/* WEBCAM IN CLEAN MODE */}
                {isWebcamActive && streamSource === 'webcam' && (
                  <video
                    ref={attachWebcamStream}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover bg-black z-0"
                  />
                )}

                {/* PIP WEBCAM IN CLEAN MODE */}
                {isWebcamActive && streamSource === 'pip' && (
                  <video
                    ref={attachWebcamStream}
                    autoPlay
                    playsInline
                    muted
                    className="absolute bottom-16 right-6 w-48 h-36 rounded-2xl border-2 border-amber-400 shadow-2xl object-cover z-20"
                  />
                )}

                {/* INTERNAL APP MODULE IN CLEAN MODE */}
                {streamSource === 'internal_app' && (
                  <div className="absolute inset-0 z-10 bg-neutral-950 overflow-y-auto p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between bg-neutral-900 border border-white/10 p-2.5 rounded-xl shrink-0 z-20">
                      <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <AppWindow size={14} className="text-amber-400" /> Transmitindo Módulo Interno do App:
                      </span>
                      <div className="flex items-center gap-1.5 bg-black/50 p-1 rounded-lg border border-white/10 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setInternalAppModule('readclub')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1 ${
                            internalAppModule === 'readclub'
                              ? 'bg-amber-500 text-neutral-950 font-black shadow'
                              : 'text-white/70 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <BookOpen size={13} /> Read Club
                        </button>
                        <button
                          type="button"
                          onClick={() => setInternalAppModule('conversation')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1 ${
                            internalAppModule === 'conversation'
                              ? 'bg-amber-500 text-neutral-950 font-black shadow'
                              : 'text-white/70 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <Mic size={13} /> Conversação
                        </button>
                        <button
                          type="button"
                          onClick={() => setInternalAppModule('quiz')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1 ${
                            internalAppModule === 'quiz'
                              ? 'bg-amber-500 text-neutral-950 font-black shadow'
                              : 'text-white/70 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <HelpCircle size={13} /> Quiz
                        </button>
                        <button
                          type="button"
                          onClick={() => setInternalAppModule('youtube')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1 ${
                            internalAppModule === 'youtube'
                              ? 'bg-amber-500 text-neutral-950 font-black shadow'
                              : 'text-white/70 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <Youtube size={13} /> Music / YouTube
                        </button>
                        <button
                          type="button"
                          onClick={() => setInternalAppModule('biacompare')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1 ${
                            internalAppModule === 'biacompare'
                              ? 'bg-amber-500 text-neutral-950 font-black shadow'
                              : 'text-white/70 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <Sparkles size={13} /> BIA Compare
                        </button>
                        <button
                          type="button"
                          onClick={() => setInternalAppModule('board')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1 ${
                            internalAppModule === 'board'
                              ? 'bg-amber-500 text-neutral-950 font-black shadow'
                              : 'text-white/70 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <PenTool size={13} /> Brazilian Board
                        </button>
                        <button
                          type="button"
                          onClick={() => setInternalAppModule('tradutor')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1 ${
                            internalAppModule === 'tradutor'
                              ? 'bg-amber-500 text-neutral-950 font-black shadow'
                              : 'text-white/70 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <Languages size={13} /> Tradutor
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 w-full overflow-y-auto rounded-xl bg-black border border-white/10 p-2">
                      {internalAppModule === 'readclub' && (
                        <ReadClub
                          library={[]}
                          onAddStory={() => {}}
                          onUpdateStory={() => {}}
                          onDeleteStory={() => {}}
                          sessions={[]}
                          onSaveSession={() => {}}
                          onDeleteSession={() => {}}
                          glossary={{}}
                          onAddGlossary={() => {}}
                          onRemoveGlossary={() => {}}
                          onClearGlossary={() => {}}
                          learnedWords={{}}
                          onToggleLearnedWord={() => {}}
                          accentColor={accentColor}
                        />
                      )}

                      {internalAppModule === 'conversation' && (
                        <BrazilianConversation accentColor={accentColor} />
                      )}

                      {internalAppModule === 'quiz' && (
                        <BrazilianQuiz accentColor={accentColor} />
                      )}

                      {internalAppModule === 'youtube' && (
                        <YouTubeHub accentColor={accentColor} />
                      )}

                      {internalAppModule === 'biacompare' && (
                        <BiaCompare accentColor={accentColor} />
                      )}

                      {internalAppModule === 'board' && (
                        <BrazilianBoard accentColor={accentColor} />
                      )}

                      {internalAppModule === 'tradutor' && (
                        <BrazilianTradutor accentColor={accentColor} />
                      )}
                    </div>
                  </div>
                )}

                {/* 16:9 ENQUADRAMENTO SAFE AREA & RULE OF THIRDS GRID OVERLAY IN CLEAN MODE */}
                {showFrameGuide && (
                  <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between p-4 border-2 border-dashed border-amber-400/80 rounded-2xl bg-black/10">
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-30">
                      <div className="border-r border-b border-amber-300" />
                      <div className="border-r border-b border-amber-300" />
                      <div className="border-b border-amber-300" />
                      <div className="border-r border-b border-amber-300" />
                      <div className="border-r border-b border-amber-300" />
                      <div className="border-b border-amber-300" />
                      <div className="border-r border-amber-300" />
                      <div className="border-r border-amber-300" />
                      <div />
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                      <div className="w-16 h-[1px] bg-amber-400" />
                      <div className="h-16 w-[1px] bg-amber-400 absolute" />
                      <div className="w-8 h-8 rounded-full border-2 border-amber-400 absolute" />
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-mono font-black text-amber-300 bg-neutral-950/90 px-3 py-1 rounded-lg border border-amber-500/50 backdrop-blur-md self-start">
                      <span className="flex items-center gap-1.5">
                        <Grid size={13} className="text-amber-400" />
                         GUIA DE ENQUADRAMENTO 16:9 • REGRA DOS 3 TERÇOS
                      </span>
                      <span className="text-emerald-400 font-bold ml-3 animate-pulse">● ENQUADRADO</span>
                    </div>

                    <div className="flex justify-between items-center text-[9px] font-mono font-bold text-amber-300/90 bg-neutral-950/80 px-2.5 py-1 rounded-lg border border-amber-500/30">
                      <span>[  CENTRALIZAR ROSTO / MATÉRIA ]</span>
                      <span>[  1080p BROADCAST SAFE ]</span>
                    </div>
                  </div>
                )}

                {/* SCENE BACKGROUNDS (WHEN NO VIDEO CAPTURE) */}
                {streamSource === 'scene' && activeScene === 'starting' && (
                  <div className="absolute inset-0 bg-gradient-to-br from-red-950 via-neutral-950 to-neutral-900 flex flex-col items-center justify-center p-8 text-center z-0">
                    <BrazilianLogo size="xl" />
                    <h2 className="text-2xl md:text-4xl font-black text-white mt-4 uppercase tracking-tight">
                      A AULA COMESA EM BREVE!
                    </h2>
                    {showTimer && (
                      <div className="mt-4 px-6 py-2 bg-black/70 border border-amber-500/40 text-3xl font-mono text-amber-400 rounded-2xl shadow-xl">
                        {formatTime(timerSeconds)}
                      </div>
                    )}
                  </div>
                )}

                {streamSource === 'scene' && activeScene === 'break' && (
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-950/90 via-neutral-950 to-neutral-900 flex flex-col items-center justify-center p-8 text-center z-0">
                    <Clock size={48} className="text-amber-400 mb-3 animate-spin" />
                    <h2 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-wider">
                      INTERVALO DA AULA
                    </h2>
                    {showTimer && (
                      <div className="mt-3 px-5 py-1.5 bg-black/60 border border-white/20 text-2xl font-mono text-amber-300 rounded-xl">
                        {formatTime(timerSeconds)}
                      </div>
                    )}
                  </div>
                )}

                {streamSource === 'scene' && activeScene === 'reading' && (
                  <div className="absolute inset-0 bg-neutral-900/90 border-4 border-amber-500/30 p-8 flex flex-col justify-center z-0">
                    <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-bold uppercase mb-2">
                      <BookOpen size={18} /> Read Club & Leitura Guiada
                    </div>
                    <h2 className="text-3xl font-black text-white">{lessonSubject}</h2>
                    <p className="text-sm text-white/70 mt-2 font-light">Acompanhe a leitura e pronúncia no material na tela.</p>
                  </div>
                )}

                {streamSource === 'scene' && activeScene === 'ending' && (
                  <div className="absolute inset-0 bg-gradient-to-br from-neutral-950 via-red-950/60 to-black flex flex-col items-center justify-center p-8 text-center z-0">
                    <BrazilianLogo size="lg" />
                    <h2 className="text-3xl font-bold text-white mt-4 uppercase">
                      MUITO OBRIGADO PELA AULA!
                    </h2>
                    <p className="text-sm text-amber-400 font-mono mt-1">
                      Te vejo na próxima aula • Brazilian in Action
                    </p>
                  </div>
                )}

                {/* Overlays Top: Badge & QR Code */}
                <div className="relative z-20 flex justify-between items-start">
                  <div className="flex items-center gap-2 bg-black/80 border border-white/15 px-4 py-2 rounded-2xl backdrop-blur-md">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                    <span className="text-xs font-mono font-bold uppercase text-white">
                      BRAZILIAN IN ACTION • LIVE
                    </span>
                  </div>

                  {showQr && (
                    <div className="bg-neutral-950/90 border-2 border-amber-500/50 p-3 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col items-center gap-1">
                      <img
                        src={getQrImageUrl(qrUrl, 250)}
                        alt="QR Code"
                        className="w-24 h-24 md:w-28 md:h-28 rounded-lg border border-white/10"
                      />
                      <span className="text-[10px] font-bold text-white max-w-[150px] text-center">
                        {qrTitle}
                      </span>
                    </div>
                  )}
                </div>

                {/* Lower Thirds & Ticker Bottom */}
                <div className="relative z-20 flex flex-col gap-3 mt-auto">
                  {showLowerThird && (
                    <div className="self-start bg-neutral-950/90 border border-white/15 p-3.5 rounded-2xl backdrop-blur-md shadow-2xl flex items-center gap-3">
                      <div className="p-2.5 bg-amber-500 text-neutral-950 font-black rounded-xl">
                        BIA
                      </div>
                      <div>
                        <h4 className="text-base font-black text-white">{teacherName}</h4>
                        <p className="text-xs text-amber-400 font-mono">{lessonSubject}</p>
                      </div>
                    </div>
                  )}

                  {showTicker && (
                    <div className="w-full bg-red-950/90 border border-red-500/30 rounded-xl px-4 py-2 overflow-hidden flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-red-600 text-white font-mono text-[10px] font-bold uppercase">
                        LIVE
                      </span>
                      <div className="whitespace-nowrap overflow-hidden text-xs font-mono text-white/90 animate-marquee">
                        {tickerText}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* FLOATING STUDIO HUD CONTROL DOCK (FLOATING PROFESSOR CONTROLS) */}
              <AnimatePresence>
                {!isHudCollapsed && !isStealthPresentation && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 30 }}
                    className="relative md:absolute bottom-0 md:bottom-2 left-0 md:left-1/2 md:-translate-x-1/2 z-[100010] bg-neutral-950/95 border-2 border-amber-500/40 p-2.5 rounded-2xl backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] max-w-4xl w-full md:w-[95%] flex flex-wrap items-center justify-between gap-2.5 text-white my-2 shrink-0"
                  >
                    {/* 1. Quick Scenes */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider mr-1">
                        Cenas:
                      </span>
                      {[
                        { id: 'live', label: 'Ao Vivo', icon: Tv },
                        { id: 'starting', label: 'Em Breve', icon: Radio },
                        { id: 'reading', label: 'Leitura', icon: BookOpen },
                        { id: 'break', label: 'Intervalo', icon: Clock },
                        { id: 'ending', label: 'Fim', icon: Youtube },
                      ].map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => triggerStingerTransition(s.id as any)}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            activeScene === s.id && streamSource === 'scene'
                              ? 'bg-red-600 text-white shadow-lg'
                              : 'bg-white/10 hover:bg-white/20 text-white/80'
                          }`}
                        >
                          <s.icon size={12} />
                          <span>{s.label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="h-5 w-[1px] bg-white/20 hidden md:block" />

                    {/* 2. Video Sources */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider mr-1">
                        Fonte:
                      </span>
                      <button
                        type="button"
                        onClick={() => setStreamSource('internal_app')}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer ${
                          streamSource === 'internal_app' ? 'bg-amber-500 text-neutral-950 font-black' : 'bg-white/10 text-white/80'
                        }`}
                        title="Transmitir Módulos Internos do App (ReadClub, Conversação, B.I.A. Compare)"
                      >
                        App Interno
                      </button>

                      {isScreenCapturing && (
                        <button
                          type="button"
                          onClick={() => setStreamSource('screen')}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer ${
                            streamSource === 'screen' ? 'bg-amber-500 text-neutral-950 font-black' : 'bg-white/10 text-white/80'
                          }`}
                        >
                          Episoden
                        </button>
                      )}
                      {isWebcamActive && (
                        <button
                          type="button"
                          onClick={() => setStreamSource('webcam')}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer ${
                            streamSource === 'webcam' ? 'bg-blue-500 text-white font-black' : 'bg-white/10 text-white/80'
                          }`}
                        >
                          Câmera
                        </button>
                      )}
                      {isScreenCapturing && isWebcamActive && (
                        <button
                          type="button"
                          onClick={() => setStreamSource('pip')}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer ${
                            streamSource === 'pip' ? 'bg-purple-600 text-white font-black' : 'bg-white/10 text-white/80'
                          }`}
                        >
                          PIP
                        </button>
                      )}
                      {(!isScreenCapturing && !isWebcamActive) && (
                        <button
                          type="button"
                          onClick={handleStartScreenCapture}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-500/30 text-amber-300 font-bold text-[11px] cursor-pointer"
                        >
                          Capturar Episoden
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setShowFrameGuide(!showFrameGuide)}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1 ${
                          showFrameGuide ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40' : 'bg-white/10 text-white/80'
                        }`}
                        title="Ativar/Desativar Grade de Enquadramento 16:9"
                      >
                        <Grid size={12} />
                        <span>Guia 16:9</span>
                      </button>
                    </div>

                    <div className="h-5 w-[1px] bg-white/20 hidden md:block" />

                    {/* 3. Toggles & Sound Effects */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider mr-0.5">
                        Transições Vinhetas:
                      </span>
                      <button
                        type="button"
                        onClick={() => triggerStingerTransition(undefined, 'wind')}
                        className="px-2 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-[10px] cursor-pointer flex items-center gap-1"
                        title="Transição Vento + Logo B.I.A. (2.8s)"
                      >
                        <Wind size={12} />
                        <span>Vento B.I.A.</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => triggerStingerTransition(undefined, 'promo')}
                        className="px-2 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-[10px] cursor-pointer flex items-center gap-1"
                        title="Transição Material Didático B.I.A. (2.8s)"
                      >
                        <BookOpen size={12} />
                        <span>Livro B.I.A.</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => triggerStingerTransition(undefined, 'conversation')}
                        className="px-2 py-1 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 font-bold text-[10px] cursor-pointer flex items-center gap-1"
                        title="Transição Conversação B.I.A. (2.8s)"
                      >
                        <Mic size={12} />
                        <span>Conversação</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => triggerStingerTransition(undefined, 'cyber')}
                        className="px-2 py-1 rounded-xl bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/40 font-bold text-[10px] cursor-pointer flex items-center gap-1"
                        title="Transição Dica B.I.A. / Tópico da Aula (2.8s)"
                      >
                        <Zap size={12} />
                        <span>Dica B.I.A.</span>
                      </button>

                      <div className="h-4 w-[1px] bg-white/20 mx-1" />

                      <button
                        type="button"
                        onClick={() => setShowQr(!showQr)}
                        className={`p-1.5 rounded-xl border text-[11px] font-bold cursor-pointer ${
                          showQr ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-white/10 border-white/10 text-white/40'
                        }`}
                        title="Alternar QR Code"
                      >
                        <QrCode size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowLowerThird(!showLowerThird)}
                        className={`p-1.5 rounded-xl border text-[11px] font-bold cursor-pointer ${
                          showLowerThird ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' : 'bg-white/10 border-white/10 text-white/40'
                        }`}
                        title="Alternar Tarja de Nome"
                      >
                        <Type size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => playSoundEffect('correct')}
                        className="px-2 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold cursor-pointer"
                      >
                         Acerto
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {isStealthPresentation && (
                <div className="absolute top-2 right-2 z-[100020] opacity-30 hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => setIsStealthPresentation(false)}
                    className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold shadow-2xl cursor-pointer"
                  >
                    ️ Exibir Controles (Atalho: Tecla 'H')
                  </button>
                </div>
              )}
            </div>

            <div className={`flex justify-between items-center border-t border-white/10 pt-2 text-[11px] text-white/40 font-mono z-30 transition-all duration-300 ${isStealthPresentation ? 'opacity-0' : 'opacity-100'}`}>
              <span> Transmitindo via Brazilian LIVE / Brazilian in Action</span>
              <span>Compartilhe este estúdio no Google Meet ou grave com o gravador do computador</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ANIMATED STINGER OBS SCENE TRANSITION OVERLAY */}
      <AnimatePresence>
        {isStingerActive && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: ['-100%', '0%', '0%', '100%'] }}
            transition={{
              duration: 2.8,
              times: [0, 0.25, 0.75, 1],
              ease: 'easeInOut',
            }}
            className="fixed inset-0 z-[200000] pointer-events-none flex items-center justify-center overflow-hidden"
          >
            {/* 1. CLASSIC WIND BIA STINGER */}
            {activeStingerType === 'wind' && (
              <div className="w-full h-full bg-gradient-to-r from-red-700 via-amber-500 to-yellow-500 flex items-center justify-center shadow-[0_0_150px_rgba(234,179,8,1)] border-y-8 border-amber-300 relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2)_0%,transparent_70%)] animate-pulse" />
                <div className="relative z-10 flex items-center gap-6 text-neutral-950 font-black tracking-widest uppercase text-3xl md:text-6xl drop-shadow-2xl">
                  <BrazilianLogo size="xl" />
                  <div className="flex flex-col">
                    <span className="text-3xl md:text-5xl font-black text-neutral-950 tracking-tight">
                      BRAZILIAN IN ACTION
                    </span>
                    <span className="text-xs md:text-base font-mono font-bold text-red-950 tracking-widest">
                      ️ AULA AO VIVO • TRANSMISSÃO PROFISSIONAL B.I.A.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. PROMO MATERIAL DIDÁTICO BIA */}
            {activeStingerType === 'promo' && (
              <div className="w-full h-full bg-gradient-to-r from-neutral-950 via-amber-950 to-neutral-950 flex flex-col items-center justify-center p-8 border-y-8 border-amber-500 shadow-[0_0_120px_rgba(245,158,11,0.8)] relative">
                <div className="flex items-center gap-6 max-w-4xl bg-neutral-900/95 border-2 border-amber-500/60 p-6 md:p-8 rounded-3xl shadow-2xl backdrop-blur-xl">
                  <div className="p-4 bg-amber-500 text-neutral-950 font-black rounded-2xl flex-shrink-0 text-center">
                    <BookOpen size={48} />
                    <span className="text-[10px] font-mono font-black uppercase block mt-1">E-BOOK B.I.A.</span>
                  </div>
                  <div className="text-left flex-1">
                    <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold uppercase">
                       MATERIAL DIDÁTICO EXCLUSIVO • BRAZILIAN IN ACTION
                    </span>
                    <h3 className="text-2xl md:text-4xl font-black text-white mt-2">
                      Aprenda Português de Forma Prática & Eficiente!
                    </h3>
                    <p className="text-xs md:text-sm text-amber-200/80 mt-1 font-light">
                      Garanta seu e-book, exercícios guiados e gravações exclusivas do método Brazilian in Action.
                    </p>
                  </div>
                  <div className="hidden sm:flex flex-col items-center bg-white p-2 rounded-2xl shadow-xl flex-shrink-0">
                    <img
                      src={getQrImageUrl(qrUrl, 200)}
                      alt="QR Promo"
                      className="w-20 h-20 rounded-lg"
                    />
                    <span className="text-[9px] font-black text-neutral-900 mt-1 uppercase">ACESSE JÁ</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. BRAZILIAN CONVERSATION BIA */}
            {activeStingerType === 'conversation' && (
              <div className="w-full h-full bg-gradient-to-r from-neutral-950 via-red-950 to-emerald-950 flex items-center justify-center border-y-8 border-emerald-400 shadow-[0_0_120px_rgba(16,185,129,0.8)] relative">
                <div className="flex items-center gap-6 text-white font-black tracking-widest uppercase text-2xl md:text-5xl drop-shadow-2xl">
                  <div className="p-4 bg-emerald-500 text-neutral-950 rounded-3xl border border-emerald-300/40 shadow-xl">
                    <Mic size={48} />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-2xl md:text-4xl font-black text-white tracking-tight">
                      BRAZILIAN CONVERSATION
                    </span>
                    <span className="text-xs md:text-sm font-mono font-bold text-amber-400 tracking-widest mt-1">
                      ️ PRÁTICA GUIADA • PRONÚNCIA NATIVA & CONVERSAÇÃO B.I.A.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 4. DICA BIA / TROCA DE TÓPICO */}
            {activeStingerType === 'cyber' && (
              <div className="w-full h-full bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-600 flex items-center justify-center border-y-8 border-white shadow-[0_0_200px_rgba(255,255,255,1)] relative">
                <div className="flex items-center gap-4 text-neutral-950 font-black tracking-widest uppercase text-3xl md:text-6xl drop-shadow-2xl">
                  <Zap size={64} className="text-neutral-950 animate-bounce" />
                  <div className="flex flex-col text-left">
                    <span className="text-3xl md:text-5xl font-black text-neutral-950">
                      DICA B.I.A. DA AULA!
                    </span>
                    <span className="text-xs md:text-sm font-mono font-bold text-neutral-900 tracking-widest">
                       MUDANÇA DE TÓPICO • NOVO ASSUNTO DA TRANSMISSÃO
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 5. REDES SOCIAIS BIA */}
            {activeStingerType === 'socials' && (
              <div className="w-full h-full bg-gradient-to-r from-pink-600 via-purple-700 to-indigo-900 flex items-center justify-center border-y-8 border-pink-400 shadow-[0_0_150px_rgba(236,72,153,0.8)] relative">
                <div className="flex items-center gap-6 text-white font-black tracking-widest uppercase text-2xl md:text-5xl drop-shadow-2xl">
                  <div className="p-4 bg-pink-500 text-white rounded-3xl border border-pink-300 shadow-2xl animate-bounce">
                    <Share2 size={56} />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-3xl md:text-5xl font-black text-white tracking-tight">
                      SIGA NAS REDES SOCIAIS!
                    </span>
                    <span className="text-xs md:text-sm font-mono font-bold text-pink-200 tracking-widest mt-1">
                       @brazilianinaction • INSTAGRAM & TIKTOK
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 6. YOUBECOME ACADEMY BIA */}
            {activeStingerType === 'academy' && (
              <div className="w-full h-full bg-gradient-to-r from-neutral-950 via-blue-950 to-neutral-950 flex items-center justify-center border-y-8 border-blue-400 shadow-[0_0_150px_rgba(59,130,246,0.8)] relative">
                <div className="flex items-center gap-6 text-white font-black tracking-widest uppercase text-2xl md:text-5xl drop-shadow-2xl">
                  <div className="p-4 bg-blue-600 text-white rounded-3xl border border-blue-300 shadow-2xl">
                    <Award size={56} />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-3xl md:text-5xl font-black text-white tracking-tight">
                      YOUBECOME ACADEMY
                    </span>
                    <span className="text-xs md:text-sm font-mono font-bold text-amber-400 tracking-widest mt-1">
                       METODOLOGIA B.I.A. • CURSOS & IMERSÃO EXECUTIVE
                    </span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {/* REAL-TIME POPOUT CLEAN STAGE WINDOW PORTAL (STUDENT VIEW FOR YOUTUBE / OBS SHARE) */}
      {popoutWindow && createPortal(
        <div className="w-screen h-screen bg-neutral-950 flex flex-col items-center justify-center relative overflow-hidden select-none p-0 m-0 text-white">
          <div className="relative w-full h-full bg-neutral-950 overflow-hidden flex flex-col justify-between p-6">
            {/* 1. SCREEN CAPTURE VIDEO STREAM */}
            {isScreenCapturing && (streamSource === 'screen' || streamSource === 'pip') && (
              <video
                ref={attachScreenStream}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-contain bg-black z-0"
              />
            )}

            {/* 2. WEBCAM VIDEO STREAM */}
            {isWebcamActive && streamSource === 'webcam' && (
              <video
                ref={attachWebcamStream}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover bg-black z-0"
              />
            )}

            {/* 3. PIP WEBCAM */}
            {isWebcamActive && streamSource === 'pip' && (
              <video
                ref={attachWebcamStream}
                autoPlay
                playsInline
                muted
                className="absolute bottom-16 right-6 w-56 h-40 rounded-2xl border-2 border-amber-400 shadow-2xl object-cover z-20"
              />
            )}

            {/* 4. INTERNAL APP MODULES */}
            {streamSource === 'internal_app' && (
              <div className="absolute inset-0 z-10 bg-neutral-950 overflow-y-auto p-4 flex flex-col gap-2">
                {internalAppModule === 'readclub' && (
                  <ReadClub
                    library={library || INITIAL_READ_LIBRARY}
                    onAddStory={onAddStory || (() => {})}
                    onUpdateStory={onUpdateStory || (() => {})}
                    onDeleteStory={onDeleteStory || (() => {})}
                    sessions={sessions || []}
                    onSaveSession={onSaveSession || (() => {})}
                    onDeleteSession={onDeleteSession || (() => {})}
                    glossary={glossary || {}}
                    onAddGlossary={onAddGlossary || (() => {})}
                    onRemoveGlossary={onRemoveGlossary || (() => {})}
                    onClearGlossary={onClearGlossary || (() => {})}
                    learnedWords={learnedWords || {}}
                    onToggleLearnedWord={onToggleLearnedWord || (() => {})}
                    accentColor={accentColor}
                  />
                )}
                {internalAppModule === 'conversation' && <BrazilianConversation accentColor={accentColor} />}
                {internalAppModule === 'quiz' && <BrazilianQuiz accentColor={accentColor} />}
                {internalAppModule === 'youtube' && <YouTubeHub accentColor={accentColor} />}
                {internalAppModule === 'board' && <BrazilianBoard accentColor={accentColor} />}
                {internalAppModule === 'tradutor' && <BrazilianTradutor accentColor={accentColor} />}
              </div>
            )}

            {/* 5. ANIMATED SCENE BACKGROUNDS */}
            {streamSource === 'scene' && activeScene === 'starting' && (
              <div className="absolute inset-0 z-0 bg-gradient-to-br from-neutral-950 via-red-950 to-neutral-950 flex flex-col items-center justify-center p-8 text-center">
                <div className="p-4 bg-red-600/30 border border-red-500/50 rounded-full text-red-400 mb-4 animate-bounce">
                  <Radio size={48} />
                </div>
                <span className="px-4 py-1 rounded-full bg-red-600/20 text-red-400 border border-red-500/40 text-xs font-mono font-black uppercase tracking-widest mb-3">
                  ● A TRANSMISSÃO VAI COMEÇAR
                </span>
                <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">Brazilian LIVE</h2>
                <p className="text-sm font-mono text-amber-400/90 mt-2">Prepare seus cadernos • A aula ao vivo já vai iniciar!</p>
              </div>
            )}

            {streamSource === 'scene' && activeScene === 'reading' && (
              <div className="absolute inset-0 z-0 bg-neutral-950 overflow-y-auto p-4 flex flex-col">
                <ReadClub
                  library={library || INITIAL_READ_LIBRARY}
                  onAddStory={onAddStory || (() => {})}
                  onUpdateStory={onUpdateStory || (() => {})}
                  onDeleteStory={onDeleteStory || (() => {})}
                  sessions={sessions || []}
                  onSaveSession={onSaveSession || (() => {})}
                  onDeleteSession={onDeleteSession || (() => {})}
                  glossary={glossary || {}}
                  onAddGlossary={onAddGlossary || (() => {})}
                  onRemoveGlossary={onRemoveGlossary || (() => {})}
                  onClearGlossary={onClearGlossary || (() => {})}
                  learnedWords={learnedWords || {}}
                  onToggleLearnedWord={onToggleLearnedWord || (() => {})}
                  accentColor={accentColor}
                />
              </div>
            )}

            {streamSource === 'scene' && activeScene === 'break' && (
              <div className="absolute inset-0 z-0 bg-gradient-to-br from-neutral-950 via-amber-950/80 to-neutral-950 flex flex-col items-center justify-center p-8 text-center">
                <div className="p-4 bg-amber-500/20 border border-amber-500/40 rounded-full text-amber-400 mb-4 animate-pulse">
                  <Coffee size={48} />
                </div>
                <span className="px-4 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-mono font-black uppercase tracking-widest mb-3">
                   INTERVALO RÁPIDO
                </span>
                <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">Voltamos em Instantes!</h2>
                <p className="text-sm font-mono text-white/60 mt-2">Aproveite para tomar uma água • A aula continua em breve.</p>
              </div>
            )}

            {streamSource === 'scene' && activeScene === 'ending' && (
              <div className="absolute inset-0 z-0 bg-gradient-to-br from-neutral-950 via-blue-950 to-neutral-950 flex flex-col items-center justify-center p-8 text-center">
                <div className="p-4 bg-blue-500/20 border border-blue-500/40 rounded-full text-blue-400 mb-4 animate-pulse">
                  <Award size={48} />
                </div>
                <span className="px-4 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 text-xs font-mono font-black uppercase tracking-widest mb-3">
                   AULA CONCLUÍDA
                </span>
                <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">Obrigado pela Presença!</h2>
                <p className="text-sm font-mono text-amber-400/90 mt-2">Brazilian in Action • Até a próxima transmissão!</p>
              </div>
            )}

            {streamSource === 'scene' && activeScene === 'custom' && customSceneBgUrl && (
              <div className="absolute inset-0 z-0 bg-black flex items-center justify-center overflow-hidden">
                {customSceneBgUrl.startsWith('data:video') || customSceneBgUrl.endsWith('.mp4') ? (
                  <video src={customSceneBgUrl} autoPlay loop muted className="w-full h-full object-cover" />
                ) : (
                  <img src={customSceneBgUrl} alt="Cena Customizada" className="w-full h-full object-cover" />
                )}
              </div>
            )}

            {/* 6. OVERLAYS: TOP WATERMARK & QR CODE */}
            <div className="relative z-20 flex justify-between items-start pointer-events-none">
              <div className="flex items-center gap-3 bg-neutral-950/80 border border-white/10 px-4 py-2 rounded-2xl backdrop-blur-md shadow-xl">
                <BrazilianLogo size="sm" />
                <div className="flex flex-col">
                  <span className="text-xs font-extrabold text-white tracking-tight">BRAZILIAN LIVE</span>
                  <span className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" /> ● AO VIVO
                  </span>
                </div>
              </div>

              {showQr && (
                <div
                  className={`bg-neutral-950/90 border-2 border-amber-500/60 p-3 rounded-2xl backdrop-blur-xl shadow-2xl flex flex-col items-center gap-2 transition-all duration-300 ${getQrPositionClass(
                    qrPosition
                  )} ${getQrSizeClass(qrSize).container}`}
                >
                  <img
                    src={getQrImageUrl(qrUrl, 250)}
                    alt="QR Code Transmissão"
                    className={`rounded-xl border border-white/20 bg-white p-1 ${getQrSizeClass(qrSize).img}`}
                  />
                  {qrTitle && (
                    <span className="text-[10px] font-bold text-amber-300 text-center uppercase tracking-wider leading-tight">
                      {qrTitle}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 7. OVERLAYS: TEACHER IDENTIFICATION & FOX NEWS / JOVEM PAN BROADCAST OVERLAY */}
            <div className="relative z-20 flex flex-col gap-2 pointer-events-none mt-auto">
              {programState.showLowerThird && (
                <div className="bg-gradient-to-r from-red-950/90 via-neutral-950/95 to-neutral-950/90 border-l-4 border-red-500 p-3.5 rounded-2xl border-y border-r border-white/10 shadow-2xl backdrop-blur-xl max-w-xl self-start">
                  <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block mb-0.5">
                    AULA AO VIVO • PROFESSOR
                  </span>
                  <h4 className="text-base font-black text-white font-['Outfit']">{programState.teacherName}</h4>
                  <p className="text-xs text-white/80 font-medium">{programState.lessonSubject}</p>
                </div>
              )}

              {renderNewsBroadcastOverlay(true)}
            </div>

            {/* FLOATING CAMERA PIP OVERLAY IN POPOUT STUDENT STAGE */}
            {programState.showPipCamera && (
              <div
                className={`absolute z-35 transition-all duration-300 flex flex-col items-center pointer-events-auto ${getPipPositionClass(
                  programState.pipCameraPos
                )}`}
              >
                <div
                  className={`relative flex items-center justify-center transition-all ${getPipShapeClass(
                    programState.pipCameraShape
                  )} ${getPipSizeClass(programState.pipCameraSize)}`}
                >
                  <video
                    ref={attachWebcamStream}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${
                      programState.pipCameraShape === 'circle' || programState.pipCameraShape === 'badge_b'
                        ? 'rounded-full'
                        : 'rounded-2xl'
                    }`}
                  />

                  {!isWebcamActive && (
                    <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-2 text-center text-white">
                      <Camera size={22} className="text-amber-400 mb-1 animate-pulse" />
                      <span className="text-[9px] font-bold text-amber-300 uppercase leading-tight">
                        Câmera Prof.
                      </span>
                    </div>
                  )}

                  {programState.pipCameraShape === 'badge_b' && (
                    <div className="absolute -bottom-1 -right-1 bg-neutral-950 border-2 border-emerald-400 p-1 rounded-full shadow-2xl flex items-center justify-center">
                      <BrazilianLogo size="sm" />
                    </div>
                  )}
                </div>

                {programState.pipCameraShape === 'badge_bia' && (
                  <div className="mt-1.5 px-3 py-1 bg-gradient-to-r from-emerald-600 via-amber-500 to-blue-600 border border-white/30 rounded-full text-[10px] font-black text-white uppercase tracking-wider shadow-2xl flex items-center gap-1.5 whitespace-nowrap">
                    <span></span> Brazilian in Action
                  </div>
                )}
              </div>
            )}

            {/* 8. ANIMATED STINGER SCENE TRANSITIONS IN POPOUT */}
            <AnimatePresence>
              {isStingerActive && (
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: ['-100%', '0%', '0%', '100%'] }}
                  transition={{
                    duration: 2.8,
                    times: [0, 0.25, 0.75, 1],
                    ease: 'easeInOut',
                  }}
                  className="fixed inset-0 z-[200000] pointer-events-none flex items-center justify-center overflow-hidden"
                >
                  {activeStingerType === 'wind' && (
                    <div className="w-full h-full bg-gradient-to-r from-red-700 via-amber-500 to-yellow-500 flex items-center justify-center shadow-[0_0_150px_rgba(234,179,8,1)] border-y-8 border-amber-300 relative">
                      <div className="flex items-center gap-6 text-neutral-950 font-black tracking-widest uppercase text-3xl md:text-5xl drop-shadow-2xl">
                        <BrazilianLogo size="xl" />
                        <div className="flex flex-col text-left">
                          <span className="text-3xl md:text-5xl font-black text-neutral-950">BRAZILIAN IN ACTION</span>
                          <span className="text-xs md:text-base font-mono font-bold text-red-950 tracking-widest">
                            ️ AULA AO VIVO • TRANSMISSÃO PROFISSIONAL B.I.A.
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeStingerType === 'promo' && (
                    <div className="w-full h-full bg-gradient-to-r from-neutral-950 via-amber-950 to-neutral-950 flex flex-col items-center justify-center p-8 border-y-8 border-amber-500 shadow-[0_0_120px_rgba(245,158,11,0.8)] relative">
                      <div className="flex items-center gap-6 max-w-4xl bg-neutral-900/95 border-2 border-amber-500/60 p-6 md:p-8 rounded-3xl shadow-2xl backdrop-blur-xl">
                        <div className="p-4 bg-amber-500 text-neutral-950 font-black rounded-2xl flex-shrink-0 text-center">
                          <BookOpen size={48} />
                          <span className="text-[10px] font-mono font-black uppercase block mt-1">E-BOOK B.I.A.</span>
                        </div>
                        <div className="text-left flex-1">
                          <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold uppercase">
                             MATERIAL DIDÁTICO EXCLUSIVO • BRAZILIAN IN ACTION
                          </span>
                          <h3 className="text-2xl md:text-4xl font-black text-white mt-2">
                            Aprenda Português de Forma Prática & Eficiente!
                          </h3>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeStingerType === 'conversation' && (
                    <div className="w-full h-full bg-gradient-to-r from-neutral-950 via-red-950 to-emerald-950 flex items-center justify-center border-y-8 border-emerald-400 shadow-[0_0_120px_rgba(16,185,129,0.8)] relative">
                      <div className="flex items-center gap-6 text-white font-black tracking-widest uppercase text-2xl md:text-5xl drop-shadow-2xl">
                        <div className="p-4 bg-emerald-500 text-neutral-950 rounded-3xl border border-emerald-300/40 shadow-xl">
                          <Mic size={48} />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-2xl md:text-4xl font-black text-white tracking-tight">BRAZILIAN CONVERSATION</span>
                          <span className="text-xs md:text-sm font-mono font-bold text-amber-400 tracking-widest mt-1">
                            ️ PRÁTICA GUIADA • PRONÚNCIA NATIVA & CONVERSAÇÃO B.I.A.
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeStingerType === 'cyber' && (
                    <div className="w-full h-full bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-600 flex items-center justify-center border-y-8 border-white shadow-[0_0_200px_rgba(255,255,255,1)] relative">
                      <div className="flex items-center gap-4 text-neutral-950 font-black tracking-widest uppercase text-3xl md:text-6xl drop-shadow-2xl">
                        <Zap size={64} className="text-neutral-950 animate-bounce" />
                        <div className="flex flex-col text-left">
                          <span className="text-3xl md:text-5xl font-black text-neutral-950">DICA B.I.A. DA AULA!</span>
                          <span className="text-xs md:text-sm font-mono font-bold text-neutral-900 tracking-widest">
                             MUDANÇA DE TÓPICO • NOVO ASSUNTO DA TRANSMISSÃO
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>,
        popoutWindow.document.body
      )}

      {/* EDIT MODAL FOR QR CODE PRESET */}
      {editingQrPreset && (
        <div className="fixed inset-0 z-[300000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border-2 border-amber-500/50 p-5 rounded-2xl max-w-md w-full shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Edit2 size={16} /> Editar Atalho de QR Code
              </h3>
              <button
                type="button"
                onClick={() => setEditingQrPreset(null)}
                className="text-white/50 hover:text-white"
              >
                
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono text-white/70">Título do Atalho:</label>
              <input
                type="text"
                value={editingQrPreset.title}
                onChange={(e) => setEditingQrPreset({ ...editingQrPreset, title: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/15 text-xs text-white"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono text-white/70">Link / URL:</label>
              <input
                type="text"
                value={editingQrPreset.url}
                onChange={(e) => setEditingQrPreset({ ...editingQrPreset, url: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/15 text-xs text-white font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingQrPreset(null)}
                className="px-3 py-1.5 rounded-xl bg-white/10 text-white/70 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEditedQrPreset}
                className="px-4 py-1.5 rounded-xl bg-amber-500 text-neutral-950 text-xs font-black cursor-pointer"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL FOR TICKER PRESET */}
      {editingTickerPreset && (
        <div className="fixed inset-0 z-[300000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border-2 border-red-500/50 p-5 rounded-2xl max-w-md w-full shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
                <Edit2 size={16} /> Editar Atalho de Letreiro
              </h3>
              <button
                type="button"
                onClick={() => setEditingTickerPreset(null)}
                className="text-white/50 hover:text-white"
              >
                
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono text-white/70">Etiqueta do Botão:</label>
              <input
                type="text"
                value={editingTickerPreset.label}
                onChange={(e) => setEditingTickerPreset({ ...editingTickerPreset, label: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/15 text-xs text-white"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono text-white/70">Texto Completo do Letreiro:</label>
              <textarea
                rows={3}
                value={editingTickerPreset.text}
                onChange={(e) => setEditingTickerPreset({ ...editingTickerPreset, text: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/15 text-xs text-white font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingTickerPreset(null)}
                className="px-3 py-1.5 rounded-xl bg-white/10 text-white/70 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEditedTickerPreset}
                className="px-4 py-1.5 rounded-xl bg-red-600 text-white text-xs font-black cursor-pointer"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
      {/* TIKTOK LIVE GUIDANCE MODAL */}
      <AnimatePresence>
        {showTikTokGuideModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-neutral-900 border-2 border-pink-500/50 p-6 rounded-3xl max-w-2xl w-full shadow-2xl flex flex-col gap-5 text-white my-8"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-pink-500/20 border border-pink-500/40 text-pink-400 rounded-2xl">
                    <Share2 size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-white">
                      Como Transmitir no TikTok Live com o Brazilian LIVE
                    </h2>
                    <p className="text-xs text-pink-300/80 font-mono">
                      Guia passo a passo para fazer lives profissionais no TikTok
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTikTokGuideModal(false)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors cursor-pointer"
                >
                  
                </button>
              </div>

              <div className="flex flex-col gap-4 text-xs text-white/90 leading-relaxed">
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 font-mono text-[11px] flex items-center gap-2">
                  <span></span>
                  <span><strong>SIM!</strong> Você pode fazer Lives incríveis no TikTok usando toda a estrutura do Brazilian LIVE!</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-2">
                    <span className="px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/40 font-mono font-bold text-[10px] w-max">
                      PASSO 1: JANELA LIMPA DO ALUNO
                    </span>
                    <h4 className="font-bold text-sm text-white">1. Abra a Janela do Aluno</h4>
                    <p className="text-white/70 text-[11px]">
                      No topo da tela do Brazilian LIVE, clique em <strong>"Abrir Janela do Aluno"</strong>. Isso abre uma tela sem botões, pronta para transmissão.
                    </p>
                  </div>

                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold text-[10px] w-max">
                      PASSO 2: NO TIKTOK LIVE STUDIO
                    </span>
                    <h4 className="font-bold text-sm text-white">2. Adicione a Captura no TikTok</h4>
                    <p className="text-white/70 text-[11px]">
                      No <strong>TikTok Live Studio</strong> ou <strong>OBS Studio</strong>, adicione uma fonte de <em>"Captura de Janela" (Window Capture)</em> ou <em>"Captura de Navegador"</em>.
                    </p>
                  </div>

                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-2">
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 font-mono font-bold text-[10px] w-max">
                      PASSO 3: SELEÇÃO DA JANELA
                    </span>
                    <h4 className="font-bold text-sm text-white">3. Selecione o Brazilian LIVE</h4>
                    <p className="text-white/70 text-[11px]">
                      Escolha a Janela do Aluno como a fonte visual e áudio do sistema ativado. Ajuste o enquadramento na tela vertical do TikTok.
                    </p>
                  </div>

                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-2">
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono font-bold text-[10px] w-max">
                      PASSO 4: TROCA AO VIVO
                    </span>
                    <h4 className="font-bold text-sm text-white">4. Produza na Mesa de Som</h4>
                    <p className="text-white/70 text-[11px]">
                      Controle tudo na sua tela de Retorno e clique em <strong>" PRODUZIR TRANSISÃO"</strong>. As atualizações aparecem instantaneamente para seu público do TikTok!
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-200 text-[11px]">
                   <strong>Dica Pro:</strong> Se preferir transmitir direto pelo celular, você pode espelhar a tela do seu computador com a Janela do Aluno ativa ou usar o OBS Studio com o plugin <em>TikTok Live Stream Key</em>!
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowTikTokGuideModal(false)}
                  className="px-6 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Entendi! Fechar Guia
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DIRECT STREAMING (YOUTUBE & INSTAGRAM) GUIDANCE MODAL */}
      <AnimatePresence>
        {showDirectStreamGuideModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-neutral-900 border-2 border-red-500/50 p-6 rounded-3xl max-w-2xl w-full shadow-2xl flex flex-col gap-5 text-white my-8"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-500/20 border border-red-500/40 text-red-400 rounded-2xl">
                    <Tv size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-white">
                      Como Transmitir Direto no YouTube e Instagram Live
                    </h2>
                    <p className="text-xs text-red-300/80 font-mono">
                      Captura Automática da Janela do Aluno sem exibir botões de controle
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDirectStreamGuideModal(false)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors cursor-pointer"
                >
                  
                </button>
              </div>

              <div className="flex flex-col gap-4 text-xs text-white/90 leading-relaxed">
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300 font-mono text-[11px] flex items-center gap-2">
                  <span></span>
                  <span><strong>CAPTURA LIMPA GARANTIDA:</strong> O YouTube e o Instagram receberão apenas o vídeo final em 1080p da Janela do Aluno, com suas cenas, câmera PiP e logotipos, totalmente livre de painéis de controle.</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-2">
                    <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 font-mono font-bold text-[10px] w-max">
                      PASSO 1: CHAVE DE STREAM
                    </span>
                    <h4 className="font-bold text-sm text-white">1. Pegue sua Chave no YouTube / Instagram</h4>
                    <p className="text-white/70 text-[11px]">
                      Acesse o <strong>YouTube Studio Live</strong> ou o <strong>Instagram Live Producer</strong>, copie a <em>Stream Key (Chave de Transmissão)</em> e cole no painel do nosso estúdio.
                    </p>
                  </div>

                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold text-[10px] w-max">
                      PASSO 2: ABRIR JANELA LIMPA
                    </span>
                    <h4 className="font-bold text-sm text-white">2. Abra a Janela do Aluno</h4>
                    <p className="text-white/70 text-[11px]">
                      Clique em <strong>"Abrir Janela do Aluno"</strong> no topo da página. Uma aba separada se abrirá contendo unicamente a transmissão limpa sem botões.
                    </p>
                  </div>

                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-2">
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 font-mono font-bold text-[10px] w-max">
                      PASSO 3: NO OBS / STREAMYARD
                    </span>
                    <h4 className="font-bold text-sm text-white">3. Selecione a Captura de Janela</h4>
                    <p className="text-white/70 text-[11px]">
                      No OBS Studio, PRISM Live ou Streamyard, adicione a fonte <em>"Captura de Janela"</em> e escolha a Janela do Aluno.
                    </p>
                  </div>

                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-2">
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono font-bold text-[10px] w-max">
                      PASSO 4: INICIAR TRANSMISSÃO
                    </span>
                    <h4 className="font-bold text-sm text-white">4. Transmita para o Mundo!</h4>
                    <p className="text-white/70 text-[11px]">
                      Clique em <strong>"Iniciar Transmissão"</strong> no OBS ou no YouTube Studio. Alterne cenas e matérias no estúdio em tempo real com total controle!
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-neutral-950 border border-white/15 rounded-2xl flex flex-col gap-2 font-mono text-[11px]">
                  <span className="text-amber-400 font-bold uppercase"> Dados de Servidor Pré-Configurados:</span>
                  <div className="text-white/80 space-y-1">
                    <div>• <strong>YouTube RTMP:</strong> <code className="text-emerald-300">rtmp://a.rtmp.youtube.com/live2</code></div>
                    <div>• <strong>Instagram RTMP:</strong> <code className="text-emerald-300">rtmps://live-upload.instagram.com:443/rtmp/</code></div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleOpenPopoutStage}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider cursor-pointer flex items-center gap-1.5"
                >
                  <ExternalLink size={14} />
                  <span>Abrir Janela do Aluno Agora</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowDirectStreamGuideModal(false)}
                  className="px-6 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Entendi! Fechar Guia
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REAL-TIME POPOUT STAGE PORTAL FOR JANELA DO ALUNO */}
      {popoutWindow && !popoutWindow.closed && createPortal(
        <div
          style={{ backgroundColor: stageBgColor }}
          className="relative w-screen h-screen overflow-hidden flex flex-col justify-between p-6 select-none font-['Outfit',sans-serif] bg-neutral-950 text-white"
        >
          {/* Scene background or custom image */}
          {activeScene === 'starting' && (
            <div className="absolute inset-0 bg-gradient-to-br from-red-950 via-neutral-950 to-amber-950 flex flex-col items-center justify-center p-8 z-10 text-center">
              <Radio size={64} className="text-red-500 animate-pulse mb-4" />
              <h2 className="text-4xl font-black text-white font-['Outfit'] mb-2">TRANSMISSÃO EM BREVE</h2>
              <p className="text-lg text-amber-300 font-semibold font-['Outfit']">Brazilian in Action • A aula já vai começar!</p>
            </div>
          )}

          {activeScene === 'break' && (
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-950 via-amber-950 to-neutral-950 flex flex-col items-center justify-center p-8 z-10 text-center">
              <Clock size={64} className="text-amber-400 animate-spin mb-4" />
              <h2 className="text-4xl font-black text-white font-['Outfit'] mb-2">INTERVALO RÁPIDO</h2>
              <p className="text-lg text-amber-300 font-semibold font-['Outfit']">Voltamos em alguns instantes!</p>
            </div>
          )}

          {activeScene === 'reading' && (
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-neutral-950 to-teal-950 flex flex-col items-center justify-center p-8 z-10 text-center">
              <BookOpen size={64} className="text-emerald-400 animate-bounce mb-4" />
              <h2 className="text-4xl font-black text-white font-['Outfit'] mb-2">READ CLUB • MOMENTO LEITURA</h2>
              <p className="text-lg text-emerald-300 font-semibold font-['Outfit']">Acompanhe o texto na tela!</p>
            </div>
          )}

          {activeScene === 'ending' && (
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-950 via-red-950 to-neutral-950 flex flex-col items-center justify-center p-8 z-10 text-center">
              <Youtube size={64} className="text-red-500 animate-pulse mb-4" />
              <h2 className="text-4xl font-black text-white font-['Outfit'] mb-2">OBRIGADO POR ASSISTIR!</h2>
              <p className="text-lg text-amber-300 font-semibold font-['Outfit']">Inscreva-se no canal @brazilianinaction</p>
            </div>
          )}

          {activeScene === 'custom' && customSceneBgUrl && (
            <img src={customSceneBgUrl} alt="Fundo Customizado" className="absolute inset-0 w-full h-full object-cover z-0" />
          )}

          {/* Video feeds with crop styles applied */}
          <PopoutVideoFeed
            stream={screenVideoRef.current?.srcObject as MediaStream}
            style={getCroppedVideoStyle()}
            visible={(streamSource === 'screen' || streamSource === 'pip') && isScreenCapturing}
          />
          <PopoutVideoFeed
            stream={webcamVideoRef.current?.srcObject as MediaStream}
            style={getCroppedVideoStyle()}
            visible={streamSource === 'webcam' && isWebcamActive}
          />

          {/* Floating PiP Camera */}
          {showPipCamera && isWebcamActive && (
            <PopoutPipCamera
              stream={webcamVideoRef.current?.srcObject as MediaStream}
              posClass={getPipPositionClass(pipCameraPos)}
              sizeClass={getPipSizeClass(pipCameraSize)}
              shapeClass={getPipShapeClass(pipCameraShape)}
            />
          )}

          {/* QR Code Overlay */}
          {showQr && (
            <div className={`absolute z-30 transition-all duration-300 ${getQrPositionClass(qrPosition)}`}>
              <div className={`bg-neutral-950/95 border-2 border-amber-400/80 rounded-2xl shadow-2xl flex flex-col items-center justify-center gap-1.5 backdrop-blur-md ${getQrSizeClass(qrSize).container}`}>
                <img src={getQrImageUrl(qrUrl, 300)} alt="QR Code" className={`rounded-xl border border-white/20 object-contain shadow-md ${getQrSizeClass(qrSize).img}`} />
                {qrTitle && <span className="text-[11px] font-extrabold text-amber-300 font-['Outfit'] text-center leading-tight drop-shadow truncate w-full">{qrTitle}</span>}
              </div>
            </div>
          )}

          {/* Lower Third Overlay */}
          {showLowerThird && (
            <div className="absolute bottom-20 left-6 z-30 transition-all duration-300">
              <div className="bg-neutral-950/90 border-l-4 border-amber-400 p-3 rounded-r-2xl shadow-2xl backdrop-blur-md flex flex-col">
                <span className="text-sm font-black text-amber-300 uppercase tracking-wide font-['Outfit']">{teacherName}</span>
                <span className="text-xs font-semibold text-white/80 font-['Outfit']">{lessonSubject}</span>
              </div>
            </div>
          )}

          {/* News Headline & Ticker Overlay */}
          {renderNewsBroadcastOverlay(false)}

          {/* Live Timer */}
          {showTimer && (
            <div className="absolute top-6 left-6 z-30 bg-neutral-950/90 border border-amber-400/60 px-4 py-2 rounded-2xl text-amber-300 font-mono text-xl font-black shadow-2xl backdrop-blur-md flex items-center gap-2">
              <Clock size={20} className="text-amber-400 animate-pulse" />
              <span>{formatTime(timerSeconds)}</span>
            </div>
          )}

          {/* Stinger Transition Overlay */}
          {isStingerActive && (
            <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center bg-amber-500/30 backdrop-blur-sm animate-pulse">
              <div className="bg-neutral-950/90 border-2 border-amber-400 px-8 py-4 rounded-3xl text-amber-300 font-black text-2xl font-['Outfit'] uppercase tracking-widest shadow-2xl">
                 TRANSMISSÃO AO VIVO
              </div>
            </div>
          )}
        </div>,
        popoutWindow.document.body
      )}
    </div>
  );
};
