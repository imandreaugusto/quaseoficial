import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin } from 'lucide-react';
import type { AppSettings } from '../types';
import { BACKGROUND_SLIDES } from '../data';

interface BackgroundSlideshowProps {
  settings: AppSettings;
  paused: boolean;
}

const getLandmarkImageUrl = (slide: (typeof BACKGROUND_SLIDES)[number]) =>
  window.innerWidth * window.devicePixelRatio > 1920 ? slide.highResolutionUrl : slide.url;

const shuffleSlideIndexes = (count: number, avoidFirst?: number) => {
  const indexes = Array.from({ length: count }, (_, index) => index);
  for (let index = indexes.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [indexes[index], indexes[swapIndex]] = [indexes[swapIndex], indexes[index]];
  }
  if (indexes.length > 1 && indexes[0] === avoidFirst) {
    const swapIndex = 1 + Math.floor(Math.random() * (indexes.length - 1));
    [indexes[0], indexes[swapIndex]] = [indexes[swapIndex], indexes[0]];
  }
  return indexes;
};

export function BackgroundSlideshow({ settings, paused }: BackgroundSlideshowProps) {
  const [sequence, setSequence] = useState(() => shuffleSlideIndexes(BACKGROUND_SLIDES.length));
  const [currentPosition, setCurrentPosition] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(() => sequence[0] ?? 0);
  const [incomingIndex, setIncomingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!settings.bgEnabled || paused) return;
    if (incomingIndex !== null || sequence.length < 2) return;

    let active = true;
    const slideDuration =
      (settings.bgInterval && settings.bgInterval > 0 ? settings.bgInterval : 7) * 1000;
    const slideTimer = window.setTimeout(() => {
      const startsNewSequence = currentPosition + 1 >= sequence.length;
      const nextSequence = startsNewSequence
        ? shuffleSlideIndexes(BACKGROUND_SLIDES.length, currentIndex)
        : sequence;
      const nextPosition = startsNewSequence ? 0 : currentPosition + 1;
      const nextIndex = nextSequence[nextPosition] ?? currentIndex;
      const nextImageUrl = getLandmarkImageUrl(BACKGROUND_SLIDES[nextIndex]);
      const preloadedImage = new Image();
      let handled = false;

      const skipUnavailableSlide = () => {
        if (!active || handled) return;
        handled = true;
        console.error('Background slideshow image failed to load:', nextImageUrl);
        if (startsNewSequence) setSequence(nextSequence);
        setCurrentPosition(nextPosition);
      };
      const showPreloadedSlide = () => {
        if (!active || handled) return;
        handled = true;
        if (startsNewSequence) setSequence(nextSequence);
        setCurrentPosition(nextPosition);
        setIncomingIndex(nextIndex);
      };

      preloadedImage.onload = showPreloadedSlide;
      preloadedImage.onerror = skipUnavailableSlide;
      preloadedImage.src = nextImageUrl;

      if (preloadedImage.complete) {
        if (preloadedImage.naturalWidth > 0) showPreloadedSlide();
        else skipUnavailableSlide();
      }
    }, slideDuration);

    return () => {
      active = false;
      window.clearTimeout(slideTimer);
    };
  }, [currentIndex, currentPosition, incomingIndex, paused, sequence, settings.bgEnabled, settings.bgInterval]);

  useEffect(() => {
    if (incomingIndex === null) return;

    const transitionTimer = window.setTimeout(() => {
      setCurrentIndex(incomingIndex);
      setIncomingIndex(null);
    }, 1000);

    return () => window.clearTimeout(transitionTimer);
  }, [incomingIndex]);

  if (!settings.bgEnabled || BACKGROUND_SLIDES.length === 0) return null;

  const brightness =
    settings.bgBright === 'darker'
      ? 'brightness(0.45) saturate(1.1)'
      : settings.bgBright === 'lighter'
        ? 'brightness(0.92) saturate(1.15)'
        : 'brightness(0.78) saturate(1.2)';
  const currentImageUrl = getLandmarkImageUrl(BACKGROUND_SLIDES[currentIndex]);
  const nextImageUrl =
    incomingIndex === null
      ? currentImageUrl
      : getLandmarkImageUrl(BACKGROUND_SLIDES[incomingIndex]);

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
              {BACKGROUND_SLIDES[incomingIndex ?? currentIndex].name}
            </span>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </>
  );
}
