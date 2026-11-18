import { useEffect, useRef, useState } from 'react';
import { Check, Coins, Gift, Volume2, X } from 'lucide-react';
import { persistenceManager } from '../../../lib/actionStreet/persistenceManager';
import { addInventoryItem, appendJournalEntry, awardXp, createJournalEntry } from '../../../lib/actionStreet/progression';
import { routeAnimations } from '../../../lib/actionStreet/routeAnimations';
import { useActionStreet } from '../ActionStreetContext';
import ClickableText from '../shared/ClickableText';
import { glass } from '../shared/glass';
import SpeechRateControl from '../shared/SpeechRateControl';
import { getSouvenirIcon } from '../shared/souvenirIcons';

interface Props {
  cityId: string;
  hotspotId: string;
  onClose: () => void;
}

export const souvenirId = (cityId: string, hotspotId: string) => `${cityId}:${hotspotId}`;

function speak(text: string, rate: number) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = rate;
  window.speechSynthesis.speak(utterance);
}

export default function VocabularyCard({ cityId, hotspotId, onClose }: Props) {
  const { state, updateState, getCityData, speechRate, setSpeechRate, reportActivity } = useActionStreet();
  const city = getCityData(cityId);
  const hotspot = city?.hotspots.find((item) => item.id === hotspotId);
  const cardRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLSpanElement>(null);
  const animationCleanup = useRef<(() => void) | null>(null);
  const openedAt = useRef(Date.now());
  const [collecting, setCollecting] = useState(false);

  const alreadyCollected = state.souvenirs.some((item) => item.id === souvenirId(cityId, hotspotId));

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const context = gsap.context(() => {
      routeAnimations.modalOpen(card);
    }, card);
    return () => context.revert();
  }, []);

  useEffect(() => () => {
    animationCleanup.current?.();
    animationCleanup.current = null;
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.speechSynthesis?.cancel();
    };
  }, [onClose]);

  if (!city || !hotspot) return null;
  const SouvenirIcon = getSouvenirIcon(hotspot.souvenirIcon);

  const collect = () => {
    if (alreadyCollected || collecting) return;
    setCollecting(true);
    const id = souvenirId(cityId, hotspot.id);

    const award = () => {
      updateState((previous) => {
        if (previous.souvenirs.some((item) => item.id === id)) return previous;
        let updated = persistenceManager.addSouvenir(previous, {
          id,
          icon: hotspot.souvenirIcon,
          label: hotspot.word,
          fromCity: city.stateName,
          collectedAt: Date.now(),
        });
        updated = persistenceManager.updateBalance(updated, hotspot.rewardDollars);
        updated = awardXp(updated, 10);
        if (hotspot.inventoryItemId) updated = addInventoryItem(updated, hotspot.inventoryItemId);
        return appendJournalEntry(
          updated,
          createJournalEntry(cityId, 'collectible', `You collected "${hotspot.word}".`, `${city.city} · +${hotspot.rewardDollars} Action Dollars · +10 XP`)
        );
      });
      reportActivity('collectible', cityId, hotspot.id, Date.now() - openedAt.current);
      onClose();
    };

    if (iconRef.current) {
      animationCleanup.current = routeAnimations.flyToNotebook(iconRef.current, iconRef.current.innerHTML, award);
    } else {
      award();
    }
  };

  return (
    <div className={`absolute inset-0 z-40 flex items-center justify-center p-4 ${glass.backdrop}`} onClick={onClose}>
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Vocabulário: ${hotspot.word}`}
        onClick={(event) => event.stopPropagation()}
        className={`relative w-full max-w-md overflow-hidden p-6 text-white ${glass.modal}`}
      >
        <button type="button" onClick={onClose} aria-label="Fechar" className={`absolute right-4 top-4 ${glass.iconButton}`}>
          <X className="h-4 w-4" />
        </button>

        <div className="relative flex items-center gap-4">
          <span ref={iconRef} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/25 bg-blue-500/30 text-white">
            <SouvenirIcon className="h-7 w-7" />
          </span>
          <div className="min-w-0 pr-10">
            <p className={glass.label}>Vocabulário da rua</p>
            <h2 className="text-2xl font-black leading-tight">{hotspot.word}</h2>
            <p className="font-mono text-sm text-blue-200">{hotspot.phonetic}</p>
          </div>
        </div>

        <div className={`relative mt-5 ${glass.chip} !rounded-2xl px-4 py-3`}>
          <p className={glass.label}>Tradução</p>
          <p className="mt-1 text-lg font-bold">{hotspot.translation}</p>
        </div>

        <div className={`relative mt-3 ${glass.chip} !rounded-2xl px-4 py-3`}>
          <p className={glass.label}>Exemplo</p>
          <ClickableText text={hotspot.example} speechRate={speechRate} className="mt-1 text-sm italic leading-relaxed text-white/90" />
        </div>

        <div className="relative mt-5 grid grid-cols-2 gap-3">
          <button type="button" onClick={() => speak(`${hotspot.word}. ${hotspot.example}`, speechRate)} disabled={!('speechSynthesis' in window)} className={glass.secondaryButton}>
            <Volume2 className="h-5 w-5" /> Ouvir
          </button>
          <button type="button" onClick={collect} disabled={alreadyCollected || collecting} className={glass.primaryButton}>
            {alreadyCollected ? <Check className="h-5 w-5" /> : <Gift className="h-5 w-5" />}
            {alreadyCollected ? 'Anotado no Caderno' : 'Anotar no Caderno'}
          </button>
        </div>
        <div className="relative mt-3 flex items-center justify-between gap-3">
          <span className={glass.label}>Velocidade da pronúncia</span>
          <SpeechRateControl rate={speechRate} onChange={setSpeechRate} />
        </div>

        {!alreadyCollected && (
          <p className="relative mt-3 flex items-center justify-center gap-1.5 text-xs font-bold text-amber-200">
            <Coins className="h-3.5 w-3.5" />+{hotspot.rewardDollars} Action Dollars ao coletar
          </p>
        )}
      </div>
    </div>
  );
}
