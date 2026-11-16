import { useEffect, useRef, useState } from 'react';
import { BookOpen, Backpack, Lock, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import gsap from 'gsap';
import { useActionStreet } from '../ActionStreetContext';
import { getSouvenirIcon } from '../shared/souvenirIcons';
import { glass } from '../shared/glass';

export type PassportTab = 'stamps' | 'backpack';

interface Props {
  initialTab: PassportTab;
  highlightStampId?: string;
  onClose: () => void;
}

export default function PassportModal({ initialTab, highlightStampId, onClose }: Props) {
  const { state, allCities } = useActionStreet();
  const [tab, setTab] = useState<PassportTab>(initialTab);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const opening = gsap.fromTo(card, { opacity: 0, y: 24, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'back.out(1.4)' });
    return () => {
      opening.kill();
    };
  }, []);

  useEffect(() => {
    if (!highlightStampId || tab !== 'stamps') return;
    const card = cardRef.current;
    const stamp = card?.querySelector<HTMLElement>(`[data-stamp-id="${highlightStampId}"]`);
    if (!card || !stamp) return;

    const timeline = gsap.timeline({ delay: 0.55 });
    timeline
      .fromTo(stamp, { scale: 3.4, rotation: -32, opacity: 0 }, { scale: 1, rotation: -8, opacity: 1, duration: 0.32, ease: 'power4.in' })
      .add(() => {
        confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, zIndex: 10000 });
      })
      .fromTo(card, { x: -7 }, { x: 0, duration: 0.45, ease: 'elastic.out(1, 0.25)' }, '<')
      .fromTo(stamp, { filter: 'brightness(2.2)' }, { filter: 'brightness(1)', duration: 0.5 }, '<');

    return () => {
      timeline.kill();
      gsap.set(stamp, { clearProps: 'all' });
    };
  }, [highlightStampId, tab]);

  const earnedByCity = new Map(state.stamps.map((stamp) => [stamp.cityId, stamp]));

  return (
    <div className={`absolute inset-0 z-50 flex items-center justify-center p-4 ${glass.backdrop}`} onClick={onClose}>
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label="Passaporte digital"
        onClick={(event) => event.stopPropagation()}
        className={`relative w-full max-w-xl overflow-hidden p-6 text-white ${glass.panelOverImagery}`}
      >
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-violet-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="relative mb-5 flex items-center justify-between">
          <div>
            <p className={glass.label}>Action Street</p>
            <h2 className="text-xl font-black">Passaporte Digital</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className={glass.iconButton}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className={`relative mb-5 grid grid-cols-2 gap-1 p-1 ${glass.chip}`} role="tablist">
          {([
            ['stamps', 'Carimbos', BookOpen],
            ['backpack', 'Mochila', Backpack],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`flex items-center justify-center gap-2 rounded-full border px-3 py-2 text-sm font-bold transition ${
                tab === id ? glass.chipActive + ' text-white' : 'border-transparent text-white/60 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === 'stamps' ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {allCities.map((city) => {
              const earned = earnedByCity.get(city.id);
              return earned ? (
                <div key={city.id} className="flex justify-center">
                  <div
                    data-stamp-id={earned.id}
                    className="flex h-28 w-28 -rotate-[8deg] flex-col items-center justify-center rounded-full border-4 border-double p-2 text-center"
                    style={{ borderColor: earned.color, color: earned.color, opacity: earned.id === highlightStampId ? 0 : 1 }}
                  >
                    <span className="text-[11px] font-black uppercase leading-tight tracking-wider">{earned.title}</span>
                    <span className="mt-1 text-[10px] font-semibold opacity-80">{earned.subtitle}</span>
                  </div>
                </div>
              ) : (
                <div key={city.id} className="flex justify-center">
                  <div className="flex h-28 w-28 flex-col items-center justify-center gap-1 rounded-full border-2 border-dashed border-white/20 text-center text-white/40">
                    <Lock className="h-4 w-4" />
                    <span className="text-[10px] font-semibold uppercase">{city.stamp.subtitle}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : state.souvenirs.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/60">Sua mochila está vazia. Toque nos pinos da rua para coletar souvenirs.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {state.souvenirs.map((souvenir) => {
              const Icon = getSouvenirIcon(souvenir.icon);
              return (
                <li key={souvenir.id} className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                  <Icon className="h-7 w-7 text-orange-300" />
                  <span className="text-sm font-semibold">{souvenir.label}</span>
                  <span className="text-[11px] uppercase text-white/50">{souvenir.fromCity}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
