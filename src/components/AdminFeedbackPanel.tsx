import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, MessageSquareText, RefreshCw, Save } from 'lucide-react';
import {
  loadAllStudentFeedback,
  StudentFeedbackRecord,
  updateStudentFeedback,
} from '../utils/supabaseClient';

const STATUS_LABELS: Record<StudentFeedbackRecord['status'], string> = {
  new: 'Novo',
  reviewing: 'Em análise',
  answered: 'Respondido',
};

export const AdminFeedbackPanel: React.FC = () => {
  const [feedback, setFeedback] = useState<StudentFeedbackRecord[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { status: StudentFeedbackRecord['status']; reply: string }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const records = await loadAllStudentFeedback();
      setFeedback(records);
      setDrafts(Object.fromEntries(records.map((item) => [item.id, {
        status: item.admin_reply?.trim() ? 'answered' : item.status,
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

  const hasReply = (item: StudentFeedbackRecord) => Boolean(item.admin_reply?.trim());
  const isAnswered = (item: StudentFeedbackRecord) => item.status === 'answered' || hasReply(item);
  const awaitingReply = feedback.filter((item) => !isAnswered(item));
  const answered = feedback.filter(isAnswered);
  const renderFeedbackCard = (item: StudentFeedbackRecord) => {
    const draft = drafts[item.id];
    return (
      <article key={item.id} className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
        <header className="flex flex-wrap items-start justify-between gap-2 border-b border-white/10 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white">{item.student_name}</h3>
            <a className="text-xs text-white/55 underline underline-offset-2" href={`mailto:${item.student_email}`}>
              {item.student_email}
            </a>
          </div>
          <div className="text-right">
            <span className={`mb-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${
              isAnswered(item)
                ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                : item.status === 'reviewing'
                  ? 'border-amber-400/30 bg-amber-400/10 text-amber-200'
                  : 'border-sky-400/30 bg-sky-400/10 text-sky-200'
            }`}>{isAnswered(item) ? STATUS_LABELS.answered : STATUS_LABELS[item.status]}</span>
            <time className="block text-xs text-white/40" dateTime={item.created_at}>
              {new Date(item.created_at).toLocaleString('pt-BR')}
            </time>
          </div>
        </header>

        <div className="space-y-3 py-4">
          {item.answers.message ? (
            <p className="whitespace-pre-wrap text-sm text-white/75">{item.answers.message}</p>
          ) : (
            [
              ['O que está achando da plataforma?', item.answers.platform],
              ['Como podemos melhorar?', item.answers.improve],
              ['O que espera encontrar na plataforma?', item.answers.expectations],
              ['Outros comentários', item.answers.other],
            ].map(([question, answer]) => answer && (
              <p key={question} className="whitespace-pre-wrap text-sm text-white/75">
                <span className="font-semibold text-white/90">{question} </span>
                {answer}
              </p>
            ))
          )}
        </div>

        {item.admin_reply && (
          <div className="mb-4 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] p-3">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-emerald-200">Sua resposta enviada</p>
            <p className="whitespace-pre-wrap text-sm text-white/80">{item.admin_reply}</p>
          </div>
        )}

        {draft && (
          <div className="grid gap-3 border-t border-white/10 pt-4">
            <label className="max-w-xs text-xs font-semibold text-white/70">
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
              Resposta do CEO para este aluno (privada)
              <textarea
                value={draft.reply}
                onChange={(event) => setDrafts((previous) => ({
                  ...previous,
                  [item.id]: { ...draft, reply: event.target.value },
                }))}
                maxLength={2000}
                rows={3}
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
              {savingId === item.id ? 'Salvando...' : isAnswered(item) ? 'Atualizar resposta' : 'Enviar resposta'}
            </button>
          </div>
        )}
      </article>
    );
  };

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-neutral-950/70 p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
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
      </div>

      {message && (
        <p role={message.error ? 'alert' : 'status'} className={`mb-4 text-sm ${message.error ? 'text-red-300' : 'text-emerald-300'}`}>
          {message.text}
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-white/55">Carregando feedbacks...</p>
      ) : feedback.length === 0 ? (
        <p className="text-sm text-white/55">Ainda não há feedbacks enviados.</p>
      ) : (
        <div className="space-y-8">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-amber-200">A responder / em análise</h3>
              <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-xs font-bold text-amber-100">{awaitingReply.length}</span>
            </div>
            {awaitingReply.length ? (
              <div className="space-y-4">{awaitingReply.map(renderFeedbackCard)}</div>
            ) : (
              <p className="rounded-xl border border-white/10 bg-white/[0.025] p-4 text-sm text-white/50">Nenhum feedback aguardando resposta.</p>
            )}
          </section>
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-emerald-200">Respondidos</h3>
              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-xs font-bold text-emerald-100">{answered.length}</span>
            </div>
            {answered.length ? (
              <div className="space-y-4">{answered.map(renderFeedbackCard)}</div>
            ) : (
              <p className="rounded-xl border border-white/10 bg-white/[0.025] p-4 text-sm text-white/50">Ainda não há feedbacks respondidos.</p>
            )}
          </section>
        </div>
      )}
    </section>
  );
};
