import { loadSharedContentFromSupabase, syncSharedContentToSupabase } from '../utils/supabaseClient';

export interface UpdatesNotice {
  id: string;
  title: string;
  body: string;
  publishedAt: string;
  active: boolean;
}

export const UPDATES_CONTENT_KEY = 'bia_updates_notice';
const MAX_VIEWS = 2;

export const loadUpdatesNotice = async (): Promise<UpdatesNotice | null> => {
  try {
    return await loadSharedContentFromSupabase<UpdatesNotice>(UPDATES_CONTENT_KEY);
  } catch {
    return null;
  }
};

export const saveUpdatesNotice = (notice: UpdatesNotice) => syncSharedContentToSupabase(UPDATES_CONTENT_KEY, notice);

// O aviso aparece apenas nas 2 primeiras visitas (sessões do navegador) de cada assinante após cada publicação.
export const shouldShowUpdatesNotice = (userId: string, notice: UpdatesNotice | null): boolean => {
  if (!userId || !notice || !notice.active || !notice.id) return false;
  const sessionKey = `bia_new_session_${userId}_${notice.id}`;
  const countKey = `bia_new_views_${userId}_${notice.id}`;
  try {
    const sessionState = sessionStorage.getItem(sessionKey);
    if (sessionState) return sessionState === 'show';

    const views = Number(localStorage.getItem(countKey) || 0);
    if (views >= MAX_VIEWS) {
      sessionStorage.setItem(sessionKey, 'hide');
      return false;
    }
    localStorage.setItem(countKey, String(views + 1));
    sessionStorage.setItem(sessionKey, 'show');
    return true;
  } catch {
    return false;
  }
};
