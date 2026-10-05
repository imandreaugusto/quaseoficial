import React, { useMemo } from 'react';
import { Globe, MapPin } from 'lucide-react';
import { UserProfile } from '../../types';
import { CeoWorldMap } from './CeoWorldMap';

const GLASS = 'rounded-3xl border border-white/20 bg-white/[0.08] backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.2)]';
const COLORS = ['#38bdf8', '#a78bfa', '#f472b6', '#34d399', '#fbbf24'];

const countBy = (items: string[]) => {
  const map = new Map<string, number>();
  items.filter(Boolean).forEach((item) => map.set(item, (map.get(item) || 0) + 1));
  return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
};

// Mapa grande e listas de países, estados e cidades dos assinantes (somente quem autorizou a localização).
export const CeoLocation: React.FC<{ users: UserProfile[] }> = ({ users }) => {
  const { students, countries, regions, cities } = useMemo(() => {
    const onlyStudents = users.filter((user) => user.role === 'student');
    return {
      students: onlyStudents,
      countries: countBy(onlyStudents.map((user) => (user.ip_country || '').trim())),
      regions: countBy(onlyStudents.map((user) => [user.ip_region, user.ip_country].filter(Boolean).join(' · '))),
      cities: countBy(onlyStudents.map((user) => [user.ip_city, user.ip_region].filter(Boolean).join(' · ')))
    };
  }, [users]);

  const located = countries.reduce((sum, country) => sum + country.count, 0);

  const List: React.FC<{ title: string; items: Array<{ name: string; count: number }> }> = ({ title, items }) => (
    <section className={`p-5 ${GLASS}`}>
      <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/75">{title}</h3>
      <ul className="space-y-1.5 text-sm">
        {items.slice(0, 8).map((item, index) => (
          <li key={item.name} className="flex items-center justify-between gap-3 text-white/80">
            <span className="flex min-w-0 items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: COLORS[index % COLORS.length] }} /><span className="truncate">{item.name}</span></span>
            <span className="font-bold text-white">{item.count}</span>
          </li>
        ))}
        {items.length === 0 && <li className="text-xs text-white/50">Sem dados de localização ainda.</li>}
      </ul>
    </section>
  );

  return (
    <div className="space-y-5">
      <section className={`p-5 sm:p-6 ${GLASS}`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-white"><Globe size={18} className="text-sky-300" /> De onde vêm os assinantes</h2>
          <span className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/75"><MapPin size={12} /> {located} de {students.length} com localização</span>
        </div>
        <div className="aspect-[720/268] w-full"><CeoWorldMap countries={countries.slice(0, 20)} /></div>
        <p className="mt-2 text-[11px] text-white/50">A localização vem do cadastro e só existe para quem autorizou o uso do local.</p>
      </section>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <List title="Países" items={countries} />
        <List title="Estados e regiões" items={regions} />
        <List title="Cidades" items={cities} />
      </div>
    </div>
  );
};
