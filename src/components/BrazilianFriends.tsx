import { useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { MessageCircle, Send, Users, WifiOff } from 'lucide-react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';
import { getSupabaseClient, getSupabaseConfig } from '../utils/supabaseClient';

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
  receiver_id: string;
  body: string;
  created_at: string;
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
  if (region && country) return `${region} · ${country}`;
  return country || region || 'Brazil';
};

const formatTime = (date: string) =>
  new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(date));

export function BrazilianFriends({ currentUser, accentColor }: BrazilianFriendsProps) {
  const [profiles, setProfiles] = useState<FriendProfile[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, PresencePayload>>({});
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [messages, setMessages] = useState<FriendMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);

  const selectedFriend = profiles.find((profile) => profile.id === selectedFriendId) || null;
  const onlineFriends = useMemo(
    () => profiles.filter((profile) => profile.id !== currentUser.id && onlineUsers[profile.id]),
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
        full_name: currentUser.full_name || currentUser.email.split('@')[0],
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
    if (!client || !selectedFriendId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    const conversationKey = getConversationKey(currentUser.id, selectedFriendId);
    const loadConversation = async () => {
      setIsLoadingMessages(true);
      setError('');
      const { data, error: messagesError } = await client
        .from(MESSAGES_TABLE)
        .select('id, sender_id, receiver_id, body, created_at')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedFriendId}),and(sender_id.eq.${selectedFriendId},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });

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
          const isThisConversation =
            (nextMessage.sender_id === currentUser.id && nextMessage.receiver_id === selectedFriendId) ||
            (nextMessage.sender_id === selectedFriendId && nextMessage.receiver_id === currentUser.id);
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

  const sendMessage = async () => {
    const body = draft.trim();
    const client = getSupabaseClient();
    if (!client || !selectedFriendId || !body) return;

    setDraft('');
    const { data, error: sendError } = await client
      .from(MESSAGES_TABLE)
      .insert({ sender_id: currentUser.id, receiver_id: selectedFriendId, body })
      .select('id, sender_id, receiver_id, body, created_at')
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
  if (!configuredUrl || !configuredAnonKey) {
    return (
      <section className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6">
        <div className="glass-card rounded-3xl p-8 text-center sm:p-12">
          <WifiOff className="mx-auto mb-4 text-white/50" size={28} />
          <h1 className="text-xl font-semibold text-white">Brazilian Friends</h1>
          <p className="mt-2 text-sm text-white/60">Supabase connection is waiting to be configured.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6">
      <div className="glass-card grid min-h-[min(72vh,680px)] overflow-hidden rounded-3xl lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-white/10 lg:border-b-0 lg:border-r">
          <div className="border-b border-white/10 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl p-2.5" style={{ backgroundColor: `${accentColor}22`, color: accentColor }}>
                <Users size={20} />
              </div>
              <div>
                <h1 className="text-base font-semibold text-white">Brazilian Friends</h1>
                <p className="text-xs text-white/50">{onlineFriends.length} online now</p>
              </div>
            </div>
          </div>
          <div className="custom-scrollbar max-h-56 overflow-y-auto p-2 lg:max-h-[calc(min(72vh,680px)-86px)]">
            {isLoading && <p className="p-3 text-sm text-white/50">Finding friends...</p>}
            {!isLoading && onlineFriends.length === 0 && (
              <p className="p-3 text-sm leading-6 text-white/50">No friends are online yet.</p>
            )}
            {onlineFriends.map((friend) => {
              const presence = onlineUsers[friend.id];
              const isSelected = friend.id === selectedFriendId;
              return (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() => setSelectedFriendId(friend.id)}
                  className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-white/10"
                  style={isSelected ? { backgroundColor: `${accentColor}22`, boxShadow: `inset 2px 0 ${accentColor}` } : undefined}
                >
                  <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white/80">
                    {(presence.full_name || friend.full_name).charAt(0).toUpperCase()}
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-neutral-900 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-white">{presence.full_name || friend.full_name}</span>
                    <span className="block truncate text-xs text-white/45">{formatLocation(presence)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="flex min-h-0 flex-col">
          <header className="border-b border-white/10 px-5 py-4">
            <p className="text-sm font-medium text-white">Brazilian Friends <span className="text-white/40">— Start a conversation in English.</span></p>
            {selectedFriend && <p className="mt-1 text-xs text-white/45">Chatting with {selectedFriend.full_name}</p>}
          </header>

          <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
            {!selectedFriend && (
              <div className="flex h-full min-h-52 flex-col items-center justify-center text-center text-white/45">
                <MessageCircle size={28} className="mb-3" />
                <p className="text-sm">Choose an online friend to begin.</p>
              </div>
            )}
            {selectedFriend && isLoadingMessages && <p className="text-sm text-white/45">Loading conversation...</p>}
            {selectedFriend && !isLoadingMessages && messages.length === 0 && (
              <div className="flex h-full min-h-52 items-center justify-center text-center text-sm text-white/45">
                Start a conversation in English.
              </div>
            )}
            {messages.map((message) => {
              const ownMessage = message.sender_id === currentUser.id;
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${ownMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${ownMessage ? 'rounded-br-md text-white' : 'rounded-bl-md bg-white/10 text-white/85'}`} style={ownMessage ? { backgroundColor: accentColor } : undefined}>
                    <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.body}</p>
                    <p className={`mt-1 text-[10px] ${ownMessage ? 'text-white/70' : 'text-white/40'}`}>{formatTime(message.created_at)}</p>
                  </div>
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <form
            className="border-t border-white/10 p-3 sm:p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage();
            }}
          >
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 p-1.5 transition-colors focus-within:border-white/30">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                disabled={!selectedFriend}
                placeholder="Write in English..."
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 disabled:cursor-not-allowed"
                maxLength={2000}
              />
              <button
                type="submit"
                disabled={!selectedFriend || !draft.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-black transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35"
                style={{ backgroundColor: accentColor }}
                aria-label="Send message"
                title="Send message"
              >
                <Send size={17} />
              </button>
            </div>
            {error && <p className="mt-2 px-2 text-xs text-rose-300">{error}</p>}
          </form>
        </div>
      </div>
    </section>
  );
}
