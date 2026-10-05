import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import gsap from 'gsap';
import { Sparkles, X } from 'lucide-react';
import { UserProfile } from '../types';
import { loadUpdatesNotice, shouldShowUpdatesNotice, UpdatesNotice } from '../lib/updatesNotice';

interface NewUpdatesBadgeProps {
  currentUser?: UserProfile | null;
}

// Selo "NEW" sutil em vidro: mostra as novidades escritas pelo CEO nas 2 primeiras visitas do assinante.
export const NewUpdatesBadge: React.FC<NewUpdatesBadgeProps> = ({ currentUser }) => {
  const [notice, setNotice] = useState<UpdatesNotice | null>(null);
  const [open, setOpen] = useState(false);
  const glowRef = useRef<HTMLSpanElement | null>(null);
  const userId = currentUser?.auth_user_id || currentUser?.id || '';

  useEffect(() => {
    let cancelled = false;
    void loadUpdatesNotice().then((loaded) => {
      if (!cancelled && shouldShowUpdatesNotice(userId, loaded)) setNotice(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!notice || !glowRef.current) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const tween = gsap.fromTo(glowRef.current, { opacity: 0.25, scale: 0.9 }, { opacity: 0.7, scale: 1.15, duration: 1.8, ease: 'sine.inOut', repeat: -1, yoyo: true });
    return () => {
      tween.kill();
    };
  }, [notice]);

  if (!notice) return null;

  return (
    <div className="relative flex flex-col items-end">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Ver novidades da plataforma"
        className="relative inline-flex cursor-pointer items-center gap-1.5 overflow-hidden rounded-full border border-white/30 bg-white/15 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/90 shadow-[0_4px_20px_rgba(255,255,255,0.12)] backdrop-blur-xl transition hover:bg-white/25"
      >
        <span ref={glowRef} aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-blue-300/30 via-white/30 to-fuchsia-300/30 blur-md" />
        <Sparkles size={12} className="relative text-amber-200" />
        <span className="relative">New</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-label="Novidades da plataforma"
            className="absolute right-0 top-11 z-30 w-[min(22rem,calc(100vw-2.5rem))] rounded-3xl border border-white/30 bg-white/20 p-5 text-left shadow-[0_12px_50px_rgba(0,0,0,0.25)] backdrop-blur-2xl"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar novidades"
              className="absolute right-3 top-3 cursor-pointer rounded-full p-1 text-white/55 transition hover:bg-white/15 hover:text-white"
            >
              <X size={14} />
            </button>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.25em] text-white/60">Novidades</p>
            <h3 className="pr-6 text-base font-extrabold leading-snug text-white">{notice.title}</h3>
            <p className="mt-2 max-h-64 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-white/85">{notice.body}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
