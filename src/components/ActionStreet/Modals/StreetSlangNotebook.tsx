import { Volume2 } from 'lucide-react';
import type { City, ActionStreetState } from '../../../types/actionStreet';
import type { SpeechRate } from '../../../types/actionStreet';
import { glass } from '../shared/glass';

interface Props {
  cities: City[];
  state: ActionStreetState;
  speechRate: SpeechRate;
}

function speak(text: string, rate: SpeechRate) {
  if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = rate;
  window.speechSynthesis.speak(utterance);
}

export default function StreetSlangNotebook({ cities, state, speechRate }: Props) {
  return (
    <div className="relative max-h-[58dvh] space-y-2 overflow-y-auto pr-1">
      <header className="mb-4">
        <p className={glass.label}>Caderno de Campo · Street Slang</p>
        <h3 className="mt-1 text-lg font-black">Expressões ouvidas na rua</h3>
        <p className="mt-1 text-xs text-white/60">Explore os marcadores da cena 360º para revelar cada expressão, seu contexto e a pronúncia.</p>
      </header>
      {cities.map((city) => {
        const collected = city.hotspots.filter((hotspot) =>
          state.souvenirs.some((souvenir) => souvenir.id === `${city.id}:${hotspot.id}`)
        ).length;
        const isCurrent = city.id === state.currentCity;
        return (
          <details key={city.id} open={isCurrent} className={`${glass.panelOverImagery} overflow-hidden !rounded-2xl`}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0">
                <span className="block truncate text-sm font-black">{city.city}</span>
                <span className={glass.label}>{city.stateName}</span>
              </span>
              <span className="shrink-0 rounded-full border border-white/15 bg-slate-950/85 px-3 py-1 text-[10px] font-bold text-emerald-100">
                {collected}/{city.hotspots.length}
              </span>
            </summary>
            <ul className="space-y-2 border-t border-white/10 p-3">
              {city.hotspots.map((hotspot) => {
                const discovered = state.souvenirs.some((souvenir) => souvenir.id === `${city.id}:${hotspot.id}`);
                const spot = city.spots.find((item) => item.id === hotspot.spotId);
                return (
                  <li key={hotspot.id} className={`rounded-xl border px-3 py-2.5 ${discovered ? 'border-violet-300/30 bg-slate-950/85' : 'border-dashed border-white/15 bg-slate-950/55'}`}>
                    {discovered ? (
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-black text-violet-100">{hotspot.word}</p>
                          <p className="mt-0.5 text-xs text-white/75">{hotspot.translation}</p>
                          <p className="mt-1 text-[10px] text-white/45">Ouvida em {spot?.name ?? city.city} · {city.city}</p>
                          <p className="mt-1 text-xs italic text-white/60">{hotspot.example}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => speak(hotspot.word, speechRate)}
                          aria-label={`Ouvir a expressão ${hotspot.word}`}
                          className={`${glass.iconButton} shrink-0`}
                        >
                          <Volume2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="font-mono text-sm tracking-[0.3em] text-white/35">••••••••</p>
                        <p className="mt-1 text-[10px] text-white/45">Expressão ainda não anotada · explore {spot?.name ?? 'esta rua'}.</p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </details>
        );
      })}
    </div>
  );
}
