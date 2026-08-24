import React, { useState, useEffect } from 'react';
import { Clock } from './Clock';
import { ClassItem, UserProfile } from '../types';
import { 
  Calendar, 
  Instagram, 
  Youtube, 
  Video, 
  Book, 
  ArrowRight, 
  Layers, 
  Sparkles 
} from 'lucide-react';
import { motion } from 'motion/react';
import { SocialLinksBar } from './SocialLinksBar';

interface HomeProps {
  classes: ClassItem[];
  clock24h: boolean;
  accentColor: string;
  showNextClass: boolean;
  onNavigate: (app: string) => void;
  currentUser?: UserProfile | null;
  isAdmin?: boolean;
}

export const Home: React.FC<HomeProps> = ({
  classes,
  clock24h,
  accentColor,
  showNextClass,
  onNavigate,
  currentUser,
  isAdmin: propIsAdmin,
}) => {
  const [agendaMode, setAgendaMode] = useState<'semana' | 'hoje'>('semana');
  const [currentTime, setCurrentTime] = useState(new Date());

  const isAdmin = propIsAdmin !== undefined ? propIsAdmin : currentUser?.role === 'admin';

  // Persistent user selected class ID on home page (admin only)
  const [selectedClassId, setSelectedClassId] = useState<string | null>(() => {
    return localStorage.getItem('selected_class_id');
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const handleSelectClass = (id: string) => {
    setSelectedClassId((prev) => {
      const next = prev === id ? null : id;
      if (next) {
        localStorage.setItem('selected_class_id', next);
      } else {
        localStorage.removeItem('selected_class_id');
      }
      return next;
    });
  };

  const diasSemanaNomes = [
    'SEGUNDA-FEIRA',
    'TERÇA-FEIRA',
    'QUARTA-FEIRA',
    'QUINTA-FEIRA',
    'SEXTA-FEIRA',
    'SÁBADO',
    'DOMINGO',
  ];
  const diasSemanaCurto = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

  const getDayIndex = (date: Date) => {
    const jsDay = date.getDay();
    return jsDay === 0 ? 6 : jsDay - 1;
  };

  const getDecimalTime = (date: Date) => {
    return date.getHours() + date.getMinutes() / 60;
  };

  const getClassDecimalTime = (c: ClassItem) => {
    const hVal = parseInt(c.h, 10);
    const isPM = c.p === 'PM';
    if (isPM && hVal !== 12) return hVal + 12;
    if (!isPM && hVal === 12) return 0;
    return hVal;
  };

  const getNextClass = () => {
    const todayIdx = getDayIndex(currentTime);
    const decTime = getDecimalTime(currentTime);

    const classesToday = classes
      .filter((c) => c.d.includes(todayIdx))
      .map((c) => ({ ...c, decTime: getClassDecimalTime(c) }))
      .filter((c) => c.decTime > decTime)
      .sort((a, b) => a.decTime - b.decTime);

    return classesToday[0] || null;
  };

  const nextClass = getNextClass();

  const getFilteredAgenda = () => {
    const todayIdx = getDayIndex(currentTime);

    if (agendaMode === 'hoje') {
      return classes
        .filter((c) => c.d.includes(todayIdx))
        .sort((a, b) => getClassDecimalTime(a) - getClassDecimalTime(b));
    }

    return [...classes].sort((a, b) => {
      const minDayA = Math.min(...a.d);
      const minDayB = Math.min(...b.d);
      if (minDayA !== minDayB) return minDayA - minDayB;
      return getClassDecimalTime(a) - getClassDecimalTime(b);
    });
  };

  const filteredClasses = getFilteredAgenda();
  const todayIdx = getDayIndex(currentTime);
  const decTime = getDecimalTime(currentTime);

  const todayClasses = classes.filter((c) => c.d.includes(todayIdx));
  const completedTodayCount = todayClasses.filter((c) => {
    const classDec = getClassDecimalTime(c);
    return decTime > classDec + 0.85;
  }).length;
  const remainingTodayCount = todayClasses.length - completedTodayCount;

  // Reusable Social Media Footer (YouTube, TikTok, Instagram, WhatsApp) - Soltos e Separados
  const renderSocialLinks = () => (
    <div className="flex justify-center items-center px-4 py-4 w-full max-w-4xl mx-auto mt-4 mb-20 md:mb-14 shrink-0 z-10">
      <SocialLinksBar size="md" />
    </div>
  );

  // STUDENT VIEW: Pure, clean, minimalist clock, rolling background wallpapers and social links at the bottom
  if (!isAdmin) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-10 flex flex-col justify-between min-h-[calc(100vh-5rem)] z-10 select-none">
        
        {/* UPPER LEFT: IDENTICAL OFFICIAL CLOCK WITH DATE & FOUNDER TEXT */}
        <div className="flex justify-start items-center">
          <Clock clock24h={clock24h} align="left" />
        </div>

        {/* BOTTOM: SOCIAL LINKS */}
        <div className="w-full mt-auto">
          {renderSocialLinks()}
        </div>
      </div>
    );
  }

  // ADMIN / CEO VIEW: Complete management dashboard with Clock, Next Class, Schedule, and Controls
  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col gap-6 md:gap-10 z-10 select-none">
      
      {/* TOP GLANCEABILITY ZONE: SIDE-BY-SIDE CLOCK & STRATEGIC PROMINENT NEXT CLASS */}
      <div className="w-full flex flex-col md:flex-row md:items-center md:justify-between gap-6 md:gap-10 pt-2 pb-2 shrink-0">
        
        {/* THE CLOCK - LEFT ALIGNED AND SLEEK */}
        <div className="flex justify-start items-center">
          <Clock clock24h={clock24h} align="left" />
        </div>

        {/* PRÓXIMA TURMA/AULA - STRATEGICALLY PLACED ON THE RIGHT CORNER */}
        {showNextClass && nextClass && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full md:max-w-md px-5 py-3.5 rounded-2xl bg-orange-500/[0.08] border border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.15)] relative overflow-hidden flex items-center justify-between gap-4 shrink-0"
          >
            {/* Orange neon left sidebar accent */}
            <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-orange-500 shadow-[0_0_10px_#f97316]" />
            
            <div className="flex items-center gap-3 pl-1.5">
              <div className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500 shadow-[0_0_8px_#f97316]"></span>
              </div>
              <div className="flex flex-col min-w-[120px] max-w-[180px]">
                <span className="text-[9px] uppercase tracking-[0.18em] text-orange-400 font-bold font-mono leading-none">
                  Próxima Aula Hoje
                </span>
                <span className="text-xs sm:text-sm font-bold text-white tracking-tight mt-1 truncate">
                  {nextClass.n || 'Estudante'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/50 uppercase tracking-wider font-mono bg-white/[0.04] px-2 py-0.5 rounded border border-white/10">
                {nextClass.tipo}
              </span>
              <div className="flex items-center gap-1 bg-orange-500/15 px-2.5 py-1 rounded-xl border border-orange-500/30 font-mono">
                <span className="text-orange-400 font-extrabold text-sm sm:text-base">{nextClass.h}</span>
                <span className="text-amber-500 text-[10px] font-bold">{nextClass.p}</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* ADMIN MODE VIEW: TWO-COLUMN DASHBOARD - LOUSA DE HORARIOS & RESUMO */}
      <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-10 items-stretch flex-1">
        
        {/* LEFT COMPACT COCKPIT: CLASSES STATUS SUMMARY */}
        <div className="md:col-span-4 flex flex-col gap-4 w-full">
          
          {/* STATS HEADER */}
          <div className="flex items-center gap-2 px-1">
            <Layers size={14} className="text-white/40" />
            <span className="text-[10px] uppercase tracking-widest text-white/60 font-bold font-mono">Resumo do Dia</span>
          </div>
          
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-neutral-950/80 border border-white/15 rounded-xl p-3.5 text-center backdrop-blur-md shadow-lg">
              <div className="text-xl sm:text-2xl font-bold font-mono text-white/90">{classes.length}</div>
              <div className="text-[8px] uppercase tracking-wider text-white/50 mt-1 font-semibold">Total</div>
            </div>
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3.5 text-center backdrop-blur-md shadow-lg">
              <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">{todayClasses.length}</div>
              <div className="text-[8px] uppercase tracking-wider text-emerald-300/80 mt-1 font-semibold">Hoje</div>
            </div>
            <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-3.5 text-center backdrop-blur-md shadow-lg">
              <div className="text-xl sm:text-2xl font-bold font-mono text-blue-400">{remainingTodayCount}</div>
              <div className="text-[8px] uppercase tracking-wider text-blue-300/80 mt-1 font-semibold">Pendentes</div>
            </div>
          </div>

          <div className="p-4 bg-neutral-950/80 border border-white/15 rounded-2xl backdrop-blur-md shadow-lg text-[11px] sm:text-xs text-white/70 space-y-2 font-light">
            <div className="flex justify-between">
              <span>Aulas concluídas hoje:</span>
              <span className="font-mono text-white/90 font-bold">{completedTodayCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Semana de Atividades:</span>
              <span className="font-mono text-emerald-400 font-bold">Ativa</span>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: MAIN INTERACTIVE SCHEDULE COCKPIT */}
        <div className="md:col-span-8 flex flex-col h-[380px] md:h-[400px]">
          
          {/* List Header controls */}
          <div className="flex justify-between items-center pb-2.5 mb-2 shrink-0">
            <div className="flex items-center gap-2">
              <Calendar className="text-amber-400" size={16} />
              <h3 className="text-xs uppercase tracking-[0.2em] font-bold font-mono text-white/90">
                Lousa de Horários
              </h3>
            </div>
            <div className="flex gap-1 bg-neutral-950/80 p-1 rounded-full border border-white/15 backdrop-blur-md shadow-md">
              <button
                onClick={() => setAgendaMode('hoje')}
                className={`px-3 py-1 rounded-full text-[9px] tracking-widest uppercase transition-all cursor-pointer ${
                  agendaMode === 'hoje'
                    ? 'bg-amber-500 text-neutral-950 font-bold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Hoje
              </button>
              <button
                onClick={() => setAgendaMode('semana')}
                className={`px-3 py-1 rounded-full text-[9px] tracking-widest uppercase transition-all cursor-pointer ${
                  agendaMode === 'semana'
                    ? 'bg-amber-500 text-neutral-950 font-bold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Semana
              </button>
            </div>
          </div>

          {/* Interactive Classes Grid list */}
          {filteredClasses.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6 rounded-xl bg-neutral-950/70 border border-dashed border-white/20 backdrop-blur-md">
              <p className="text-xs text-white/50 max-w-xs font-light">
                {agendaMode === 'hoje'
                  ? 'Nenhuma aula cadastrada ou ocorrendo hoje.'
                  : 'Sua lista de aulas cadastradas está vazia.'}
              </p>
              <button
                onClick={() => onNavigate('dashboard')}
                className="mt-3 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all inline-flex items-center gap-1.5 cursor-pointer"
                style={{ backgroundColor: accentColor, color: '#000' }}
              >
                <span>Adicionar Aula</span>
                <ArrowRight size={12} />
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
              {filteredClasses.map((c) => {
                const isSelected = selectedClassId === c.id;
                const isToday = c.d.includes(todayIdx);
                const classDec = getClassDecimalTime(c);
                const isLive = isToday && (decTime >= classDec && decTime <= classDec + 0.85);
                const isUpcomingToday = isToday && (decTime < classDec);
                const isCompletedToday = isToday && (decTime > classDec + 0.85);

                let borderStyle = 'border-white/15 bg-neutral-950/80 hover:border-white/30 hover:bg-neutral-950/90 backdrop-blur-md shadow-lg';
                let glowTag = null;
                let tagColorStyle = '';

                if (isSelected) {
                  borderStyle = 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)] bg-neutral-950/90 backdrop-blur-md scale-[1.002]';
                } else if (isLive) {
                  borderStyle = 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)] bg-neutral-950/90 backdrop-blur-md';
                } else if (isUpcomingToday) {
                  borderStyle = 'border-orange-500/80 shadow-[0_0_15px_rgba(249,115,22,0.35)] bg-neutral-950/90 backdrop-blur-md';
                }

                if (isLive) {
                  glowTag = 'AO VIVO';
                  tagColorStyle = 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
                } else if (isUpcomingToday) {
                  const diffMin = Math.round((classDec - decTime) * 60);
                  glowTag = diffMin <= 60 ? `EM ${diffMin}m` : 'HOJE';
                  tagColorStyle = 'bg-orange-500/25 text-orange-400 border border-orange-500/40';
                } else if (isCompletedToday) {
                  glowTag = 'CONCLUÍDA';
                  tagColorStyle = 'bg-white/5 text-white/30 border border-white/10';
                }

                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectClass(c.id)}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-300 relative group overflow-hidden ${borderStyle}`}
                  >
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-orange-500 shadow-[0_0_8px_#f97316]" />
                    )}
                    {isLive && !isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
                    )}
                    {isUpcomingToday && !isSelected && !isLive && (
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-orange-500 shadow-[0_0_8px_#f97316]" />
                    )}

                    <div className="flex items-center gap-3">
                      <div className="flex flex-col min-w-[60px]">
                        <div className="flex items-baseline gap-0.5 font-mono">
                          <span className="text-sm font-bold text-white/90">
                            {c.h}
                          </span>
                          <span className="text-amber-500 text-[9px] font-bold">
                            {c.p}
                          </span>
                        </div>
                        <span className="text-[7.5px] tracking-widest text-white/30 uppercase mt-0.5 font-mono">
                          {c.tipo}
                        </span>
                      </div>

                      <div className="h-6 w-[1px] bg-white/10 hidden sm:block" />

                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white/95 group-hover:text-white transition-colors">
                            {c.n || 'Estudante'}
                          </span>
                          {isSelected && (
                            <span className="flex items-center gap-0.5 text-[8px] uppercase tracking-wider text-orange-400 font-bold bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
                              <Sparkles size={8} />
                              <span>Foco Ativo</span>
                            </span>
                          )}
                        </div>
                        {c.notas && (
                          <p className="text-[10px] text-white/40 mt-0.5 truncate max-w-[200px] sm:max-w-xs md:max-w-md font-light">
                            {c.notas}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 mt-1 sm:mt-0">
                      <div className="flex gap-1">
                        {diasSemanaCurto.map((dia, idx) => {
                          const active = c.d.includes(idx);
                          const isHoliday = c.f.includes(idx);
                          const hasPassed = idx < todayIdx;
                          const isCompletedDay = active && (hasPassed || (idx === todayIdx && isCompletedToday));
                          const isLiveDay = active && idx === todayIdx && isLive;
                          const isUpcomingTodayDay = active && idx === todayIdx && isUpcomingToday;

                          let bubbleStyle = 'bg-transparent text-white/20 border border-white/5';

                          if (isHoliday) {
                            bubbleStyle = 'bg-transparent text-red-400 border border-red-500/50 shadow-[0_0_6px_rgba(239,68,68,0.25)]';
                          } else if (active) {
                            if (isCompletedDay) {
                              bubbleStyle = 'bg-transparent text-emerald-400 border border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.35)] font-bold';
                            } else if (isLiveDay) {
                              bubbleStyle = 'bg-transparent text-blue-400 border-2 border-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.55)] font-bold';
                            } else if (isUpcomingTodayDay) {
                              bubbleStyle = 'bg-transparent text-orange-400 border-2 border-orange-500 animate-pulse shadow-[0_0_12px_rgba(249,115,22,0.65)] font-bold';
                            } else {
                              bubbleStyle = 'bg-transparent text-white/80 border border-white/35 font-medium';
                            }
                          } else {
                            bubbleStyle = 'bg-transparent text-white/10 border border-transparent opacity-20';
                          }

                          return (
                            <div
                              key={idx}
                              className={`w-[19px] h-[19px] rounded-full text-[9px] font-bold flex items-center justify-center transition-all ${bubbleStyle}`}
                              title={diasSemanaNomes[idx]}
                            >
                              {dia}
                            </div>
                          );
                        })}
                      </div>

                      {glowTag && (
                        <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ${tagColorStyle}`}>
                          {glowTag}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* FOOTER: PERSISTENT UNBOXED FLOATING SOCIAL LINKS */}
      {renderSocialLinks()}
    </div>
  );
};
