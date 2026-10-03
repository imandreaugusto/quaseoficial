import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import {LegalPage} from './components/LegalPage.tsx';
import { apiFetch } from './lib/api';
import { getSupabaseConfig } from './utils/supabaseClient';
import './index.css';

const renderApplication = () => {
  const legal = new URLSearchParams(window.location.search).get('legal');
  const initialView = legal === 'terms' || legal === 'privacy'
    ? <LegalPage kind={legal} />
    : <App />;

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary fallbackTitle="Erro ao carregar aplicativo">
        {initialView}
      </ErrorBoundary>
    </StrictMode>,
  );
};

const loadRuntimeSupabaseConfig = async () => {
  const currentConfig = getSupabaseConfig();
  const isRenderHost = window.location.hostname.endsWith('.onrender.com');
  if (currentConfig.url && currentConfig.anonKey && !isRenderHost) return false;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 5000);
  try {
    const response = await apiFetch('/api/public-config', { signal: controller.signal });
    if (!response.ok) return false;
    const config = await response.json() as { url?: string; anonKey?: string; appUrl?: string | null };
    if (config.url && config.anonKey) {
      localStorage.setItem('bia_supabase_public_config', JSON.stringify({
        ...currentConfig,
        ...config
      }));
    }

    if (isRenderHost && config.appUrl) {
      const canonicalUrl = new URL(config.appUrl);
      if (canonicalUrl.protocol === 'https:' && canonicalUrl.origin !== window.location.origin) {
        canonicalUrl.search = window.location.search;
        canonicalUrl.hash = window.location.hash;
        window.location.replace(canonicalUrl.toString());
        return true;
      }
    }
    return false;
  } catch (error) {
    console.warn('Supabase runtime config could not be loaded:', error);
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

void loadRuntimeSupabaseConfig().then((redirecting) => {
  if (!redirecting) renderApplication();
}, () => renderApplication());

