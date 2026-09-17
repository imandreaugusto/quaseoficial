// Gerenciador de Áudio com Web Audio API nativo
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Som suave de "Hover" (ao passar o mouse pelos botões do menu)
 * Frequência decai de 950Hz para 140Hz em 24ms.
 */
export function playHoverSound(volume: number = 0.12): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const now = ctx.currentTime;
    // Tipo de onda: 'sine' produz um som limpo, sem estridência
    osc.type = 'sine';

    // Frequência desce muito rápido, simulando um clique/estalo físico
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.024);

    // Volume começa no valor desejado e decai suavemente até quase zero
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.026);
  } catch (err) {
    console.warn('Hover sound suppressed:', err);
  }
}

/**
 * Som de Seleção/Clique (ao escolher um app ou abrir o menu)
 * Produz um tom duplo suave confirmando a ação.
 */
export function playMenuSelectSound(volume: number = 0.18): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Primeiro tom (fundamental de clique)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(620, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.04);
    gain1.gain.setValueAtTime(volume, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.055);
  } catch (err) {
    console.warn('Select sound error:', err);
  }
}
