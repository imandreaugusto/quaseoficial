import React, { useEffect, useState } from 'react';
import { CheckCircle, Loader2, MessageSquareText, Send } from 'lucide-react';
import type { UserProfile } from '../types';
import {
  loadStudentFeedback,
  markStudentFeedbackRepliesSeen,
  StudentFeedbackRecord,
  submitStudentFeedback,
} from '../utils/supabaseClient';

interface StudentFeedbackProps {
  currentUser: UserProfile;
  accentColor: string;
}

const LEGACY_QUESTIONS: Record<string, string> = {
  platform: 'O que você está achando da plataforma?',
  improve: 'Como poderíamos melhorar?',
  expectations: 'O que você espera encontrar na plataforma?',
  other: 'Quer deixar alguma outra sugestão ou comentário?',
};

const STATUS_LABELS: Record<StudentFeedbackRecord['status'], string> = {
  new: 'Recebido',
  reviewing: 'Em análise',
  answered: 'Respondido',
};

export const StudentFeedback: React.FC<StudentFeedbackProps> = ({ currentUser, accentColor }) => {
  const [answer, setAnswer] = useState('');
  const [history, setHistory] = useState<StudentFeedbackRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const refreshHistory = async () => {
    try {
      const records = await loadStudentFeedback();
      setHistory(records);
      const unreadReplyIds = records
        .filter((record) => Boolean(record.admin_reply?.trim()) && !record.student_reply_seen_at)
        .map((record) => record.id);
      if (unreadReplyIds.length > 0) {
        await markStudentFeedbackRepliesSeen(unreadReplyIds);
        const seenAt = new Date().toISOString();
        setHistory((current) => current.map((record) =>
          unreadReplyIds.includes(record.id)
            ? { ...record, student_reply_seen_at: seenAt }
            : record
        ));
      }
    } catch (error) {
      console.error('Could not load your feedback history:', error);
      setErrorMessage('Não foi possível carregar seus feedbacks. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshHistory();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!answer.trim()) {
      setErrorMessage('Escreva seu feedback antes de enviar.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await submitStudentFeedback({
        authUserId: currentUser.auth_user_id || currentUser.id,
        studentName: currentUser.full_name || currentUser.email,
        studentEmail: currentUser.email,
        answers: { message: answer.trim() },
      });
      setAnswer('');
      setSuccessMessage('Obrigado! Seu feedback foi enviado para a equipe.');
      await refreshHistory();
    } catch (error) {
      console.error('Could not submit student feedback:', error);
      setErrorMessage(error instanceof Error
        ? error.message
        : 'Não foi possível enviar seu feedback. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 pb-24 text-white">
      <header className="mb-8 text-center">
        <MessageSquareText className="mx-auto mb-3" size={30} style={{ color: accentColor }} />
        <h1 className="text-2xl font-bold">Feedback e sugestões</h1>
        <p className="mt-2 text-sm text-white/60">
          Em um único campo, conte o que está achando da plataforma, como podemos melhorar
          e o que você espera encontrar. Sua mensagem será lida pela equipe.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-7">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-white/85">
            O que você está achando? Como podemos melhorar? O que espera encontrar?
          </span>
          <textarea
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            maxLength={5000}
            rows={8}
            className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/30"
            placeholder="Responda às perguntas com suas palavras. Você pode falar sobre todos os pontos em uma única mensagem."
          />
          <span className="mt-1 block text-right text-[11px] text-white/35">{answer.length}/5000</span>
        </label>

        {errorMessage && <p role="alert" className="text-sm text-red-300">{errorMessage}</p>}
        {successMessage && <p role="status" className="text-sm text-emerald-300">{successMessage}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-black transition-opacity disabled:cursor-wait disabled:opacity-60"
          style={{ backgroundColor: accentColor }}
        >
          {isSubmitting ? <Loader2 size={17} className="animate-spin" /> : <Send size={16} />}
          {isSubmitting ? 'Enviando...' : 'Enviar feedback'}
        </button>
      </form>

      <section className="mt-9">
        <h2 className="mb-3 text-lg font-bold">Meus feedbacks</h2>
        {isLoading ? (
          <p className="text-sm text-white/55">Carregando seus feedbacks...</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-white/55">Os feedbacks que você enviar aparecerão aqui.</p>
        ) : (
          <div className="space-y-3">
            {history.map((entry) => (
              <article key={entry.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-200">
                    <CheckCircle size={14} />
                    {STATUS_LABELS[entry.status]}
                  </span>
                  <time className="text-xs text-white/40" dateTime={entry.created_at}>
                    {new Date(entry.created_at).toLocaleDateString('pt-BR')}
                  </time>
                </div>
                {entry.answers.message ? (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-white/75">{entry.answers.message}</p>
                ) : Object.entries(entry.answers).map(([key, legacyAnswer]) => (
                  legacyAnswer ? (
                    <p key={key} className="mt-3 whitespace-pre-wrap text-sm text-white/75">
                      {LEGACY_QUESTIONS[key] && (
                        <span className="font-semibold text-white/90">{LEGACY_QUESTIONS[key]} </span>
                      )}
                      {legacyAnswer}
                    </p>
                  ) : null
                ))}
                {entry.admin_reply && (
                  <div className="mt-4 rounded-lg border border-emerald-300/15 bg-emerald-300/5 p-3">
                    <p className="text-xs font-bold text-emerald-200">Resposta do CEO para você</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-white/80">{entry.admin_reply}</p>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
};
