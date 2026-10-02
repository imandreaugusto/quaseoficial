import { apiFetch } from './api';
import { getSupabaseClient } from '../utils/supabaseClient';

export interface WeeklyGameLeaderboardEntry {
  name: string;
  points: number;
  rank: number;
  isCurrentUser: boolean;
}

export interface WeeklyGameLeaderboard {
  weekStart: string;
  entries: WeeklyGameLeaderboardEntry[];
  currentUser: { rank: number; points: number; pointsToTopTen: number } | null;
}

const getAccessToken = async (): Promise<string> => {
  const client = getSupabaseClient();
  if (!client) throw new Error('O login do ranking requer uma sessão Supabase.');
  const { data, error } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) throw new Error('Entre novamente para acessar o ranking semanal.');
  return token;
};

export const submitBrazilianGameScore = async (gameId: string, sessionId: string, points: number) => {
  const token = await getAccessToken();
  const response = await apiFetch('/api/games/score', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ gameId, sessionId, points })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Não foi possível enviar a pontuação.');
  return result as { saved: boolean; duplicate: boolean };
};

export const loadBrazilianGamesLeaderboard = async (): Promise<WeeklyGameLeaderboard> => {
  const token = await getAccessToken();
  const response = await apiFetch('/api/games/leaderboard', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Não foi possível carregar o ranking semanal.');
  return result as WeeklyGameLeaderboard;
};