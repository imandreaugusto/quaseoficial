import gsap from 'gsap';

export const routeAnimations = {
  // Transição suave do Lobby ao Map3D
  transitionToMap3D(element: HTMLElement, onComplete?: () => void): gsap.core.Timeline {
    const timeline = gsap.timeline({ onComplete });

    timeline.to(element, {
      opacity: 0,
      scale: 0.95,
      duration: 0.4,
      ease: 'power2.inOut',
    });

    return timeline;
  },

  // Transição do Map3D ao Street View 360°
  transitionToStreetView(element: HTMLElement, onComplete?: () => void): gsap.core.Timeline {
    const timeline = gsap.timeline({ onComplete });

    timeline.to(element, {
      opacity: 0,
      scale: 1.05,
      duration: 0.5,
      ease: 'power2.inOut',
    });

    return timeline;
  },

  // Animação de carimbo batendo no Passaporte
  stampAnimation(element: HTMLElement): gsap.core.Timeline {
    const timeline = gsap.timeline();

    timeline
      .from(element, {
        scale: 0,
        rotation: -45,
        opacity: 0,
        duration: 0.3,
        ease: 'back.out',
      })
      .to(
        element,
        {
          scale: 1.1,
          duration: 0.1,
          ease: 'power2.out',
        },
        0.25
      )
      .to(
        element,
        {
          scale: 1,
          rotation: 0,
          duration: 0.15,
          ease: 'power2.out',
        },
        0.35
      );

    return timeline;
  },

  // Souvenir fluindo para mochila
  souvenirFly(fromElement: HTMLElement, toElement: HTMLElement): gsap.core.Tween {
    const fromRect = fromElement.getBoundingClientRect();
    const toRect = toElement.getBoundingClientRect();

    const clone = fromElement.cloneNode(true) as HTMLElement;
    clone.style.position = 'fixed';
    clone.style.pointerEvents = 'none';
    clone.style.zIndex = '9999';
    document.body.appendChild(clone);

    gsap.set(clone, {
      left: fromRect.left,
      top: fromRect.top,
      width: fromRect.width,
      height: fromRect.height,
    });

    return gsap.to(clone, {
      left: toRect.left,
      top: toRect.top,
      width: toRect.width * 0.6,
      height: toRect.height * 0.6,
      opacity: 0.3,
      duration: 0.8,
      ease: 'power2.inOut',
      onComplete: () => {
        clone.remove();
      },
    });
  },

  // Pulsação nos hotspots
  hotspotPulse(element: HTMLElement): gsap.core.Timeline {
    const timeline = gsap.timeline({ repeat: -1 });

    timeline
      .to(element, {
        scale: 1.2,
        duration: 0.6,
        ease: 'power1.inOut',
      })
      .to(
        element,
        {
          scale: 1,
          duration: 0.6,
          ease: 'power1.inOut',
        }
      );

    return timeline;
  },

  // Abertura de modal com zoom
  modalOpen(element: HTMLElement): gsap.core.Timeline {
    const timeline = gsap.timeline();

    timeline.from(element, {
      opacity: 0,
      scale: 0.8,
      y: 20,
      duration: 0.3,
      ease: 'back.out',
    });

    return timeline;
  },

  // Fechamento de modal
  modalClose(element: HTMLElement): gsap.core.Timeline {
    const timeline = gsap.timeline();

    timeline.to(element, {
      opacity: 0,
      scale: 0.8,
      y: -20,
      duration: 0.2,
      ease: 'back.in',
    });

    return timeline;
  },
};
