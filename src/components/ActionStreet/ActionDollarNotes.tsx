import { glass } from './shared/glass';

export const ACTION_DOLLAR_NOTES = [
  { id: 'classic-front', title: 'Classic · frente', image: '/action-dollars/classic-front-benjamin.jpg' },
  { id: 'classic-back', title: 'Classic · verso', image: '/action-dollars/classic-back-nyc.jpg' },
  { id: 'benjamin', title: 'Benjamin Franklin', image: '/action-dollars/collection-benjamin.jpg' },
  { id: 'liberty', title: 'Statue of Liberty', image: '/action-dollars/collection-liberty.jpg' },
  { id: 'bridge', title: 'Brooklyn Bridge', image: '/action-dollars/collection-bridge.jpg' },
  { id: 'world', title: 'Around the World', image: '/action-dollars/collection-world.jpg' },
] as const;

export function getActionDollarNote(cityId: string) {
  const index = Array.from(cityId).reduce((total, character) => total + character.charCodeAt(0), 0);
  return ACTION_DOLLAR_NOTES[index % ACTION_DOLLAR_NOTES.length];
}

export default function ActionDollarNotes({ balance }: { balance: number }) {
  return (
    <section className="relative" aria-label="Coleção de notas Action Dollars">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className={glass.label}>Coleção especial</p>
          <h3 className="text-lg font-black">Action Dollars</h3>
        </div>
        <p className="text-right text-sm font-black tabular-nums text-amber-200">{balance} AD</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {ACTION_DOLLAR_NOTES.map((note) => (
          <li key={note.id} className={`overflow-hidden rounded-2xl border border-white/15 bg-slate-950/85 p-2`}>
            <img
              src={note.image}
              alt={note.title}
              loading="lazy"
              decoding="async"
              className="aspect-[1.55] w-full rounded-xl object-cover"
            />
            <p className="px-1 pb-1 pt-2 text-xs font-bold text-white/75">{note.title}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
