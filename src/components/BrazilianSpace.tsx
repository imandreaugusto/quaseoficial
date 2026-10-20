import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../lib/api';
import type { UserProfile } from '../types';
import { CEO_EMAIL } from '../utils/security';
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
  created_at: string;
  author: SpaceUser | null;
}

interface SpacePost {
  id: string;
  author_id: string;
  body: string;
  jev_valid: boolean;
  created_at: string;
  author: SpaceUser | null;
  comments: SpaceComment[];
}

interface SpaceLeaderboardEntry {
  user_id: string;
  help_points: number;
  xp: number;
  coins: number;
  user: SpaceUser | null;
}

interface RewardSettings {
  mention_reply_points: number;
  mention_reply_xp: number;
  mention_reply_coins: number;
}

interface SpaceFeedData {
  posts: SpacePost[];
  leaderboard: SpaceLeaderboardEntry[];
  helpers: SpaceUser[];
  my_helper_awards: Array<{ season_key: string; source_season_key: string; place: number; help_points: number }>;
  badge_users: string[];
  badges: Array<{ badge_key: string; acquired_at: string }>;
  season_key: string;
  reward_settings: RewardSettings;
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

const Avatar = ({ person, helper, badge }: { person: SpaceUser | null; helper?: boolean; badge?: boolean }) => {
  const displayName = person?.display_name || 'Aluno Space';
  return (
    <div className={`space-avatar ${helper ? 'space-avatar--helper' : ''} ${badge ? 'space-avatar--ice' : ''}`}>
      {person?.photo_url
        ? <img src={person.photo_url} alt="" />
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
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeComment, setActiveComment] = useState('');
  const [rewardSettings, setRewardSettings] = useState<RewardSettings | null>(null);
  const [rewardForm, setRewardForm] = useState<RewardSettings>({
    mention_reply_points: 10,
    mention_reply_xp: 15,
    mention_reply_coins: 5
  });
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const isCeo = user.email.trim().toLowerCase() === CEO_EMAIL;

  const helperIds = useMemo(() => new Set(feed?.helpers.map((helper) => helper.auth_user_id) || []), [feed?.helpers]);

  const loadFeed = async () => {
    setError('');
    try {
      const data = await requestJson<SpaceFeedData>('/api/space/feed');
      setFeed(data);
      setRewardSettings(data.reward_settings);
      setRewardForm(data.reward_settings);
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
      const result = await requestJson<{ validation: { isValid: boolean; reason: string } }>('/api/space/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: draft.trim(), mentions: mentions.map((person) => person.handle) })
      });
      setDraft('');
      setMentions([]);
      setNotice(result.validation.isValid
        ? 'Publicado! A JEV validou sua contribuicao e o emblema Quebra-Gelo esta no seu perfil.'
        : `Publicado sem emblema: ${result.validation.reason}`);
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
        body: JSON.stringify({ body })
      });
      setCommentDrafts((current) => ({ ...current, [postId]: '' }));
      const rewards = result.rewards;
      setNotice(rewards?.recipients
        ? `Resposta validada! Ambos receberam ${rewards.points} pontos, ${rewards.xp} XP e ${rewards.coins} moedas.`
        : result.validation.isValid ? 'Resposta publicada e validada pela JEV.' : `Resposta publicada: ${result.validation.reason}`);
      await loadFeed();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Falha ao responder.');
    } finally {
      setActiveComment('');
    }
  };

  const saveRewardSettings = async () => {
    if (!rewardForm || !isCeo) return;
    setError('');
    setNotice('');
    try {
      const result = await requestJson<{ settings: RewardSettings }>('/api/space/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rewardForm)
      });
      setRewardSettings(result.settings);
      setRewardForm(result.settings);
      setNotice('Valores de recompensa atualizados.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Nao foi possivel atualizar as recompensas.');
    }
  };

  const renderPost = (post: SpacePost) => {
    const hasIceBadge = feed?.badge_users.includes(post.author_id);
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
        <p className="space-post-body">{post.body}</p>
        <div className="space-post-meta">
          <span>{post.comments.length} {post.comments.length === 1 ? 'resposta' : 'respostas'}</span>
          {post.jev_valid && <span className="space-validation">✓ Insight verificado pela JEV</span>}
        </div>
        {post.comments.map((comment) => (
          <div className="space-comment" key={comment.id}>
            <Avatar person={comment.author} helper={helperIds.has(comment.author_id)} />
            <div>
              <div className="space-author-line">
                <strong className={helperIds.has(comment.author_id) ? 'space-helper-name' : ''}>{comment.author?.display_name || 'Aluno Space'}</strong>
                {helperIds.has(comment.author_id) && <span className="space-helper-label">Space Helper</span>}
                <time>{formatDate(comment.created_at)}</time>
              </div>
              <p>{comment.body}</p>
            </div>
          </div>
        ))}
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
            {activeComment === post.id ? 'Verificando...' : 'Responder'}
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
        <div className="space-season-pill">
          <span>Temporada</span>
          <strong>{feed?.season_key ? new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${feed.season_key}T00:00:00Z`)) : '—'}</strong>
        </div>
      </header>

      {error && <div className="space-alert space-alert--error" role="alert">{error}</div>}
      {notice && <div className="space-alert space-alert--success" role="status">{notice}</div>}

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
              <span>A JEV verifica se o conteudo e um insight ou uma duvida de estudo.</span>
              <button className="space-primary-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Verificando com JEV...' : 'Publicar no Space'}
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

        <aside className="space-side-column">
          <section className="space-glass space-panel">
            <div className="space-panel-heading"><h2>Space Helpers</h2><span>Top 3 do mes</span></div>
            <p className="space-panel-copy">Quem mais ajuda a comunidade nesta temporada.</p>
            {feed?.leaderboard.length ? feed.leaderboard.slice(0, 3).map((entry, index) => (
              <div className="space-rank-row" key={entry.user_id}>
                <span className="space-rank-number">{index + 1}</span>
                <Avatar person={entry.user} helper />
                <div className="space-rank-user">
                  <strong className="space-helper-name">{entry.user?.display_name || 'Aluno Space'}</strong>
                  <span>@{entry.user?.handle || 'aluno'}</span>
                </div>
                <b>{entry.help_points} pts</b>
              </div>
            )) : <p className="space-empty-inline">As primeiras interacoes validas iniciam o placar.</p>}
            <div className="space-reward-summary">
              <span>Recompensa por resposta valida</span>
              <strong>+{rewardSettings?.mention_reply_points ?? 10} pts · +{rewardSettings?.mention_reply_xp ?? 15} XP · +{rewardSettings?.mention_reply_coins ?? 5} moedas para cada aluno</strong>
            </div>
          </section>

          <section className="space-glass space-panel">
            <div className="space-panel-heading"><h2>Suas conquistas</h2><span>{feed?.badges.length || 0}</span></div>
            {feed?.badges.some((badge) => badge.badge_key === 'break_the_ice')
              ? <div className="space-badge-card">
                <span className="space-badge-icon">✦</span>
                <div><strong>Quebra-Gelo</strong><p>A JEV reconheceu sua contribuicao de estudo.</p></div>
              </div>
              : <p className="space-empty-inline">Publique seu primeiro insight ou duvida validada pela JEV para conquistar o Quebra-Gelo.</p>}
            {feed?.my_helper_awards.map((award) => (
              <div className="space-badge-card" key={award.season_key}>
                <span className="space-badge-icon space-badge-icon--gold">✧</span>
                <div>
                  <strong>Space Helper · #{award.place}</strong>
                  <p>Top 3 de {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${award.source_season_key}T00:00:00Z`))} · {award.help_points} pontos</p>
                </div>
              </div>
            ))}
          </section>

          {isCeo && (
            <section className="space-glass space-panel space-admin-rewards">
              <div className="space-panel-heading"><h2>Recompensas</h2><span>CEO</span></div>
              <label>Pontos <input type="number" min="0" max="10000" value={rewardForm.mention_reply_points} onChange={(event) => setRewardForm((current) => ({ ...current, mention_reply_points: Number(event.target.value) }))} /></label>
              <label>XP <input type="number" min="0" max="10000" value={rewardForm.mention_reply_xp} onChange={(event) => setRewardForm((current) => ({ ...current, mention_reply_xp: Number(event.target.value) }))} /></label>
              <label>Moedas <input type="number" min="0" max="10000" value={rewardForm.mention_reply_coins} onChange={(event) => setRewardForm((current) => ({ ...current, mention_reply_coins: Number(event.target.value) }))} /></label>
              <button type="button" className="space-quiet-button" onClick={() => void saveRewardSettings()}>Salvar valores</button>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
