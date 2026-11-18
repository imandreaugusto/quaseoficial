import { useEffect, useRef } from 'react';
import { Flame } from 'lucide-react';
import gsap from 'gsap';
import { streakMultiplier } from '../../../lib/actionStreet/streak';
import { glass } from './glass';

interface Props {
  count: number;
  className?: string;
}

export default function StreakChip({ count, className = '' }: Props) {
  const numberRef = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);
  const multiplier = streakMultiplier(count);

  useEffect(() => {
    const element = numberRef.current;
    if (!element) return;
    const counter = { value: shown.current };
    const context = gsap.context(() => {
      gsap.to(counter, {
        value: count,
        duration: 0.9,
        ease: 'power2.out',
        onUpdate: () => {
          shown.current = counter.value;
          element.textContent = String(Math.round(counter.value));
        },
      });
    }, element);
    return () => context.revert();
  }, [count]);

  return (
    <div className={`${glass.chip} inline-flex items-center gap-2 px-4 py-2 ${className}`} aria-label={`${count} ${count === 1 ? 'dia' : 'dias'} viajando seguidos`}>
      <Flame className={`h-4 w-4 ${count > 0 ? 'text-orange-300' : 'text-white/50'}`} />
      <span className="text-sm font-black tabular-nums">
        <span ref={numberRef}>0</span> {count === 1 ? 'Dia' : 'Dias'}
      </span>
      <span className={`${glass.label} hidden sm:inline`}>Viajando seguidos</span>
      {multiplier > 1 && <span className="rounded-full bg-amber-300/25 px-2 py-0.5 text-[10px] font-black text-amber-200">x{multiplier} nas missões</span>}
    </div>
  );
}
