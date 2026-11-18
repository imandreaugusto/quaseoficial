import gsap from 'gsap';

export const routeAnimations = {
  modalOpen(element: HTMLElement): gsap.core.Tween {
    return gsap.fromTo(element, { opacity: 0, y: 24, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'back.out(1.4)' });
  },

  modalClose(element: HTMLElement, onComplete?: () => void): gsap.core.Tween {
    return gsap.to(element, { opacity: 0, y: 16, scale: 0.96, duration: 0.2, ease: 'power2.in', onComplete });
  },

  hotspotPulse(ring: HTMLElement): gsap.core.Tween {
    return gsap.fromTo(ring, { scale: 1, opacity: 0.8 }, { scale: 2.1, opacity: 0, duration: 1.8, repeat: -1, ease: 'power1.out' });
  },

  flyToNotebook(from: HTMLElement, iconMarkup: string, onComplete?: () => void): () => void {
    const target = document.querySelector<HTMLElement>('[data-notebook-button]');
    if (!target) {
      onComplete?.();
      return () => undefined;
    }

    const start = from.getBoundingClientRect();
    const end = target.getBoundingClientRect();
    const token = document.createElement('div');
    token.innerHTML = iconMarkup;
    token.style.cssText = `position:fixed;z-index:10001;left:${start.left}px;top:${start.top}px;width:${start.width}px;height:${start.height}px;display:flex;align-items:center;justify-content:center;border-radius:9999px;color:#fff;background:rgba(59,130,246,0.85);border:1px solid rgba(255,255,255,0.45);pointer-events:none;`;
    document.body.appendChild(token);

    const contexts: gsap.Context[] = [];
    contexts.push(gsap.context(() => {
      gsap.to(token, {
        x: end.left + end.width / 2 - (start.left + start.width / 2),
        y: end.top + end.height / 2 - (start.top + start.height / 2),
        scale: 0.4,
        duration: 0.8,
        ease: 'power2.inOut',
        onComplete: () => {
          token.remove();
          contexts.push(gsap.context(() => {
            gsap.fromTo(target, { scale: 1 }, { scale: 1.3, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' });
          }, target));
          onComplete?.();
        },
      });
    }, token));
    return () => {
      contexts.forEach((context) => context.revert());
      token.remove();
    };
  },
};
