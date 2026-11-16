import type { Stamp } from '../../../types/actionStreet';

interface Props {
  stamp: Stamp;
  expired: boolean;
  hidden?: boolean;
}

export default function StampBadge({ stamp, expired, hidden = false }: Props) {
  const color = expired ? '#fbbf24' : stamp.color;
  const outline = Array.from({ length: 72 }, (_, index) => {
    const angle = (index / 72) * Math.PI * 2 - Math.PI / 2;
    const radius = index % 2 === 0 ? 56 : 52;
    const x = 64 + Math.cos(angle) * radius;
    const y = 64 + Math.sin(angle) * radius;
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ') + ' Z';

  return (
    <div
      data-stamp-id={stamp.id}
      data-expired={expired ? 'true' : 'false'}
      className="relative h-28 w-28 -rotate-[8deg] text-center"
      style={{ color, opacity: hidden ? 0 : expired ? 0.75 : 1, filter: expired ? 'saturate(0.55)' : undefined }}
    >
      <svg viewBox="0 0 128 128" className="absolute inset-0 h-full w-full drop-shadow-[0_3px_2px_rgba(0,0,0,0.35)]" role="img" aria-label={`Carimbo ${stamp.title}, ${stamp.subtitle}`}>
        <path d={outline} fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="64" cy="64" r="44" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="64" cy="64" r="39" fill="none" stroke="currentColor" strokeDasharray="1 3" strokeLinecap="round" strokeWidth="1.5" />
        <path d="M37 48h54M33 53h62M31 58h66" fill="none" opacity="0.45" stroke="currentColor" strokeWidth="1" />
        <text x="64" y="69" fill="currentColor" fontFamily="sans-serif" fontSize="10" fontWeight="900" letterSpacing="0.6" textAnchor="middle">
          {stamp.title.length > 16 ? `${stamp.title.slice(0, 14)}…` : stamp.title}
        </text>
        <text x="64" y="81" fill="currentColor" fontFamily="sans-serif" fontSize="7.5" fontWeight="700" letterSpacing="0.4" textAnchor="middle">
          {stamp.subtitle.length > 21 ? `${stamp.subtitle.slice(0, 19)}…` : stamp.subtitle}
        </text>
        <text x="64" y="96" fill="currentColor" fontFamily="sans-serif" fontSize="5.5" fontWeight="800" letterSpacing="1.1" textAnchor="middle">
          ACTION STREET · USA
        </text>
      </svg>
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
