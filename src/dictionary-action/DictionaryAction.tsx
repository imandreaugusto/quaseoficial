import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { toPng } from 'html-to-image';
import gsap from 'gsap';
import {
  ArrowLeft,
  Bookmark,
  Check,
  ChevronRight,
  Clock3,
  Download,
  Search,
  Share2,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import { scenarioFilters } from './data';
import {
  cacheHighlights,
  deleteHighlightFromSupabase,
  loadHighlightsFromSupabase,
  lookupDictionary,
  readCachedHighlights,
  syncHighlightToSupabase,
} from './services';
import { getSupabaseClient } from '../utils/supabaseClient';
import type { CulturalEntry, HighlightColor, UserHighlight } from './types';
import './dictionary-action.css';

const colorNames: Record<HighlightColor, string> = {
  cyan: 'Expressão-chave',
  amber: 'Pegadinha ou cuidado',
  emerald: 'Usar na fala',
};

const readHistory = (userId: string) => {
  try {
    const stored = localStorage.getItem(`dictionary-action:history:${userId}`);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter((word): word is string => typeof word === 'string') : [];
  } catch (error) {
    console.warn('Não foi possível ler o histórico local do dicionário:', error);
    return [];
  }
};

const getTextSegments = (text: string, highlights: UserHighlight[]) => {
  const found: Array<{ start: number; end: number; highlight: UserHighlight }> = [];
  highlights.forEach((highlight) => {
    if (!highlight.highlighted_text) return;
    const query = highlight.highlighted_text.toLocaleLowerCase();
    const source = text.toLocaleLowerCase();
    let start = 0;
    while ((start = source.indexOf(query, start)) !== -1) {
      found.push({ start, end: start + query.length, highlight });
      start += query.length;
    }
  });
  found.sort((a, b) => a.start - b.start || b.end - a.end);

  const segments: Array<{ text: string; highlight?: UserHighlight }> = [];
  let cursor = 0;
  found.forEach(({ start, end, highlight }) => {
    if (start < cursor) return;
    if (start > cursor) segments.push({ text: text.slice(cursor, start) });
    segments.push({ text: text.slice(start, end), highlight });
    cursor = end;
  });
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments.length ? segments : [{ text }];
};

function HighlightedText({
  text,
  highlights,
}: {
  text: string;
  highlights: UserHighlight[];
}) {
  return (
    <>
      {getTextSegments(text, highlights).map((segment, index) =>
        segment.highlight ? (
          <mark className={`da-highlight da-highlight--${segment.highlight.color_tag}`} key={`${segment.highlight.id}-${index}`}>
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}

const displayPronunciation = (entry: CulturalEntry, role: CulturalEntry['grammatical_roles'][number]) =>
  role.ipa || entry.grammatical_roles.find((item) => item.ipa)?.ipa || '';

export default function DictionaryAction() {
  const [userId, setUserId] = useState('guest');
  const [studentName, setStudentName] = useState('Aluno');
  const [query, setQuery] = useState('');
  const [entry, setEntry] = useState<CulturalEntry | null>(null);
  const [collocations, setCollocations] = useState<string[]>([]);
  const [notices, setNotices] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeScenario, setActiveScenario] = useState('');
  const [highlights, setHighlights] = useState<UserHighlight[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null);
  const [speakingId, setSpeakingId] = useState('');
  const [feedback, setFeedback] = useState('');
  const storyRef = useRef<HTMLDivElement>(null);
  const ambientRef = useRef<HTMLDivElement>(null);
  const entryRef = useRef<HTMLElement>(null);
  const feedbackTimeout = useRef<number | undefined>(undefined);
  const searchSequence = useRef(0);

  const currentHighlights = useMemo(
    () => highlights.filter((highlight) => highlight.word_key === entry?.word_key),
    [entry?.word_key, highlights],
  );

  const selectedScenario = scenarioFilters.find((item) => item.value === activeScenario);
  const suggestionWord = selectedScenario?.suggestion || 'close';

  const announce = useCallback((message: string) => {
    setFeedback(message);
    window.clearTimeout(feedbackTimeout.current);
    feedbackTimeout.current = window.setTimeout(() => setFeedback(''), 3600);
  }, []);

  useEffect(() => {
    let mounted = true;
    const client = getSupabaseClient();

    if (!client) {
      setHighlights(readCachedHighlights('guest'));
      setHistory(readHistory('guest'));
      return () => { mounted = false; };
    }

    const updateUser = async (id?: string, metadata?: Record<string, unknown>, email?: string) => {
      if (!mounted) return;
      const currentId = id || 'guest';
      setUserId(currentId);
      setStudentName(
        (typeof metadata?.full_name === 'string' && metadata.full_name.trim()) ||
        (typeof metadata?.name === 'string' && metadata.name.trim()) ||
        email?.split('@')[0] ||
        'Aluno',
      );
      setHighlights(readCachedHighlights(currentId));
      setHistory(readHistory(currentId));
      if (!id) return;
      try {
        const remote = await loadHighlightsFromSupabase(id);
        if (mounted && remote) {
          const remoteByKey = new Map(remote.map((highlight) => [
            `${highlight.word_key}\n${highlight.highlighted_text.toLocaleLowerCase()}`,
            highlight,
          ]));
          const localToSync = readCachedHighlights(currentId).filter((highlight) => {
            const remoteHighlight = remoteByKey.get(`${highlight.word_key}\n${highlight.highlighted_text.toLocaleLowerCase()}`);
            return !remoteHighlight || highlight.created_at > remoteHighlight.created_at;
          });
          const merged = new Map(remote.map((highlight) => [
            `${highlight.word_key}\n${highlight.highlighted_text.toLocaleLowerCase()}`,
            highlight,
          ]));
          readCachedHighlights(currentId).forEach((highlight) => {
            const key = `${highlight.word_key}\n${highlight.highlighted_text.toLocaleLowerCase()}`;
            const remoteHighlight = merged.get(key);
            if (!remoteHighlight || highlight.created_at >= remoteHighlight.created_at) merged.set(key, highlight);
          });
          const updated = [...merged.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
          setHighlights(updated);
          cacheHighlights(currentId, updated);
          const syncResults = await Promise.allSettled(localToSync.map(syncHighlightToSupabase));
          if (syncResults.some((result) => result.status === 'rejected') && mounted) {
            console.error('Um ou mais grifos locais não puderam ser sincronizados:', syncResults);
            announce('Alguns grifos locais ainda não foram sincronizados com sua conta.');
          }
        }
      } catch (error) {
        console.error('Não foi possível sincronizar os grifos do Supabase:', error);
        if (mounted) announce('Os grifos locais foram carregados, mas a sincronização com sua conta falhou.');
      }
    };

    void client.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('Não foi possível verificar a sessão do Dictionary Action:', error);
        return updateUser();
      }
      return updateUser(data.session?.user.id, data.session?.user.user_metadata, data.session?.user.email);
    });

    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      void updateUser(session?.user.id, session?.user.user_metadata, session?.user.email);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [announce]);

  useLayoutEffect(() => {
    if (!ambientRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const context = gsap.context(() => {
      gsap.from('.da-brand', { opacity: 0, y: -8, duration: 0.9, ease: 'power2.out' });
      gsap.to('.da-orb--one', { x: 65, y: -36, scale: 1.12, duration: 18, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      gsap.to('.da-orb--two', { x: -55, y: 48, scale: 0.92, duration: 22, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      gsap.to('.da-orb--three', { x: 32, y: 28, duration: 25, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    }, ambientRef);
    return () => context.revert();
  }, []);

  useEffect(() => {
    if (!entry || !entryRef.current) return;
    gsap.fromTo(entryRef.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' });
    gsap.fromTo('.da-temperature__fill', { scaleX: 0 }, { scaleX: 1, duration: 0.85, ease: 'power2.out', transformOrigin: 'left center' });
  }, [entry]);

  useEffect(() => {
    if (!selection) return;
    const menu = document.querySelector('.da-highlight-menu');
    if (menu) gsap.fromTo(menu, { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: 0.18, ease: 'power2.out' });
  }, [selection]);

  useEffect(() => () => {
    window.clearTimeout(feedbackTimeout.current);
    window.speechSynthesis?.cancel();
  }, []);

  const searchWord = useCallback(async (term: string) => {
    const normalized = term.trim();
    if (!normalized) return;
    const requestId = ++searchSequence.current;
    setQuery(normalized);
    setIsSearching(true);
    setNotices([]);
    setSelection(null);
    setShowComparison(false);
    try {
      const result = await lookupDictionary(normalized);
      if (requestId !== searchSequence.current) return;
      setEntry(result.entry);
      setCollocations(result.collocations);
      setNotices(result.notices);
      if (!result.entry) {
        announce(`Não encontramos uma definição para “${normalized}”. Confira a grafia e tente novamente.`);
        return;
      }
      setHistory((previous) => {
        const updated = [result.entry!.word_key, ...previous.filter((word) => word !== result.entry!.word_key)];
        try {
          localStorage.setItem(`dictionary-action:history:${userId}`, JSON.stringify(updated));
        } catch (error) {
          console.warn('Não foi possível salvar o histórico local:', error);
        }
        return updated;
      });
    } catch (error) {
      if (requestId !== searchSequence.current) return;
      console.error('A busca do Dictionary Action falhou:', error);
      announce('Não foi possível concluir a busca. Verifique a conexão e tente novamente.');
    } finally {
      if (requestId === searchSequence.current) setIsSearching(false);
    }
  }, [announce, userId]);

  const getEntryHighlights = useCallback((wordKey: string) =>
    highlights.filter((highlight) => highlight.word_key === wordKey), [highlights]);

  const speak = useCallback((text: string, rate: number, id: string) => {
    if (!('speechSynthesis' in window)) {
      announce('A síntese de voz não está disponível neste navegador.');
      return;
    }
    gsap.killTweensOf('.da-wave i');
    gsap.set('.da-wave i', { scaleY: 1 });
    setSpeakingId('');
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    utterance.onstart = () => {
      setSpeakingId(id);
      const waveform = document.querySelector(`[data-wave="${id}"]`);
      if (waveform) gsap.to(waveform.children, { scaleY: 1.8, duration: 0.22, repeat: -1, yoyo: true, stagger: 0.05, ease: 'sine.inOut' });
    };
    utterance.onend = () => {
      setSpeakingId('');
      const waveform = document.querySelector(`[data-wave="${id}"]`);
      if (waveform) {
        gsap.killTweensOf(waveform.children);
        gsap.set(waveform.children, { scaleY: 1 });
      }
    };
    utterance.onerror = () => {
      setSpeakingId('');
      const waveform = document.querySelector(`[data-wave="${id}"]`);
      if (waveform) {
        gsap.killTweensOf(waveform.children);
        gsap.set(waveform.children, { scaleY: 1 });
      }
      announce('O navegador não conseguiu reproduzir este áudio.');
    };
    window.speechSynthesis.speak(utterance);
  }, [announce]);

  const handleSelection = useCallback((event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => {
    const selected = window.getSelection();
    const text = selected?.toString().trim();
    if (!selected || !text || selected.isCollapsed || !entry) {
      setSelection(null);
      return;
    }
    if (event.target instanceof Element && event.target.closest('.da-highlight-menu')) return;
    const container = selected.anchorNode instanceof Element
      ? selected.anchorNode
      : selected.anchorNode?.parentElement;
    if (!container?.closest('.da-selectable')) return;
    const bounds = selected.getRangeAt(0).getBoundingClientRect();
    const x = Math.max(160, Math.min(window.innerWidth - 160, bounds.left + bounds.width / 2));
    const desiredY = bounds.top > 56 ? bounds.top - 50 : bounds.bottom + 8;
    const y = Math.max(12, Math.min(window.innerHeight - 52, desiredY));
    setSelection({ text, x, y });
    event.stopPropagation();
  }, [entry]);

  const addHighlight = async (color: HighlightColor) => {
    if (!selection || !entry) return;
    const existing = highlights.find((item) =>
      item.word_key === entry.word_key &&
      item.highlighted_text.toLocaleLowerCase() === selection.text.toLocaleLowerCase(),
    );
    const highlight: UserHighlight = existing
      ? { ...existing, color_tag: color }
      : {
          id: crypto.randomUUID(),
          user_id: userId,
          word_key: entry.word_key,
          highlighted_text: selection.text,
          color_tag: color,
          created_at: new Date().toISOString(),
        };
    const updated = existing
      ? highlights.map((item) => item.id === existing.id ? highlight : item)
      : [highlight, ...highlights];
    setHighlights(updated);
    cacheHighlights(userId, updated);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
    if (userId === 'guest') {
      announce('Grifo salvo neste navegador. Entre na plataforma para sincronizá-lo com sua conta.');
      return;
    }
    try {
      await syncHighlightToSupabase(highlight);
      announce('Grifo salvo na sua conta.');
    } catch (error) {
      console.error('Não foi possível sincronizar o grifo com o Supabase:', error);
      announce('O grifo está neste navegador, mas não foi sincronizado com o Supabase.');
    }
  };

  const removeHighlight = async (highlight: UserHighlight) => {
    try {
      if (highlight.user_id !== 'guest') await deleteHighlightFromSupabase(highlight);
      const updated = highlights.filter((item) => item.id !== highlight.id);
      setHighlights(updated);
      cacheHighlights(userId, updated);
      announce('Grifo removido.');
    } catch (error) {
      console.error('Não foi possível remover o grifo do Supabase:', error);
      announce('Não foi possível remover o grifo da sua conta. Tente novamente.');
    }
  };

  const exportReviewGuide = async () => {
    const guide = highlights.length
      ? highlights.map((item) => `${item.word_key} — ${colorNames[item.color_tag]}\n“${item.highlighted_text}”`).join('\n\n')
      : 'Seu caderno ainda não tem grifos.';
    try {
      await navigator.clipboard.writeText(`DICTIONARY ACTION — GUIA DE REVISÃO\n\n${guide}`);
      announce('Guia de revisão copiado para a área de transferência.');
    } catch (error) {
      console.error('Não foi possível copiar o guia de revisão:', error);
      const blob = new Blob([`DICTIONARY ACTION — GUIA DE REVISÃO\n\n${guide}`], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'dictionary-action-guia-de-revisao.txt';
      link.click();
      URL.revokeObjectURL(link.href);
      announce('Guia de revisão baixado em arquivo de texto.');
    }
  };

  const shareStory = async () => {
    if (!storyRef.current || !entry) return;
    try {
      const image = await toPng(storyRef.current, { pixelRatio: 3, cacheBust: true });
      const response = await fetch(image);
      const file = new File([await response.blob()], `dictionary-action-${entry.word_key.replace(/\s+/g, '-')}.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `${entry.word} | Dictionary Action`, files: [file] });
        announce('Imagem compartilhada.');
      } else {
        const link = document.createElement('a');
        link.download = file.name;
        link.href = image;
        link.click();
        announce('Imagem do Story baixada.');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('Não foi possível gerar ou compartilhar o Story:', error);
      announce('Não foi possível gerar a imagem. Tente novamente.');
    }
  };

  const resultHighlights = entry ? getEntryHighlights(entry.word_key) : [];
  return (
    <main className="dictionary-action" ref={ambientRef} onMouseUp={handleSelection} onKeyUp={handleSelection}>
      <div className="da-ambient" aria-hidden="true">
        <div className="da-orb da-orb--one" />
        <div className="da-orb da-orb--two" />
        <div className="da-orb da-orb--three" />
      </div>

      <header className="da-header">
        <a className="da-brand" href="/" aria-label="Brazilian in Action">
          <span className="da-brand__mark" aria-hidden="true"><i /><i /><i /></span>
          <span className="da-brand__text"><strong>Dictionary</strong><span>Action</span></span>
        </a>
        <button className="da-button da-button--quiet" type="button" onClick={() => setDrawerOpen(true)}>
          <Bookmark size={16} strokeWidth={1.7} />
          <span>Meus Grifos &amp; Histórico</span>
          {highlights.length > 0 && <span className="da-count">{highlights.length}</span>}
        </button>
      </header>

      <section className={`da-search-area ${entry ? 'da-search-area--compact' : ''}`}>
        {!entry && (
          <div className="da-intro">
            <p className="da-eyebrow">BRAZILIAN IN ACTION · ENGLISH, IN CONTEXT</p>
            <h1>Entenda o que as palavras <em>realmente</em> dizem.</h1>
            <p>Nuance, pronúncia e contexto cultural — sem tradução ao pé da letra.</p>
          </div>
        )}
        <form className="da-search" onSubmit={(event) => { event.preventDefault(); void searchWord(query); }}>
          <Search size={19} strokeWidth={1.7} aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Busque uma palavra ou expressão"
            aria-label="Busque uma palavra ou expressão em inglês"
            autoComplete="off"
          />
          <button type="submit" disabled={isSearching || !query.trim()} aria-label="Pesquisar">
            {isSearching ? <span className="da-spinner" /> : <ChevronRight size={19} />}
          </button>
        </form>

        <div className="da-discovery">
          <div className="da-suggestion-row">
            <span className="da-suggestion-label">Sugestão</span>
            <button type="button" className="da-pill da-pill--suggestion" onClick={() => void searchWord(suggestionWord)}>
              Explorar nuance: <strong>{suggestionWord}</strong><ChevronRight size={13} />
            </button>
          </div>
          <div className="da-scenarios" aria-label="Explorar por situação">
            {scenarioFilters.map((scenario) => (
              <button
                type="button"
                key={scenario.value}
                className={`da-pill ${activeScenario === scenario.value ? 'is-selected' : ''}`}
                onClick={() => setActiveScenario(activeScenario === scenario.value ? '' : scenario.value)}
                aria-pressed={activeScenario === scenario.value}
              >
                {scenario.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {entry && (
        <section className="da-result-wrap">
          <article className="da-result glass-panel" ref={entryRef}>
            <div className="da-result__top">
              <div>
                <p className="da-eyebrow">RAIO-X CULTURAL</p>
                <div className="da-word-line">
                  <h2>{entry.word}</h2>
                  {entry.grammatical_roles[0]?.ipa && <span className="da-ipa">{entry.grammatical_roles[0].ipa}</span>}
                </div>
                <span className="da-result__meta">Inglês americano <span className="da-dot" /> {entry.grammatical_roles.length} {entry.grammatical_roles.length === 1 ? 'uso gramatical' : 'usos gramaticais'}</span>
              </div>
              <button className="da-icon-button" type="button" onClick={() => setShareOpen(true)} aria-label="Compartilhar em um Story">
                <Share2 size={18} strokeWidth={1.7} />
              </button>
            </div>

            {notices.length > 0 && (
              <div className="da-notices" role="status">{notices.map((notice) => <p key={notice}>{notice}</p>)}</div>
            )}

            <div className="da-result-grid">
              <section className="da-section da-section--roles">
                <div className="da-section__heading"><span className="da-index">01</span><h3>Camaleão gramatical</h3></div>
                <p className="da-section__intro">Um termo, mais de uma intenção. Escute a diferença.</p>
                <div className="da-roles">
                  {entry.grammatical_roles.map((role, index) => {
                    const audioId = `role-${entry.word_key}-${index}`;
                    return (
                      <div className="da-role" key={`${role.label}-${index}`}>
                        <div className="da-role__copy">
                          <span className="da-role__label">{role.label}</span>
                          {role.ipa && <span className="da-ipa">{displayPronunciation(entry, role)}</span>}
                          <p className="da-selectable"><HighlightedText text={role.meaning} highlights={resultHighlights} /></p>
                          {role.pronunciationTip && <p className="da-role__tip da-selectable"><HighlightedText text={role.pronunciationTip} highlights={resultHighlights} /></p>}
                        </div>
                        <div className="da-audio-controls">
                          <span className={`da-wave ${speakingId === audioId ? 'is-speaking' : ''}`} data-wave={audioId} aria-hidden="true"><i /><i /><i /><i /><i /></span>
                          <button type="button" onClick={() => speak(entry.word === 'close' ? role.label === 'Verbo' ? 'Please close the door.' : 'The hotel is close to the station.' : entry.word, 1, audioId)} aria-label={`Ouvir ${role.label}, velocidade normal`}><Volume2 size={15} /> 1.0</button>
                          <button type="button" onClick={() => speak(entry.word === 'close' ? role.label === 'Verbo' ? 'Please close the door.' : 'The hotel is close to the station.' : entry.word, 0.75, audioId)} aria-label={`Ouvir ${role.label}, velocidade pausada`}>0.75</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="da-body-copy da-selectable"><HighlightedText text={entry.phonetic_tips} highlights={resultHighlights} /></p>
              </section>

              <section className="da-section">
                <div className="da-section__heading"><span className="da-index">02</span><h3>Escuta conectada</h3></div>
                <p className="da-section__intro">Do inglês escrito ao ritmo da vida real.</p>
                <div className="da-speech-pair">
                  <div className="da-speech-line">
                    <span>FORMA ESCRITA</span>
                    <p className="da-selectable"><HighlightedText text={entry.connected_speech.formal} highlights={resultHighlights} /></p>
                    <button className="da-text-audio" type="button" onClick={() => speak(entry.connected_speech.formal, 1, 'speech-formal')} aria-label="Ouvir forma escrita"><Volume2 size={14} /> Ouvir</button>
                  </div>
                  <div className="da-speech-line da-speech-line--natural">
                    <span>NA CONVERSA</span>
                    <p className="da-selectable"><HighlightedText text={entry.connected_speech.natural} highlights={resultHighlights} /></p>
                    <button className="da-text-audio" type="button" onClick={() => speak(entry.connected_speech.natural, 0.85, 'speech-natural')} aria-label="Ouvir forma natural"><Volume2 size={14} /> Ouvir</button>
                  </div>
                </div>
                <p className="da-body-copy da-selectable"><HighlightedText text={entry.connected_speech.meaning} highlights={resultHighlights} /></p>
              </section>

              <section className="da-section da-section--wide">
                <div className="da-section__heading"><span className="da-index">03</span><h3>Como os nativos realmente usam</h3></div>
                <p className="da-prose da-selectable"><HighlightedText text={entry.cultural_usage} highlights={resultHighlights} /></p>
              </section>

              <section className="da-section">
                <div className="da-section__heading"><span className="da-index">04</span><h3>Por que o brasileiro erra aqui</h3></div>
                <p className="da-prose da-selectable"><HighlightedText text={entry.brazilian_pitfalls} highlights={resultHighlights} /></p>
                {entry.false_twin_comparison.otherWord && (
                  <button className="da-pill da-pill--false-twin" type="button" onClick={() => setShowComparison(!showComparison)} aria-expanded={showComparison}>
                    Não confunda com <strong>{entry.false_twin_comparison.otherWord}</strong>
                    <ChevronRight className={showComparison ? 'is-rotated' : ''} size={14} />
                  </button>
                )}
              </section>

              <section className="da-section">
                <div className="da-section__heading"><span className="da-index">05</span><h3>Temperatura social</h3></div>
                <div className={`da-temperature da-temperature--${entry.social_temp}`} aria-label={`Tom social: ${entry.social_temp}`}>
                  <div className="da-temperature__track"><span className="da-temperature__fill" /></div>
                  <div className="da-temperature__labels"><span>Corporativo</span><span>Neutro</span><span>Informal / Amigos</span><span>Alerta de risco</span></div>
                  <p>{entry.social_temp === 'corporate' ? 'Profissional' : entry.social_temp === 'informal' ? 'Informal' : entry.social_temp === 'risk' ? 'Atenção ao contexto' : 'Neutro e versátil'}</p>
                </div>
              </section>

              <section className="da-section da-section--wide">
                <div className="da-section__heading"><span className="da-index">06</span><h3>Combinações naturais</h3></div>
                <p className="da-section__intro">Palavras que aparecem juntas com frequência.</p>
                {collocations.length > 0 ? (
                  <div className="da-collocations">
                    {collocations.map((word) => <button type="button" className="da-pill" key={word} onClick={() => void searchWord(word)}>{word}</button>)}
                  </div>
                ) : (
                  <p className="da-muted">Sem combinações disponíveis para esta busca.</p>
                )}
              </section>

              {showComparison && entry.false_twin_comparison.otherWord && (
                <section className="da-comparison da-section--wide" aria-label={`Comparação entre ${entry.word} e ${entry.false_twin_comparison.otherWord}`}>
                  <div className="da-comparison__column"><span>{entry.word}</span>                  <p className="da-selectable"><HighlightedText text={entry.false_twin_comparison.searchedWordUsage} highlights={resultHighlights} /></p></div>
                  <div className="da-comparison__divider" />
                  <div className="da-comparison__column"><span>{entry.false_twin_comparison.otherWord}</span>                  <p className="da-selectable"><HighlightedText text={entry.false_twin_comparison.otherWordUsage} highlights={resultHighlights} /></p></div>
                </section>
              )}
            </div>

            <section className="da-examples">
              <div className="da-section__heading"><span className="da-index">+</span><h3>Em uma frase</h3></div>
              <div className="da-examples__list">
                {entry.examples_json.map((example, index) => (
                  <div className="da-example" key={`${example.sentence}-${index}`}>
                    <p className="da-example__sentence da-selectable"><HighlightedText text={example.sentence} highlights={resultHighlights} /></p>
                    <p className="da-example__translation da-selectable"><HighlightedText text={example.translation} highlights={resultHighlights} /></p>
                    <button className="da-example__audio" type="button" onClick={() => speak(example.sentence, 0.95, `example-${index}`)} aria-label="Ouvir exemplo"><Volume2 size={14} /></button>
                  </div>
                ))}
              </div>
            </section>
          </article>
        </section>
      )}

      {selection && (
        <div className="da-highlight-menu" style={{ left: selection.x, top: selection.y }} role="toolbar" aria-label="Opções de grifo">
          <span>Grifar</span>
          <button type="button" className="da-color-button da-color-button--cyan" onClick={() => void addHighlight('cyan')} aria-label="Grifar como expressão-chave" title="Expressão-chave" />
          <button type="button" className="da-color-button da-color-button--amber" onClick={() => void addHighlight('amber')} aria-label="Grifar como pegadinha ou cuidado" title="Pegadinha ou cuidado" />
          <button type="button" className="da-color-button da-color-button--emerald" onClick={() => void addHighlight('emerald')} aria-label="Grifar para usar na fala" title="Usar na fala" />
          <button className="da-highlight-menu__xray" type="button" onClick={() => void searchWord(selection.text.split(/\s+/)[0])}>Ver Raio-X</button>
          <button type="button" className="da-highlight-menu__close" onClick={() => setSelection(null)} aria-label="Fechar menu"><X size={14} /></button>
        </div>
      )}

      {drawerOpen && (
        <div className="da-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setDrawerOpen(false); }}>
          <aside className="da-drawer glass-panel" aria-label="Meus Grifos e Histórico">
            <div className="da-drawer__header">
              <div><p className="da-eyebrow">SEU CADERNO DE BOLSO</p><h2>Meus Grifos &amp; Histórico</h2></div>
              <button className="da-icon-button" type="button" onClick={() => setDrawerOpen(false)} aria-label="Fechar gaveta"><X size={18} /></button>
            </div>
            <button className="da-review-button" type="button" onClick={() => setReviewOpen(true)}>
              <Bookmark size={16} /><span>Gerar Guia de Revisão</span><ChevronRight size={16} />
            </button>
            <section className="da-drawer__section">
              <div className="da-drawer__section-title"><Bookmark size={15} /><h3>Grifos salvos</h3><span>{highlights.length}</span></div>
              {highlights.length ? (
                <div className="da-saved-list">
                  {highlights.map((highlight) => (
                    <article className="da-saved-item" key={highlight.id}>
                      <button type="button" className="da-saved-item__main" onClick={() => { setDrawerOpen(false); void searchWord(highlight.word_key); }}>
                        <span className="da-saved-item__word">{highlight.word_key}</span>
                        <span className={`da-highlight da-highlight--${highlight.color_tag}`}>{highlight.highlighted_text}</span>
                        <small>{colorNames[highlight.color_tag]}</small>
                      </button>
                      <button className="da-icon-button da-icon-button--small" type="button" onClick={() => void removeHighlight(highlight)} aria-label={`Remover grifo de ${highlight.word_key}`}><Trash2 size={14} /></button>
                    </article>
                  ))}
                </div>
              ) : <p className="da-muted">Selecione uma frase no Raio-X para guardar seu primeiro grifo.</p>}
            </section>
            <section className="da-drawer__section">
              <div className="da-drawer__section-title"><Clock3 size={15} /><h3>Explorados recentemente</h3></div>
              {history.length ? (
                <div className="da-history-list">
                  {history.map((word) => <button type="button" key={word} onClick={() => { setDrawerOpen(false); void searchWord(word); }}>{word}<ChevronRight size={14} /></button>)}
                </div>
              ) : <p className="da-muted">Suas buscas aparecerão aqui.</p>}
            </section>
          </aside>
        </div>
      )}

      {reviewOpen && (
        <div className="da-overlay da-overlay--center" onMouseDown={(event) => { if (event.target === event.currentTarget) setReviewOpen(false); }}>
          <section className="da-modal glass-panel" role="dialog" aria-modal="true" aria-labelledby="da-review-title">
            <div className="da-modal__header"><div><p className="da-eyebrow">CADERNO DE BOLSO</p><h2 id="da-review-title">Guia de revisão</h2></div><button className="da-icon-button" type="button" onClick={() => setReviewOpen(false)} aria-label="Fechar guia"><X size={18} /></button></div>
            <div className="da-review-content">
              {highlights.length ? highlights.map((highlight) => (
                <article key={highlight.id}>
                  <span>{highlight.word_key} <small>{colorNames[highlight.color_tag]}</small></span>
                  <p className={`da-highlight da-highlight--${highlight.color_tag}`}>{highlight.highlighted_text}</p>
                </article>
              )) : <p className="da-muted">Seus grifos vão aparecer aqui para uma revisão rápida.</p>}
            </div>
            <button className="da-review-button da-review-button--export" type="button" onClick={() => void exportReviewGuide()}><Download size={15} /> Copiar ou baixar texto</button>
          </section>
        </div>
      )}

      {shareOpen && entry && (
        <div className="da-overlay da-overlay--center" onMouseDown={(event) => { if (event.target === event.currentTarget) setShareOpen(false); }}>
          <section className="da-modal da-share-modal glass-panel" role="dialog" aria-modal="true" aria-labelledby="da-share-title">
            <div className="da-modal__header"><div><p className="da-eyebrow">COMPARTILHE UMA DESCOBERTA</p><h2 id="da-share-title">Seu próximo Story</h2></div><button className="da-icon-button" type="button" onClick={() => setShareOpen(false)} aria-label="Fechar compartilhamento"><X size={18} /></button></div>
            <div className="da-story-preview">
              <div className="da-story-card" ref={storyRef}>
                <div className="da-story-card__brand"><span className="da-brand__mark" aria-hidden="true"><i /><i /><i /></span><span>BRAZILIAN IN ACTION</span></div>
                <span className="da-story-card__label">DICTIONARY ACTION</span>
                <div className="da-story-card__word"><h3>{entry.word}</h3><span>{entry.grammatical_roles[0]?.ipa || 'English, in context'}</span></div>
                <div className="da-story-card__insight"><span>O QUE PARECE VS. O QUE É</span><p>{entry.brazilian_pitfalls}</p></div>
                {resultHighlights[0] && <blockquote>“{resultHighlights[0].highlighted_text}”</blockquote>}
                <div className="da-story-card__footer"><span>ESTUDADO POR <strong>{studentName}</strong></span><span>{history.length} {history.length === 1 ? 'palavra explorada' : 'palavras exploradas'}</span></div>
              </div>
            </div>
            <p className="da-muted da-share-hint">O card será exportado como imagem vertical 9:16 em alta resolução.</p>
            <button className="da-review-button da-review-button--export" type="button" onClick={() => void shareStory()}><Share2 size={15} /> Compartilhar ou baixar PNG</button>
          </section>
        </div>
      )}

      {feedback && <div className="da-toast" role="status"><Check size={16} />{feedback}</div>}
      <footer className="da-footer"><span>DICTIONARY ACTION</span><span>Feito para aprender inglês em contexto</span><a href="/" aria-label="Voltar ao Brazilian in Action"><ArrowLeft size={14} /> Brazilian in Action</a></footer>
    </main>
  );
}
