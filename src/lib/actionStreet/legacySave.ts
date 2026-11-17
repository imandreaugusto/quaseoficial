import type { ActionStreetState } from '../../types/actionStreet';
import { persistenceManager } from './persistenceManager';
import { journeyStore, type Journey } from './journeyStore';

const LEGACY_DECISION_PREFIX = 'ACTION_STREET_LEGACY_IMPORT_V1_';

const decisionKey = (userId: string) => `${LEGACY_DECISION_PREFIX}${encodeURIComponent(userId)}`;

export function hasLegacySaveToImport(userId: string): boolean {
  try {
    return localStorage.getItem(decisionKey(userId)) === null
      && !persistenceManager.hasAccountState(userId)
      && (persistenceManager.hasLegacyState() || journeyStore.hasLegacyJourney());
  } catch (error) {
    console.warn('Não foi possível verificar se há um save antigo do Action Street.', error);
    return false;
  }
}

export function importLegacySave(userId: string): { state: ActionStreetState | null; journey: Journey | null } {
  const state = persistenceManager.importLegacyState(userId);
  const journey = journeyStore.importLegacyJourney(userId);
  return { state, journey };
}

export function recordLegacySaveDecision(userId: string, decision: 'imported' | 'skipped'): void {
  try {
    localStorage.setItem(decisionKey(userId), decision);
  } catch (error) {
    console.warn('Não foi possível salvar a escolha de importação do Action Street.', error);
  }
}
