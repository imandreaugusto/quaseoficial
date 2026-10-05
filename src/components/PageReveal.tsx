import React, { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';

interface PageRevealProps {
  enabled: boolean;
  children: React.ReactNode;
}

// Faz os cartões de vidro de cada tela entrarem em sequência ao abrir o app; ignora o que já tem animação própria.
export const PageReveal: React.FC<PageRevealProps> = ({ enabled, children }) => {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !enabled || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const candidates = Array.from(root.querySelectorAll<HTMLElement>('.glass-card, [class*="backdrop-blur"], [data-reveal]'));
    const targets = candidates
      .filter((element) =>
        !element.closest('[data-no-reveal]') &&
        !candidates.some((other) => other !== element && other.contains(element)) &&
        !element.style.opacity &&
        !element.style.transform &&
        getComputedStyle(element).position !== 'fixed' &&
        element.offsetHeight > 24 &&
        element.offsetHeight < window.innerHeight * 1.5
      )
      .slice(0, 18);
    if (targets.length === 0) return;

    const tween = gsap.from(targets, { opacity: 0, y: 22, duration: 0.6, stagger: 0.05, ease: 'power3.out', clearProps: 'opacity,transform' });
    return () => {
      tween.kill();
    };
  }, []);

  return <div ref={rootRef} className="contents">{children}</div>;
};
