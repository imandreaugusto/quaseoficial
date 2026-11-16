import { useEffect, useRef } from 'react';
import { PlaneTakeoff, X } from 'lucide-react';
import gsap from 'gsap';
import { glass } from '../shared/glass';

interface Props {
  cityName: string;
  onContinue: () => void;
  onDismiss: () => void;
}

export default function ResumeBanner({ cityName, onContinue, onDismiss }: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const timeline = gsap.timeline();
    timeline
      .fromTo(element, { opacity: 0, y: -26, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: 'power3.out' })
      .fromTo(element.querySelectorAll('[data-reveal-item]'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.09, ease: 'power2.out' }, '-=0.25');
    return () => {
      timeline.kill();
    };
  }, []);

  return (
    <section ref={ref} aria-label="Continuar viagem" className={`relative overflow-hidden p-4 sm:p-5 ${glass.panel}`}>
      <div className="pointer-events-none absolute -left-16 -top-20 h-48 w-48 rounded-full bg-blue-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 right-8 h-44 w-44 rounded-full bg-violet-500/25 blur-3xl" />
      <div className="relative flex flex-wrap items-center gap-4">
        <span data-reveal-item className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/25 bg-blue-500/30">
          <PlaneTakeoff className="h-5 w-5" />
        </span>
        <div data-reveal-item className="min-w-0 flex-1">
          <p className="text-base font-black leading-tight">Bem-vindo de volta!</p>
          <p className="text-sm text-white/75">Continuar sua viagem em {cityName}?</p>
        </div>
        <div data-reveal-item className="flex items-center gap-2">
          <button type="button" onClick={onContinue} className={`${glass.primaryButton} !px-5 !py-2.5 text-sm`}>
            Continuar
          </button>
          <button type="button" onClick={onDismiss} aria-label="Começar do lobby" title="Começar do lobby" className={glass.iconButton}>
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
