const productionApiUrl = 'https://brazilian-in-action.onrender.com';

const apiBaseUrl = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_URL || productionApiUrl).replace(/\/$/, '');

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${apiBaseUrl}${path}`, init);
}