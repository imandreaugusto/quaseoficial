import React, { useState, useEffect } from 'react';

interface ClockProps {
  clock24h?: boolean;
  isMini?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'default';
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export const Clock: React.FC<ClockProps> = ({
  clock24h = false,
  isMini = false,
  size = 'default',
  align = 'left',
  className = ''
}) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = () => {
    if (clock24h) {
      return time.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } else {
      const h = time.getHours();
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      const min = String(time.getMinutes()).padStart(2, '0');
      return `${String(h12).padStart(2, '0')}:${min} ${ampm}`;
    }
  };

  const formatDate = () => {
    const meses = [
      'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
      'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
    ];
    return `${time.getDate()} ${meses[time.getMonth()]} ${time.getFullYear()}`;
  };

  if (isMini) {
    return (
      <div className={`pointer-events-none opacity-60 ${align === 'right' ? 'text-right' : align === 'left' ? 'text-left' : 'text-center'} ${className}`}>
        <div className="text-xl font-light tracking-tight leading-none text-white font-sans">
          {formatTime()}
        </div>
        <div className="text-[9px] tracking-wider uppercase text-white/50 mt-1 font-sans">
          {formatDate()}
        </div>
      </div>
    );
  }

  const alignmentClass = align === 'center' ? 'items-center text-center' : align === 'right' ? 'items-end text-right' : 'items-start text-left';

  if (size === 'sm') {
    return (
      <div className={`select-none flex flex-col ${alignmentClass} ${className}`}>
        <div className="text-[10px] sm:text-xs font-light text-white/70 tracking-[0.25em] uppercase font-mono drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
          {formatDate()}
        </div>
        <div className="text-3xl sm:text-4xl md:text-5xl font-light text-white/95 tracking-tight leading-none my-1 font-sans drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]">
          {formatTime()}
        </div>
        <div className="text-[9px] sm:text-[10px] font-semibold tracking-[0.25em] uppercase text-white/60 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
          BRAZILIAN IN ACTION
        </div>
      </div>
    );
  }

  return (
    <div className={`select-none flex flex-col ${alignmentClass} py-2 transition-all duration-300 ${className}`}>
      <div className="text-xs sm:text-sm font-light text-white/40 tracking-[0.3em] uppercase mb-1 font-mono">
        {formatDate()}
      </div>
      <div className="text-5xl sm:text-6xl md:text-7xl font-light text-white/90 tracking-tight leading-none my-1 sm:my-2 font-sans drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
        {formatTime()}
      </div>
      <div className="text-[10px] sm:text-xs font-medium tracking-[0.3em] sm:tracking-[0.4em] uppercase text-white/40 drop-shadow">
        BRAZILIAN IN ACTION
      </div>
    </div>
  );
};
