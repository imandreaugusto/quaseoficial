import { useMemo } from 'react';
import { BookOpen, Clock3, Footprints, MapPin, MessageCircle, Sparkles } from 'lucide-react';
import { getTouristLevelProgress, refreshChallengeTickets } from '../../../lib/actionStreet/progression';
import type { ActionStreetState, TravelJournalEventType } from '../../../types/actionStreet';
import { glass } from '../shared/glass';

interface Props {
  state: ActionStreetState;
  cityNames: Map<string, string>;
}

const EVENT_ICON: Record<TravelJournalEventType, typeof MapPin> = {
  arrival: MapPin,
  collectible: Sparkles,
  phrase: BookOpen,
  dialogue: MessageCircle,
  challenge: Footprints,
  mission: Sparkles,
};

const EVENT_LABEL: Record<TravelJournalEventType, string> = {
  arrival: 'Chegada',
  collectible: 'Descoberta',
  phrase: 'Expressão aprendida',
  dialogue: 'Conversa',
  challenge: 'Desafio',
  mission: 'Missão',
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' });

export default function TravelJournal({ state, cityNames }: Props) {
  const level = getTouristLevelProgress(state.xp);
  const tickets = refreshChallengeTickets(state.tickets);
  const entries = useMemo(() => [...state.journal].sort((a, b) => b.timestamp - a.timestamp), [state.journal]);

  return (
    <div className="relative space-y-4">
      <section className={`rounded-2xl p-4 ${glass.chip}`} aria-label="Progressão da viagem">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={glass.label}>Nível de viajante</p>
            <h3 className="mt-1 text-lg font-black">{level.current.title}</h3>
          </div>
          <span className="rounded-full border border-amber-100/20 bg-amber-200/10 px-3 py-1 text-xs font-black text-amber-100">{state.xp} XP</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-violet-400" style={{ width: `${level.progress * 100}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-[10px] font-bold text-white/55">
          <span>{level.next ? `Próximo nível: ${level.next.title}` : 'Nível máximo'}</span>
          {level.next && <span>{Math.max(0, level.next.minXp - state.xp)} XP restantes</span>}
        </div>
        <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3 text-xs text-white/75">
          <Clock3 className="h-4 w-4 text-amber-200" />
          <span>Desafios opcionais: {tickets.available}/3 tickets · recarrega 1 a cada 6 horas</span>
        </div>
        <div className="mt-4 border-t border-white/10 pt-3">
          <p className={glass.label}>Reputação local</p>
          {Object.entries(state.reputation).length ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {Object.entries(state.reputation).map(([cityId, reputation]) => (
                <li key={cityId} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-bold text-white/80">
                  {cityNames.get(cityId) ?? cityId} · {reputation > 0 ? '+' : ''}{reputation}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-white/55">Converse com moradores para construir sua reputação.</p>
          )}
        </div>
      </section>

      <section aria-label="Diário de viagem">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="font-black">Diário da viagem</h3>
          <span className={glass.label}>{entries.length} registros</span>
        </div>
        {entries.length === 0 ? (
          <div className={`rounded-2xl px-4 py-8 text-center text-sm text-white/60 ${glass.chip}`}>
            Suas descobertas e conversas aparecerão aqui enquanto você explora.
          </div>
        ) : (
          <ol className="max-h-[42dvh] space-y-2 overflow-y-auto pr-1">
            {entries.map((entry) => {
              const Icon = EVENT_ICON[entry.type];
              return (
                <li key={entry.id} className={`flex gap-3 rounded-2xl px-3 py-3 ${glass.chip}`}>
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-blue-200">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <p className={glass.label}>{EVENT_LABEL[entry.type]} · {cityNames.get(entry.cityId) ?? entry.cityId}</p>
                      <time className="text-[10px] text-white/45" dateTime={new Date(entry.timestamp).toISOString()}>
                        {dateFormatter.format(entry.timestamp)}
                      </time>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-white/90">{entry.label}</p>
                    {entry.detail && <p className="mt-1 text-[11px] leading-relaxed text-white/55">{entry.detail}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
