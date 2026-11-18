export type TripPurpose = 'tourism' | 'business';
export type IntendedStay = '10-days' | '2-weeks' | '1-month';

export interface Ds160Answers {
  purpose: TripPurpose;
  intendedStay: IntendedStay;
}

export interface VisaOnboardingRecord extends Ds160Answers {
  hasCompletedOnboarding: true;
  destination: 'new-york-city';
  visaApprovedAt: number;
  admittedAt: number;
}

export function matchesDs160Answer(field: string, response: string, answers: Ds160Answers): boolean {
  if (field === 'purpose') return response === answers.purpose;
  if (field === 'stayDuration') return response === answers.intendedStay;
  return false;
}

const STORAGE_KEY_PREFIX = 'action_street_visa_onboarding_record_v1_';
const COMPLETED_KEY_PREFIX = 'action_street_hasCompletedOnboarding_v1_';

export function visaOnboardingStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${encodeURIComponent(userId)}`;
}

export function visaOnboardingCompletedKey(userId: string): string {
  return `${COMPLETED_KEY_PREFIX}${encodeURIComponent(userId)}`;
}

function isTripPurpose(value: unknown): value is TripPurpose {
  return value === 'tourism' || value === 'business';
}

function isIntendedStay(value: unknown): value is IntendedStay {
  return value === '10-days' || value === '2-weeks' || value === '1-month';
}

function isVisaOnboardingRecord(value: unknown): value is VisaOnboardingRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    record.hasCompletedOnboarding === true
    && isTripPurpose(record.purpose)
    && isIntendedStay(record.intendedStay)
    && record.destination === 'new-york-city'
    && typeof record.visaApprovedAt === 'number'
    && Number.isFinite(record.visaApprovedAt)
    && typeof record.admittedAt === 'number'
    && Number.isFinite(record.admittedAt)
  );
}

export function hasCompletedVisaOnboarding(userId: string | null | undefined): boolean {
  if (!userId || typeof window === 'undefined') return false;
  try {
    if (window.localStorage.getItem(visaOnboardingCompletedKey(userId)) !== 'true') return false;
    return loadVisaOnboardingRecord(userId) !== null;
  } catch (error) {
    console.warn('Não foi possível consultar a conclusão do onboarding do visto neste navegador.', error);
    return false;
  }
}

export function loadVisaOnboardingRecord(userId: string | null | undefined): VisaOnboardingRecord | null {
  if (!userId || typeof window === 'undefined') return null;
  try {
    if (window.localStorage.getItem(visaOnboardingCompletedKey(userId)) !== 'true') return null;
    const raw = window.localStorage.getItem(visaOnboardingStorageKey(userId));
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!isVisaOnboardingRecord(value)) {
      console.warn('O registro local do onboarding do visto está inválido.');
      return null;
    }
    return value;
  } catch (error) {
    console.warn('Não foi possível carregar o registro local do onboarding do visto.', error);
    return null;
  }
}

export function saveVisaOnboardingRecord(userId: string | null | undefined, record: VisaOnboardingRecord): boolean {
  if (!userId || typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(visaOnboardingStorageKey(userId), JSON.stringify(record));
    window.localStorage.setItem(visaOnboardingCompletedKey(userId), 'true');
    return true;
  } catch (error) {
    console.warn('Não foi possível salvar o onboarding do visto neste navegador.', error);
    return false;
  }
}
