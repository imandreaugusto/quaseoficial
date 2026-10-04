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
        status: item.status,
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
    setSavingId(item.id);
    setMessage(null);
    try {
      await updateStudentFeedback(item.id, {
        status: draft.status,
        admin_reply: draft.reply.trim() || null,
      });
      setFeedback((previous) => previous.map((record) => record.id === item.id
        ? { ...record, status: draft.status, admin_reply: draft.reply.trim() || null, updated_at: new Date().toISOString() }
        : record));
      setMessage({ text: 'Status e resposta salvos.' });
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
        <div className="space-y-4">
          {feedback.map((item) => {
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
                  <time className="text-xs text-white/40" dateTime={item.created_at}>
                    {new Date(item.created_at).toLocaleString('pt-BR')}
                  </time>
                </header>

                <div className="space-y-3 py-4">
                  {[
                    ['O que está achando da plataforma?', item.answers.platform],
                    ['Como podemos melhorar?', item.answers.improve],
                    ['O que espera encontrar na plataforma?', item.answers.expectations],
                    ['Outros comentários', item.answers.other],
                  ].map(([question, answer]) => answer && (
                    <p key={question} className="whitespace-pre-wrap text-sm text-white/75">
                      <span className="font-semibold text-white/90">{question} </span>
                      {answer}
                    </p>
                  ))}
                </div>

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
                      Resposta para o aluno (opcional)
                      <textarea
                        value={draft.reply}
                        onChange={(event) => setDrafts((previous) => ({
                          ...previous,
                          [item.id]: { ...draft, reply: event.target.value },
                        }))}
                        maxLength={2000}
                        rows={3}
                        className="mt-1 block w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                        placeholder="Escreva uma resposta para o aluno..."
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void handleSave(item)}
                      disabled={savingId === item.id}
                      className="inline-flex w-fit items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-xs font-bold text-black disabled:opacity-50"
                    >
                      {savingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Salvar acompanhamento
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
