import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActionStreetState } from '../../types/actionStreet';
import { ACTION_STREET_SAVE_ERROR_EVENT, getActionStreetSaveError } from '../../lib/actionStreet/saveEnvelope';
import { journeyStore, type Journey } from '../../lib/actionStreet/journeyStore';
import { persistenceManager } from '../../lib/actionStreet/persistenceManager';
import {
  hasCompletedVisaOnboarding,
  saveVisaOnboardingRecord,
  type VisaOnboardingRecord,
} from '../../lib/actionStreet/visaOnboarding';

export function useActionStreetStore(userId?: string) {
  const [state, setState] = useState<ActionStreetState>(() => persistenceManager.loadState(userId));
  const stateRef = useRef(state);
  const activeUserId = useRef(userId);
  const [savedJourney, setSavedJourney] = useState<Journey | null>(() => journeyStore.load(userId));
  const [saveError, setSaveError] = useState(getActionStreetSaveError);
  const [visaOnboarding, setVisaOnboarding] = useState(() => ({
    userId,
    completed: hasCompletedVisaOnboarding(userId),
  }));

  const updateState = useCallback((updater: (previous: ActionStreetState) => ActionStreetState) => {
    const previous = stateRef.current;
    const next = updater(previous);
    if (next === previous) return;

    stateRef.current = next;
    setState(next);
    persistenceManager.saveState(next, activeUserId.current);
    setSaveError(getActionStreetSaveError());
  }, []);

  useEffect(() => {
    if (activeUserId.current === userId) return;
    activeUserId.current = userId;
    const nextState = persistenceManager.loadState(userId);
    stateRef.current = nextState;
    setState(nextState);
    setSavedJourney(journeyStore.load(userId));
    setSaveError(getActionStreetSaveError());
    setVisaOnboarding({
      userId,
      completed: hasCompletedVisaOnboarding(userId),
    });
  }, [userId]);

  const completeVisaOnboarding = useCallback((record: VisaOnboardingRecord): boolean => {
    if (!saveVisaOnboardingRecord(userId, record)) return false;
    setVisaOnboarding({ userId, completed: true });
    return true;
  }, [userId]);

  useEffect(() => {
    const onSaveStatus = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      setSaveError(typeof detail === 'string' ? detail : getActionStreetSaveError());
    };
    window.addEventListener(ACTION_STREET_SAVE_ERROR_EVENT, onSaveStatus);
    return () => window.removeEventListener(ACTION_STREET_SAVE_ERROR_EVENT, onSaveStatus);
  }, []);

  return {
    state,
    updateState,
    savedJourney,
    setSavedJourney,
    saveError,
    visaOnboardingUserId: visaOnboarding.userId,
    hasCompletedOnboarding: visaOnboarding.completed,
    completeVisaOnboarding,
  };
}
