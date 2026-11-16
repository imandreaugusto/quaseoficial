import type { Stamp } from '../../../types/actionStreet';

interface Props {
  stamp: Stamp;
  expired: boolean;
  hidden?: boolean;
}

export default function StampBadge({ stamp, expired, hidden = false }: Props) {
  const color = expired ? '#fbbf24' : stamp.color;
  return (
    <div
      data-stamp-id={stamp.id}
      data-expired={expired ? 'true' : 'false'}
      className="relative flex h-28 w-28 -rotate-[8deg] flex-col items-center justify-center rounded-full border-4 border-double p-2 text-center"
      style={{ borderColor: color, color, opacity: hidden ? 0 : expired ? 0.75 : 1, filter: expired ? 'saturate(0.55)' : undefined }}
    >
      <span className="text-[11px] font-black uppercase leading-tight tracking-wider">{stamp.title}</span>
      <span className="mt-1 text-[10px] font-semibold opacity-80">{stamp.subtitle}</span>
      {expired && (
        <span
          data-expired-band
          className="absolute -right-3 top-1/2 -translate-y-1/2 rotate-12 whitespace-nowrap rounded border border-amber-200/70 bg-amber-400/95 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-slate-950 shadow-lg"
        >
          Visto expirado
        </span>
      )}
    </div>
  );
}
