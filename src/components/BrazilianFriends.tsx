import { useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { ArrowLeft, ChevronDown, MessageCircle, Send, Smile, Users, WifiOff, X } from 'lucide-react';
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
  email: string;
  full_name: string;
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
  email: string;
  full_name: string;
  ip_region?: string | null;
  ip_country?: string | null;
}

const USERS_TABLE = 'brazilian_friends_users';
const MESSAGES_TABLE = 'brazilian_friends_messages';
const PRESENCE_CHANNEL = 'online-users';

const getConversationKey = (firstId: string, secondId: string) =>
  [firstId, secondId].sort().join(':');

const formatLocation = (profile: Pick<FriendProfile, 'ip_region' | 'ip_country'>) => {
  const region = profile.ip_region?.trim();
  const country = profile.ip_country?.trim();
  if (region && country) return `${country} ${region}`;
  return country || region || 'Brasil';
};

const formatTime = (date: string) =>
  new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(date));

const getPublicName = (user: Pick<UserProfile, 'email' | 'full_name'>) =>
  user.email.trim().toLowerCase() === CEO_EMAIL.toLowerCase()
    ? 'André Augusto'
    : user.full_name?.trim() || user.email.split('@')[0];

export function BrazilianFriends({ currentUser, accentColor }: BrazilianFriendsProps) {
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);

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
    [currentUser.id, onlineUsers, profiles]
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
        id: currentUser.id,
        email: currentUser.email,
        full_name: getPublicName(currentUser),
        ip_region: currentUser.ip_region,
        ip_country: currentUser.ip_country
      };

      const { error: profileError } = await client.from(USERS_TABLE).upsert(profile, { onConflict: 'id' });
      if (profileError) {
        if (!cancelled) {
          setError('Friends is not configured yet. Please try again later.');
          setIsLoading(false);
        }
        return;
      }

      const { data, error: profilesError } = await client
        .from(USERS_TABLE)
        .select('id, email, full_name, ip_region, ip_country')
        .order('full_name', { ascending: true });

      if (cancelled) return;
      if (profilesError) {
        setError('Unable to load your friends right now.');
      } else {
        setProfiles((data || []) as FriendProfile[]);
      }
      setIsLoading(false);

      const channel = client.channel(PRESENCE_CHANNEL, {
        config: { presence: { key: currentUser.id } }
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
              user_id: currentUser.id,
              email: profile.email,
              full_name: profile.full_name,
              ip_region: profile.ip_region,
              ip_country: profile.ip_country
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
      setError('Supabase connection is waiting to be configured.');
      setMessages([]);
      return;
    }
    let cancelled = false;
    const conversationKey = selectedFriendId
      ? getConversationKey(currentUser.id, selectedFriendId)
      : 'public';
    const loadConversation = async () => {
      setIsLoadingMessages(true);
      setError('');
      const now = new Date().toISOString();
      if (selectedFriendId) await client
        .from(MESSAGES_TABLE)
        .delete()
        .lte('expires_at', now)
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedFriendId}),and(sender_id.eq.${selectedFriendId},receiver_id.eq.${currentUser.id})`);
      let query = client
        .from(MESSAGES_TABLE)
        .select('id, sender_id, receiver_id, body, created_at, expires_at')
        .gt('expires_at', now)
        .order('created_at', { ascending: true });
      query = selectedFriendId
        ? query.or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedFriendId}),and(sender_id.eq.${selectedFriendId},receiver_id.eq.${currentUser.id})`)
        : query.is('receiver_id', null);
      const { data, error: messagesError } = await query;

      if (cancelled) return;
      if (messagesError) {
        setError('Unable to load this conversation.');
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
            ? ((nextMessage.sender_id === currentUser.id && nextMessage.receiver_id === selectedFriendId) ||
              (nextMessage.sender_id === selectedFriendId && nextMessage.receiver_id === currentUser.id))
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
  }, [currentUser.id, selectedFriendId]);

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
      .insert({ sender_id: currentUser.id, receiver_id: selectedFriendId, body })
      .select('id, sender_id, receiver_id, body, created_at, expires_at')
      .single();

    if (sendError) {
      setDraft(body);
      setError('Your message could not be sent.');
      return;
    }

    const sentMessage = data as FriendMessage;
    setMessages((current) => current.some((message) => message.id === sentMessage.id)
      ? current
      : [...current, sentMessage]);
  };

  const { url: configuredUrl, anonKey: configuredAnonKey } = getSupabaseConfig();
  const publicName = getPublicName(currentUser);
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
        {isLoading && <p className="friends-muted-copy">Finding friends...</p>}
        {!isLoading && allFriends.length === 0 && <p className="friends-muted-copy">No one is online yet.</p>}
        {allFriends.map((friend) => {
          const presence = onlineUsers[friend.id];
          const isOnline = Boolean(presence);
          const isSelected = friend.id === selectedFriendId;
          return (
            <button key={friend.id} type="button" onClick={() => { setSelectedFriendId(friend.id); setIsPeopleDrawerOpen(false); }} className={`friends-person ${isSelected ? 'friends-person-selected' : ''}`}>
              <span className="friends-avatar" style={{ '--avatar-color': accentColor } as React.CSSProperties}>{(presence?.full_name || friend.full_name).charAt(0).toUpperCase()}<span className={`friends-status ${isOnline ? 'friends-status-online' : ''}`} /></span>
              <span className="friends-person-copy"><strong>{presence?.full_name || friend.full_name}</strong><small>{formatLocation(presence || friend)}{friend.id === currentUser.id ? ' · You' : ''}</small></span>
            </button>
          );
        })}
      </div>
    </aside>
  );

  if (!configuredUrl || !configuredAnonKey) {
    return (
      <section className="friends-shell">
        <div className="friends-glass-frame friends-empty-state">
          <WifiOff className="mx-auto mb-4 text-white/50" size={28} />
          <h1 className="text-xl font-semibold text-white">Brazilian Friends</h1>
          <p className="mt-2 text-sm text-white/60">Supabase connection is waiting to be configured.</p>
        </div>
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
            <button type="button" className="friends-mobile-people-button" onClick={() => setIsPeopleDrawerOpen(true)}><Users size={16} /><span>{onlineFriends.length} online</span></button>
            {selectedFriend && <button type="button" className="friends-selected-chip" onClick={() => setSelectedFriendId(null)}><ArrowLeft size={13} /> {selectedFriend.full_name}</button>}
          </header>

          <div className="friends-message-scroll custom-scrollbar">
            {!selectedFriend && messages.length === 0 && (
              <div className="friends-empty-conversation">
                <MessageCircle size={28} className="mb-3" />
                <p>Say hi to everyone in Brazilian Friends.</p>
              </div>
            )}
            {isLoadingMessages && <p className="friends-muted-copy">Loading conversation...</p>}
            {messages.map((message) => {
              const ownMessage = message.sender_id === currentUser.id;
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
                    <div className="friends-message-meta"><strong>{senderName}</strong><span>{senderLocation} · {formatTime(message.created_at)}</span></div>
                    <div className={`friends-message-bubble ${ownMessage ? 'friends-message-bubble-own' : ''}`} style={ownMessage ? { '--bubble-accent': accentColor } as React.CSSProperties : undefined}>
                      <p>{message.body}</p>
                      <span>{formatTime(message.created_at)}</span>
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
                placeholder="Write in English..."
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
    </section>
  );
}
