import { useState } from 'react';
import { ChevronDown, Languages, Landmark } from 'lucide-react';
import ClickableText from '../shared/ClickableText';
import { glass } from '../shared/glass';

interface Props {
  title: string;
  text: string;
}

export default function HUDBottom({ title, text }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className={`absolute bottom-4 left-4 z-[25] w-[min(28rem,calc(100vw-2rem))] overflow-hidden text-white sm:bottom-6 sm:left-6 ${glass.panelOverImagery}`}>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition hover:bg-white/5"
      >
        <span className="flex min-w-0 items-center gap-3">
          <Landmark className="h-5 w-5 shrink-0 text-blue-300" />
          <span className="min-w-0">
            <span className={`block ${glass.label}`}>Guia turístico</span>
            <span className="block truncate text-sm font-black">{title}</span>
          </span>
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-white/60 transition-transform ${expanded ? '' : '-rotate-180'}`} />
      </button>

      {expanded && (
        <div className="border-t border-white/10 px-5 pb-4 pt-3">
          <ClickableText text={text} className="max-h-48 overflow-y-auto pr-1 text-sm leading-relaxed text-white/90" />
          <p className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-white/55">
            <Languages className="h-3.5 w-3.5" />
            Toque em qualquer palavra para ver a tradução e ouvir a pronúncia.
          </p>
        </div>
      )}
    </section>
  );
}
