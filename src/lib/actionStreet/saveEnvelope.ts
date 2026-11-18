import type { ActionStreetState } from '../../types/actionStreet';

const SAVE_KEY = 'action_street_save_v1';
export const ACTION_STREET_SAVE_ERROR_EVENT = 'action-street-save-error';

export interface ActionStreetSaveEnvelope {
  version: 1;
  state?: Partial<ActionStreetState>;
  journey?: unknown;
}

let lastSaveError = '';

function storageKey(userId?: string): string {
  return userId ? `${SAVE_KEY}_${encodeURIComponent(userId)}` : SAVE_KEY;
}

function reportSaveError(error: unknown): void {
  lastSaveError = 'Não foi possível salvar seu progresso neste dispositivo. Verifique o espaço disponível e mantenha esta aba aberta.';
  console.error(lastSaveError, error);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ACTION_STREET_SAVE_ERROR_EVENT, { detail: lastSaveError }));
  }
}

export function getActionStreetSaveError(): string {
  return lastSaveError;
}

export function readActionStreetSave(userId?: string): ActionStreetSaveEnvelope | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('O save local do Action Street não tem um formato válido.');
    }
    const envelope = parsed as Partial<ActionStreetSaveEnvelope>;
    if (envelope.version !== 1) {
      throw new Error('A versão do save local do Action Street não é compatível.');
    }
    return envelope as ActionStreetSaveEnvelope;
  } catch (error) {
    reportSaveError(error);
    return null;
  }
}

export function writeActionStreetSave(
  patch: Partial<Omit<ActionStreetSaveEnvelope, 'version'>>,
  userId?: string
): boolean {
  try {
    const key = storageKey(userId);
    const raw = localStorage.getItem(key);
    let current: Partial<ActionStreetSaveEnvelope> = {};
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || (parsed as { version?: unknown }).version !== 1) {
        throw new Error('O save local existente não é compatível; ele foi preservado sem sobrescrever.');
      }
      current = parsed as Partial<ActionStreetSaveEnvelope>;
    }
    localStorage.setItem(key, JSON.stringify({ ...current, ...patch, version: 1 }));
    lastSaveError = '';
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(ACTION_STREET_SAVE_ERROR_EVENT, { detail: '' }));
    }
    return true;
  } catch (error) {
    reportSaveError(error);
    return false;
  }
}
