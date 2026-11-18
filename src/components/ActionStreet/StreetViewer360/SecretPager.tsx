import { useEffect, useRef, useState } from 'react';
import { MessageSquareLock } from 'lucide-react';
import { appendJournalEntry, awardXp, createJournalEntry } from '../../../lib/actionStreet/progression';
import {
  loadSecretMissions,
  PAGER_TRIGGER_DELAY_MS,
  PAGER_UNLOCK_DELAY_MS,
  SECRET_MISSION_COUNT,
  type SecretMission,
} from '../../../lib/actionStreet/secretPager';
import { playActionStreetSound } from '../../../lib/actionStreet/soundEffects';
import { persistenceManager } from '../../../lib/actionStreet/persistenceManager';
import { useActionStreet } from '../ActionStreetContext';
import { glass } from '../shared/glass';
import SecretPagerModal from './SecretPagerModal';

interface Props {
  cityId: string;
  spotId: string;
  paused: boolean;
  previewUrl: string | null;
  onModalChange: (open: boolean) => void;
  onOpenPassport: (stampId: string) => void;
}

export default function SecretPager({ cityId, spotId, paused, previewUrl, onModalChange, onOpenPassport }: Props) {
  const { state, updateState, soundEnabled, reportActivity } = useActionStreet();
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible');
  const [missions, setMissions] = useState<SecretMission[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [activeMission, setActiveMission] = useState<SecretMission | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const lastAlertIndex = useRef(-1);
  const progress = state.secretMission;

  useEffect(() => {
    const handleVisibility = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    if (progress.status !== 'pending_tomorrow' || progress.unlockAt === null) return;
    const delay = progress.unlockAt - Date.now();
    if (delay <= 0) {
      updateState((previous) => previous.secretMission.status === 'pending_tomorrow'
        ? { ...previous, secretMission: { ...previous.secretMission, status: 'ready_to_verify' } }
        : previous);
      return;
    }
    const timer = window.setTimeout(() => {
      updateState((previous) => previous.secretMission.status === 'pending_tomorrow'
        ? { ...previous, secretMission: { ...previous.secretMission, status: 'ready_to_verify' } }
        : previous);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [progress.status, progress.unlockAt, updateState]);

  useEffect(() => {
    if (paused || !visible || progress.status !== 'idle' || progress.currentIndex >= SECRET_MISSION_COUNT) return;
    const startedAt = Date.now();
    const initialActiveTime = progress.activeTimeMs;
    let fired = false;
    let lastSavedAt = initialActiveTime;
    const persistElapsed = () => {
      const activeTimeMs = Math.min(PAGER_TRIGGER_DELAY_MS, initialActiveTime + Date.now() - startedAt);
      updateState((previous) => {
        if (previous.secretMission.status !== 'idle' || activeTimeMs <= previous.secretMission.activeTimeMs) return previous;
        return { ...previous, secretMission: { ...previous.secretMission, activeTimeMs } };
      });
    };
    const timer = window.setInterval(() => {
      const activeTimeMs = Math.min(PAGER_TRIGGER_DELAY_MS, initialActiveTime + Date.now() - startedAt);
      if (activeTimeMs >= PAGER_TRIGGER_DELAY_MS) {
        fired = true;
        window.clearInterval(timer);
        updateState((previous) => previous.secretMission.status === 'idle'
          ? {
              ...previous,
              secretMission: { ...previous.secretMission, status: 'ready_to_verify', activeTimeMs: PAGER_TRIGGER_DELAY_MS },
            }
          : previous);
      } else if (activeTimeMs - lastSavedAt >= 10_000) {
        lastSavedAt = activeTimeMs;
        persistElapsed();
      }
    }, 1_000);
    return () => {
      window.clearInterval(timer);
      if (!fired) persistElapsed();
    };
  }, [paused, visible, progress.status, progress.currentIndex, updateState]);

  useEffect(() => {
    if (progress.status !== 'ready_to_verify') return;
    if (lastAlertIndex.current !== progress.currentIndex) {
      lastAlertIndex.current = progress.currentIndex;
      playActionStreetSound('pager', soundEnabled);
    }
    let cancelled = false;
    void loadSecretMissions()
      .then((loaded) => {
        if (!cancelled) {
          setMissions(loaded);
          setLoadError('');
        }
      })
      .catch((error: unknown) => {
        console.error('Não foi possível carregar as missões locais do Pager Secreto.', error);
        if (!cancelled) setLoadError('Não foi possível carregar as missões secretas. Feche e reabra o Pager para tentar novamente.');
      });
    return () => {
      cancelled = true;
    };
  }, [progress.status, progress.currentIndex, soundEnabled, loadAttempt]);

  useEffect(() => {
    onModalChange(modalOpen);
    return () => onModalChange(false);
  }, [modalOpen, onModalChange]);

  const mission = missions?.[progress.currentIndex] ?? null;

  const openPager = () => {
    if (!mission || progress.status !== 'ready_to_verify') return;
    setActiveMission(mission);
    setActiveIndex(progress.currentIndex);
    setModalOpen(true);
  };

  const closePager = () => {
    setModalOpen(false);
    setActiveMission(null);
    setActiveIndex(null);
  };

  const acceptMission = () => {
    const unlockAt = Date.now() + PAGER_UNLOCK_DELAY_MS;
    updateState((previous) => {
      if (previous.secretMission.status !== 'ready_to_verify' || previous.secretMission.unlockAt !== null) return previous;
      return {
        ...previous,
        secretMission: { ...previous.secretMission, status: 'pending_tomorrow', unlockAt, activeTimeMs: 0 },
      };
    });
    closePager();
  };

  const verifyMission = (correct: boolean, selectedMission: SecretMission) => {
    if (activeIndex === null) return false;
    const earnedStampId = `secret-${selectedMission.id}`;
    let succeeded = false;
    updateState((previous) => {
      if (
        previous.secretMission.status !== 'ready_to_verify'
        || previous.secretMission.unlockAt === null
        || previous.secretMission.currentIndex !== activeIndex
      ) return previous;

      succeeded = correct;
      let next = previous;
      if (correct) {
        next = persistenceManager.updateBalance(next, selectedMission.rewardDollars);
        next = awardXp(next, 25);
        next = persistenceManager.addStamp(next, {
          id: earnedStampId,
          title: 'ACCESS GRANTED',
          subtitle: `Secret mission · ${selectedMission.id.toUpperCase()}`,
          color: '#10B981',
          cityId,
          earnedAt: Date.now(),
        });
        next = appendJournalEntry(
          next,
          createJournalEntry(cityId, 'mission', 'Secret transmission verified.', selectedMission.id)
        );
      } else {
        next = appendJournalEntry(
          next,
          createJournalEntry(cityId, 'mission', 'Secret transmission ended without a reward.', selectedMission.id)
        );
      }
      return {
        ...next,
        secretMission: {
          currentIndex: Math.min(SECRET_MISSION_COUNT, activeIndex + 1),
          status: 'idle',
          unlockAt: null,
          activeTimeMs: 0,
        },
      };
    });
    if (succeeded) {
      playActionStreetSound('stamp', soundEnabled);
      playActionStreetSound('coin', soundEnabled);
      reportActivity('mission-complete', cityId, spotId);
    } else {
      playActionStreetSound('error', soundEnabled);
      reportActivity('wrong-answer', cityId, spotId);
    }
    return succeeded;
  };

  const openPassport = (stampId: string) => {
    closePager();
    onOpenPassport(stampId);
  };

  return (
    <>
      {progress.status === 'ready_to_verify' && progress.currentIndex < SECRET_MISSION_COUNT && (
        <div className="absolute right-4 top-[8.25rem] z-30 flex max-w-[min(20rem,calc(100vw-2rem))] flex-col items-end gap-1">
          <button
            type="button"
            onClick={openPager}
            disabled={!mission}
            className={`${glass.panelOverImagery} flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-black text-emerald-100 ring-1 ring-emerald-300/50 transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70 ${mission ? 'animate-pulse' : ''}`}
            aria-label={progress.unlockAt === null ? 'Abrir nova interceptação do Pager Secreto' : 'Verificar a senha da missão secreta'}
          >
            <MessageSquareLock className="h-4 w-4" />
            {mission ? 'Mensagem criptografada' : 'Carregando Pager...'}
          </button>
          {loadError && (
            <button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)} className="rounded-lg bg-slate-950/90 px-2 py-1 text-[10px] text-rose-200">
              {loadError} · Tentar novamente
            </button>
          )}
        </div>
      )}
      {modalOpen && activeMission && (
        <SecretPagerModal
          mission={activeMission}
          unlockAt={progress.unlockAt}
          previewUrl={previewUrl}
          onClose={closePager}
          onAccept={acceptMission}
          onVerify={verifyMission}
          onOpenPassport={openPassport}
        />
      )}
    </>
  );
}
