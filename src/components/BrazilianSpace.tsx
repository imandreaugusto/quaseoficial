import { useEffect, useMemo, useRef, useState } from 'react';
import { Orbit } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { playPrivateMessageSound } from '../lib/menuSounds';
import type { UserProfile } from '../types';
import './BrazilianSpace.css';

interface SpaceUser {
  auth_user_id: string;
  handle: string;
  display_name: string;
  photo_url: string | null;
}

interface SpaceComment {
  id: string;
  author_id: string;
  body: string;
  jev_valid: boolean;
  parent_comment_id: string | null;
  created_at: string;
  author: SpaceUser | null;
  reactions: SpaceReaction[];
}

interface SpaceReaction {
  emoji: string;
  count: number;
  reacted: boolean;
}

interface SpacePost {
  id: string;
  author_id: string;
  body: string;
  jev_valid: boolean;
  created_at: string;
  author: SpaceUser | null;
  comments: SpaceComment[];
  reactions: SpaceReaction[];
}

interface SpaceFeedData {
  posts: SpacePost[];
  helpers: SpaceUser[];
  my_helper_awards: Array<{ season_key: string; source_season_key: string; place: number }>;
  badge_users: string[];
  badges: Array<{ badge_key: string; acquired_at: string }>;
  season_key: string;
}

interface SpaceProps {
  user: UserProfile;
  initialDraft?: string;
  focusRequestId: number;
}

interface SpaceApiError {
  error?: string;
  validation?: { isValid: boolean; reason: string };
}

const requestJson = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const response = await apiFetch(path, init);
  const payload = await response.json().catch(() => ({})) as T & SpaceApiError;
  if (!response.ok) throw new Error(payload.error || 'Nao foi possivel concluir esta acao.');
  return payload;
};

const formatDate = (value: string) => new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit'
}).format(new Date(value));

const reactionEmojis = ['👍', '❤️', '😂', '👏', '💡'];

const LinkifiedText = ({ text }: { text: string }) => (
  <>
    {text.split(/(https?:\/\/[^\s<]+)/gi).map((part, index) => {
      if (!/^https?:\/\//i.test(part)) return part;
      const url = part.replace(/[),.!?;:]+$/, '');
      const suffix = part.slice(url.length);
      return (
        <span key={`${index}-${url}`}>
          <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
          {suffix}
        </span>
      );
    })}
  </>
);

const Avatar = ({ person, helper, badge }: { person: SpaceUser | null; helper?: boolean; badge?: boolean }) => {
  const displayName = person?.display_name || 'Aluno Space';
  const photoUrl = person?.photo_url?.trim() || '';
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [photoUrl]);

  const canRenderImage = photoUrl && /^https?:\/\/i.test(photoUrl) && !hasImageError;

  return (
    <div className={`space-avatar ${helper ? 'space-avatar--helper' : ''} ${badge ? 'space-avatar--ice' : ''}`}>
      {canRenderImage
        ? <img src={photoUrl} alt="" referrerPolicy="no-referrer" onError={() => setHasImageError(true)} />
        : <span aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</span>}
    </div>
  );
};

export function BrazilianSpace({ user, initialDraft = '', focusRequestId }: SpaceProps) {
  const [feed, setFeed] = useState<SpaceFeedData | null>(null);
  const [draft, setDraft] = useState(initialDraft);
  const [mentions, setMentions] = useState<SpaceUser[]>([]);
  const [suggestions, setSuggestions] = useState<SpaceUser[]>([]);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [replyTargets, setReplyTargets] = useState<Record<string, SpaceComment | null>>({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeComment, setActiveComment] = useState('');
  const [activeReaction, setActiveReaction] = useState('');
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const notificationCursorRef = useRef(new Date().toISOString());
  const notifiedPostIdsRef = useRef(new Set<string>());
  const achievementStorageKey = `bia-space-seen-achievements:${user.email.trim().toLowerCase()}`;

  const helperIds = useMemo(() => new Set(feed?.helpers.map((helper) => helper.auth_user_id) || []), [feed?.helpers]);

  const loadFeed = async () => {
    setError('');
    try {
      const data = await requestJson<SpaceFeedData>('/api/space/feed');
      const achievements = [
        ...data.badges.map((badge) => `badge:${badge.badge_key}`),
        ...data.my_helper_awards.map((award) => `helper:${award.season_key}:${award.place}`)
      ];
      try {
        const saved = window.localStorage.getItem(achievementStorageKey);
        if (saved !== null) {
          const seen = new Set(JSON.parse(saved) as string[]);
          const newBadge = data.badges.find((badge) => !seen.has(`badge:${badge.badge_key}`));
          const newHelperAward = data.my_helper_awards.find((award) => !seen.has(`helper:${award.season_key}:${award.place}`));
          if (newBadge) {
            setNotice('Conquista desbloqueada: Quebra-Gelo! Seu insight agora brilha no Space.');
          } else if (newHelperAward) {
            setNotice(`Parabéns! Você conquistou o título Space Helper na temporada ${newHelperAward.source_season_key.slice(0, 7)}.`);
          }
        }
        window.localStorage.setItem(achievementStorageKey, JSON.stringify(achievements));
      } catch (storageError) {
        console.warn('Não foi possível salvar as conquistas já exibidas no Brazilian Space:', storageError);
      }
      setFeed(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Nao foi possivel carregar o Brazilian Space.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadFeed();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const checkForNewPosts = async () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      try {
        const updates = await requestJson<{
          posts: Array<{ id: string; author_id: string; body: string; created_at: string; author: SpaceUser | null }>;
        }>(`/api/space/updates?since=${encodeURIComponent(notificationCursorRef.current)}`);
        if (cancelled || updates.posts.length === 0) return;
        const newPosts = updates.posts.filter((post) => !notifiedPostIdsRef.current.has(post.id));
        updates.posts.forEach((post) => notifiedPostIdsRef.current.add(post.id));
        if (newPosts.length === 0) return;
        const latestTimestamp = newPosts.reduce((latest, post) =>
          Date.parse(post.created_at) > Date.parse(latest) ? post.created_at : latest,
          notificationCursorRef.current
        );
        notificationCursorRef.current = latestTimestamp;
        const latestPost = newPosts[newPosts.length - 1];
        const authorName = latestPost.author?.display_name || 'Alguém';
        const preview = latestPost.body.replace(/\s+/g, ' ').trim().slice(0, 120);
        setNotice(`${authorName} publicou no Brazilian Space: ${preview}`);
        playPrivateMessageSound();
        if (typeof navigator.vibrate === 'function') navigator.vibrate([180, 100, 180]);
        if (
          'Notification' in window &&
          Notification.permission === 'granted' &&
          'serviceWorker' in navigator
        ) {
          const registration = await navigator.serviceWorker.getRegistration('/');
          await registration?.showNotification(`${authorName} publicou no Brazilian Space`, {
            body: preview,
            icon: '/brazilian-in-action-icon.svg',
            badge: '/brazilian-in-action-icon.svg',
            tag: `brazilian-space-post-${latestPost.id}`,
            data: { url: '/' }
          });
        }
        void loadFeed();
      } catch (updateError) {
        if (!cancelled) console.error('Não foi possível verificar novas publicações do Space:', updateError);
      }
    };
    void checkForNewPosts();
    const interval = window.setInterval(() => void checkForNewPosts(), 15_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void checkForNewPosts();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 5000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    setDraft(initialDraft);
  }, [initialDraft, focusRequestId]);

  useEffect(() => {
    if (focusRequestId > 0) composerRef.current?.focus();
  }, [focusRequestId]);

  useEffect(() => {
    const match = draft.match(/(?:^|\s)@([a-z0-9_-]{2,30})$/i);
    if (!match) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      try {
        const data = await requestJson<{ users: SpaceUser[] }>(`/api/space/users?q=${encodeURIComponent(match[1])}`);
        if (!cancelled) setSuggestions(data.users);
      } catch (searchError) {
        if (!cancelled) {
          setSuggestions([]);
          setError(searchError instanceof Error ? searchError.message : 'Falha ao pesquisar alunos.');
        }
      }
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [draft]);

  const addMention = (person: SpaceUser) => {
    const next = draft.replace(/(?:^|\s)@[a-z0-9_-]{2,30}$/i, (token) => `${token.startsWith(' ') ? ' ' : ''}@${person.handle} `);
    setDraft(next);
    setMentions((current) => current.some((item) => item.auth_user_id === person.auth_user_id)
      ? current
      : [...current, person]);
    setSuggestions([]);
    composerRef.current?.focus();
  };

  const submitPost = async (event: React.FormEvent) => {
    event.preventDefault();
    if (draft.trim().length < 8) {
      setError('Escreva pelo menos 8 caracteres para publicar.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    setNotice('');
    try {
      await requestJson('/api/space/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: draft.trim(), mentions: mentions.map((person) => person.handle) })
      });
      setDraft('');
      setMentions([]);
      setNotice('Sua publicação foi compartilhada.');
      await loadFeed();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Falha ao publicar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitComment = async (postId: string) => {
    const body = commentDrafts[postId]?.trim() || '';
    if (body.length < 8) {
      setError('Escreva uma resposta com pelo menos 8 caracteres.');
      return;
    }
    setActiveComment(postId);
    setError('');
    setNotice('');
    try {
      const result = await requestJson<{
        validation: { isValid: boolean; reason: string };
        rewards?: { recipients: number; points: number; xp: number; coins: number };
      }>(`/api/space/posts/${encodeURIComponent(postId)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, parentCommentId: replyTargets[postId]?.id || null })
      });
      setCommentDrafts((current) => ({ ...current, [postId]: '' }));
      setReplyTargets((current) => ({ ...current, [postId]: null }));
      const rewards = result.rewards;
      setNotice(rewards?.recipients
        ? 'A ajuda de vocês foi reconhecida. Uma surpresa chegou para os dois!'
        : 'Sua resposta foi compartilhada.');
      await loadFeed();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Falha ao responder.');
    } finally {
      setActiveComment('');
    }
  };

  const toggleReaction = async (targetType: 'post' | 'comment', targetId: string, emoji: string) => {
    const actionKey = `${targetType}:${targetId}:${emoji}`;
    setActiveReaction(actionKey);
    setError('');
    try {
      await requestJson('/api/space/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, emoji })
      });
      await loadFeed();
    } catch (reactionError) {
      setError(reactionError instanceof Error ? reactionError.message : 'Não foi possível salvar a reação.');
    } finally {
      setActiveReaction('');
    }
  };

  const renderReactions = (targetType: 'post' | 'comment', targetId: string, reactions: SpaceReaction[]) => (
    <div className="space-reactions" aria-label="Reações">
      {reactionEmojis.map((emoji) => {
        const reaction = reactions.find((item) => item.emoji === emoji);
        const actionKey = `${targetType}:${targetId}:${emoji}`;
        return (
          <button
            key={emoji}
            type="button"
            className={`space-reaction ${reaction?.reacted ? 'space-reaction--active' : ''}`}
            aria-label={`${reaction?.reacted ? 'Remover' : 'Adicionar'} reação ${emoji}${reaction?.count ? `, ${reaction.count}` : ''}`}
            aria-pressed={Boolean(reaction?.reacted)}
            disabled={activeReaction === actionKey}
            onClick={() => void toggleReaction(targetType, targetId, emoji)}
          >
            <span>{emoji}</span>{reaction?.count ? <span>{reaction.count}</span> : null}
          </button>
        );
      })}
    </div>
  );

  const renderPost = (post: SpacePost) => {
    const hasIceBadge = feed?.badge_users.includes(post.author_id);
    const commentsById = new Map(post.comments.map((comment) => [comment.id, comment]));
    return (
      <article className="space-glass space-post" key={post.id}>
        <div className="space-post-header">
          <Avatar person={post.author} helper={helperIds.has(post.author_id)} badge={Boolean(hasIceBadge)} />
          <div className="space-author">
            <div className="space-author-line">
              <strong className={helperIds.has(post.author_id) ? 'space-helper-name' : ''}>{post.author?.display_name || 'Aluno Space'}</strong>
              {helperIds.has(post.author_id) && <span className="space-helper-label">Space Helper</span>}
              {post.jev_valid && <span className="space-ice-label">Quebra-Gelo</span>}
            </div>
            <span>@{post.author?.handle || 'aluno'} · {formatDate(post.created_at)}</span>
          </div>
        </div>
        <p className="space-post-body"><LinkifiedText text={post.body} /></p>
        {renderReactions('post', post.id, post.reactions)}
        <div className="space-post-meta">
          <span>{post.comments.length} {post.comments.length === 1 ? 'resposta' : 'respostas'}</span>
        </div>
        {post.comments.map((comment) => (
          <div className={`space-comment ${comment.parent_comment_id ? 'space-comment--nested' : ''}`} key={comment.id}>
            <Avatar person={comment.author} helper={helperIds.has(comment.author_id)} />
            <div>
              <div className="space-author-line">
                <strong className={helperIds.has(comment.author_id) ? 'space-helper-name' : ''}>{comment.author?.display_name || 'Aluno Space'}</strong>
                {helperIds.has(comment.author_id) && <span className="space-helper-label">Space Helper</span>}
                <time>{formatDate(comment.created_at)}</time>
              </div>
              {comment.parent_comment_id && commentsById.get(comment.parent_comment_id) && (
                <span className="space-reply-context">
                  Respondendo a {commentsById.get(comment.parent_comment_id)?.author?.display_name || 'Aluno Space'}
                </span>
              )}
              <p><LinkifiedText text={comment.body} /></p>
              <div className="space-comment-actions">
                {renderReactions('comment', comment.id, comment.reactions)}
                <button
                  type="button"
                  className="space-text-button"
                  onClick={() => setReplyTargets((current) => ({ ...current, [post.id]: comment }))}
                >
                  Responder
                </button>
              </div>
            </div>
          </div>
        ))}
        {replyTargets[post.id] && (
          <div className="space-replying-to">
            Respondendo a <strong>{replyTargets[post.id]?.author?.display_name || 'Aluno Space'}</strong>
            <button type="button" aria-label="Cancelar resposta" onClick={() => setReplyTargets((current) => ({ ...current, [post.id]: null }))}>×</button>
          </div>
        )}
        <div className="space-reply-row">
          <input
            value={commentDrafts[post.id] || ''}
            onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
            placeholder="Responda com uma ideia que ajude..."
            maxLength={1200}
            aria-label="Escrever resposta"
          />
          <button
            type="button"
            className="space-quiet-button"
            disabled={activeComment === post.id}
            onClick={() => void submitComment(post.id)}
          >
            {activeComment === post.id ? 'Enviando...' : 'Responder'}
          </button>
        </div>
      </article>
    );
  };

  return (
    <main className="space-page">
      <header className="space-hero space-glass">
        <div>
          <span className="space-eyebrow">COMUNIDADE DE APRENDIZAGEM</span>
          <h1>Brazilian <span>Space</span></h1>
          <p>Compartilhe descobertas, tire duvidas e ajude outros alunos a decolarem.</p>
        </div>
        <div className="space-hero-actions">
          <div className="space-season-pill">
            <span>Temporada</span>
            <strong>{feed?.season_key ? new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${feed.season_key}T00:00:00Z`)) : '—'}</strong>
          </div>
        </div>
      </header>

      {error && <div className="space-alert space-alert--error" role="alert">{error}</div>}
      {notice && <div className="space-toast space-alert--success" role="status"><Orbit size={19} /><span>{notice}</span></div>}

      <div className="space-layout">
        <section className="space-main-column">
          <form className="space-glass space-composer" onSubmit={(event) => void submitPost(event)}>
            <label htmlFor="space-composer" className="space-composer-title">Qual insight ou duvida voce quer compartilhar?</label>
            <textarea
              id="space-composer"
              ref={composerRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Conte o que voce aprendeu, pergunte algo ou mencione um colega com @..."
              maxLength={2000}
              rows={4}
            />
            {suggestions.length > 0 && (
              <div className="space-suggestions" role="listbox" aria-label="Alunos para mencionar">
                {suggestions.map((person) => (
                  <button type="button" role="option" key={person.auth_user_id} onClick={() => addMention(person)}>
                    <Avatar person={person} />
                    <span>{person.display_name}</span>
                    <small>@{person.handle}</small>
                  </button>
                ))}
              </div>
            )}
            {mentions.length > 0 && (
              <div className="space-mention-chips">
                {mentions.map((person) => <span key={person.auth_user_id}>@{person.handle}</span>)}
              </div>
            )}
            <div className="space-composer-footer">
              <button className="space-primary-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Publicando...' : 'Publicar no Space'}
              </button>
            </div>
          </form>
          <div className="space-feed-heading">
            <h2>Conversas recentes</h2>
            <button type="button" className="space-quiet-button" onClick={() => void loadFeed()}>Atualizar</button>
          </div>
          {isLoading
            ? <div className="space-glass space-empty">Carregando a comunidade...</div>
            : feed?.posts.length
              ? feed.posts.map(renderPost)
              : <div className="space-glass space-empty">Ainda nao ha publicacoes. Seja a primeira pessoa a compartilhar um insight!</div>}
        </section>
      </div>

    </main>
  );
}
