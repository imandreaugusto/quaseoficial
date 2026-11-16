import { useEffect, useRef, useState } from 'react';
import { Loader2, Volume2, VolumeX } from 'lucide-react';
import type { City } from '../../types/actionStreet';
import { glass } from './shared/glass';

type WeatherPreset = City['weatherPreset'];

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

function createNoiseBuffer(context: AudioContext) {
  const buffer = context.createBuffer(1, context.sampleRate * 4, context.sampleRate);
  const data = buffer.getChannelData(0);
  let lowFrequency = 0;
  for (let index = 0; index < data.length; index += 1) {
    const whiteNoise = Math.random() * 2 - 1;
    lowFrequency = (lowFrequency + 0.02 * whiteNoise) / 1.02;
    data[index] = lowFrequency * 3.5;
  }
  return buffer;
}

function closeContext(context: AudioContext) {
  if (context.state !== 'closed') {
    void context.close().catch((error: unknown) => console.warn('Action Street ambience could not be stopped cleanly:', error));
  }
}

export default function AmbientSoundToggle({ weather }: { weather: WeatherPreset }) {
  const [playing, setPlaying] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const contextRef = useRef<AudioContext | null>(null);
  const startingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (contextRef.current) closeContext(contextRef.current);
      contextRef.current = null;
    };
  }, []);

  const toggle = async () => {
    setError('');
    if (contextRef.current) {
      const context = contextRef.current;
      contextRef.current = null;
      closeContext(context);
      setPlaying(false);
      return;
    }
    if (startingRef.current) return;

    const AudioContextConstructor = window.AudioContext || (window as AudioWindow).webkitAudioContext;
    if (!AudioContextConstructor) {
      setError('Este navegador não oferece áudio ambiente.');
      return;
    }

    startingRef.current = true;
    setStarting(true);
    let context: AudioContext | null = null;
    try {
      context = new AudioContextConstructor();
      const source = context.createBufferSource();
      source.buffer = createNoiseBuffer(context);
      source.loop = true;

      const filter = context.createBiquadFilter();
      filter.type = weather === 'rainy' ? 'highpass' : 'lowpass';
      filter.frequency.value =
        weather === 'rainy' ? 850 : weather === 'snowy' ? 300 : weather === 'cloudy' ? 520 : weather === 'golden_hour' ? 1150 : weather === 'night' ? 420 : 900;

      const gain = context.createGain();
      gain.gain.value = weather === 'rainy' ? 0.065 : weather === 'night' ? 0.035 : 0.04;
      source.connect(filter).connect(gain).connect(context.destination);
      source.start();
      contextRef.current = context;
      await context.resume();
      if (mountedRef.current) setPlaying(true);
    } catch (reason) {
      if (context) closeContext(context);
      if (contextRef.current === context) contextRef.current = null;
      if (mountedRef.current) setError(reason instanceof Error ? reason.message : 'Não foi possível iniciar o áudio ambiente.');
    } finally {
      startingRef.current = false;
      if (mountedRef.current) setStarting(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={starting}
        aria-label={playing ? 'Desligar som ambiente' : 'Ligar som ambiente'}
        aria-pressed={playing}
        title={playing ? 'Desligar som ambiente' : 'Ligar som ambiente'}
        className={`${glass.iconButton} ${playing ? 'border-emerald-200/50 bg-emerald-300/15 text-emerald-100' : ''}`}
      >
        {starting ? <Loader2 className="h-5 w-5 animate-spin" /> : playing ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
      </button>
      {error && (
        <p role="alert" className={`absolute right-0 top-full z-50 mt-2 w-56 p-3 text-xs text-rose-100 ${glass.panelOverImagery}`}>
          {error}
        </p>
      )}
    </div>
  );
}
