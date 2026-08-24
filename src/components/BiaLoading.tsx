import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrazilianLogo } from './BrazilianLogo';
import { Sparkles } from 'lucide-react';

interface BiaLoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg' | 'full';
  compact?: boolean;
}

export const MANDATORY_LOADING_PHRASES = [
  "I'm Brazilian",
  "Brazilian in Action",
  "Let's study, come on!",
  "Brazilian in Action - O melhor conteúdo de Inglês do mundo!"
];

export const getRandomBiaLoadingPhrase = (): string => {
  const randomIndex = Math.floor(Math.random() * MANDATORY_LOADING_PHRASES.length);
  return MANDATORY_LOADING_PHRASES[randomIndex];
};

export const BiaLoading: React.FC<BiaLoadingProps> = ({
  message,
  size = 'md',
  compact = false
}) => {
  const [currentText, setCurrentText] = useState<string>(message || getRandomBiaLoadingPhrase());

  useEffect(() => {
    if (message) {
      setCurrentText(message);
      return;
    }
    const interval = setInterval(() => {
      setCurrentText(getRandomBiaLoadingPhrase());
    }, 2200);
    return () => clearInterval(interval);
  }, [message]);

  if (compact) {
    return (
      <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-neutral-950/60 border border-white/10 backdrop-blur-md select-none">
        <div className="animate-spin-slow shrink-0">
          <BrazilianLogo size="xs" variant="monogram" />
        </div>
        <AnimatePresence mode="wait">
          <motion.span
            key={currentText}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 4 }}
            transition={{ duration: 0.25 }}
            className="text-xs font-bold text-amber-300 drop-shadow truncate"
          >
            {currentText}
          </motion.span>
        </AnimatePresence>
      </div>
    );
  }

  if (size === 'full') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center select-none">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
          className="mb-5 relative"
        >
          <div className="absolute -inset-4 bg-amber-500/20 rounded-full blur-xl animate-pulse pointer-events-none" />
          <BrazilianLogo size="lg" variant="full" />
        </motion.div>

        {/* Pulse indicator */}
        <div className="flex items-center gap-1.5 mb-3">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span className="w-2 h-2 rounded-full bg-white" />
          <span className="w-2 h-2 rounded-full bg-blue-500" />
        </div>

        {/* Dynamic Slogans Animation */}
        <div className="min-h-[2.5rem] flex items-center justify-center max-w-lg px-4">
          <AnimatePresence mode="wait">
            <motion.p
              key={currentText}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="text-sm sm:text-base md:text-lg font-black text-amber-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]"
            >
              {currentText}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center select-none">
      <motion.div
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        className="mb-3 relative"
      >
        <BrazilianLogo size={size === 'sm' ? 'sm' : 'md'} variant="full" />
      </motion.div>

      <div className="min-h-[2rem] flex items-center justify-center max-w-sm px-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentText}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-amber-300 drop-shadow-md"
          >
            <Sparkles size={13} className="text-amber-400 shrink-0 animate-spin" />
            <span className="truncate">{currentText}</span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
