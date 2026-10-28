import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Inbox,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Save,
  Search,
} from 'lucide-react';
import {
  classifyStudentFeedback,
  loadAllStudentFeedback,
  StudentFeedbackRecord,
  StudentFeedbackTriage,
  updateStudentFeedback,
} from '../utils/supabaseClient';

type FeedbackStatusFilter = 'all' | StudentFeedbackRecord['status'];
type FeedbackSort = 'oldest' | 'newest' | 'priority';

const STATUS_LABELS: Record<StudentFeedbackRecord['status'], string> = {
  new: 'Novo',
  reviewing: 'Em análise',
  answered: 'Respondido',
};

const CATEGORY_LABELS: Record<StudentFeedbackTriage['category'], string> = {
  access: 'Acesso / login',
  payment: 'Pagamento',
  technical: 'Problema técnico',
  content: 'Conteúdo / aulas',
  suggestion: 'Sugestão',
  other: 'Outro',
};

const PRIORITY_LABELS: Record<StudentFeedbackTriage['priority'], string> = {
  high: 'Alta',
  normal: 'Normal',
  low: 'Baixa',
};

const LEGACY_ANSWERS: Array<{ key: keyof StudentFeedbackRecord['answers']; question: string }> = [
  { key: 'platform', question: 'O que está achando da plataforma?' },
  { key: 'improve', question: 'Como podemos melhorar?' },
  { key: 'expectations', question: 'O que espera encontrar na plataforma?' },
  { key: 'other', question: 'Outros comentários' },
];

const getFeedbackText = (item: StudentFeedbackRecord) => item.answers.message?.trim() || LEGACY_ANSWERS
  .map(({ key }) => item.answers[key]?.trim())
  .filter(Boolean)
  .join('\n');

const getFeedbackStatus = (item: StudentFeedbackRecord): StudentFeedbackRecord['status'] =>
  item.admin_reply?.trim() ? 'answered' : item.status;

const formatDate = (date: string, includeTime = false) => new Date(date).toLocaleString('pt-BR', includeTime
  ? { dateStyle: 'short', timeStyle: 'short' }
  : { dateStyle: 'short' });

export const AdminFeedbackPanel: React.FC = () => {
  const [feedback, setFeedback] = useState<StudentFeedbackRecord[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { status: StudentFeedbackRecord['status']; reply: string }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [classifyingId, setClassifyingId] = useState<string | null>(null);
  const [classifications, setClassifications] = useState<Record<string, StudentFeedbackTriage>>({});
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FeedbackStatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<StudentFeedbackTriage['category'] | 'all'>('all');
  const [sort, setSort] = useState<FeedbackSort>('oldest');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const records = await loadAllStudentFeedback();
      setFeedback(records);
      setDrafts(Object.fromEntries(records.map((item) => [item.id, {
        status: getFeedbackStatus(item),
        reply: item.admin_reply || '',
      }])));
    } catch (error) {
      console.error('Could not load student feedback for CEO:', error);
      setMessage({
        text: error instanceof Error ? error.message : 'Não foi possível carregar os feedbacks.',
        error: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const counts = useMemo(() => ({
    all: feedback.length,
    new: feedback.filter((item) => getFeedbackStatus(item) === 'new').length,
    reviewing: feedback.filter((item) => getFeedbackStatus(item) === 'reviewing').length,
    answered: feedback.filter((item) => getFeedbackStatus(item) === 'answered').length,
  }), [feedback]);

  const filteredFeedback = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');
    const filtered = feedback.filter((item) => {
      const matchesStatus = statusFilter === 'all' || getFeedbackStatus(item) === statusFilter;
      const matchesCategory = categoryFilter === 'all' || classifications[item.id]?.category === categoryFilter;
      const searchableText = [
        item.student_name,
        item.student_email,
        getFeedbackText(item),
      ].join('\n').toLocaleLowerCase('pt-BR');
      return matchesStatus && matchesCategory && (!normalizedSearch || searchableText.includes(normalizedSearch));
    });

    return filtered.sort((left, right) => {
      const statusOrder = Number(getFeedbackStatus(left) === 'answered') - Number(getFeedbackStatus(right) === 'answered');
      if (statusOrder !== 0) return statusOrder;

      if (sort === 'priority') {
        const priorityRank: Record<StudentFeedbackTriage['priority'], number> = { high: 0, normal: 1, low: 2 };
        const leftRank = classifications[left.id] ? priorityRank[classifications[left.id].priority] : 3;
        const rightRank = classifications[right.id] ? priorityRank[classifications[right.id].priority] : 3;
        if (leftRank !== rightRank) return leftRank - rightRank;
      }

      const dateOrder = new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
      return sort === 'newest' ? -dateOrder : dateOrder;
    });
  }, [categoryFilter, classifications, feedback, search, sort, statusFilter]);

  const selectedFeedback = filteredFeedback.find((item) => item.id === selectedId) || filteredFeedback[0] || null;

  const handleSave = async (item: StudentFeedbackRecord) => {
    const draft = drafts[item.id];
    if (!draft) return;
    const reply = draft.reply.trim();
    const status = reply ? 'answered' : draft.status === 'answered' ? 'reviewing' : draft.status;
    setSavingId(item.id);
    setMessage(null);
    try {
      await updateStudentFeedback(item.id, {
        status,
        admin_reply: reply || null,
      });
      setFeedback((previous) => previous.map((record) => record.id === item.id
        ? { ...record, status, admin_reply: reply || null, updated_at: new Date().toISOString() }
        : record));
      setDrafts((previous) => ({
        ...previous,
        [item.id]: { ...draft, status, reply },
      }));
      setMessage({ text: reply ? 'Resposta enviada. O feedback foi movido para Respondidos.' : 'Acompanhamento salvo.' });
    } catch (error) {
      console.error('Could not save the feedback response:', error);
      setMessage({
        text: error instanceof Error ? error.message : 'Não foi possível salvar a resposta.',
        error: true,
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleClassify = async (item: StudentFeedbackRecord) => {
    const text = getFeedbackText(item);
    if (!text) return;

    setClassifyingId(item.id);
    setMessage(null);
    try {
      const classification = await classifyStudentFeedback(text);
      setClassifications((previous) => ({ ...previous, [item.id]: classification }));
    } catch (error) {
      console.error('Could not classify student feedback:', error);
      setMessage({
        text: error instanceof Error ? error.message : 'Não foi possível classificar este feedback.',
        error: true,
      });
    } finally {
      setClassifyingId(null);
    }
  };

  const renderStatus = (item: StudentFeedbackRecord) => {
    const status = getFeedbackStatus(item);
    const color = status === 'answered'
      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
      : status === 'reviewing'
        ? 'border-amber-400/30 bg-amber-400/10 text-amber-200'
        : 'border-sky-400/30 bg-sky-400/10 text-sky-200';
    return (
      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${color}`}>
        {STATUS_LABELS[status]}
      </span>
    );
  };

  const renderDetails = (item: StudentFeedbackRecord) => {
    const draft = drafts[item.id];
    const classification = classifications[item.id];
    const hasMessage = Boolean(item.answers.message?.trim());

    return (
      <div className="space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white">{item.student_name}</h3>
            <a className="text-xs text-white/55 underline underline-offset-2" href={`mailto:${item.student_email}`}>
              {item.student_email}
            </a>
          </div>
          <div className="text-right">
            {renderStatus(item)}
            <time className="mt-1 block text-xs text-white/45" dateTime={item.created_at}>
              {formatDate(item.created_at, true)}
            </time>
          </div>
        </header>

        <div className="space-y-4">
          {hasMessage ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">{item.answers.message}</p>
          ) : LEGACY_ANSWERS.map(({ key, question }) => item.answers[key] && (
            <p key={key} className="whitespace-pre-wrap text-sm leading-relaxed text-white/75">
              <span className="block text-xs font-semibold text-white/50">{question}</span>
              {item.answers[key]}
            </p>
          ))}
        </div>

        <section className="rounded-xl border border-violet-400/20 bg-violet-400/[0.05] p-3">
          <p className="mb-3 text-xs leading-relaxed text-white/50">
            A classificação é uma sugestão automática. Apenas o texto da mensagem é enviado ao Jev da TypeSafe; nome e e-mail não são enviados.
          </p>
          {classification && (
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-white/10 px-2 py-1 text-white/80">
                {CATEGORY_LABELS[classification.category]}
              </span>
              <span className={`rounded-full border px-2 py-1 font-semibold ${
                classification.priority === 'high'
                  ? 'border-red-400/30 bg-red-400/10 text-red-200'
                  : classification.priority === 'normal'
                    ? 'border-amber-400/30 bg-amber-400/10 text-amber-200'
                    : 'border-white/10 bg-white/5 text-white/65'
              }`}>
                Prioridade {PRIORITY_LABELS[classification.priority]}
              </span>
              <span className="text-white/45">
                Confiança {Math.round(classification.categoryConfidence * 100)}% / {Math.round(classification.priorityConfidence * 100)}%
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => void handleClassify(item)}
            disabled={classifyingId === item.id || !getFeedbackText(item)}
            className="inline-flex items-center gap-2 rounded-lg border border-violet-300/20 px-3 py-1.5 text-xs font-semibold text-violet-100 hover:bg-violet-300/10 disabled:opacity-50"
          >
            {classifyingId === item.id && <Loader2 size={13} className="animate-spin" />}
            {classifyingId === item.id ? 'Classificando...' : classification ? 'Classificar novamente' : 'Classificar com Jev'}
          </button>
        </section>

        {item.admin_reply && (
          <section className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-emerald-200">Resposta enviada</p>
            <p className="whitespace-pre-wrap text-sm text-white/80">{item.admin_reply}</p>
          </section>
        )}

        {draft && (
          <div className="grid gap-3 border-t border-white/10 pt-4">
            <label className="text-xs font-semibold text-white/70 sm:max-w-xs">
              Status
              <select
                value={draft.status}
                onChange={(event) => setDrafts((previous) => ({
                  ...previous,
                  [item.id]: { ...draft, status: event.target.value as StudentFeedbackRecord['status'] },
                }))}
                className="mt-1 block w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white"
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-white/70">
              Resposta privada para o aluno
              <textarea
                value={draft.reply}
                onChange={(event) => setDrafts((previous) => ({
                  ...previous,
                  [item.id]: { ...draft, reply: event.target.value },
                }))}
                maxLength={2000}
                rows={4}
                className="mt-1 block w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                placeholder="Somente este aluno verá sua resposta..."
              />
            </label>
            <button
              type="button"
              onClick={() => void handleSave(item)}
              disabled={savingId === item.id}
              className="inline-flex w-fit items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-xs font-bold text-black disabled:opacity-50"
            >
              {savingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {savingId === item.id ? 'Salvando...' : getFeedbackStatus(item) === 'answered' ? 'Atualizar resposta' : 'Salvar acompanhamento'}
            </button>
          </div>
        )}
      </div>
    );
  };

  const statCards: Array<{ status: FeedbackStatusFilter; label: string; count: number; icon: React.ReactNode; color: string }> = [
    { status: 'all', label: 'Todos', count: counts.all, icon: <Inbox size={16} />, color: 'text-white/85' },
    { status: 'new', label: 'Novos', count: counts.new, icon: <MessageSquareText size={16} />, color: 'text-sky-200' },
    { status: 'reviewing', label: 'Em análise', count: counts.reviewing, icon: <Clock3 size={16} />, color: 'text-amber-200' },
    { status: 'answered', label: 'Respondidos', count: counts.answered, icon: <CheckCircle2 size={16} />, color: 'text-emerald-200' },
  ];

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-neutral-950/70 p-4 sm:p-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <MessageSquareText size={19} className="text-amber-300" />
            Feedback dos alunos
          </h2>
          <p className="mt-1 text-xs text-white/50">Respostas privadas, visíveis apenas à equipe autorizada e ao próprio aluno.</p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/5 disabled:opacity-50"
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Atualizar
        </button>
      </header>

      {message && (
        <p role={message.error ? 'alert' : 'status'} className={`mb-4 text-sm ${message.error ? 'text-red-300' : 'text-emerald-300'}`}>
          {message.text}
        </p>
      )}

      {!isLoading && feedback.length > 0 && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {statCards.map((card) => (
              <button
                key={card.status}
                type="button"
                onClick={() => setStatusFilter(card.status)}
                aria-pressed={statusFilter === card.status}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  statusFilter === card.status
                    ? 'border-amber-300/40 bg-amber-300/[0.08]'
                    : 'border-white/10 bg-white/[0.025] hover:bg-white/[0.06]'
                }`}
              >
                <span className={`flex items-center gap-2 text-xs font-semibold ${card.color}`}>{card.icon}{card.label}</span>
                <span className="mt-1 block text-xl font-bold text-white">{card.count}</span>
              </button>
            ))}
          </div>

          <div className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <label className="relative block">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por aluno, e-mail ou mensagem..."
                className="w-full rounded-lg border border-white/10 bg-black/25 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/25"
              />
            </label>
            <label className="sr-only" htmlFor="feedback-category-filter">Filtrar por categoria</label>
            <select
              id="feedback-category-filter"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value as StudentFeedbackTriage['category'] | 'all')}
              className="rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white"
            >
              <option value="all">Todas as categorias</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <label className="sr-only" htmlFor="feedback-sort">Ordenar feedbacks</label>
            <select
              id="feedback-sort"
              value={sort}
              onChange={(event) => setSort(event.target.value as FeedbackSort)}
              className="rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white"
            >
              <option value="oldest">Mais antigos primeiro</option>
              <option value="newest">Mais recentes primeiro</option>
              <option value="priority">Prioridade da triagem</option>
            </select>
          </div>
        </>
      )}

      {isLoading ? (
        <p className="text-sm text-white/55">Carregando feedbacks...</p>
      ) : feedback.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.025] p-4 text-sm text-white/55">
          Ainda não há feedbacks enviados.
        </p>
      ) : filteredFeedback.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.025] p-4 text-sm text-white/55">
          Nenhum feedback corresponde a essa busca e aos filtros selecionados.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(250px,0.8fr)_minmax(0,1.4fr)]">
          <nav aria-label="Lista de feedbacks" className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
            {filteredFeedback.map((item) => {
              const isSelected = selectedFeedback?.id === item.id;
              const classification = classifications[item.id];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  aria-pressed={isSelected}
                  className={`block w-full rounded-xl border p-3 text-left transition-colors ${
                    isSelected
                      ? 'border-amber-300/40 bg-amber-300/[0.08]'
                      : 'border-white/10 bg-white/[0.025] hover:bg-white/[0.06]'
                  }`}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-white">{item.student_name}</span>
                    {renderStatus(item)}
                  </span>
                  <span className="mt-1 block truncate text-xs text-white/45">{item.student_email}</span>
                  <span className="mt-2 block text-xs leading-relaxed text-white/65">
                    {getFeedbackText(item).replace(/\s+/g, ' ').slice(0, 120) || 'Sem mensagem'}
                    {getFeedbackText(item).length > 120 ? '…' : ''}
                  </span>
                  <span className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-white/40">
                    <time dateTime={item.created_at}>{formatDate(item.created_at)}</time>
                    {classification && (
                      <span className="rounded-full border border-violet-300/20 px-2 py-0.5 text-violet-200">
                        {CATEGORY_LABELS[classification.category]} · {PRIORITY_LABELS[classification.priority]}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </nav>

          {selectedFeedback && (
            <article className="min-w-0 rounded-xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
              {renderDetails(selectedFeedback)}
            </article>
          )}
        </div>
      )}
    </section>
  );
};
