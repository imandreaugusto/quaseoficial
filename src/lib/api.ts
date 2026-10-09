const productionApiUrl = 'https://brazilian-in-action-i036.onrender.com';

const apiBaseUrl = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_URL || productionApiUrl).replace(/\/$/, '');

type ApiAccessTokenProvider = () => Promise<string | null>;

let accessTokenProvider: ApiAccessTokenProvider = async () => null;

export function setApiAccessTokenProvider(provider: ApiAccessTokenProvider) {
  accessTokenProvider = provider;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (!headers.has('Authorization')) {
    const accessToken = await accessTokenProvider();
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return fetch(`${apiBaseUrl}${path}`, { ...init, headers });
}