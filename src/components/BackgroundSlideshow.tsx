import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin } from 'lucide-react';
import type { AppSettings } from '../types';
import { US_LANDMARKS } from '../data';

interface BackgroundSlideshowProps {
  settings: AppSettings;
  paused: boolean;
}

const getLandmarkImageUrl = (url: string) =>
  window.innerWidth * window.devicePixelRatio > 1920
    ? url.replace('1920px-', '3840px-').replace('w=1920', 'w=3840')
    : url;

export function BackgroundSlideshow({ settings, paused }: BackgroundSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [incomingIndex, setIncomingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!settings.bgEnabled || paused) {
      setIncomingIndex(null);
      return;
    }
    if (incomingIndex !== null || US_LANDMARKS.length < 2) return;

    const slideDuration =
      (settings.bgInterval && settings.bgInterval > 0 ? settings.bgInterval : 7) * 1000;
    const slideTimer = window.setTimeout(() => {
      const nextIndex = (currentIndex + 1) % US_LANDMARKS.length;
      setIncomingIndex(nextIndex);
    }, slideDuration);

    return () => window.clearTimeout(slideTimer);
  }, [currentIndex, incomingIndex, paused, settings.bgEnabled, settings.bgInterval]);

  useEffect(() => {
    if (incomingIndex === null) return;

    const transitionTimer = window.setTimeout(() => {
      setCurrentIndex(incomingIndex);
      setIncomingIndex(null);
    }, 1000);

    return () => window.clearTimeout(transitionTimer);
  }, [incomingIndex]);

  if (!settings.bgEnabled || US_LANDMARKS.length === 0) return null;

  const nextIndex = (currentIndex + 1) % US_LANDMARKS.length;
  const brightness =
    settings.bgBright === 'darker'
      ? 'brightness(0.45) saturate(1.1)'
      : settings.bgBright === 'lighter'
        ? 'brightness(0.92) saturate(1.15)'
        : 'brightness(0.78) saturate(1.2)';
  const currentImageUrl = getLandmarkImageUrl(US_LANDMARKS[currentIndex].url);
  const nextImageUrl = getLandmarkImageUrl(US_LANDMARKS[incomingIndex ?? nextIndex].url);

  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-neutral-950">
        <div
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
            incomingIndex === null ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            backgroundImage: `url(${currentImageUrl})`,
            filter: brightness,
          }}
        />
        <div
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
            incomingIndex === null ? 'opacity-0' : 'opacity-100'
          }`}
          style={{
            backgroundImage: `url(${nextImageUrl})`,
            filter: brightness,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/10 to-black/55 pointer-events-none" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0, right: 'clamp(0.75rem, 2vw, 2rem)' }}
        transition={{ type: 'spring', damping: 25, stiffness: 240 }}
        style={{ position: 'fixed', right: 'clamp(0.75rem, 2vw, 2rem)', bottom: '12px', zIndex: 2500 }}
        className="select-none text-right flex items-center gap-2 p-1.5 px-3 rounded-2xl"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={incomingIndex ?? currentIndex}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.3 }}
            className="flex max-w-[min(80vw,24rem)] items-center gap-1.5 text-xs font-medium text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]"
          >
            <MapPin size={12} className="text-amber-400 shrink-0" />
            <span className="font-semibold tracking-wide uppercase text-[11px] text-white/90">
              {US_LANDMARKS[incomingIndex ?? currentIndex].name}
            </span>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </>
  );
}
