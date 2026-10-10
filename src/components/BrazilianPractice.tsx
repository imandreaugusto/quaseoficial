import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Video, 
  Headphones, 
  MessageSquare, 
  Sparkles, 
  ExternalLink, 
  Play, 
  Clock, 
  Check, 
  Copy, 
  Flame, 
  Star, 
  Radio, 
  Users, 
  Compass, 
  BookOpen, 
  ChevronRight,
  Maximize2,
  Minimize2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PracticePortal {
  id: string;
  name: string;
  category: string;
  tagline: string;
  description: string;
  url: string;
  isFeatured?: boolean;
  format: '1-on-1 Vídeo' | 'Mesas de Áudio' | 'Salas Temáticas' | 'Troca de Voz';
  level: 'Todos os Níveis' | 'Iniciante ao Avançado' | 'Intermediário / Avançado';
  badge: string;
  gradient: string;
  borderAccent: string;
  glowColor: string;
  stats: string;
  features: string[];
}

const PRACTICE_PORTALS: PracticePortal[] = [
  {
    id: 'episoden',
    name: 'Episoden Practice Live',
    category: 'Conversação 1-on-1 em Vídeo',
    tagline: 'Imersão global de 7 minutos por rodada com pessoas reais ao vivo',
    description: 'Nosso ambiente favorito de prática direta. Conecte-se instantaneamente por vídeo ou áudio em rodadas rápidas de 7 minutos com parceiros globais. O formato mais dinâmico para destravar a fala e perder a timidez.',
    url: 'https://episoden.com',
    isFeatured: true,
    format: '1-on-1 Vídeo',
    level: 'Todos os Níveis',
    badge: 'Ambiente Recomendado',
    gradient: 'from-amber-500/20 via-orange-500/15 to-transparent',
    borderAccent: 'border-amber-500/50 hover:border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.18)]',
    glowColor: '#f59e0b',
    stats: 'Rodadas de 7 Min • Câmera & Mic • 100% Gratuito',
    features: [
      'Pareamento instantâneo 1-on-1',
      'Tópicos e perguntas na tela para guiar o papo',
      'Excelente para perder o medo de falar',
      'Treino intenso de pronúncia e agilidade'
    ]
  },
  {
    id: 'free4talk',
    name: 'Free4Talk Audio Tables',
    category: 'Mesas Abertas de Voz',
    tagline: 'Salas temáticas de áudio divididas por níveis de proficiência',
    description: 'Espaço aberto 24 horas por dia com salas de bate-papo em grupo organizadas por nível de inglês (Qualquer nível, Intermediário, Avançado) ou tópicos como música, cinema e cultura.',
    url: 'https://www.free4talk.com',
    format: 'Mesas de Áudio',
    level: 'Iniciante ao Avançado',
    badge: 'Salas em Grupo',
    gradient: 'from-blue-500/25 via-indigo-500/10 to-transparent',
    borderAccent: 'border-blue-500/40 hover:border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.12)]',
    glowColor: '#3b82f6',
    stats: 'Salas por Nível • Microfone Aberto • 24/7',
    features: [
      'Escolha salas de acordo com o seu nível',
      'Entre apenas para ouvir ou participar ativamente',
      'Crie sua própria mesa de conversação',
      'Ótimo para listening de diferentes sotaques'
    ]
  },
  {
    id: 'speakstreet',
    name: 'SpeakStreet Community',
    category: 'Conversação & Vocabulário',
    tagline: 'Prática guiada com contexto social e expressões cotidianas',
    description: 'Comunidade dinâmica para trocar ideias sobre situações do dia a dia, trabalho, viagens e cultura. Ideal para expandir vocabulário e usar gírias naturais em contexto.',
    url: 'https://speakstreet.com',
    format: 'Salas Temáticas',
    level: 'Todos os Níveis',
    badge: 'Comunidade Fluente',
    gradient: 'from-emerald-500/25 via-teal-500/10 to-transparent',
    borderAccent: 'border-emerald-500/40 hover:border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.12)]',
    glowColor: '#10b981',
    stats: 'Tópicos Diários • Prática Guiada • Expressões',
    features: [
      'Ambiente amigável e focado em aprendizado',
      'Perfeito para prática de expressões reais',
      'Discussões sobre temas atuais e cultura',
      'Desenvolvimento de fluência natural'
    ]
  },
  {
    id: 'hellotalk',
    name: 'HelloTalk Voice Lounge',
    category: 'Troca de Voz & Nativos',
    tagline: 'Salas de áudio ao vivo com falantes nativos e estudantes do mundo todo',
    description: 'Acesse o ambiente de salas de voz ao vivo para conversar, tirar dúvidas sobre expressões culturais e praticar pronúncia com moderação amigável e correção mútua.',
    url: 'https://web.hellotalk.com',
    format: 'Troca de Voz',
    level: 'Iniciante ao Avançado',
    badge: 'Voz & Conexão',
    gradient: 'from-purple-500/25 via-pink-500/10 to-transparent',
    borderAccent: 'border-purple-500/40 hover:border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.12)]',
    glowColor: '#a855f7',
    stats: 'Salas de Voz • Feedback Mútuo • Global',
    features: [
      'Salas de áudio moderadas e participativas',
      'Troca cultural e prática de pronúncia',
      'Ideal para treinar ouvido com falantes reais',
      'Sem necessidade de downloads na versão web'
    ]
  },
  {
    id: 'hilokal',
    name: 'Hilokal Drop-in Audio',
    category: 'Mesas de Áudio & Pronúncia',
    tagline: 'Prática de conversação com microfone aberto e salas de bate-papo',
    description: 'Mesas de áudio ao vivo com temas variados, desde conversas descontraídas até desafios de pronúncia e expressões idiomáticas.',
    url: 'https://www.hilokal.com',
    format: 'Mesas de Áudio',
    level: 'Todos os Níveis',
    badge: 'Microfone Aberto',
    gradient: 'from-rose-500/25 via-orange-500/10 to-transparent',
    borderAccent: 'border-rose-500/40 hover:border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.12)]',
    glowColor: '#f43f5e',
    stats: 'Salas Dinâmicas • Microfone Aberto • Tópicos',
    features: [
      'Mesas de conversa abertas o dia todo',
      'Treinamento de entonação e ritmo de fala',
      'Feedback amigável e sem pressão',
      'Diversidade de sotaques e culturas'
    ]
  }
];

const ICEBREAKER_PROMPTS = [
  {
    en: "What's the most memorable trip you have ever taken and why?",
    pt: "Qual foi a viagem mais memorável que você já fez e por quê?"
  },
  {
    en: "If you could instantly become fluent in any language, what would it be?",
    pt: "Se você pudesse ficar fluente instantaneamente em qualquer idioma, qual seria?"
  },
  {
    en: "What kind of music do you listen to when you want to relax or focus?",
    pt: "Que tipo de música você escuta quando quer relaxar ou focar?"
  },
  {
    en: "What's your favorite comfort food from your home country?",
    pt: "Qual é a sua comida caseira favorita do seu país de origem?"
  },
  {
    en: "If you had a free weekend with no responsibilities, how would you spend it?",
    pt: "Se você tivesse um fim de semana livre sem obrigações, como passaria o tempo?"
  },
  {
    en: "What is a movie or TV series you could rewatch anytime without getting bored?",
    pt: "Qual filme ou série você assistiria a qualquer momento sem enjoar?"
  }
];

interface BrazilianPracticeProps {
  accentColor?: string;
}

// Logos opcionais: salve src/assets/images/practice/<id-do-ambiente>.png; sem arquivo, usa o favicon do próprio site.
const PRACTICE_IMAGES = import.meta.glob('../assets/images/practice/*.{jpg,jpeg,png,webp,svg}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

const PortalLogo: React.FC<{ portal: PracticePortal; className?: string }> = ({ portal, className = 'h-12 w-12' }) => {
  const [failed, setFailed] = useState(false);
  const localLogo = Object.entries(PRACTICE_IMAGES).find(([path]) => path.split('/').pop()?.replace(/\.[^.]+$/, '') === portal.id)?.[1];
  const src = localLogo || `${new URL(portal.url).origin}/favicon.ico`;
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/25 bg-white/15 shadow-lg backdrop-blur-xl ${className}`} style={{ boxShadow: `0 0 22px ${portal.glowColor}40` }}>
      {failed ? (
        <span className="text-lg font-black text-white" aria-hidden="true">{portal.name.charAt(0)}</span>
      ) : (
        <img src={src} alt="" aria-hidden="true" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-3/4 w-3/4 object-contain" />
      )}
    </span>
  );
};

export const BrazilianPractice: React.FC<BrazilianPracticeProps> = ({
  accentColor = '#f59e0b'
}) => {
  const [activePortal, setActivePortal] = useState<PracticePortal | null>(null);
  const [isPortalExpanded, setIsPortalExpanded] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [portalLoadTimedOut, setPortalLoadTimedOut] = useState(false);
  const [copiedPromptIdx, setCopiedPromptIdx] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [completedSessionsCount, setCompletedSessionsCount] = useState<number>(() => {
    return parseInt(localStorage.getItem('bia_practice_completed_count') || '0', 10);
  });

  // Practice Stopwatch
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  useEffect(() => {
    if (!activePortal) return;

    const timeout = window.setTimeout(() => setPortalLoadTimedOut(true), 12000);
    return () => window.clearTimeout(timeout);
  }, [activePortal]);

  useEffect(() => {
    if (!activePortal) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActivePortal(null);
        setIsPortalExpanded(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePortal]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleCopyPrompt = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedPromptIdx(idx);
    setTimeout(() => setCopiedPromptIdx(null), 2000);
  };

  const handleFinishPracticeRound = () => {
    if (timerSeconds > 60) {
      const nextCount = completedSessionsCount + 1;
      setCompletedSessionsCount(nextCount);
      localStorage.setItem('bia_practice_completed_count', nextCount.toString());
    }
    setIsTimerRunning(false);
    setTimerSeconds(0);
  };

  const openPortal = (portal: PracticePortal) => {
    setActivePortal(portal);
    setIsPortalExpanded(false);
    setIsPortalLoading(true);
    setPortalLoadTimedOut(false);
    if (!isTimerRunning) {
      setIsTimerRunning(true);
    }
  };

  const openPortalInNewTab = (portal: PracticePortal) => {
    window.open(portal.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-8 select-none z-10">
      
      {/* HEADER SECTION */}
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 sm:p-8 rounded-3xl bg-white/[0.07] border border-white/20 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.2)] overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        <div className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-10 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles size={11} />
              <span>Imersão & Conversação Livre</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-widest">
              100% Gratuito
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span>Brazilian Practice</span>
          </h1>

          <p className="text-xs sm:text-sm text-white/60 max-w-2xl mt-1.5 font-light leading-relaxed">
            Nossos ambientes integrados de imersão e prática de conversação ao vivo. Conecte-se com pessoas reais, treine seu vocabulário e vença a timidez de falar inglês no dia a dia.
          </p>
        </div>

        {/* PRATICE TIMER & SESSION METRICS */}
        <div className="relative flex items-center gap-3 self-start md:self-auto bg-white/10 border border-white/20 p-3 rounded-2xl backdrop-blur-xl shadow-xl">
          <div className="flex flex-col pr-3 border-r border-white/10">
            <span className="text-[9px] uppercase tracking-wider text-white/40 font-mono font-bold">
              Tempo de Prática
            </span>
            <div className="flex items-center gap-1.5 mt-0.5 font-mono text-lg font-bold text-amber-400">
              <Clock size={16} className={isTimerRunning ? 'animate-spin text-amber-400' : 'text-white/40'} />
              <span>{formatTimer(timerSeconds)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isTimerRunning ? (
              <button
                onClick={() => setIsTimerRunning(true)}
                className="px-3.5 py-2 rounded-xl bg-amber-500 text-neutral-950 hover:bg-amber-400 text-xs font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20"
              >
                <Play size={12} className="fill-current" />
                <span>Iniciar Treino</span>
              </button>
            ) : (
              <button
                onClick={handleFinishPracticeRound}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 text-neutral-950 hover:bg-emerald-400 text-xs font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <Check size={14} />
                <span>Concluir Sessão</span>
              </button>
            )}

            {completedSessionsCount > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-mono font-bold" title="Sessões de conversa concluídas">
                <Flame size={14} />
                <span>{completedSessionsCount}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FEATURED: EPISODEN HERO BANNER (USER'S TOP FAVORITE) */}
      {(() => {
        const episoden = PRACTICE_PORTALS[0];
        return (
          <div className="relative rounded-3xl bg-gradient-to-br from-amber-400/20 via-white/[0.08] to-orange-500/10 border border-amber-300/40 p-6 sm:p-8 overflow-hidden backdrop-blur-2xl shadow-[0_8px_40px_rgba(245,158,11,0.15)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
            
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-10 -bottom-10 w-60 h-60 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="hidden sm:block"><PortalLogo portal={episoden} className="h-24 w-24" /></div>
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-amber-500 text-neutral-950 font-mono text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1.5 shadow-md">
                    <Star size={11} className="fill-current" />
                    <span>Ambiente Principal Recomendado</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-white/80 font-mono text-[10px] font-bold uppercase">
                    {episoden.format}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-white/80 font-mono text-[10px] font-bold uppercase">
                    {episoden.level}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {episoden.name}
                </h2>

                <p className="text-sm sm:text-base text-amber-200/90 font-medium">
                  {episoden.tagline}
                </p>

                <p className="text-xs sm:text-sm text-white/70 font-light leading-relaxed max-w-3xl">
                  {episoden.description}
                </p>

                {/* Features Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {episoden.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-white/80">
                      <div className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                        <Check size={10} />
                      </div>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Side */}
              <div className="flex flex-col sm:flex-row lg:flex-col items-stretch gap-3 w-full lg:w-auto shrink-0">
                <button
                  onClick={() => openPortal(episoden)}
                  className="px-6 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-3 cursor-pointer shadow-xl shadow-amber-500/25 hover:scale-[1.02]"
                >
                  <Video size={18} />
                  <span>Entrar no Episoden Live</span>
                  <ChevronRight size={16} />
                </button>

                <span className="text-[10px] text-center text-white/40 font-mono">
                  Abra dentro da plataforma com câmera e microfone
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ALL OTHER HUBS & PRACTICE LABS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio size={16} className="text-amber-400" />
            <h3 className="text-xs uppercase tracking-[0.2em] font-mono font-bold text-white/80">
              Ambientes Adicionais de Prática
            </h3>
          </div>
          <span className="text-[10px] text-white/40 font-mono">
            {PRACTICE_PORTALS.length} Ambientes Disponíveis
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PRACTICE_PORTALS.slice(1).map((portal) => (
            <div
              key={portal.id}
              className={`group relative rounded-2xl bg-white/[0.08] border p-5 flex flex-col justify-between backdrop-blur-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.12] ${portal.borderAccent}`}
            >
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${portal.gradient}`} />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
              <div className="relative space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <PortalLogo portal={portal} className="h-12 w-12" />
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-white/70">
                    {portal.format}
                  </span>
                  <span className="text-[9px] font-mono text-white/40 uppercase">
                    {portal.level}
                  </span>
                </div>

                <div>
                  <h4 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <span>{portal.name}</span>
                  </h4>
                  <p className="text-xs text-amber-400/90 font-medium mt-0.5">
                    {portal.tagline}
                  </p>
                </div>

                <p className="text-xs text-white/60 font-light leading-relaxed">
                  {portal.description}
                </p>

                {/* Bullets */}
                <div className="space-y-1.5 pt-1">
                  {portal.features.slice(0, 3).map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[11px] text-white/75">
                      <div className="w-3.5 h-3.5 rounded-full bg-white/10 text-amber-400 flex items-center justify-center shrink-0 text-[8px]">
                        <Check size={8} />
                      </div>
                      <span className="truncate">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative pt-5 mt-4 border-t border-white/15 flex items-center justify-between gap-3">
                <span className="text-[10px] font-mono text-white/40 truncate">
                  {portal.stats}
                </span>

                <button
                  onClick={() => openPortal(portal)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-amber-500 hover:text-neutral-950 text-white text-xs font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border border-white/15 hover:border-transparent shadow-md"
                >
                  <span>Acessar Sala</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* QUICK CONVERSATION STARTERS (ICEBREAKERS FOR PRACTICE SESSIONS) */}
      <div className="relative overflow-hidden rounded-3xl bg-white/[0.07] border border-white/20 p-5 sm:p-6 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.2)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-amber-400" />
            <h3 className="text-xs uppercase tracking-[0.2em] font-mono font-bold text-white/90">
              Banco de Temas & Quebra-Gelo (Icebreakers)
            </h3>
          </div>
          <span className="text-[10px] text-white/40 font-mono">
            Copie e use diretamente nas conversas ao vivo
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ICEBREAKER_PROMPTS.map((prompt, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 hover:border-amber-300/50 backdrop-blur-xl transition-all flex flex-col justify-between gap-3 group"
            >
              <div className="space-y-1">
                <p className="text-xs font-medium text-white/90 leading-relaxed group-hover:text-amber-300 transition-colors">
                  "{prompt.en}"
                </p>
                <p className="text-[11px] text-white/40 font-light">
                  {prompt.pt}
                </p>
              </div>

              <button
                onClick={() => handleCopyPrompt(prompt.en, idx)}
                className="self-end px-2.5 py-1 rounded-lg bg-white/10 hover:bg-amber-500 hover:text-neutral-950 text-[10px] font-mono font-bold uppercase tracking-wider text-white/80 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copiedPromptIdx === idx ? (
                  <>
                    <Check size={11} className="text-emerald-400" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy size={11} />
                    <span>Copiar Pergunta</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {activePortal && (
          <motion.div
            key={activePortal.id}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-2 backdrop-blur-md sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActivePortal(null)}
          >
            <motion.div
              className={`relative flex flex-col overflow-hidden border border-white/20 bg-neutral-950 shadow-2xl shadow-black/60 ${
                isPortalExpanded
                  ? 'h-dvh w-screen rounded-none'
                  : 'h-[min(90dvh,900px)] w-[min(96vw,1440px)] rounded-2xl'
              }`}
              initial={{ y: 24, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 16, scale: 0.98 }}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={`${activePortal.name} incorporado`}
            >
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-neutral-900/95 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <PortalLogo portal={activePortal} className="h-9 w-9 rounded-xl" />
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-bold text-white">{activePortal.name}</h2>
                    <p className="truncate text-[11px] text-white/50">{activePortal.category}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openPortalInNewTab(activePortal)}
                    className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/15"
                  >
                    <ExternalLink size={14} />
                    <span className="hidden sm:inline">Abrir em nova aba</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPortalExpanded((expanded) => !expanded)}
                    className="rounded-lg border border-white/15 bg-white/5 p-2 text-white/80 transition hover:bg-white/15"
                    aria-label={isPortalExpanded ? 'Restaurar janela' : 'Expandir janela'}
                    title={isPortalExpanded ? 'Restaurar janela' : 'Expandir janela'}
                  >
                    {isPortalExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActivePortal(null);
                      setIsPortalExpanded(false);
                    }}
                    className="rounded-lg border border-white/15 bg-white/5 p-2 text-white/80 transition hover:border-red-400/40 hover:bg-red-500/20 hover:text-red-200"
                    aria-label="Fechar ambiente"
                    title="Fechar"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="relative min-h-0 flex-1 bg-neutral-950">
                <iframe
                  key={activePortal.id}
                  src={activePortal.url}
                  title={activePortal.name}
                  className="h-full w-full border-0 bg-neutral-950"
                  allow="camera; microphone; autoplay; fullscreen; clipboard-read; clipboard-write; display-capture"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  onLoad={() => {
                    setIsPortalLoading(false);
                    setPortalLoadTimedOut(false);
                  }}
                />
                {isPortalLoading && (
                  <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center p-3">
                    <span className="rounded-full border border-white/15 bg-neutral-900/90 px-4 py-2 text-xs text-white/80 shadow-lg">
                      Carregando {activePortal.name}…
                    </span>
                  </div>
                )}
              </div>

              <div className="flex shrink-0 flex-col gap-1 border-t border-white/10 bg-neutral-900/95 px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] text-white/55">
                  Se o site não carregar ou câmera/microfone não funcionarem, abra em uma nova aba.
                  {portalLoadTimedOut && ' O carregamento está demorando mais que o esperado.'}
                </p>
                <span className="shrink-0 text-[10px] font-mono text-amber-300/80">
                  Tempo de prática: {formatTimer(timerSeconds)}
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
