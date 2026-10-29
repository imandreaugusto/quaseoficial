import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

export const LOADING_PHRASES = [
  'Hang tight, Brazilian!',
  'One moment, Brazilian!',
  'Your next step starts here.',
  'Getting things ready for you!',
  'Almost there — keep that English spirit!',
  'A little wait, a lot of learning.',
  'Ready to make today count?',
  'Your English journey is loading!',
  'Stay curious, Brazilian!',
  'Great things take a moment.',
  'Let’s make English happen!',
  'A new learning moment is on its way.',
  'Keep going — you’re doing great!',
  'Have you practiced your English today?',
  'What will you discover today?',
  'Have you read anything in English today?'
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
    <div className={`flex min-h-64 flex-col items-center justify-center p-6 text-center select-none ${className}`}>
      {showLogo && (
        <motion.div
          animate={{ scale: [0.96, 1.04, 0.96], opacity: [0.82, 1, 0.82] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="mb-4"
        >
          <svg
            aria-label="Logo Brazilian in Action"
            role="img"
            viewBox="0 0 48 48"
            className={size === 'sm' ? 'h-12 w-12' : size === 'lg' ? 'h-20 w-20' : 'h-16 w-16'}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M9 5v38" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
            <path
              d="M10 6h15a9 9 0 0 1 0 18H10"
              stroke="#EF1E28"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M10 24h17a9.5 9.5 0 0 1 0 19H10"
              stroke="#EF1E28"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M10 24h15" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M4 13v22" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity=".8" />
            <rect x="38" y="3" width="5" height="5" rx="1" fill="#EF1E28" />
          </svg>
        </motion.div>
      )}

      <motion.div
        key={currentPhrase}
        initial={{ y: 4 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex min-h-6 items-center justify-center"
      >
        <span className={`font-bold tracking-wide text-amber-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] ${
          size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base sm:text-lg font-black' : 'text-xs sm:text-sm font-extrabold'
        }`}>
          {currentPhrase}
        </span>
      </motion.div>

      <motion.div
        animate={{ opacity: [0.3, 0.8, 0.3], width: ['30%', '60%', '30%'] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        className="mt-3 h-0.5 rounded-full bg-gradient-to-r from-transparent via-red-500/80 to-transparent"
      />
    </div>
  );
};
