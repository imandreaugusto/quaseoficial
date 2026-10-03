import { apiFetch } from '../lib/api';
import { getSupabaseClient } from './supabaseClient';

export interface CEOAnnouncement {
  id: number;
  message: string;
  is_active: boolean;
  revision: number;
  updated_at: string;
}

const requestAnnouncementApi = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const client = getSupabaseClient();
  if (!client) throw new Error('A conexão com a conta Google não está disponível.');

  const { data: sessionData } = await client.auth.getSession();
  let accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error('Sua sessão expirou. Entre novamente com o Google.');

  const sendRequest = (token: string) => apiFetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers
    }
  });

  let response = await sendRequest(accessToken);
  if (response.status === 401) {
    const { data: refreshedData, error: refreshError } = await client.auth.refreshSession();
    if (!refreshError && refreshedData.session?.access_token) {
      accessToken = refreshedData.session.access_token;
      response = await sendRequest(accessToken);
    }
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Não foi possível carregar o aviso.');
  return payload as T;
};

export const loadCEOAnnouncement = async () => {
  const result = await requestAnnouncementApi<{ announcement: CEOAnnouncement | null }>('/api/announcements/active');
  return result.announcement;
};

export const saveCEOAnnouncement = async (message: string, isActive: boolean) => {
  const result = await requestAnnouncementApi<{ announcement: CEOAnnouncement | null }>('/api/admin/announcement', {
    method: 'POST',
    body: JSON.stringify({ message, isActive })
  });
  return result.announcement;
};