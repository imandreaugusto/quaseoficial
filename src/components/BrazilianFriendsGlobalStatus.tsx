import { useEffect, useState } from 'react';
import { Bell, MessageCircle, X } from 'lucide-react';
import type { UserProfile } from '../types';
import { apiFetch } from '../lib/api';
import { playPrivateMessageSound } from '../lib/menuSounds';
import { loadUpdatesNotice } from '../lib/updatesNotice';
import { CEO_EMAIL } from '../utils/security';
import { getSupabaseClient } from '../utils/supabaseClient';

interface BrazilianFriendsGlobalStatusProps {
  user: UserProfile;
  currentApp: string;
  onOpenFriends: (friendId?: string) => void;
  onOpenHome: () => void;
}

interface PresencePayload {
  user_id: string;
  full_name: string;
  photo_url?: string | null;
  status_message?: string | null;
  ip_region?: string | null;
  ip_country?: string | null;
}

interface PrivateNotification {
  id: string;
  sender_id: string;
  created_at: string;
}

interface GlobalToast {
  type: 'private-message' | 'platform-update';
  text: string;
  friendId?: string;
}

const decodeVapidPublicKey = (encodedKey: string) => {
  const base64 = encodedKey.replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
};

export function BrazilianFriendsGlobalStatus({
  user,
  currentApp,
  onOpenFriends,
  onOpenHome
}: BrazilianFriendsGlobalStatusProps) {
  const [authenticatedUserId, setAuthenticatedUserId] = useState(user.auth_user_id || '');
  const [toast, setToast] = useState<GlobalToast | null>(null);
  const [pushReady, setPushReady] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const client = getSupabaseClient();
  const userId = authenticatedUserId || user.auth_user_id || '';
  const isFriendsOpen = currentApp === 'brazilianfriends';

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    void client.auth.getSession().then(({ data, error }) => {
      if (error) throw error;
      if (!cancelled) setAuthenticatedUserId(data.session?.user.id || '');
    }).catch((error: unknown) => {
      console.error('Could not restore global Brazilian Friends session:', error);
    });
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setAuthenticatedUserId(session?.user.id || '');
    });
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [client, user.id]);

  useEffect(() => {
    if (!client || !userId) return;

    let cancelled = false;
    let channel: ReturnType<typeof client.channel> | null = null;
    let requestPresence: (() => void) | null = null;
    const startPresence = async () => {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      const session = data.session;
      if (!session?.user.id || session.user.id !== userId || cancelled) return;

      const profile: PresencePayload = {
        user_id: session.user.id,
        full_name: user.email.trim().toLowerCase() === CEO_EMAIL
          ? 'André Augusto'
          : user.full_name?.trim() || user.email.split('@')[0],
        photo_url: user.photo_url || null,
        status_message: user.status_message || null,
        ip_region: user.location_consent ? user.ip_region || null : null,
        ip_country: user.location_consent ? user.ip_country || null : null
      };
      const token = session.access_token;
      const profileResponse = await apiFetch('/api/friends/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: profile.user_id,
          email: user.email,
          full_name: profile.full_name,
          photo_url: profile.photo_url,
          status_message: profile.status_message
        })
      });
      if (!profileResponse.ok) {
        throw new Error(`Brazilian Friends profile sync failed (${profileResponse.status}).`);
      }
      if (cancelled) return;

      channel = client.channel('online-users', {
        config: { presence: { key: profile.user_id } }
      });
      const publishPresence = () => {
        if (!channel) return;
        const onlineUsers: Record<string, PresencePayload> = {};
        Object.values(channel.presenceState<PresencePayload>()).flat().forEach((presence) => {
          if (presence.user_id) onlineUsers[presence.user_id] = presence;
        });
        window.dispatchEvent(new CustomEvent('brazilian-friends-presence', { detail: onlineUsers }));
      };
      requestPresence = publishPresence;
      window.addEventListener('brazilian-friends-presence-request', publishPresence);
      channel
        .on('presence', { event: 'sync' }, publishPresence)
        .on('presence', { event: 'join' }, publishPresence)
        .on('presence', { event: 'leave' }, publishPresence)
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && !cancelled && channel) {
            await channel.track(profile);
            publishPresence();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('Brazilian Friends global presence could not connect:', status);
          }
        });
    };

    void startPresence().catch((error: unknown) => {
      if (!cancelled) console.error('Brazilian Friends global presence failed:', error);
    });

    return () => {
      cancelled = true;
      if (requestPresence) window.removeEventListener('brazilian-friends-presence-request', requestPresence);
      if (channel) void client.removeChannel(channel);
      window.dispatchEvent(new CustomEvent('brazilian-friends-presence', { detail: {} }));
    };
  }, [client, userId, user.email, user.full_name, user.photo_url, user.status_message, user.location_consent, user.ip_region, user.ip_country]);

  useEffect(() => {
    if (!client || !userId || isFriendsOpen) return;

    let cancelled = false;
    let cursor = localStorage.getItem(`bia_friends_global_cursor_${userId}`) || new Date().toISOString();
    const poll = async () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      try {
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        let token = data.session?.access_token;
        if (!token) return;

        const request = (accessToken: string) => apiFetch(
          `/api/friends/private-notifications?since=${encodeURIComponent(cursor)}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        let response = await request(token);
        if (response.status === 401) {
          const refreshed = await client.auth.refreshSession();
          if (refreshed.error) throw refreshed.error;
          if (!refreshed.data.session?.access_token) return;
          token = refreshed.data.session.access_token;
          response = await request(token);
        }
        if (!response.ok) throw new Error(`Private message notification check failed (${response.status}).`);
        const payload = await response.json() as { messages?: PrivateNotification[] };
        const messages = (payload.messages || []).filter((message) =>
          message.id && message.sender_id && message.created_at
        );
        if (messages.length === 0 || cancelled) return;

        cursor = messages.reduce((latest, message) =>
          Date.parse(message.created_at) > Date.parse(latest) ? message.created_at : latest,
          cursor
        );
        localStorage.setItem(`bia_friends_global_cursor_${userId}`, cursor);
        const latest = messages[messages.length - 1];
        const countBySender = messages.filter((message) => message.sender_id === latest.sender_id).length;
        const messageText = countBySender > 1
          ? `${countBySender} novas mensagens privadas no Brazilian Friends.`
          : 'Você recebeu uma mensagem privada no Brazilian Friends.';
        setToast({ type: 'private-message', text: messageText, friendId: latest.sender_id });
        playPrivateMessageSound();
        if (typeof navigator.vibrate === 'function') navigator.vibrate(70);
      } catch (error) {
        console.error('Could not check for private messages across the platform:', error);
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), 5_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void poll();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [client, userId, isFriendsOpen]);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    const checkForUpdates = async () => {
      const notice = await loadUpdatesNotice();
      if (cancelled || !notice?.active || !notice.id) return;
      const storageKey = `bia_platform_notice_seen_${userId}`;
      if (localStorage.getItem(storageKey) === notice.id) return;
      localStorage.setItem(storageKey, notice.id);
      setToast({ type: 'platform-update', text: `Novidade: ${notice.title}` });
      if (
        document.visibilityState !== 'visible' &&
        'Notification' in window &&
        Notification.permission === 'granted' &&
        'serviceWorker' in navigator
      ) {
        const registration = await navigator.serviceWorker.getRegistration('/');
        if (registration) {
          await registration.showNotification(notice.title, {
            body: notice.body,
            icon: '/brazilian-in-action-icon.svg',
            badge: '/brazilian-in-action-icon.svg',
            tag: `platform-update-${notice.id}`,
            data: { url: '/' }
          });
        }
      }
    };

    void checkForUpdates();
    const interval = window.setInterval(() => void checkForUpdates(), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;

    let cancelled = false;
    const restorePushState = async () => {
      const configResponse = await apiFetch('/api/public-config');
      if (!configResponse.ok) throw new Error('Could not load push notification configuration.');
      const config = await configResponse.json() as { webPushPublicKey?: string | null };
      const registration = await navigator.serviceWorker.getRegistration('/');
      const subscription = await registration?.pushManager.getSubscription();
      const storedUserId = localStorage.getItem('bia_friends_push_user_id');
      if (!cancelled) {
        setPushReady(Boolean(config.webPushPublicKey));
        setPushEnabled(Boolean(subscription && storedUserId === userId));
      }
    };
    void restorePushState().catch((error: unknown) => {
      console.error('Could not restore platform push notification settings:', error);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const enablePushNotifications = async () => {
    if (!client || !userId || pushBusy) return;
    setPushBusy(true);
    try {
      if (Notification.permission === 'default' && await Notification.requestPermission() !== 'granted') {
        throw new Error('Permita notificações nas configurações do navegador para receber avisos.');
      }
      if (Notification.permission !== 'granted') {
        throw new Error('As notificações estão bloqueadas nas configurações do navegador.');
      }
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      const configResponse = await apiFetch('/api/public-config');
      if (!configResponse.ok) throw new Error('Não foi possível carregar a configuração de notificações.');
      const config = await configResponse.json() as { webPushPublicKey?: string | null };
      if (!config.webPushPublicKey) throw new Error('As notificações push ainda não foram configuradas no servidor.');
      const subscription = await registration.pushManager.getSubscription() ||
        await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapidPublicKey(config.webPushPublicKey)
        });
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      const token = data.session?.access_token;
      if (!token) throw new Error('Sua sessão expirou. Entre novamente para ativar as notificações.');
      const response = await apiFetch('/api/friends/push-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(subscription.toJSON())
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({})) as { error?: string };
        await subscription.unsubscribe();
        throw new Error(result.error || 'Não foi possível ativar as notificações.');
      }
      localStorage.setItem('bia_friends_push_user_id', userId);
      setPushEnabled(true);
    } catch (error) {
      console.error('Could not enable platform push notifications:', error);
      setToast({
        type: 'platform-update',
        text: error instanceof Error ? error.message : 'Não foi possível ativar as notificações.'
      });
    } finally {
      setPushBusy(false);
    }
  };

  if (!userId) return null;

  return (
    <>
      {!pushEnabled && pushReady && (
        <button
          type="button"
          onClick={() => void enablePushNotifications()}
          disabled={pushBusy}
          title="Ativar notificações no telefone"
          aria-label="Ativar notificações no telefone"
          className="fixed bottom-5 left-5 z-[4000] inline-flex items-center gap-2 rounded-full border border-white/20 bg-slate-950/90 px-4 py-3 text-xs font-semibold text-white shadow-xl backdrop-blur hover:bg-slate-900 disabled:opacity-60"
        >
          <Bell size={16} />
          {pushBusy ? 'Ativando...' : 'Ativar notificações'}
        </button>
      )}
      {toast && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-[4000] flex max-w-[min(92vw,28rem)] items-center gap-3 rounded-xl border border-cyan-200/25 bg-slate-950/95 px-4 py-3 text-sm text-white shadow-2xl backdrop-blur"
        >
          {toast.type === 'private-message'
            ? <MessageCircle size={18} className="shrink-0 text-cyan-200" aria-hidden="true" />
            : <Bell size={18} className="shrink-0 text-amber-200" aria-hidden="true" />}
          <p className="min-w-0 flex-1">{toast.text}</p>
          {toast.type === 'private-message' ? (
            <button
              type="button"
              className="shrink-0 rounded-lg bg-cyan-200/15 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-200/25"
              onClick={() => {
                setToast(null);
                onOpenFriends(toast.friendId);
              }}
            >
              Abrir
            </button>
          ) : (
            <button
              type="button"
              className="shrink-0 rounded-lg bg-amber-200/15 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-200/25"
              onClick={() => {
                setToast(null);
                onOpenHome();
              }}
            >
              Ver
            </button>
          )}
          <button
            type="button"
            className="shrink-0 rounded p-1 text-white/70 hover:bg-white/10 hover:text-white"
            onClick={() => setToast(null)}
            aria-label="Fechar notificação"
          >
            <X size={15} />
          </button>
        </aside>
      )}
    </>
  );
}
