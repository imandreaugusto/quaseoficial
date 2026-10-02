import confetti from 'canvas-confetti';

export const celebrateCorrectAnswer = () => {
  confetti({
    particleCount: 28,
    spread: 58,
    startVelocity: 22,
    gravity: 0.9,
    scalar: 0.65,
    origin: { x: 0.5, y: 0.68 },
    colors: ['#fbbf24', '#22d3ee', '#34d399', '#fb7185'],
    disableForReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
  });
};