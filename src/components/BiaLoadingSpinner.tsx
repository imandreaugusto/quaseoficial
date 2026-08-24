import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BrazilianLogo } from './BrazilianLogo';

export const LOADING_PHRASES = [
  "I'm Brazilian",
  "Brazilian in Action",
  "Let's study, come on!",
  "Brazilian in Action - O melhor conteúdo de Inglês do mundo!"
];

export const getRandomLoadingPhrase = (): string => {
  const randomIndex = Math.floor(Math.random() * LOADING_PHRASES.length);
  return LOADING_PHRASES[randomIndex];
};

interface BiaLoadingSpinnerProps {
  phrase?: string;
  size?: 'sm' | 'md' | 'lg';
  showLogo?: boolean;
  className?: string;
}

export const BiaLoadingSpinner: React.FC<BiaLoadingSpinnerProps> = ({
  phrase,
  size = 'md',
  showLogo = true,
  className = ''
}) => {
  const [currentPhrase, setCurrentPhrase] = useState<string>(phrase || getRandomLoadingPhrase());

  useEffect(() => {
    if (phrase) {
      setCurrentPhrase(phrase);
      return;
    }
    // Rotate loading phrase smoothly every 2.4s if it takes longer
    const interval = setInterval(() => {
      setCurrentPhrase(getRandomLoadingPhrase());
    }, 2400);
    return () => clearInterval(interval);
  }, [phrase]);

  return (
    <div className={`flex flex-col items-center justify-center p-6 text-center select-none ${className}`}>
      {showLogo && (
        <motion.div
          animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="mb-3.5 relative"
        >
          <BrazilianLogo size={size === 'sm' ? 'sm' : size === 'lg' ? 'xl' : 'md'} />
          <div className="absolute -bottom-1 -right-1">
            <Sparkles size={14} className="text-amber-400 animate-spin" />
          </div>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentPhrase}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.35 }}
          className="flex items-center gap-2 justify-center"
        >
          <span className={`font-bold tracking-wide text-amber-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] ${
            size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base sm:text-lg font-black' : 'text-xs sm:text-sm font-extrabold'
          }`}>
            {currentPhrase}
          </span>
        </motion.div>
      </AnimatePresence>

      <motion.div
        animate={{ opacity: [0.3, 0.8, 0.3], width: ['30%', '60%', '30%'] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        className="h-0.5 bg-gradient-to-r from-transparent via-amber-400/80 to-transparent rounded-full mt-2"
      />
    </div>
  );
};
