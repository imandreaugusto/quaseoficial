import { useEffect, useRef, useState } from 'react';
import { Banknote, BookMarked, BookOpen, Backpack, Lock, ScrollText, ShieldCheck, X } from 'lucide-react';
import gsap from 'gsap';
import { getAdventureItem, getAdventurePhrase } from '../../../lib/actionStreet/adventureCatalog';
import { loadVisaOnboardingRecord } from '../../../lib/actionStreet/visaOnboarding';
import { getVisaStatus } from '../../../lib/actionStreet/visa';
import { useActionStreet } from '../ActionStreetContext';
import { glass } from '../shared/glass';
import DiscoveryAtlas from './DiscoveryAtlas';
import TravelJournal from './TravelJournal';
import StampBadge from '../shared/StampBadge';
import StreakChip from '../shared/StreakChip';
import VisaNotice from './VisaNotice';
import VisaRenewalQuiz from './VisaRenewalQuiz';
import ActionDollarNotes from '../ActionDollarNotes';
import StreetSlangNotebook from './StreetSlangNotebook';

export type PassportTab = 'stamps' | 'backpack' | 'journal' | 'slang' | 'dollars';
export interface PassportHighlight {
  stampId: string;
  kind: 'earn' | 'renew';
}

interface Props {
  initialTab: PassportTab;
  highlight?: PassportHighlight;
  onClose: () => void;
  onExploreSpot: (cityId: string, spotId: string) => void;
}

export default function PassportModal({ initialTab, highlight: initialHighlight, onClose, onExploreSpot }: Props) {
  const { state, allCities, speechRate, profile } = useActionStreet();
  const [tab, setTab] = useState<PassportTab>(initialTab);
  const [highlight, setHighlight] = useState<PassportHighlight | undefined>(initialHighlight);
  const [renewingCityId, setRenewingCityId] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (renewingCityId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, renewingCityId]);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const context = gsap.context(() => {
      gsap.fromTo(card, { opacity: 0, y: 24, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'power2.out' });
    }, card);
    return () => context.revert();
  }, []);

  useEffect(() => {
    if (!highlight || tab !== 'stamps') return;
    const card = cardRef.current;
    const stamp = card?.querySelector<HTMLElement>(`[data-stamp-id="${highlight.stampId}"]`);
    if (!card || !stamp) return;

    const context = gsap.context(() => {
      const timeline = gsap.timeline({ delay: 0.2 });
      if (highlight.kind === 'earn') {
        timeline
          .fromTo(stamp, { scale: 2.5, rotation: -24, opacity: 0 }, { scale: 1, rotation: -8, opacity: 1, duration: 0.28, ease: 'power4.in' })
          .fromTo(card, { x: -5 }, { x: 0, duration: 0.24, ease: 'power2.out' }, '<')
          .fromTo(stamp, { filter: 'brightness(1.8)' }, { filter: 'brightness(1)', duration: 0.32 }, '<');
      } else {
        timeline
          .fromTo(stamp, { filter: 'saturate(0.4) brightness(0.8)', opacity: 0.6 }, { filter: 'saturate(1) brightness(1.4)', opacity: 1, duration: 0.3, ease: 'power2.out' })
          .fromTo(stamp, { scale: 1.2, rotation: -14 }, { scale: 1, rotation: -8, duration: 0.34, ease: 'power2.out' }, '<')
          .to(stamp, { filter: 'brightness(1)', duration: 0.32 });
      }
    }, card);
    return () => context.revert();
  }, [highlight, tab]);

  const earnedByCity = new Map(state.stamps.map((stamp) => [stamp.cityId, stamp]));
  const cityNames = new Map(allCities.map((city) => [city.id, city.city]));
  const visaOnboardingRecord = loadVisaOnboardingRecord(profile?.userId);
  const expiredCities = allCities
    .map((city) => ({ city, visa: getVisaStatus(state, city.id) }))
    .filter(({ visa }) => visa.hasStamp && visa.expired);

  return (
    <div className={`absolute inset-0 z-50 flex items-center justify-center p-4 ${glass.backdrop}`} onClick={onClose}>
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label="Passaporte digital"
        onClick={(event) => event.stopPropagation()}
        className={`relative max-h-[92dvh] w-full max-w-3xl overflow-y-auto p-6 text-white ${glass.modal}`}
      >
        <div className="relative mb-4 flex items-center justify-between">
          <div>
            <p className={glass.label}>Action Street</p>
            <h2 className="text-xl font-black">Passaporte Digital</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className={glass.iconButton}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <StreakChip count={state.streak.count} className="relative mb-4" />

        <div className={`relative mb-5 grid grid-cols-5 gap-1 p-1 ${glass.chip}`} role="tablist">
          {([
            ['stamps', 'Carimbos', BookOpen],
            ['backpack', 'Mochila', Backpack],
            ['journal', 'Diário', ScrollText],
            ['slang', 'Caderno', BookMarked],
            ['dollars', 'Dólares', Banknote],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              title={label}
              className={`flex min-w-0 items-center justify-center gap-1 rounded-full border px-1.5 py-2 text-[10px] font-bold transition sm:gap-2 sm:px-3 sm:text-sm ${
                tab === id ? glass.chipActive + ' text-white' : 'border-transparent text-white/60 hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>

        {tab === 'stamps' ? (
          <div className="relative">
            {visaOnboardingRecord && (
              <section className={`mb-5 rounded-2xl p-4 ${glass.chip}`} aria-label="Visto e entrada simulados">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-200" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className={glass.label}>Registro de treinamento · não é documento oficial</p>
                    <h3 className="mt-1 text-sm font-black">Prática de visto B1/B2 · chegada pelo JFK</h3>
                    <p className="mt-1 text-xs leading-relaxed text-white/65">
                      DS-160: {visaOnboardingRecord.purpose === 'tourism' ? 'Tourism / Vacation' : 'Business'} · {visaOnboardingRecord.intendedStay === '10-days' ? '10 Days' : visaOnboardingRecord.intendedStay === '2-weeks' ? '2 Weeks' : '1 Month'} · New York City
                    </p>
                    <p className="mt-1 text-[10px] text-white/45">
                      Concluído em {new Date(visaOnboardingRecord.admittedAt).toLocaleDateString('pt-BR')}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rotate-[-3deg] rounded border-2 border-emerald-300/50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-100">
                        U.S. Visa B1/B2 · Training Only
                      </span>
                      <span className="rotate-[2deg] rounded border-2 border-emerald-300/50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-100">
                        Admitted · JFK · Training Only
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            )}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {allCities.map((city) => {
                const earned = earnedByCity.get(city.id);
                const expired = getVisaStatus(state, city.id).expired;
                return earned ? (
                  <div key={city.id} className="flex justify-center">
                    <StampBadge stamp={earned} expired={expired} hidden={highlight?.kind === 'earn' && earned.id === highlight.stampId} />
                  </div>
                ) : (
                  <div key={city.id} className="flex justify-center">
                    <div className="flex h-28 w-28 flex-col items-center justify-center gap-1 rounded-full border-2 border-dashed border-white/20 text-center text-white/40">
                      <Lock className="h-4 w-4" />
                      <span className="text-[10px] font-semibold uppercase">{city.stamp.subtitle}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {expiredCities.length > 0 && (
              <div className="mt-5 space-y-3">
                {expiredCities.map(({ city, visa }) => (
                  <VisaNotice key={city.id} stateName={city.stateName} days={visa.daysSince} onRenew={() => setRenewingCityId(city.id)} />
                ))}
              </div>
            )}
          </div>
        ) : tab === 'backpack' ? (
          <div className="relative space-y-5">
            <section aria-label="Itens de viagem">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="font-black">Itens de viagem</h3>
                <span className={glass.label}>{state.inventory.length}</span>
              </div>
              {state.inventory.length ? (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {state.inventory.map((itemId) => {
                    const item = getAdventureItem(itemId);
                    return (
                      <li key={itemId} className={`rounded-2xl px-4 py-3 ${glass.chip}`}>
                        <p className="font-bold">{item.name}</p>
                        {item.translation && <p className="mt-1 text-xs text-white/55">{item.translation}</p>}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className={`rounded-2xl px-4 py-4 text-sm text-white/55 ${glass.chip}`}>Os itens que você ganhar em conversas aparecerão aqui.</p>
              )}
            </section>

            <section aria-label="Expressões aprendidas">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="font-black">Expressões aprendidas</h3>
                <span className={glass.label}>{state.learnedPhrases.length}</span>
              </div>
              {state.learnedPhrases.length ? (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {state.learnedPhrases.map((phraseId) => {
                    const phrase = getAdventurePhrase(phraseId);
                    return (
                      <li key={phraseId} className={`rounded-2xl px-4 py-3 ${glass.chip}`}>
                        <p className="font-bold">{phrase.phrase}</p>
                        {phrase.translation && <p className="mt-1 text-xs text-white/55">{phrase.translation}</p>}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className={`rounded-2xl px-4 py-4 text-sm text-white/55 ${glass.chip}`}>As expressões que você aprender em conversas aparecerão aqui.</p>
              )}
            </section>

            <section aria-label="Atlas de descobertas">
              <h3 className="mb-2 font-black">Atlas de descobertas</h3>
              <DiscoveryAtlas onExploreSpot={onExploreSpot} />
            </section>
          </div>
        ) : tab === 'journal' ? (
          <TravelJournal state={state} cityNames={cityNames} />
        ) : tab === 'slang' ? (
          <StreetSlangNotebook cities={allCities} state={state} speechRate={speechRate} />
        ) : (
          <ActionDollarNotes balance={state.balance} />
        )}
      </div>

      {renewingCityId && (
        <VisaRenewalQuiz
          cityId={renewingCityId}
          onClose={() => setRenewingCityId(null)}
          onRenewed={(stampId) => {
            setRenewingCityId(null);
            setTab('stamps');
            setHighlight({ stampId, kind: 'renew' });
          }}
        />
      )}
    </div>
  );
}
