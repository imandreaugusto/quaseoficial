import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimeChannel, Session } from '@supabase/supabase-js';
import { ArrowLeft, Bell, BellOff, Camera, Check, ChevronDown, Info, Loader2, MessageCircle, MessageCircleMore, Pin, PinOff, Send, Smile, UserPlus, Users, Video, WifiOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { BrazilianLogo } from './BrazilianLogo';
import { getSupabaseClient, getSupabaseConfig, signInWithGoogle } from '../utils/supabaseClient';
import { CEO_EMAIL } from '../utils/security';
import { apiFetch } from '../lib/api';
import { playPrivateMessageSound } from '../lib/menuSounds';
import { getCountryFlag, getCountryName } from '../utils/countries';
import { JitsiCallRoom } from './JitsiCallRoom';

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
  first_name?: string | null;
  last_name?: string | null;
  profile_state?: string | null;
  profile_city?: string | null;
  profile_country?: string | null;
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

interface PrivateNotification {
  id: string;
  sender_id: string;
  created_at: string;
}

interface PrivateMessageToast {
  senderId: string;
  messageCount: number;
}

interface CallInvitation {
  id: string;
  room_name: string;
  inviter_id: string;
  created_at: string;
  expires_at: string;
}

interface PrivateNotificationState {
  userId: string;
  cursor: string;
  unreadIdsBySender: Record<string, string[]>;
  readAtBySender: Record<string, string>;
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

const decodeVapidPublicKey = (encodedKey: string) => {
  const base64 = encodedKey.replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
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
  const [unreadPrivateBySender, setUnreadPrivateBySender] = useState<Record<string, number>>({});
  const [privateMessageToast, setPrivateMessageToast] = useState<PrivateMessageToast | null>(null);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushConfigured, setPushConfigured] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [isPushActionPending, setIsPushActionPending] = useState(false);
  const [incomingCallInvitations, setIncomingCallInvitations] = useState<CallInvitation[]>([]);
  const [activeCallRoom, setActiveCallRoom] = useState<string | null>(null);
  const [activeCallInvitees, setActiveCallInvitees] = useState<string[]>([]);
  const [isCallInviteDialogOpen, setIsCallInviteDialogOpen] = useState(false);
  const [selectedCallInvitees, setSelectedCallInvitees] = useState<string[]>([]);
  const [isCallActionPending, setIsCallActionPending] = useState(false);
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
  const activePrivateFriendRef = useRef<string | null>(null);
  const pendingCallInviteeRef = useRef<string | null>(null);
  const privateNotificationStateRef = useRef<PrivateNotificationState>({
    userId: '',
    cursor: '',
    unreadIdsBySender: {},
    readAtBySender: {}
  });
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

    const restoreSession = async () => {
      const { data, error } = await client.auth.getSession();
      if (error) {
        console.error('Could not restore Brazilian Friends authentication session:', error);
        updateSession(null);
        return;
      }
      if (data.session) {
        updateSession(data.session);
        return;
      }
      if (!currentUser.auth_user_id) {
        updateSession(null);
        return;
      }

      const { data: refreshedData, error: refreshError } = await client.auth.refreshSession();
      if (refreshError) {
        console.warn('Brazilian Friends has no restorable authentication session:', refreshError);
      }
      updateSession(refreshedData.session);
    };
    void restoreSession().catch((error) => {
      console.error('Brazilian Friends session restoration failed:', error);
      updateSession(null);
    });
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => updateSession(session));

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const supported = 'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
    setPushSupported(supported);
    if (!supported) return;

    let cancelled = false;
    void apiFetch('/api/public-config')
      .then(async (response) => {
        if (!response.ok) throw new Error('Web Push public configuration request failed.');
        return await response.json() as { webPushPublicKey?: string | null };
      })
      .then((config) => {
        if (!cancelled) setPushConfigured(Boolean(config.webPushPublicKey));
      })
      .catch((error) => {
        console.warn('Could not load Brazilian Friends push configuration:', error);
      });
    void navigator.serviceWorker.getRegistration('/')
      .then((registration) => registration?.pushManager.getSubscription() || null)
      .then((subscription) => {
        const subscribedUserId = localStorage.getItem('bia_friends_push_user_id');
        if (!cancelled) {
          setPushSubscribed(Boolean(subscription && subscribedUserId === currentUser.auth_user_id));
        }
      })
      .catch((error) => {
        console.warn('Could not restore Brazilian Friends push subscription:', error);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser.auth_user_id]);

  useEffect(() => {
    activePrivateFriendRef.current = selectedFriendId;
    if (!socialUserId) return;

    const state = privateNotificationStateRef.current;
    if (state.userId !== socialUserId || !selectedFriendId) return;

    const nextState: PrivateNotificationState = {
      ...state,
      unreadIdsBySender: { ...state.unreadIdsBySender, [selectedFriendId]: [] },
      readAtBySender: { ...state.readAtBySender, [selectedFriendId]: new Date().toISOString() }
    };
    privateNotificationStateRef.current = nextState;
    localStorage.setItem(`bia_friends_private_${socialUserId}`, JSON.stringify(nextState));
    setUnreadPrivateBySender((current) => ({ ...current, [selectedFriendId]: 0 }));
  }, [selectedFriendId, socialUserId]);

  useEffect(() => {
    if (!socialUserId) {
      privateNotificationStateRef.current = { userId: '', cursor: '', unreadIdsBySender: {}, readAtBySender: {} };
      setUnreadPrivateBySender({});
      return;
    }

    let savedState: Partial<PrivateNotificationState> = {};
    try {
      savedState = JSON.parse(localStorage.getItem(`bia_friends_private_${socialUserId}`) || '{}');
    } catch {
      savedState = {};
    }
    const sameUserState = savedState.userId === socialUserId;
    const nextState: PrivateNotificationState = {
      userId: socialUserId,
      cursor: sameUserState && savedState.cursor ? savedState.cursor : new Date().toISOString(),
      unreadIdsBySender: sameUserState && savedState.unreadIdsBySender ? savedState.unreadIdsBySender : {},
      readAtBySender: sameUserState && savedState.readAtBySender ? savedState.readAtBySender : {}
    };
    privateNotificationStateRef.current = nextState;
    localStorage.setItem(`bia_friends_private_${socialUserId}`, JSON.stringify(nextState));
    setUnreadPrivateBySender(Object.fromEntries(
      Object.entries(nextState.unreadIdsBySender).map(([senderId, ids]) => [senderId, ids.length])
    ));
  }, [socialUserId]);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client || !isSessionReady || !socialUserId) return;
    if (privateNotificationStateRef.current.userId !== socialUserId) return;

    let cancelled = false;
    const pollPrivateNotifications = async () => {
      const state = privateNotificationStateRef.current;
      if (state.userId !== socialUserId || !state.cursor) return;

      const result = await requestFriendsApi<{ messages: PrivateNotification[] }>(
        client,
        `/api/friends/private-notifications?since=${encodeURIComponent(state.cursor)}`
      );
      if (cancelled || result.error || !result.data) return;

      const nextState: PrivateNotificationState = {
        ...state,
        unreadIdsBySender: { ...state.unreadIdsBySender },
        readAtBySender: { ...state.readAtBySender }
      };
      let latestCreatedAt = nextState.cursor;
      const newlyUnreadMessages: PrivateNotification[] = [];
      const newlyReceivedMessages: PrivateNotification[] = [];

      for (const message of result.data.messages || []) {
        if (!message.id || !message.sender_id || !message.created_at) continue;
        if (Date.parse(message.created_at) > Date.parse(latestCreatedAt)) latestCreatedAt = message.created_at;
        newlyReceivedMessages.push(message);

        const readAt = nextState.readAtBySender[message.sender_id];
        if (activePrivateFriendRef.current === message.sender_id || (readAt && Date.parse(message.created_at) <= Date.parse(readAt))) {
          continue;
        }

        const unreadIds = nextState.unreadIdsBySender[message.sender_id] || [];
        if (!unreadIds.includes(message.id)) {
          nextState.unreadIdsBySender[message.sender_id] = [...unreadIds, message.id].slice(-100);
          newlyUnreadMessages.push(message);
        }
      }

      nextState.cursor = latestCreatedAt;
      privateNotificationStateRef.current = nextState;
      localStorage.setItem(`bia_friends_private_${socialUserId}`, JSON.stringify(nextState));
      setUnreadPrivateBySender(Object.fromEntries(
        Object.entries(nextState.unreadIdsBySender).map(([senderId, ids]) => [senderId, ids.length])
      ));
      if (newlyReceivedMessages.length > 0 && document.visibilityState === 'visible') {
        playPrivateMessageSound();
        if (typeof navigator.vibrate === 'function') navigator.vibrate(70);
      }
      if (newlyUnreadMessages.length > 0) {
        const latestMessage = newlyUnreadMessages[newlyUnreadMessages.length - 1];
        setPrivateMessageToast({
          senderId: latestMessage.sender_id,
          messageCount: newlyUnreadMessages.filter((message) => message.sender_id === latestMessage.sender_id).length
        });
      }
    };

    void pollPrivateNotifications();
    const intervalId = window.setInterval(() => void pollPrivateNotifications(), 5_000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [isSessionReady, socialUserId]);

  useEffect(() => {
    if (!privateMessageToast) return;
    let timeoutId: number | undefined;
    const syncDismissTimer = () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      timeoutId = document.hidden
        ? undefined
        : window.setTimeout(() => setPrivateMessageToast(null), 8_000);
    };
    syncDismissTimer();
    document.addEventListener('visibilitychange', syncDismissTimer);
    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', syncDismissTimer);
    };
  }, [privateMessageToast]);

  useEffect(() => {
    setProfilePhoto(currentUser.photo_url);
  }, [currentUser.photo_url]);

  const selectedFriend = profiles.find((profile) => profile.id === selectedFriendId) || null;
  const profilePreview = profiles.find((profile) => profile.id === profilePreviewId) || null;
  const profilePreviewPresence = profilePreviewId ? onlineUsers[profilePreviewId] : undefined;
  const isProfilePreviewOnline = Boolean(profilePreviewPresence);
  const profilePreviewDetails = profilePreview
    ? { ...profilePreview, ...profilePreviewPresence }
    : null;
  const profilePreviewName = profilePreviewDetails
    ? [profilePreviewDetails.first_name, profilePreviewDetails.last_name].filter(Boolean).join(' ') ||
      profilePreviewDetails.full_name
    : '';
  const fallbackPreviewNameParts = profilePreview?.full_name.trim().split(/\s+/) || [];
  const profilePreviewFirstName = profilePreviewDetails?.first_name || fallbackPreviewNameParts[0] || '';
  const profilePreviewLastName = profilePreviewDetails?.last_name || fallbackPreviewNameParts.slice(1).join(' ');
  const profilePreviewCountry = profilePreviewDetails?.profile_country || profilePreviewDetails?.ip_country || '';
  const profilePreviewState = profilePreviewDetails?.profile_state || profilePreviewDetails?.ip_region || '';
  const profilePreviewCity = profilePreviewDetails?.profile_city || '';
  const selectedFriendPresence = selectedFriendId ? onlineUsers[selectedFriendId] : undefined;
  const selectedFriendDetails = selectedFriendPresence || selectedFriend;
  const onlineFriends = useMemo(
    () => profiles.filter((profile) => onlineUsers[profile.id]),
    [onlineUsers, profiles]
  );
  const totalUnreadPrivateCount = Object.values(unreadPrivateBySender).reduce((total, count) => total + count, 0);
  const allFriends = useMemo(
    () => profiles
      .filter((profile) => Boolean(onlineUsers[profile.id]) || Boolean(unreadPrivateBySender[profile.id]))
      .sort((a, b) => {
        const aUnread = unreadPrivateBySender[a.id] || 0;
        const bUnread = unreadPrivateBySender[b.id] || 0;
        if (aUnread !== bUnread) return bUnread - aUnread;
        const aOnline = onlineUsers[a.id] ? 1 : 0;
        const bOnline = onlineUsers[b.id] ? 1 : 0;
        if (aOnline !== bOnline) return bOnline - aOnline;
        return a.full_name.localeCompare(b.full_name);
      }),
    [onlineUsers, profiles, unreadPrivateBySender]
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
    if (!socialUserId || profiles.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('open') !== 'friends') return;
    const senderId = params.get('friend');
    if (!senderId || !profiles.some((profile) => profile.id === senderId)) return;

    setSelectedFriendId(senderId);
    params.delete('open');
    params.delete('friend');
    const remainingQuery = params.toString();
    const nextUrl = `${window.location.pathname}${remainingQuery ? `?${remainingQuery}` : ''}${window.location.hash}`;
    window.history.replaceState(window.history.state, '', nextUrl);
  }, [profiles, socialUserId]);

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
    const client = getSupabaseClient();
    if (client) {
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError) {
        console.error('Could not restore Brazilian Friends authentication session:', sessionError);
      } else if (sessionData.session?.user.id) {
        setSessionUserId(sessionData.session.user.id);
        setIsConnectingToChat(false);
        return;
      }
    }
    const result = await signInWithGoogle();
    if (!result.ok) {
      setIsConnectingToChat(false);
      setError(result.reason === 'offline'
        ? 'O login para o chat não está disponível agora.'
        : result.message || 'Não foi possível iniciar o login para o chat.');
    }
  };

  const handlePushSubscriptionToggle = async () => {
    const client = getSupabaseClient();
    if (!client || !socialUserId || isPushActionPending) return;
    setError('');
    setIsPushActionPending(true);
    try {
      if (pushSubscribed) {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          const result = await requestFriendsApi(client, '/api/friends/push-subscriptions', {
            method: 'DELETE',
            body: JSON.stringify({ endpoint: subscription.endpoint })
          });
          if (result.error) throw new Error(result.error);
          await subscription.unsubscribe();
        }
        setPushSubscribed(false);
        localStorage.removeItem('bia_friends_push_user_id');
        return;
      }

      if (
        /iPhone|iPad|iPod/i.test(navigator.userAgent) &&
        !window.matchMedia('(display-mode: standalone)').matches
      ) {
        throw new Error('No iPhone/iPad, adicione este site à Tela de Início antes de ativar o Web Push.');
      }

      const permission = Notification.permission === 'default'
        ? await Notification.requestPermission()
        : Notification.permission;
      if (permission !== 'granted') {
        throw new Error(permission === 'denied'
          ? 'As notificações estão bloqueadas nas configurações deste navegador.'
          : 'Permita as notificações para ativar os avisos privados.');
      }

      const registration = await navigator.serviceWorker.register('/service-worker.js');
      const publicConfigResponse = await apiFetch('/api/public-config');
      const publicConfig = await publicConfigResponse.json().catch(() => ({})) as { webPushPublicKey?: string | null };
      if (!publicConfigResponse.ok || !publicConfig.webPushPublicKey) {
        throw new Error('As notificações push ainda não foram configuradas no servidor.');
      }

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapidPublicKey(publicConfig.webPushPublicKey)
        });
      }
      const result = await requestFriendsApi(client, '/api/friends/push-subscriptions', {
        method: 'POST',
        body: JSON.stringify(subscription.toJSON())
      });
      if (result.error) {
        await subscription.unsubscribe();
        throw new Error(result.error);
      }
      setPushSubscribed(true);
      localStorage.setItem('bia_friends_push_user_id', socialUserId);
    } catch (pushError) {
      setError(pushError instanceof Error ? pushError.message : 'Não foi possível alterar as notificações.');
    } finally {
      setIsPushActionPending(false);
    }
  };

  const handleStartVideoCall = () => {
    if (!socialUserId || !selectedFriendId || isCallActionPending) return;
    if (typeof crypto.randomUUID !== 'function') {
      setError('Este navegador não permite criar uma sala segura para a chamada.');
      return;
    }

    setError('');
    setIsCallActionPending(true);
    pendingCallInviteeRef.current = selectedFriendId;
    setActiveCallRoom(`brazilian-friends-${crypto.randomUUID()}`);
  };

  const sendCallInvitations = async (roomName: string, inviteeIds: string[]) => {
    const client = getSupabaseClient();
    if (!client || !inviteeIds.length) return false;
    const result = await requestFriendsApi<{ invitations: { id: string; invitee_id: string }[] }>(
      client,
      '/api/friends/call-invitations',
      {
        method: 'POST',
        body: JSON.stringify({ room_name: roomName, invitee_ids: inviteeIds })
      }
    );
    if (result.error || !result.data) {
      setError(result.error || 'Não foi possível enviar os convites para a chamada.');
      return false;
    }
    setActiveCallInvitees((current) => [...new Set([...current, ...inviteeIds])]);
    return true;
  };

  const handleSendCallInvitations = async () => {
    if (!activeCallRoom || isCallActionPending || selectedCallInvitees.length === 0) return;
    setError('');
    setIsCallActionPending(true);
    try {
      const sent = await sendCallInvitations(activeCallRoom, selectedCallInvitees);
      if (sent) {
        setIsCallInviteDialogOpen(false);
        setSelectedCallInvitees([]);
      }
    } finally {
      setIsCallActionPending(false);
    }
  };

  const handleCallRoomJoined = async (roomName: string) => {
    const inviteeId = pendingCallInviteeRef.current;
    if (!inviteeId) return;
    pendingCallInviteeRef.current = null;
    await sendCallInvitations(roomName, [inviteeId]);
    setIsCallActionPending(false);
  };

  const handleAcceptCallInvitation = async (invitation: CallInvitation) => {
    const client = getSupabaseClient();
    if (!client || isCallActionPending) return;
    setError('');
    setIsCallActionPending(true);
    try {
      const result = await requestFriendsApi<{ invitation: CallInvitation }>(
        client,
        `/api/friends/call-invitations/${encodeURIComponent(invitation.id)}/accept`,
        { method: 'POST' }
      );
      if (result.error || !result.data?.invitation) {
        setError(result.error || 'Este convite não está mais disponível.');
        return;
      }
      setSelectedFriendId(result.data.invitation.inviter_id);
      setActiveCallInvitees([result.data.invitation.inviter_id]);
      setActiveCallRoom(result.data.invitation.room_name);
      setIncomingCallInvitations((current) => current.filter((item) => item.id !== invitation.id));
    } finally {
      setIsCallActionPending(false);
    }
  };

  const handleDeclineCallInvitation = async (invitation: CallInvitation) => {
    const client = getSupabaseClient();
    if (!client || isCallActionPending) return;
    setError('');
    setIsCallActionPending(true);
    try {
      const result = await requestFriendsApi<unknown>(
        client,
        `/api/friends/call-invitations/${encodeURIComponent(invitation.id)}/decline`,
        { method: 'POST' }
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      setIncomingCallInvitations((current) => current.filter((item) => item.id !== invitation.id));
    } finally {
      setIsCallActionPending(false);
    }
  };

  const toggleCallInvitee = (userId: string) => {
    setSelectedCallInvitees((current) => current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId]);
  };

  const closeActiveCall = useCallback(() => {
    pendingCallInviteeRef.current = null;
    setIsCallActionPending(false);
    setActiveCallRoom(null);
  }, []);
  const openCallInviteDialog = useCallback(() => {
    setSelectedCallInvitees([]);
    setIsCallInviteDialogOpen(true);
  }, []);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client || !isSessionReady || !socialUserId) {
      setIncomingCallInvitations([]);
      return;
    }

    let cancelled = false;
    const loadInvitations = async () => {
      const result = await requestFriendsApi<{ invitations: CallInvitation[] }>(
        client,
        '/api/friends/call-invitations'
      );
      if (cancelled || result.error || !result.data) return;
      setIncomingCallInvitations(result.data.invitations || []);
    };
    void loadInvitations();
    const pollingId = window.setInterval(() => void loadInvitations(), 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(pollingId);
    };
  }, [isSessionReady, socialUserId]);

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
          const unreadCount = unreadPrivateBySender[friend.id] || 0;
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
              className={`friends-person ${selectedFriendId === friend.id ? 'friends-person-selected' : ''}`}
              title={isSelf ? 'Editar sua foto e descrição' : undefined}
            >
              <span className={`friends-list-status-dot ${isOnline ? 'friends-list-status-online' : ''}`} />
              <span className="friends-person-copy">
                <span className="friends-person-name-row">
                  <strong>{profileName}</strong>
                  {unreadCount > 0 && (
                    <span className="friends-private-unread-badge" aria-label={`${unreadCount} mensagens privadas não lidas`}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </span>
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
              {selectedFriend && (
                <button
                  type="button"
                  className="friends-header-action-button friends-video-call-button"
                  onClick={() => activeCallRoom
                    ? openCallInviteDialog()
                    : void handleStartVideoCall()}
                  disabled={isCallActionPending}
                  aria-label={activeCallRoom ? 'Adicionar colegas à chamada' : `Iniciar videochamada com ${selectedFriend.full_name}`}
                >
                  {isCallActionPending ? <Loader2 size={15} className="animate-spin" /> : activeCallRoom ? <UserPlus size={15} /> : <Video size={15} />}
                  <span>{activeCallRoom ? 'Adicionar à chamada' : 'Videochamada'}</span>
                </button>
              )}
              {socialUserId && pushSupported && pushConfigured && (
                <button
                  type="button"
                  className="friends-header-action-button friends-header-notifications"
                  onClick={() => void handlePushSubscriptionToggle()}
                  disabled={isPushActionPending || isLoading}
                  aria-label={pushSubscribed ? 'Desativar notificações de mensagens privadas' : 'Ativar notificações de mensagens privadas'}
                  title={pushSubscribed ? 'Desativar avisos de mensagens privadas' : 'Ativar avisos de mensagens privadas'}
                >
                  {pushSubscribed ? <BellOff size={15} /> : <Bell size={15} />}
                  <span>{isPushActionPending ? 'Aguarde...' : pushSubscribed ? 'Avisos ativos' : 'Ativar avisos'}</span>
                </button>
              )}
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

            {selectedFriend && (
              <button
                type="button"
                className="friends-mobile-call-button"
                onClick={() => activeCallRoom
                  ? openCallInviteDialog()
                  : void handleStartVideoCall()}
                disabled={isCallActionPending}
                aria-label={activeCallRoom ? 'Adicionar colegas à chamada' : `Iniciar videochamada com ${selectedFriend.full_name}`}
              >
                {isCallActionPending ? <Loader2 size={15} className="animate-spin" /> : activeCallRoom ? <UserPlus size={15} /> : <Video size={15} />}
                <span>{activeCallRoom ? 'Convidar' : 'Vídeo'}</span>
              </button>
            )}
            {!selectedFriend && <button type="button" className="friends-online-trigger" onClick={() => socialUserId ? setIsPeopleDrawerOpen(true) : void handleFriendsSignIn()} disabled={!isSessionReady || isConnectingToChat} aria-label={totalUnreadPrivateCount ? `${onlineFriends.length} pessoas online, ${totalUnreadPrivateCount} mensagens privadas não lidas` : `${onlineFriends.length} pessoas online`}><Users size={16} /><span>{socialUserId ? `${onlineFriends.length} people online` : isConnectingToChat ? 'Abrindo Google...' : 'Conectar para ficar online'}</span>{totalUnreadPrivateCount > 0 && <span className="friends-private-total-badge">{totalUnreadPrivateCount > 9 ? '9+' : totalUnreadPrivateCount}</span>}<ChevronDown size={14} /></button>}
            {selectedFriend && <button type="button" className="friends-mobile-back-button" onClick={() => setSelectedFriendId(null)}><ArrowLeft size={15} /><span>Public chat</span></button>}
            {selectedFriend && <button type="button" className="friends-selected-chip" onClick={() => setSelectedFriendId(null)}><ArrowLeft size={13} /> {selectedFriend.full_name}</button>}
          </header>

          <AnimatePresence>
            {privateMessageToast && (
              <motion.aside
                className="friends-private-toast"
                role="status"
                aria-live="polite"
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.18 }}
              >
                <MessageCircle size={16} aria-hidden="true" />
                <p>
                  {privateMessageToast.messageCount > 1
                    ? `${privateMessageToast.messageCount} novas mensagens privadas de `
                    : 'Nova mensagem privada de '}
                  <strong>{profiles.find((profile) => profile.id === privateMessageToast.senderId)?.full_name || 'alguém'}</strong>
                </p>
                <button
                  type="button"
                  className="friends-private-toast-open"
                  onClick={() => {
                    setSelectedFriendId(privateMessageToast.senderId);
                    setPrivateMessageToast(null);
                  }}
                >
                  Abrir
                </button>
                <button
                  type="button"
                  className="friends-private-toast-close"
                  onClick={() => setPrivateMessageToast(null)}
                  aria-label="Fechar notificação"
                >
                  <X size={14} />
                </button>
              </motion.aside>
            )}
          </AnimatePresence>

          {incomingCallInvitations[0] && (
            <motion.aside
              className="friends-call-incoming"
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Video size={17} />
              <p>
                <strong>{profiles.find((profile) => profile.id === incomingCallInvitations[0].inviter_id)?.full_name || 'Um colega'}</strong>
                {' convidou você para uma videochamada.'}
              </p>
              <button
                type="button"
                className="friends-call-accept"
                onClick={() => void handleAcceptCallInvitation(incomingCallInvitations[0])}
                disabled={isCallActionPending}
              >
                {isCallActionPending ? <Loader2 size={14} className="animate-spin" /> : <Video size={14} />}
                Aceitar
              </button>
              <button
                type="button"
                className="friends-call-decline"
                onClick={() => void handleDeclineCallInvitation(incomingCallInvitations[0])}
                disabled={isCallActionPending}
                aria-label="Recusar convite de videochamada"
              >
                <X size={15} />
              </button>
            </motion.aside>
          )}

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

          <div
            className="friends-message-scroll custom-scrollbar"
            ref={messageScrollRef}
            onScroll={(event) => {
              const element = event.currentTarget;
              shouldStickToBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
            }}
          >
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
                    <div className="friends-message-meta">
                      {ownMessage
                        ? <strong>{senderName}</strong>
                        : (
                          <button
                            type="button"
                            className="friends-message-profile-link"
                            onClick={() => setProfilePreviewId(message.sender_id)}
                          >
                            {senderName}
                          </button>
                        )}
                      <span>{senderLocation}</span>
                    </div>
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
      {activeCallRoom && (
        <JitsiCallRoom
          roomName={activeCallRoom}
          displayName={publicName}
          onClose={closeActiveCall}
          onJoined={handleCallRoomJoined}
          onInvite={openCallInviteDialog}
        />
      )}
      {isCallInviteDialogOpen && activeCallRoom && (
        <div
          className="friends-call-invite-backdrop"
          onClick={() => setIsCallInviteDialogOpen(false)}
        >
          <section
            className="friends-call-invite-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="friends-call-invite-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <h2 id="friends-call-invite-title">Convidar mais amigos</h2>
                <p>Cada pessoa recebe um convite privado para entrar nesta chamada.</p>
              </div>
              <button
                type="button"
                className="friends-icon-button"
                onClick={() => setIsCallInviteDialogOpen(false)}
                aria-label="Fechar convites"
              >
                <X size={16} />
              </button>
            </header>
            <div className="friends-call-invite-list">
              {profiles
                .filter((profile) => profile.id !== socialUserId && !activeCallInvitees.includes(profile.id))
                .map((profile) => (
                  <label key={profile.id} className="friends-call-invite-person">
                    <input
                      type="checkbox"
                      checked={selectedCallInvitees.includes(profile.id)}
                      onChange={() => toggleCallInvitee(profile.id)}
                    />
                    {renderAvatar(profile.full_name, profile.photo_url, 'friends-call-invite-avatar')}
                    <span>{profile.full_name}</span>
                    <small>{onlineUsers[profile.id] ? 'Online' : 'Offline'}</small>
                  </label>
                ))}
              {profiles.filter((profile) => profile.id !== socialUserId && !activeCallInvitees.includes(profile.id)).length === 0 && (
                <p className="friends-call-invite-empty">Não há outros colegas para convidar.</p>
              )}
            </div>
            {error && <p className="friends-call-invite-error" role="alert">{error}</p>}
            <button
              type="button"
              className="friends-call-invite-submit"
              onClick={() => void handleSendCallInvitations()}
              disabled={isCallActionPending || selectedCallInvitees.length === 0}
            >
              {isCallActionPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Enviar convite{selectedCallInvitees.length === 1 ? '' : 's'} ({selectedCallInvitees.length})
            </button>
          </section>
        </div>
      )}
      {profilePreview && (
        <div className="friends-profile-preview-backdrop" onClick={() => setProfilePreviewId(null)}>
          <section className="friends-profile-preview" role="dialog" aria-modal="true" aria-labelledby="friends-profile-preview-name" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="friends-icon-button friends-profile-preview-close" onClick={() => setProfilePreviewId(null)} aria-label="Fechar perfil">
              <X size={17} />
            </button>
            <div className="friends-profile-preview-avatar-wrap">
              {renderAvatar(profilePreviewName, profilePreviewDetails?.photo_url || profilePreview.photo_url, 'friends-profile-preview-avatar')}
              {isProfilePreviewOnline && <span className="friends-profile-preview-status" />}
            </div>
            <h2 id="friends-profile-preview-name">{profilePreviewName}</h2>
            <p className="friends-profile-preview-location">
              <span className={`friends-list-status-dot ${isProfilePreviewOnline ? 'friends-list-status-online' : ''}`} />
              {isProfilePreviewOnline ? 'Online' : 'Offline'}
            </p>
            <dl className="friends-profile-preview-details">
              <div><dt>Nome</dt><dd>{profilePreviewFirstName || 'Não informado'}</dd></div>
              <div><dt>Sobrenome</dt><dd>{profilePreviewLastName || 'Não informado'}</dd></div>
              <div><dt>Cidade</dt><dd>{profilePreviewCity || 'Não informada'}</dd></div>
              <div><dt>Estado / região</dt><dd>{profilePreviewState || 'Não informado'}</dd></div>
              <div>
                <dt>País</dt>
                <dd>{getCountryFlag(profilePreviewCountry)} {getCountryName(profilePreviewCountry) || 'Não informado'}</dd>
              </div>
            </dl>
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
              <span>Conversar no privado com {profilePreviewName}</span>
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
