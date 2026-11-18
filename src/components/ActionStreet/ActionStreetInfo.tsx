import { Info, X } from 'lucide-react';
import { useState } from 'react';
import { glass } from './shared/glass';

const credits = [
  { label: 'Street View: Google Maps Platform', href: 'https://maps.google.com/' },
  { label: 'Mapas: OpenFreeMap', href: 'https://openfreemap.org/' },
  { label: 'Estilo de mapa: OpenMapTiles', href: 'https://openmaptiles.org/' },
  { label: 'Dados geográficos: OpenStreetMap contributors', href: 'https://www.openstreetmap.org/copyright' },
];

export default function ActionStreetInfo() {
  const [open, setOpen] = useState(false);

  return (
    <aside className="absolute bottom-3 left-3 z-[40]">
      {open && (
        <section className={`mb-2 w-[min(21rem,calc(100vw-1.5rem))] p-3 text-white ${glass.panelOverImagery}`} aria-label="Créditos do Action Street">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-xs font-black">Fontes e créditos</h2>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fechar créditos" className="rounded-full p-1 text-white/60 transition hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="space-y-1.5">
            {credits.map((credit) => (
              <li key={credit.href}>
                <a href={credit.href} target="_blank" rel="noreferrer" className="text-[10px] leading-relaxed text-white/75 underline decoration-white/30 underline-offset-2 hover:text-white">
                  {credit.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      <button
        type="button"
        aria-label={open ? 'Ocultar créditos do Action Street' : 'Mostrar créditos do Action Street'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`${glass.iconButton} !h-8 !w-8 !border-white/20 !bg-slate-950/45 !text-white/60 hover:!text-white`}
      >
        <Info className="h-4 w-4" />
      </button>
    </aside>
  );
}
