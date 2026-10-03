import { useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimeChannel, Session } from '@supabase/supabase-js';
import { ArrowLeft, Camera, ChevronDown, Info, MessageCircle, MessageCircleMore, Pin, PinOff, Send, Smile, Users, WifiOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { BrazilianLogo } from './BrazilianLogo';
import { getSupabaseClient, getSupabaseConfig, signInWithGoogle } from '../utils/supabaseClient';
import { CEO_EMAIL } from '../utils/security';
import { apiFetch } from '../lib/api';

const QUICK_EMOJIS = [
  '😀', '😂', '😍', '😊', '😉', '😎', '🥳', '😢',
  '😡', '👍', '👏', '🙏', '💪', '❤️', '🔥', '🎉',
  '✅', '🇧🇷', '🇺🇸', '☕', '⭐', '🤔', '👋', '😴'
];

interface BrazilianFriendsProps {
  currentUser: UserProfile;
  accentColor: string;
}

interface FriendProfile {
  id: string;
  email?: string;
  full_name: string;
  photo_url?: string | null;
  status_message?: string | null;
  ip_region?: string | null;
  ip_country?: string | null;
}

interface FriendMessage {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  body: string;
  created_at: string;
  expires_at: string | null;
}

interface PinnedMessage {
  id: string;
  body: string;
  pinned_by: string;
  pinned_at: string;
}

interface PresencePayload {
  user_id: string;
  full_name: string;
  photo_url?: string | null;
  status_message?: string | null;
  ip_region?: string | null;
  ip_country?: string | null;
}

const PRESENCE_CHANNEL = 'online-users';

const COUNTRY_CODES: Record<string, string> = {
  argentina: 'AR', australia: 'AU', austria: 'AT', belgium: 'BE', bolivia: 'BO', brazil: 'BR', brasil: 'BR',
  canada: 'CA', chile: 'CL', china: 'CN', colombia: 'CO', costa_rica: 'CR', croatia: 'HR', cuba: 'CU',
  czechia: 'CZ', denmark: 'DK', ecuador: 'EC', egypt: 'EG', finland: 'FI', france: 'FR', germany: 'DE',
  greece: 'GR', india: 'IN', indonesia: 'ID', ireland: 'IE', israel: 'IL', italy: 'IT', japan: 'JP',
  mexico: 'MX', morocco: 'MA', netherlands: 'NL', new_zealand: 'NZ', nigeria: 'NG', norway: 'NO',
  panama: 'PA', paraguay: 'PY', peru: 'PE', philippines: 'PH', poland: 'PL', portugal: 'PT', romania: 'RO',
  russia: 'RU', south_africa: 'ZA', south_korea: 'KR', spain: 'ES', sweden: 'SE', switzerland: 'CH',
  thailand: 'TH', turkey: 'TR', ukraine: 'UA', united_arab_emirates: 'AE', united_kingdom: 'GB',
  united_states: 'US', uruguay: 'UY', venezuela: 'VE', vietnam: 'VN'
};

const normalizeCountry = (country?: string | null) =>
  country?.trim().toLocaleLowerCase('en-US').replace(/[\s-]+/g, '_') || '';

const getCountryFlag = (country?: string | null) => {
  const normalized = country?.trim().toUpperCase() || '';
  const code = /^[A-Z]{2}$/.test(normalized) ? normalized : COUNTRY_CODES[normalizeCountry(country)];
  return code
    ? String.fromCodePoint(...[...code].map((letter) => 127397 + letter.charCodeAt(0)))
    : '🌐';
};

const formatLocation = (profile: Pick<FriendProfile, 'ip_region' | 'ip_country'>) =>
  [profile.ip_region, profile.ip_country].filter(Boolean).join(', ') || 'Localização não compartilhada';

const formatMobileLocation = (profile: Pick<FriendProfile, 'ip_region' | 'ip_country'>) =>
  formatLocation(profile);

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'B';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const formatTime = (date: string) =>
  new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(date));

const getPublicName = (user: Pick<UserProfile, 'email' | 'full_name'>) =>
  user.email.trim().toLowerCase() === CEO_EMAIL.toLowerCase()
    ? 'André Augusto'
    : user.full_name?.trim() || user.email.split('@')[0];

type SupabaseClientLike = NonNullable<ReturnType<typeof getSupabaseClient>>;

const requestFriendsApi = async <T,>(client: SupabaseClientLike, path: string, init?: RequestInit) => {
  const { data: sessionData } = await client.auth.getSession();
  let accessToken = sessionData.session?.access_token;
  if (!accessToken) return { data: null, error: 'Sua sessão expirou. Entre novamente para usar o chat.' };

  try {
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
    if (!response.ok) return { data: null, error: payload.error || 'O chat não está disponível agora.' };
    return { data: payload as T, error: null };
  } catch {
    return { data: null, error: 'Não foi possível conectar ao servidor do chat.' };
  }
};

const upsertFriendProfile = async (client: SupabaseClientLike, profile: FriendProfile) => {
  const result = await requestFriendsApi(client, '/api/friends/profile', {
    method: 'POST',
    body: JSON.stringify(profile)
  });
  return { error: result.error };
};

const selectFriendProfiles = async (client: SupabaseClientLike) => {
  const result = await requestFriendsApi<{ profiles: FriendProfile[] }>(client, '/api/friends/profiles');
  return { data: result.data?.profiles || [], error: result.error };
};

export function BrazilianFriends({ currentUser, accentColor }: BrazilianFriendsProps) {
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const socialUserId = sessionUserId || '';
  const [profiles, setProfiles] = useState<FriendProfile[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, PresencePayload>>({});
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [profilePreviewId, setProfilePreviewId] = useState<string | null>(null);
  const [messages, setMessages] = useState<FriendMessage[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState('');
  const [isPeopleDrawerOpen, setIsPeopleDrawerOpen] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | undefined>(currentUser.photo_url);
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);
  const [statusDraft, setStatusDraft] = useState(currentUser.status_message || '');
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isConnectingToChat, setIsConnectingToChat] = useState(false);
  const friendsShellRef = useRef<HTMLElement>(null);
  const messageScrollRef = useRef<HTMLDivElement>(null);
  const composerInputRef = useRef<HTMLInputElement>(null);
  const shouldStickToBottomRef = useRef(true);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const shell = friendsShellRef.current;
    const viewport = window.visualViewport;
    if (!shell || !viewport) return;

    const syncViewportHeight = () => {
      shell.style.setProperty('--friends-viewport-height', `${viewport.height}px`);
      if (document.activeElement === composerInputRef.current) {
        window.requestAnimationFrame(() => {
          const messageScroll = messageScrollRef.current;
          messageScroll?.scrollTo({ top: messageScroll.scrollHeight, behavior: 'smooth' });
        });
      }
    };

    syncViewportHeight();
    viewport.addEventListener('resize', syncViewportHeight);
    viewport.addEventListener('scroll', syncViewportHeight);
    return () => {
      viewport.removeEventListener('resize', syncViewportHeight);
      viewport.removeEventListener('scroll', syncViewportHeight);
      shell.style.removeProperty('--friends-viewport-height');
    };
  }, []);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setIsSessionReady(true);
      return;
    }

    let cancelled = false;
    const updateSession = (session: Session | null) => {
      if (cancelled) return;
      setSessionUserId(session?.user.id || null);
      setIsSessionReady(true);
    };

    void client.auth.getSession().then(({ data }) => updateSession(data.session));
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => updateSession(session));

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    setProfilePhoto(currentUser.photo_url);
  }, [currentUser.photo_url]);

  const selectedFriend = profiles.find((profile) => profile.id === selectedFriendId) || null;
  const profilePreview = profiles.find((profile) => profile.id === profilePreviewId) || null;
  const profilePreviewPresence = profilePreviewId ? onlineUsers[profilePreviewId] : undefined;
  const isProfilePreviewOnline = Boolean(profilePreviewPresence);
  const profilePreviewDetails = profilePreviewPresence || profilePreview;
  const selectedFriendPresence = selectedFriendId ? onlineUsers[selectedFriendId] : undefined;
  const selectedFriendDetails = selectedFriendPresence || selectedFriend;
  const onlineFriends = useMemo(
    () => profiles.filter((profile) => onlineUsers[profile.id]),
    [onlineUsers, profiles]
  );
  const allFriends = useMemo(
    () => profiles
      .filter((profile) => Boolean(onlineUsers[profile.id]))
      .sort((a, b) => {
        const aOnline = onlineUsers[a.id] ? 1 : 0;
        const bOnline = onlineUsers[b.id] ? 1 : 0;
        if (aOnline !== bOnline) return bOnline - aOnline;
        return a.full_name.localeCompare(b.full_name);
      }),
    [socialUserId, onlineUsers, profiles]
  );

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setIsLoading(false);
      return;
    }
    if (!isSessionReady) return;
    if (!socialUserId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const syncProfileAndPresence = async () => {
      setError('');
      const profile: FriendProfile = {
        id: socialUserId,
        email: currentUser.email,
        full_name: getPublicName(currentUser),
        photo_url: profilePhoto || currentUser.photo_url || null,
        status_message: currentUser.status_message || null
      };

      const { error: profileError } = await upsertFriendProfile(client, profile);
      if (profileError) {
        console.warn('Brazilian Friends profile sync failed:', profileError);
      }

      const { data, error: profilesError } = await selectFriendProfiles(client);

      if (cancelled) return;
      if (profilesError) {
        setError('Não foi possível carregar os assinantes do Brazilian Friends agora.');
      } else {
        setProfiles((data || []) as FriendProfile[]);
      }
      setIsLoading(false);

      const channel = client.channel(PRESENCE_CHANNEL, {
        config: { presence: { key: socialUserId } }
      });
      presenceChannelRef.current = channel;

      const updatePresence = () => {
        const state = channel.presenceState<PresencePayload>();
        const nextUsers: Record<string, PresencePayload> = {};
        Object.values(state).flat().forEach((presence) => {
          if (presence.user_id) nextUsers[presence.user_id] = presence;
        });
        setOnlineUsers(nextUsers);
      };

      channel
        .on('presence', { event: 'sync' }, updatePresence)
        .on('presence', { event: 'join' }, updatePresence)
        .on('presence', { event: 'leave' }, updatePresence)
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              user_id: socialUserId,
              full_name: profile.full_name,
              photo_url: profile.photo_url,
              status_message: profile.status_message,
              ip_region: currentUser.location_consent ? currentUser.ip_region || null : null,
              ip_country: currentUser.location_consent ? currentUser.ip_country || null : null
            });
            updatePresence();
          }
        });
    };

    void syncProfileAndPresence();
    return () => {
      cancelled = true;
      if (presenceChannelRef.current) {
        void client.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
    };
  }, [currentUser, isSessionReady, socialUserId]);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setIsLoadingMessages(false);
      setMessages([]);
      return;
    }
    if (!isSessionReady) return;
    if (!socialUserId) {
      setIsLoadingMessages(false);
      setMessages([]);
      return;
    }
    let cancelled = false;
    const loadConversation = async (showLoading = false) => {
      if (showLoading) setIsLoadingMessages(true);
      const path = selectedFriendId
        ? `/api/friends/messages?recipientId=${encodeURIComponent(selectedFriendId)}`
        : '/api/friends/messages';
      const { data, error: messagesError } = await requestFriendsApi<{ messages: FriendMessage[] }>(client, path);

      if (cancelled) return;
      if (messagesError) {
        setError('Não foi possível carregar esta conversa no momento.');
      } else {
        const nextMessages = (data?.messages || []).filter((message) =>
          !message.expires_at || Date.parse(message.expires_at) > Date.now()
        );
        setMessages((current) => {
          const unchanged = current.length === nextMessages.length && current.every((message, index) => {
            const nextMessage = nextMessages[index];
            return message.id === nextMessage.id && message.body === nextMessage.body;
          });
          return unchanged ? current : nextMessages;
        });
      }
      setIsLoadingMessages(false);
    };

    void loadConversation(true);
    const pollingId = window.setInterval(() => void loadConversation(), 5_000);
    return () => {
      cancelled = true;
      window.clearInterval(pollingId);
    };
  }, [isSessionReady, socialUserId, selectedFriendId]);

  useEffect(() => {
    if (!shouldStickToBottomRef.current) return;
    window.requestAnimationFrame(() => {
      const messageScroll = messageScrollRef.current;
      messageScroll?.scrollTo({ top: messageScroll.scrollHeight, behavior: 'smooth' });
    });
  }, [messages]);

  useEffect(() => {
    setShowEmojiPicker(false);
  }, [selectedFriendId]);

  const sendMessage = async () => {
    const body = draft.trim();
    const client = getSupabaseClient();
    if (!client || !body) return;

    const { data: sessionData } = await client.auth.getSession();
    const senderId = sessionData.session?.user?.id;
    if (!senderId) {
      setError('Sua sessão expirou. Entre novamente para enviar mensagens.');
      return;
    }
    if (senderId !== socialUserId) setSessionUserId(senderId);

    setDraft('');
    const { data, error: sendError } = await requestFriendsApi<{ message: FriendMessage }>(client, '/api/friends/messages', {
      method: 'POST',
      body: JSON.stringify({ receiver_id: selectedFriendId, body })
    });

    if (sendError) {
      setDraft(body);
      setError(sendError);
      return;
    }

    const sentMessage = data?.message;
    if (!sentMessage) {
      setDraft(body);
      setError('Sua mensagem não pôde ser enviada. Tente novamente.');
      return;
    }
    setMessages((current) => current.some((message) => message.id === sentMessage.id)
      ? current
      : [...current, sentMessage]);
  };

  const handleFriendsSignIn = async () => {
    if (isConnectingToChat) return;
    setError('');
    setIsConnectingToChat(true);
    const result = await signInWithGoogle();
    if (!result.ok) {
      setIsConnectingToChat(false);
      setError(result.reason === 'offline'
        ? 'O login para o chat não está disponível agora.'
        : result.message || 'Não foi possível iniciar o login para o chat.');
    }
  };

  const { url: configuredUrl, anonKey: configuredAnonKey } = getSupabaseConfig();
  const publicName = getPublicName(currentUser);
  const canManagePinnedMessages = currentUser.email.trim().toLowerCase() === CEO_EMAIL.toLowerCase();

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client || !isSessionReady || !socialUserId) return;
    let cancelled = false;
    const loadPinnedMessages = async () => {
      const result = await requestFriendsApi<{ pinnedMessages: PinnedMessage[] }>(client, '/api/friends/pinned-messages');
      if (!cancelled && !result.error) setPinnedMessages(result.data?.pinnedMessages || []);
    };
    void loadPinnedMessages();
    const pollingId = window.setInterval(() => void loadPinnedMessages(), 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(pollingId);
    };
  }, [isSessionReady, socialUserId]);

  const pinMessage = async (body: string) => {
    const client = getSupabaseClient();
    if (!client || !canManagePinnedMessages) return;
    const result = await requestFriendsApi<{ pinnedMessage: PinnedMessage }>(client, '/api/friends/pinned-messages', {
      method: 'POST',
      body: JSON.stringify({ body })
    });
    if (result.error || !result.data?.pinnedMessage) {
      setError(result.error || 'Não foi possível fixar a mensagem.');
      return;
    }
    setPinnedMessages((current) => [result.data!.pinnedMessage, ...current]);
  };

  const unpinMessage = async (messageId: string) => {
    const client = getSupabaseClient();
    if (!client || !canManagePinnedMessages) return;
    const result = await requestFriendsApi<unknown>(client, `/api/friends/pinned-messages/${messageId}`, { method: 'DELETE' });
    if (result.error) {
      setError(result.error);
      return;
    }
    setPinnedMessages((current) => current.filter((message) => message.id !== messageId));
  };

  const handleProfilePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const nextPhoto = String(reader.result || '');
      setProfilePhoto(nextPhoto);
      const storedUserRaw = localStorage.getItem('bia_current_user');
      if (storedUserRaw) {
        try {
          const storedUser = JSON.parse(storedUserRaw) as UserProfile;
          const nextUser = { ...storedUser, photo_url: nextPhoto };
          localStorage.setItem('bia_current_user', JSON.stringify(nextUser));
        } catch {
          // ignore invalid storage snapshot
        }
      }

      const client = getSupabaseClient();
      if (client) {
        await upsertFriendProfile(client, {
          id: socialUserId,
          email: currentUser.email,
          full_name: getPublicName(currentUser),
          photo_url: nextPhoto,
          status_message: currentUser.status_message || null
        });
      }

      event.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  const openProfileEditor = () => {
    const myProfile = profiles.find((profile) => profile.id === socialUserId);
    setStatusDraft(myProfile?.status_message || currentUser.status_message || '');
    setIsProfileEditorOpen(true);
  };

  const handleSaveStatus = async () => {
    const client = getSupabaseClient();
    if (!client) {
      setIsProfileEditorOpen(false);
      return;
    }

    setIsSavingStatus(true);
    const nextStatus = statusDraft.trim();
    const { error: saveError } = await upsertFriendProfile(client, {
      id: socialUserId,
      email: currentUser.email,
      full_name: getPublicName(currentUser),
      photo_url: profilePhoto || currentUser.photo_url || null,
      status_message: nextStatus || null
    });
    setIsSavingStatus(false);

    if (saveError) {
      setError('Não foi possível salvar sua descrição agora.');
      return;
    }

    setProfiles((current) => current.map((profile) => (
      profile.id === socialUserId ? { ...profile, status_message: nextStatus || null } : profile
    )));

    const storedUserRaw = localStorage.getItem('bia_current_user');
    if (storedUserRaw) {
      try {
        const storedUser = JSON.parse(storedUserRaw) as UserProfile;
        localStorage.setItem('bia_current_user', JSON.stringify({ ...storedUser, status_message: nextStatus || undefined }));
      } catch {
        // ignore invalid storage snapshot
      }
    }

    setIsProfileEditorOpen(false);
  };

  const renderAvatar = (name: string, photo?: string | null, sizeClass = 'friends-avatar') => {
    const hasPhoto = Boolean(photo && photo.trim());
    if (hasPhoto) {
      return (
        <span className={`${sizeClass} friends-avatar-photo`}>
          <img src={photo || undefined} alt={name} />
        </span>
      );
    }

    return (
      <span className={sizeClass} style={{ '--avatar-color': accentColor } as React.CSSProperties}>
        {getInitials(name)}
      </span>
    );
  };

  const renderPeople = (mobile = false) => (
    <aside className={mobile ? 'friends-people-panel friends-people-panel-mobile' : 'friends-people-panel'}>
      <div className="friends-people-heading">
        <BrazilianLogo size="sm" variant="full" showText={false} className="friends-official-logo" />
        <div>
          <p className="friends-brand-name">Brazilian Friends</p>
          <p className="friends-brand-subtitle">Connect · Chat · Make Friends</p>
        </div>
        {mobile && <button type="button" className="friends-icon-button" onClick={() => setIsPeopleDrawerOpen(false)} aria-label="Close people list"><X size={17} /></button>}
      </div>
      <button
        type="button"
        className="friends-online-label"
        onClick={() => !mobile && (socialUserId ? setIsPeopleDrawerOpen(true) : void handleFriendsSignIn())}
        aria-label={socialUserId ? `${onlineFriends.length} pessoas online` : 'Entrar com Google para aparecer online'}
      >
        <span className="friends-online-dot" /> {socialUserId ? `Online (${onlineFriends.length})` : isSessionReady ? 'Entrar para aparecer online' : 'Verificando conexão...'} <ChevronDown size={14} />
      </button>
      <div className="friends-people-list custom-scrollbar">
        {isLoading && <p className="friends-muted-copy">Buscando assinantes...</p>}
        {!isLoading && allFriends.length === 0 && <p className="friends-muted-copy">Nenhum assinante online no momento.</p>}
        {allFriends.map((friend) => {
          const presence = onlineUsers[friend.id];
          const isOnline = Boolean(presence);
          const isSelf = friend.id === socialUserId;
          const profileName = presence?.full_name || friend.full_name;
          const profileLocation = presence || friend;
          const statusLine = formatMobileLocation(profileLocation);
          return (
            <button
              key={friend.id}
              type="button"
              onClick={() => {
                if (isSelf) {
                  openProfileEditor();
                } else {
                  setProfilePreviewId(friend.id);
                }
                setIsPeopleDrawerOpen(false);
              }}
              className="friends-person"
              title={isSelf ? 'Editar sua foto e descrição' : undefined}
            >
              <span className={`friends-list-status-dot ${isOnline ? 'friends-list-status-online' : ''}`} />
              <span className="friends-person-copy">
                <strong>{profileName}</strong>
                <small>{getCountryFlag(profileLocation.ip_country)} {statusLine}{isSelf ? ' · You' : ''}</small>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );

  if (!configuredUrl || !configuredAnonKey) {
    return (
      <section className="friends-shell">
        <div className="friends-glass-frame friends-empty-state" />
      </section>
    );
  }

  return (
    <section className="friends-shell" ref={friendsShellRef}>
      <div className="friends-glass-frame">
        {renderPeople()}
        <main className={`friends-conversation ${selectedFriend ? 'friends-conversation-private' : ''}`}>
          <header className="friends-conversation-header">
            <div className="friends-header-title">
              {selectedFriend ? (
                renderAvatar(
                  selectedFriendDetails?.full_name || selectedFriend.full_name,
                  selectedFriendDetails?.photo_url || selectedFriend.photo_url,
                  'friends-header-avatar'
                )
              ) : (
                <div className="friends-header-icon"><Users size={18} /></div>
              )}
              <div>
                <h1>{selectedFriendDetails?.full_name || selectedFriend?.full_name || 'Brazilian Friends'}</h1>
                <p className={selectedFriend ? 'friends-private-subtitle' : 'friends-public-online-count'}>
                  {selectedFriend
                    ? `${selectedFriendPresence ? 'Online' : 'Offline'} · ${getCountryFlag(selectedFriendDetails?.ip_country)} ${formatLocation(selectedFriendDetails || selectedFriend)}`
                    : `${onlineFriends.length} people online`}
                </p>
              </div>
            </div>

            <div className="friends-header-actions">
              <a
                href="https://chat.whatsapp.com/DGnejSTzsBKKN02aH0tU8A"
                target="_blank"
                rel="noreferrer"
                className="friends-header-action-button friends-header-whatsapp"
                aria-label="Entrar no grupo do Brazilian Friends no WhatsApp"
                title="Grupo do WhatsApp do Brazilian Friends"
              >
                <MessageCircleMore size={15} />
                <span>WhatsApp</span>
              </a>

              <span
                className="friends-header-info-button"
                aria-label="Informação sobre o grupo do WhatsApp"
                title="Grupo para continuar o assunto fora do chat do app."
              >
                <Info size={12} />
              </span>
            </div>

            {!selectedFriend && <button type="button" className="friends-online-trigger" onClick={() => socialUserId ? setIsPeopleDrawerOpen(true) : void handleFriendsSignIn()} disabled={!isSessionReady || isConnectingToChat}><Users size={16} /><span>{socialUserId ? `${onlineFriends.length} people online` : isConnectingToChat ? 'Abrindo Google...' : 'Conectar para ficar online'}</span><ChevronDown size={14} /></button>}
            {selectedFriend && <button type="button" className="friends-mobile-back-button" onClick={() => setSelectedFriendId(null)}><ArrowLeft size={15} /><span>Public chat</span></button>}
            {selectedFriend && <button type="button" className="friends-selected-chip" onClick={() => setSelectedFriendId(null)}><ArrowLeft size={13} /> {selectedFriend.full_name}</button>}
          </header>

          <div
            className="friends-message-scroll custom-scrollbar"
            ref={messageScrollRef}
            onScroll={(event) => {
              const element = event.currentTarget;
              shouldStickToBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
            }}
          >
            {!selectedFriend && pinnedMessages.length > 0 && (
              <section className="friends-pinned-messages" aria-label="Mensagens fixadas">
                {pinnedMessages.map((message) => (
                  <article key={message.id} className="friends-pinned-message">
                    <Pin size={14} />
                    <p>{message.body}</p>
                    {canManagePinnedMessages && <button type="button" className="friends-pinned-remove" onClick={() => void unpinMessage(message.id)} aria-label="Desafixar mensagem"><PinOff size={14} /></button>}
                  </article>
                ))}
              </section>
            )}
            {!isLoadingMessages && !selectedFriend && messages.length === 0 && (
              <div className="friends-empty-conversation">
                <MessageCircle size={28} className="mb-3" />
                <p>Diga oi para todos no Brazilian Friends.</p>
              </div>
            )}
            {isLoadingMessages && <p className="friends-muted-copy">Carregando conversa...</p>}
            {messages.map((message) => {
              const ownMessage = message.sender_id === socialUserId;
              const senderProfile = profiles.find((p) => p.id === message.sender_id);
              const senderName = ownMessage ? publicName : (senderProfile?.full_name || selectedFriend?.full_name || 'User');
              const senderLocation = ownMessage ? formatLocation(currentUser) : (senderProfile ? formatLocation(senderProfile) : 'Brasil');
              
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`friends-message-row ${ownMessage ? 'friends-message-row-own' : ''}`}
                >
                  <div className="friends-message-group">
                    <div className="friends-message-meta"><strong>{senderName}</strong><span>{senderLocation}</span></div>
                    <div className={`friends-message-bubble ${ownMessage ? 'friends-message-bubble-own' : ''}`} style={ownMessage ? { '--bubble-accent': accentColor } as React.CSSProperties : undefined}>
                      <p>{message.body}</p>
                      {canManagePinnedMessages && !selectedFriend && <button type="button" className="friends-message-pin" onClick={() => void pinMessage(message.body)} aria-label="Fixar mensagem" title="Fixar mensagem"><Pin size={13} /></button>}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <form
            className="friends-composer"
            onSubmit={(event) => {
              event.preventDefault();
              setShowEmojiPicker(false);
              void sendMessage();
            }}
          >
            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="friends-emoji-picker"
                >
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setDraft((current) => `${current}${emoji}`)}
                      className="friends-emoji-button"
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            {socialUserId ? (
              <div className="friends-composer-inner">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((current) => !current)}
                  className="friends-icon-button friends-composer-icon"
                  aria-label="Insert emoji"
                  title="Insert emoji"
                >
                  <Smile size={19} />
                </button>
                <input
                  ref={composerInputRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onFocus={() => {
                    shouldStickToBottomRef.current = true;
                    window.requestAnimationFrame(() => {
                      const messageScroll = messageScrollRef.current;
                      messageScroll?.scrollTo({ top: messageScroll.scrollHeight, behavior: 'smooth' });
                    });
                  }}
                  placeholder="Escreva em inglês..."
                  className="friends-composer-input"
                  maxLength={2000}
                />
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  className="friends-send-button"
                  style={{ backgroundColor: accentColor }}
                  aria-label="Send message"
                  title="Send message"
                >
                  <Send size={17} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="friends-auth-button"
                onClick={() => void handleFriendsSignIn()}
                disabled={!isSessionReady || isConnectingToChat}
                aria-busy={isConnectingToChat}
              >
                <MessageCircle size={17} />
                <span>{!isSessionReady ? 'Verificando conexão do chat...' : isConnectingToChat ? 'Abrindo login do Google...' : 'Entrar com Google para ficar online e enviar mensagens'}</span>
              </button>
            )}
            {error && <p className="friends-error">{error}</p>}
          </form>
        </main>
      </div>
      {isPeopleDrawerOpen && <div className="friends-drawer-backdrop" onClick={() => setIsPeopleDrawerOpen(false)}><div onClick={(event) => event.stopPropagation()}>{renderPeople(true)}</div></div>}
      {profilePreview && (
        <div className="friends-profile-preview-backdrop" onClick={() => setProfilePreviewId(null)}>
          <section className="friends-profile-preview" role="dialog" aria-modal="true" aria-labelledby="friends-profile-preview-name" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="friends-icon-button friends-profile-preview-close" onClick={() => setProfilePreviewId(null)} aria-label="Fechar perfil">
              <X size={17} />
            </button>
            <div className="friends-profile-preview-avatar-wrap">
              {renderAvatar(profilePreviewDetails?.full_name || profilePreview.full_name, profilePreviewDetails?.photo_url || profilePreview.photo_url, 'friends-profile-preview-avatar')}
              {isProfilePreviewOnline && <span className="friends-profile-preview-status" />}
            </div>
            <h2 id="friends-profile-preview-name">{profilePreviewDetails?.full_name || profilePreview.full_name}</h2>
            <p className="friends-profile-preview-location">
              <span className={`friends-list-status-dot ${isProfilePreviewOnline ? 'friends-list-status-online' : ''}`} />
              {isProfilePreviewOnline ? 'Online' : 'Offline'} · {getCountryFlag(profilePreviewDetails?.ip_country)} {formatMobileLocation(profilePreviewDetails || profilePreview)}
            </p>
            <p className="friends-profile-preview-bio">
              {profilePreviewDetails?.status_message || profilePreview.status_message || 'Ainda não adicionou uma descrição.'}
            </p>
            <button
              type="button"
              className="friends-profile-preview-message"
              style={{ backgroundColor: accentColor }}
              onClick={() => {
                setSelectedFriendId(profilePreview.id);
                setProfilePreviewId(null);
              }}
            >
              <MessageCircle size={16} />
              <span>Message {profilePreviewDetails?.full_name || profilePreview.full_name}</span>
            </button>
          </section>
        </div>
      )}
      {isProfileEditorOpen && (
        <div className="friends-profile-modal-backdrop" onClick={() => setIsProfileEditorOpen(false)}>
          <div className="friends-profile-modal" onClick={(event) => event.stopPropagation()}>
            <div className="friends-profile-modal-header">
              <h2>Meu Perfil</h2>
              <button type="button" className="friends-icon-button" onClick={() => setIsProfileEditorOpen(false)} aria-label="Fechar">
                <X size={16} />
              </button>
            </div>

            <label className="friends-profile-modal-avatar" title="Alterar foto de perfil">
              {renderAvatar(publicName, profilePhoto, 'friends-profile-modal-avatar-circle')}
              <span className="friends-profile-modal-avatar-edit"><Camera size={14} /></span>
              <input type="file" accept="image/*" onChange={handleProfilePhotoChange} />
            </label>

            <label className="friends-profile-modal-field">
              <span>Descrição (recado)</span>
              <textarea
                value={statusDraft}
                onChange={(event) => setStatusDraft(event.target.value)}
                maxLength={140}
                placeholder="Diga algo sobre você..."
              />
            </label>

            <button
              type="button"
              className="friends-profile-modal-save"
              style={{ backgroundColor: accentColor }}
              onClick={handleSaveStatus}
              disabled={isSavingStatus}
            >
              {isSavingStatus ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
