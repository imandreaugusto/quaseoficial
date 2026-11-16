import type { SpeechRate } from '../../../types/actionStreet';
import { glass } from './glass';

interface Props {
  rate: SpeechRate;
  onChange: (rate: SpeechRate) => void;
}

export default function SpeechRateControl({ rate, onChange }: Props) {
  return (
    <div className={`inline-flex items-center gap-1 p-1 ${glass.chip}`} role="group" aria-label="Velocidade da pronúncia">
      {([1, 0.7] as const).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={rate === value}
          onClick={() => onChange(value)}
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
            rate === value ? 'bg-blue-400/30 text-white' : 'text-white/60 hover:text-white'
          }`}
        >
          {value.toFixed(1)}x
        </button>
      ))}
    </div>
  );
}
