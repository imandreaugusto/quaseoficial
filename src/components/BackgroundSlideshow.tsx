import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MapPin } from 'lucide-react';
import type { AppSettings } from '../types';
import { BACKGROUND_SLIDES } from '../data';

interface BackgroundSlideshowProps {
  settings: AppSettings;
  paused: boolean;
  hidden?: boolean;
}

type MediaSlide =
  | { kind: 'image'; name: string; url: string }
  | { kind: 'video'; name: string; url: string };

const getLandmarkImageUrl = (slide: (typeof BACKGROUND_SLIDES)[number]) =>
  window.innerWidth * window.devicePixelRatio > 1920 ? slide.highResolutionUrl : slide.url;

const imageSlides: MediaSlide[] = BACKGROUND_SLIDES.map((slide) => ({
  kind: 'image',
  name: slide.name,
  url: getLandmarkImageUrl(slide),
}));

const baseUrl = (fileName: string) => `${import.meta.env.BASE_URL}backgrounds/${fileName}`;

const videoSlides: MediaSlide[] = [
  { kind: 'video', name: 'Central Park, New York, NY', url: baseUrl('central-park.mp4') },
  { kind: 'video', name: 'Brooklyn Bridge, New York, NY', url: baseUrl('brooklyn-bridge.mp4') },
  { kind: 'video', name: 'Empire State Building, Midtown Manhattan, New York, NY', url: baseUrl('empire-state.mp4') },
];

const mediaSlides: MediaSlide[] = [...imageSlides, ...videoSlides];

const shuffleMediaIndexes = (avoidFirst?: number) => {
  const indexes = mediaSlides.map((_, index) => index);
  for (let index = indexes.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [indexes[index], indexes[swapIndex]] = [indexes[swapIndex], indexes[index]];
  }

  for (let index = 1; index < indexes.length; index += 1) {
    if (mediaSlides[indexes[index]].kind !== 'video') continue;
    if (mediaSlides[indexes[index - 1]].kind !== 'video') continue;

    const imagePosition = indexes.findIndex(
      (mediaIndex, position) => position > index && mediaSlides[mediaIndex].kind === 'image',
    );
    if (imagePosition >= 0) {
      [indexes[index], indexes[imagePosition]] = [indexes[imagePosition], indexes[index]];
    }
  }

  if (indexes.length > 1 && indexes[0] === avoidFirst) {
    const swapIndex = 1 + Math.floor(Math.random() * (indexes.length - 1));
    [indexes[0], indexes[swapIndex]] = [indexes[swapIndex], indexes[0]];
  }
  return indexes;
};

const brightness = (settings: AppSettings) =>
  settings.bgBright === 'darker'
    ? 'brightness(0.45) saturate(1.1)'
    : settings.bgBright === 'lighter'
      ? 'brightness(0.92) saturate(1.15)'
      : 'brightness(0.78) saturate(1.2)';

export function BackgroundSlideshow({ settings, paused, hidden = false }: BackgroundSlideshowProps) {
  const [sequence, setSequence] = useState(() => shuffleMediaIndexes());
  const [currentPosition, setCurrentPosition] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(() => sequence[0] ?? 0);
  const [incomingIndex, setIncomingIndex] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (paused) video.pause();
    else void video.play().catch(() => undefined);
  }, [paused, incomingIndex, currentIndex]);

  useEffect(() => {
    if (hidden || !settings.bgEnabled || paused || incomingIndex !== null) return;

    let active = true;
    const slideDuration =
      (settings.bgInterval && settings.bgInterval > 0 ? settings.bgInterval : 8) * 1000;
    const slideTimer = window.setTimeout(() => {
      const startsNewSequence = currentPosition + 1 >= sequence.length;
      const nextSequence = startsNewSequence
        ? shuffleMediaIndexes(currentIndex)
        : sequence;
      const nextPosition = startsNewSequence ? 0 : currentPosition + 1;
      const nextIndex = nextSequence[nextPosition] ?? currentIndex;

      if (startsNewSequence) setSequence(nextSequence);
      setCurrentPosition(nextPosition);

      const nextSlide = mediaSlides[nextIndex];
      if (nextSlide.kind === 'video') {
        setIncomingIndex(nextIndex);
        return;
      }

      const preloadedImage = new Image();
      let handled = false;
      const showPreloadedSlide = () => {
        if (!active || handled) return;
        handled = true;
        setIncomingIndex(nextIndex);
      };

      preloadedImage.onload = showPreloadedSlide;
      preloadedImage.onerror = () => {
        if (!active || handled) return;
        handled = true;
        console.error('Background slideshow image failed to load:', nextSlide.url);
        setIncomingIndex(null);
      };
      preloadedImage.src = nextSlide.url;
      if (preloadedImage.complete) {
        if (preloadedImage.naturalWidth > 0) showPreloadedSlide();
        else preloadedImage.onerror?.(new Event('error'));
      }
    }, slideDuration);

    return () => {
      active = false;
      window.clearTimeout(slideTimer);
    };
  }, [currentIndex, currentPosition, hidden, incomingIndex, paused, sequence, settings.bgEnabled, settings.bgInterval]);

  useEffect(() => {
    if (incomingIndex === null) return;
    const transitionTimer = window.setTimeout(() => {
      setCurrentIndex(incomingIndex);
      setIncomingIndex(null);
    }, 1000);
    return () => window.clearTimeout(transitionTimer);
  }, [incomingIndex]);

  if (hidden || !settings.bgEnabled) return null;

  const currentSlide = mediaSlides[currentIndex];
  const incomingSlide = incomingIndex === null ? null : mediaSlides[incomingIndex];

  const renderMedia = (slide: MediaSlide, key: string, opacity: number) => {
    if (slide.kind === 'video') {
      return (
        <video
          ref={key === 'current' ? videoRef : undefined}
          key={key}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000"
          style={{ opacity, filter: brightness(settings) }}
          src={slide.url}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
        />
      );
    }
    return (
      <div
        key={key}
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
        style={{
          opacity,
          backgroundImage: `url(${slide.url})`,
          filter: brightness(settings),
        }}
      />
    );
  };

  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-neutral-950">
        {renderMedia(currentSlide, 'current', incomingSlide ? 0 : 1)}
        {incomingSlide && renderMedia(incomingSlide, 'incoming', 1)}
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
            key={(incomingSlide ?? currentSlide).name}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.3 }}
            className="flex max-w-[min(80vw,24rem)] items-center gap-1.5 text-xs font-medium text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]"
          >
            <MapPin size={12} className="text-amber-400 shrink-0" />
            <span className="font-semibold tracking-wide uppercase text-[11px] text-white/90">
              {(incomingSlide ?? currentSlide).name}
            </span>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </>
  );
}
