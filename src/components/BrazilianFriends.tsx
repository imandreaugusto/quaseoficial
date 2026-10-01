import { useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { ArrowLeft, Camera, ChevronDown, Info, MessageCircle, MessageCircleMore, Send, Smile, Users, WifiOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { BrazilianLogo } from './BrazilianLogo';
import { getSupabaseClient, getSupabaseConfig } from '../utils/supabaseClient';
import { CEO_EMAIL } from '../utils/security';

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
  expires_at: string;
}

interface PresencePayload {
  user_id: string;
  full_name: string;
  photo_url?: string | null;
  status_message?: string | null;
  ip_region?: string | null;
  ip_country?: string | null;
}

const USERS_TABLE = 'brazilian_friends_users';
const MESSAGES_TABLE = 'brazilian_friends_messages';
const PRESENCE_CHANNEL = 'online-users';

const getConversationKey = (firstId: string, secondId: string) =>
  [firstId, secondId].sort().join(':');

const formatLocation = (_profile: Pick<FriendProfile, 'ip_region' | 'ip_country'>) => 'Localização não compartilhada';

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

// Falls back to the base columns when photo_url/status_message aren't provisioned yet on the remote table.
const upsertFriendProfile = async (client: SupabaseClientLike, profile: FriendProfile) => {
  const { error } = await client.from(USERS_TABLE).upsert(profile, { onConflict: 'id' });
  if (!error) return { error: null };
  console.warn('Brazilian Friends profile sync failed, retrying with base columns:', error);
  const { id, email, full_name } = profile;
  const fallback = await client
    .from(USERS_TABLE)
    .upsert({ id, email, full_name }, { onConflict: 'id' });
  return { error: fallback.error };
};

const selectFriendProfiles = async (client: SupabaseClientLike) => {
  const full = await client
    .from(USERS_TABLE)
    .select('id, full_name, photo_url, status_message')
    .order('full_name', { ascending: true });
  if (!full.error) return full;
  return client
    .from(USERS_TABLE)
    .select('id, full_name')
    .order('full_name', { ascending: true });
};

export function BrazilianFriends({ currentUser, accentColor }: BrazilianFriendsProps) {
  const socialUserId = currentUser.auth_user_id || currentUser.id;
  const [profiles, setProfiles] = useState<FriendProfile[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, PresencePayload>>({});
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [messages, setMessages] = useState<FriendMessage[]>([]);
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    setProfilePhoto(currentUser.photo_url);
  }, [currentUser.photo_url]);

  const selectedFriend = profiles.find((profile) => profile.id === selectedFriendId) || null;
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
              status_message: profile.status_message
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
  }, [currentUser]);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setIsLoadingMessages(false);
      setMessages([]);
      return;
    }
    let cancelled = false;
    const conversationKey = selectedFriendId
      ? getConversationKey(socialUserId, selectedFriendId)
      : 'public';
    const loadConversation = async () => {
      setIsLoadingMessages(true);
      setError('');
      let query = client
        .from(MESSAGES_TABLE)
        .select('id, sender_id, receiver_id, body, created_at, expires_at')
        .order('created_at', { ascending: true });
      query = selectedFriendId
        ? query.or(`and(sender_id.eq.${socialUserId},receiver_id.eq.${selectedFriendId}),and(sender_id.eq.${selectedFriendId},receiver_id.eq.${socialUserId})`)
        : query.is('receiver_id', null);
      const { data, error: messagesError } = await query;

      if (cancelled) return;
      if (messagesError) {
        setError('Não foi possível carregar esta conversa no momento.');
      } else {
        setMessages((data || []) as FriendMessage[]);
      }
      setIsLoadingMessages(false);
    };

    const messageChannel = client
      .channel(`brazilian-friends:${conversationKey}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: MESSAGES_TABLE },
        (payload) => {
          const nextMessage = payload.new as FriendMessage;
          if (new Date(nextMessage.expires_at).getTime() <= Date.now()) return;
          const isThisConversation = selectedFriendId
            ? ((nextMessage.sender_id === socialUserId && nextMessage.receiver_id === selectedFriendId) ||
              (nextMessage.sender_id === selectedFriendId && nextMessage.receiver_id === socialUserId))
            : nextMessage.receiver_id === null;
          if (isThisConversation) {
            setMessages((current) => current.some((message) => message.id === nextMessage.id)
              ? current
              : [...current, nextMessage]);
          }
        }
      )
      .subscribe();

    void loadConversation();
    return () => {
      cancelled = true;
      void client.removeChannel(messageChannel);
    };
  }, [socialUserId, selectedFriendId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setShowEmojiPicker(false);
  }, [selectedFriendId]);

  const sendMessage = async () => {
    const body = draft.trim();
    const client = getSupabaseClient();
    if (!client || !body) return;

    setDraft('');
    const { data, error: sendError } = await client
      .from(MESSAGES_TABLE)
      .insert({ sender_id: socialUserId, receiver_id: selectedFriendId, body })
      .select('id, sender_id, receiver_id, body, created_at, expires_at')
      .single();

    if (sendError) {
      setDraft(body);
      setError('Sua mensagem não pôde ser enviada. Tente novamente.');
      return;
    }

    const sentMessage = data as FriendMessage;
    setMessages((current) => current.some((message) => message.id === sentMessage.id)
      ? current
      : [...current, sentMessage]);
  };

  const { url: configuredUrl, anonKey: configuredAnonKey } = getSupabaseConfig();
  const publicName = getPublicName(currentUser);

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
      <div className="friends-online-label"><span className="friends-online-dot" /> Online ({onlineFriends.length}) <ChevronDown size={14} /></div>
      <div className="friends-people-list custom-scrollbar">
        {isLoading && <p className="friends-muted-copy">Buscando assinantes...</p>}
        {!isLoading && allFriends.length === 0 && <p className="friends-muted-copy">Nenhum assinante online no momento.</p>}
        {allFriends.map((friend) => {
          const presence = onlineUsers[friend.id];
          const isOnline = Boolean(presence);
          const isSelected = friend.id === selectedFriendId;
          const isSelf = friend.id === socialUserId;
          const profileName = presence?.full_name || friend.full_name;
          const profilePhoto = presence?.photo_url || friend.photo_url;
          const statusLine = presence?.status_message || friend.status_message || formatLocation(presence || friend);
          return (
            <button
              key={friend.id}
              type="button"
              onClick={() => {
                if (isSelf) {
                  openProfileEditor();
                } else {
                  setSelectedFriendId(friend.id);
                }
                setIsPeopleDrawerOpen(false);
              }}
              className={`friends-person ${isSelected ? 'friends-person-selected' : ''}`}
              title={isSelf ? 'Editar sua foto e descrição' : undefined}
            >
              <span className="friends-avatar-wrap">
                {renderAvatar(profileName, profilePhoto)}
                <span className={`friends-status ${isOnline ? 'friends-status-online' : ''}`} />
                {isSelf && <span className="friends-avatar-edit-badge"><Camera size={9} /></span>}
              </span>
              <span className="friends-person-copy"><strong>{profileName}</strong><small>{statusLine}{isSelf ? ' · You' : ''}</small></span>
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
    <section className="friends-shell">
      <div className="friends-glass-frame">
        {renderPeople()}
        <main className={`friends-conversation ${selectedFriend ? 'friends-conversation-private' : ''}`}>
          <header className="friends-conversation-header">
            <div className="friends-header-title"><div className="friends-header-icon"><Users size={18} /></div><div><h1>{selectedFriend ? selectedFriend.full_name : 'Brazilian Friends'}</h1><p>{selectedFriend ? `Private conversation · ${formatLocation(selectedFriend)}` : `${onlineFriends.length} people online`}</p></div></div>

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

            <button type="button" className="friends-mobile-people-button" onClick={() => setIsPeopleDrawerOpen(true)}><Users size={16} /><span>{onlineFriends.length} online</span></button>
            {selectedFriend && <button type="button" className="friends-selected-chip" onClick={() => setSelectedFriendId(null)}><ArrowLeft size={13} /> {selectedFriend.full_name}</button>}
          </header>

          <div className="friends-message-scroll custom-scrollbar">
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
                    </div>
                  </div>
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
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
            <div className="friends-composer-inner">
              <button
                type="button"
                onClick={() => setShowEmojiPicker((current) => !current)}
                disabled={false}
                className="friends-icon-button friends-composer-icon"
                aria-label="Insert emoji"
                title="Insert emoji"
              >
                <Smile size={19} />
              </button>
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                disabled={false}
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
            {error && <p className="friends-error">{error}</p>}
          </form>
        </main>
      </div>
      {isPeopleDrawerOpen && <div className="friends-drawer-backdrop" onClick={() => setIsPeopleDrawerOpen(false)}><div onClick={(event) => event.stopPropagation()}>{renderPeople(true)}</div></div>}
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
