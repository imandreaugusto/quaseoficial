type SoundCue = 'collect' | 'success' | 'error' | 'camera' | 'stamp' | 'takeoff' | 'coin' | 'pager';
type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

const NOTES: Record<SoundCue, Array<{ frequency: number; offset: number; duration: number; wave: OscillatorType }>> = {
  collect: [
    { frequency: 660, offset: 0, duration: 0.1, wave: 'sine' },
    { frequency: 880, offset: 0.07, duration: 0.14, wave: 'sine' },
  ],
  success: [
    { frequency: 523, offset: 0, duration: 0.12, wave: 'triangle' },
    { frequency: 659, offset: 0.08, duration: 0.12, wave: 'triangle' },
    { frequency: 784, offset: 0.16, duration: 0.2, wave: 'triangle' },
  ],
  error: [
    { frequency: 260, offset: 0, duration: 0.12, wave: 'sine' },
    { frequency: 220, offset: 0.08, duration: 0.16, wave: 'sine' },
  ],
  camera: [
    { frequency: 1800, offset: 0, duration: 0.025, wave: 'square' },
    { frequency: 110, offset: 0.025, duration: 0.12, wave: 'triangle' },
  ],
  stamp: [
    { frequency: 125, offset: 0, duration: 0.08, wave: 'square' },
    { frequency: 440, offset: 0.04, duration: 0.09, wave: 'triangle' },
  ],
  takeoff: [
    { frequency: 330, offset: 0, duration: 0.12, wave: 'sine' },
    { frequency: 440, offset: 0.11, duration: 0.12, wave: 'sine' },
    { frequency: 587, offset: 0.22, duration: 0.18, wave: 'sine' },
  ],
  coin: [
    { frequency: 988, offset: 0, duration: 0.08, wave: 'sine' },
    { frequency: 1318, offset: 0.06, duration: 0.12, wave: 'sine' },
  ],
  pager: [
    { frequency: 740, offset: 0, duration: 0.08, wave: 'square' },
    { frequency: 980, offset: 0.11, duration: 0.1, wave: 'square' },
  ],
};

let audioContext: AudioContext | null = null;

export function playActionStreetSound(cue: SoundCue, enabled: boolean): void {
  if (!enabled || typeof window === 'undefined') return;
  const AudioContextConstructor = window.AudioContext || (window as AudioWindow).webkitAudioContext;
  if (!AudioContextConstructor) return;

  try {
    audioContext ??= new AudioContextConstructor();
    if (audioContext.state === 'suspended') {
      void audioContext.resume().catch((error: unknown) => {
        console.warn('O navegador bloqueou a reprodução de áudio do Action Street.', error);
      });
    }
    const now = audioContext.currentTime;
    for (const note of NOTES[cue]) {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const start = now + note.offset;
      oscillator.type = note.wave;
      oscillator.frequency.setValueAtTime(note.frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + note.duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(start);
      oscillator.stop(start + note.duration + 0.01);
    }
  } catch (error) {
    console.warn('Não foi possível reproduzir o efeito sonoro do Action Street.', error);
  }
}
