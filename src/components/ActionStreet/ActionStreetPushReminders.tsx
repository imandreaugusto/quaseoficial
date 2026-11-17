import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { getSupabaseClient } from '../../utils/supabaseClient';
import { glass } from './shared/glass';

const STORAGE_KEY = 'bia_action_street_push_user_id';
const ENDPOINT_STORAGE_KEY = 'bia_action_street_push_endpoint';

function decodeVapidPublicKey(encodedKey: string) {
  const base64 = encodedKey.replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function supportsPushNotifications() {
  return typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;
}

export default function ActionStreetPushReminders() {
  const [userId, setUserId] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const supported = supportsPushNotifications();

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client || !supported) return;
    let cancelled = false;

    const refresh = async (nextUserId: string) => {
      const registration = await navigator.serviceWorker.getRegistration('/');
      const subscription = await registration?.pushManager.getSubscription();
      if (!cancelled) {
        setEnabled(Boolean(subscription && localStorage.getItem(STORAGE_KEY) === nextUserId));
      }
    };

    void client.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError) throw sessionError;
      const id = data.session?.user.id ?? '';
      if (cancelled) return;
      setUserId(id);
      return refresh(id);
    }).catch((reason: unknown) => {
      console.error('Could not restore Action Street push reminder settings:', reason);
    });

    const { data } = client.auth.onAuthStateChange((_event, session) => {
      const id = session?.user.id ?? '';
      setUserId(id);
      setEnabled(false);
      void refresh(id).catch((reason: unknown) => {
        console.error('Could not refresh Action Street push reminder settings:', reason);
      });
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [supported]);

  const toggleReminders = async () => {
    if (busy) return;
    setBusy(true);
    setError('');

    try {
      if (!supported) throw new Error('Este navegador não oferece notificações push.');
      if (!enabled) {
        if (!userId) throw new Error('Entre na sua conta para ativar os lembretes.');
        if (Notification.permission === 'denied') {
          throw new Error('As notificações estão bloqueadas nas permissões do navegador.');
        }
        if (Notification.permission !== 'granted' && await Notification.requestPermission() !== 'granted') {
          throw new Error('Permita notificações no navegador para receber os lembretes.');
        }
      }

      const client = getSupabaseClient();
      if (!client) throw new Error('O login não está disponível agora.');
      const { data, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      const session = data.session;
      if (!session?.access_token || !session.user.id) {
        throw new Error('Entre na sua conta para ativar os lembretes.');
      }

      if (enabled) {
        const registration = await navigator.serviceWorker.getRegistration('/');
        const subscription = await registration?.pushManager.getSubscription();
        const endpoint = subscription?.endpoint || localStorage.getItem(ENDPOINT_STORAGE_KEY);
        if (!endpoint) throw new Error('Não encontramos a inscrição push deste dispositivo.');
        const response = await apiFetch('/api/action-street/push-subscriptions', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ endpoint }),
        });
        const result = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) throw new Error(result.error || 'Não foi possível desativar os lembretes.');
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(ENDPOINT_STORAGE_KEY);
        setEnabled(false);
        return;
      }

      const registration = await navigator.serviceWorker.register('/service-worker.js');
      const subscription = await registration.pushManager.getSubscription();
      const configResponse = await apiFetch('/api/public-config');
      if (!configResponse.ok) throw new Error('Não foi possível carregar a configuração de notificações.');
      const config = await configResponse.json() as { webPushPublicKey?: string | null };
      if (!config.webPushPublicKey) throw new Error('As notificações push ainda não estão configuradas no servidor.');

      const activeSubscription = subscription || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeVapidPublicKey(config.webPushPublicKey),
      });
      const response = await apiFetch('/api/action-street/push-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          ...activeSubscription.toJSON(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Não foi possível ativar os lembretes.');

      localStorage.setItem(STORAGE_KEY, session.user.id);
      localStorage.setItem(ENDPOINT_STORAGE_KEY, activeSubscription.endpoint);
      setUserId(session.user.id);
      setEnabled(true);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Não foi possível atualizar os lembretes.';
      setError(message);
      console.error('Could not update Action Street push reminders:', reason);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void toggleReminders()}
        disabled={busy || !supported || !userId}
        aria-pressed={enabled}
        className={`${enabled ? glass.secondaryButton : glass.chip} inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white/90 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : enabled ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        {busy ? 'Atualizando...' : enabled ? 'Desativar lembretes' : 'Ativar lembretes'}
      </button>
      <p className="text-center text-[10px] text-white/60">3 avisos por dia · 06:00, 12:00 e 20:00 locais</p>
      {!userId && supported && <p className="text-center text-[10px] text-white/60">Entre na sua conta para ativar.</p>}
      {error && <p role="alert" className="text-xs text-rose-200">{error}</p>}
      {!supported && <p className="text-xs text-white/60">Push não disponível neste navegador.</p>}
    </div>
  );
}
