import { useCallback, useEffect, useState } from 'react';
import { MessageSquareText } from 'lucide-react';
import { loadStudentFeedback, type StudentFeedbackRecord } from '../utils/supabaseClient';
import type { UserProfile } from '../types';

interface StudentFeedbackNotificationsProps {
  user: UserProfile;
  isFeedbackOpen: boolean;
  onOpenFeedback: () => void;
}

export function StudentFeedbackNotifications({
  user,
  isFeedbackOpen,
  onOpenFeedback
}: StudentFeedbackNotificationsProps) {
  const [unreadReplies, setUnreadReplies] = useState<StudentFeedbackRecord[]>([]);

  const refreshUnreadReplies = useCallback(async () => {
    try {
      const records = await loadStudentFeedback();
      setUnreadReplies(records.filter((record) =>
        Boolean(record.admin_reply?.trim()) && !record.student_reply_seen_at
      ));
    } catch (error) {
      console.error('Could not load private feedback reply notifications:', error);
    }
  }, [user.auth_user_id, user.email]);

  useEffect(() => {
    if (isFeedbackOpen) {
      setUnreadReplies([]);
      return;
    }

    void refreshUnreadReplies();
    const intervalId = window.setInterval(() => {
      if (!document.hidden) void refreshUnreadReplies();
    }, 20_000);
    const handleVisibilityChange = () => {
      if (!document.hidden) void refreshUnreadReplies();
    };
    window.addEventListener('focus', handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleVisibilityChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isFeedbackOpen, refreshUnreadReplies]);

  if (isFeedbackOpen || unreadReplies.length === 0) return null;

  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-[4000] flex max-w-[min(92vw,25rem)] items-center gap-3 rounded-xl border border-emerald-300/25 bg-slate-950/95 px-4 py-3 text-sm text-white shadow-2xl backdrop-blur"
    >
      <MessageSquareText size={19} className="shrink-0 text-emerald-300" aria-hidden="true" />
      <p className="min-w-0 flex-1">
        {unreadReplies.length === 1
          ? 'Você recebeu uma resposta privada ao seu feedback.'
          : `Você recebeu ${unreadReplies.length} respostas privadas aos seus feedbacks.`}
      </p>
      <button
        type="button"
        onClick={onOpenFeedback}
        className="shrink-0 rounded-lg bg-emerald-300/15 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-300/25"
      >
        Ver
      </button>
    </aside>
  );
}
