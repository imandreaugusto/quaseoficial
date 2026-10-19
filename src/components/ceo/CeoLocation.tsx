import React, { useMemo } from 'react';
import { Globe, MapPin } from 'lucide-react';
import { UserProfile } from '../../types';
import { CeoWorldMap } from './CeoWorldMap';
import { isVerifiedCeoEmail } from '../../utils/security';
import { getCountryName } from '../../utils/countries';
import { getEffectiveSubscriptionStatus, getSubscriptionDaysRemaining } from '../../lib/subscriptionStatus';
import { deduplicateUsersByEmail } from '../../utils/deduplicateUsers';

const GLASS = 'rounded-3xl border border-white/25 bg-slate-950/30 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.25)]';
const COLORS = ['#38bdf8', '#a78bfa', '#f472b6', '#34d399', '#fbbf24'];

const countBy = (items: string[]) => {
  const map = new Map<string, number>();
  items.filter(Boolean).forEach((item) => map.set(item, (map.get(item) || 0) + 1));
  return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
};

// Mapa e listas de localização usam primeiro os dados declarados no perfil.
export const CeoLocation: React.FC<{ users: UserProfile[] }> = ({ users }) => {
  const { students, countries, regions, cities } = useMemo(() => {
    const onlyStudents = deduplicateUsersByEmail(users.filter((user) =>
      user.role === 'student' && !isVerifiedCeoEmail(user.email)
    ));
    return {
      students: onlyStudents,
      countries: countBy(onlyStudents.map((user) => getCountryName(user.profile_country || user.ip_country).trim())),
      regions: countBy(onlyStudents.map((user) => [user.profile_state || user.ip_region, getCountryName(user.profile_country || user.ip_country)].filter(Boolean).join(' · '))),
      cities: countBy(onlyStudents.map((user) => [user.profile_city || user.ip_city, user.profile_state || user.ip_region].filter(Boolean).join(' · ')))
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
        <p className="mt-2 text-[11px] text-white/50">A localização usa os dados informados no perfil; quando indisponíveis, considera os dados de IP compartilhados.</p>
      </section>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <List title="Países" items={countries} />
        <List title="Estados e regiões" items={regions} />
        <List title="Cidades" items={cities} />
      </div>
      <section className={`${GLASS} overflow-hidden`}>
        <div className="border-b border-white/10 p-5">
          <h2 className="text-sm font-bold text-white">Todos os assinantes <span className="ml-1 font-medium text-white/50">({students.length})</span></h2>
          <p className="mt-1 text-xs text-white/55">Localização informada no perfil, com dados de IP como alternativa quando disponíveis.</p>
        </div>
        <div className="ceo-subscriber-scroll max-h-[36rem] overflow-auto">
          <table className="w-full table-fixed text-left text-[10px]">
            <colgroup>
              <col className="w-[14%]" />
              <col className="w-[10%]" />
              <col className="w-[11%]" />
              <col className="w-[9%]" />
              <col className="w-[19%]" />
              <col className="w-[13%]" />
              <col className="w-[9%]" />
              <col className="w-[8%]" />
              <col className="w-[7%]" />
            </colgroup>
            <thead className="sticky top-0 bg-slate-950/95 text-[10px] uppercase tracking-wider text-white/55 backdrop-blur">
              <tr>
                {['Nome', 'Cidade', 'Estado / região', 'País', 'E-mail', 'Cadastro', 'Cupom', 'Dias restantes', 'Status'].map((heading) => (
                  <th key={heading} className="px-1 py-3 font-semibold first:pl-5 last:pr-5">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {[...students]
                .sort((first, second) => new Date(second.created_at).getTime() - new Date(first.created_at).getTime())
                .map((student) => {
                  const status = getEffectiveSubscriptionStatus(student.status, student.data_expiracao);
                  const days = getSubscriptionDaysRemaining(student.status, student.data_expiracao);
                  const statusStyle = status === 'active'
                    ? 'border-emerald-300/40 bg-emerald-400/20 text-emerald-100'
                    : status === 'expired'
                      ? 'border-rose-300/40 bg-rose-400/20 text-rose-100'
                      : 'border-amber-300/40 bg-amber-400/20 text-amber-100';
                  const statusLabel = status === 'active' ? 'Ativo' : status === 'expired' ? 'Vencido' : status === 'trial' ? 'Teste' : 'Pendente';
                  return (
                    <tr key={student.id} className="text-white/80">
                      <td className="truncate py-3 pl-5 pr-1 font-semibold text-white" title={student.full_name || student.email}>{student.full_name || student.email.split('@')[0]}</td>
                      <td className="truncate px-1" title={student.profile_city || student.ip_city || undefined}>{student.profile_city || student.ip_city || '—'}</td>
                      <td className="truncate px-1" title={student.profile_state || student.ip_region || undefined}>{student.profile_state || student.ip_region || '—'}</td>
                      <td className="truncate px-1" title={getCountryName(student.profile_country || student.ip_country) || undefined}>{getCountryName(student.profile_country || student.ip_country) || '—'}</td>
                      <td className="truncate px-1" title={student.email}>{student.email}</td>
                      <td className="whitespace-nowrap px-1">
                        <time dateTime={student.created_at}>
                          {new Date(student.created_at).toLocaleDateString('pt-BR')}
                          <span className="block text-white/55">{new Date(student.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </time>
                      </td>
                      <td className="truncate px-1" title={student.cupom_usado || undefined}>{student.cupom_usado || '—'}</td>
                      <td className="truncate px-1">{days === null ? '—' : days > 0 ? `${days} dias` : days === 0 ? 'Hoje' : 'Vencido'}</td>
                      <td className="whitespace-nowrap py-3 pl-1 pr-5">
                        <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${statusStyle}`}>{statusLabel}</span>
                      </td>
                    </tr>
                  );
                })}
              {students.length === 0 && (
                <tr><td colSpan={9} className="px-5 py-8 text-center text-white/50">Nenhum assinante cadastrado ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
