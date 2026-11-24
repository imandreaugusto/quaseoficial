import { getSupabaseClient } from '../utils/supabaseClient';

export interface CardProgress {
  card_id: string;
  due_date: string;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  state: number;
}

export type ReviewRating = 1 | 2 | 3 | 4;

const dayKey = (date = new Date()) => date.toISOString().slice(0, 10);
const progressCacheKey = (userId: string) => `anki_progress_${userId}`;
const dailyCountKey = (userId: string, day: string) => `anki_daily_${userId}_${day}`;
const readLocalProgress = (userId: string): Record<string, CardProgress> => {
  try {
    const stored = localStorage.getItem(progressCacheKey(userId));
    if (!stored) return {};
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<string, CardProgress>;
  } catch (error) {
    console.warn('Não foi possível ler o progresso local dos flashcards:', error);
    return {};
  }
};

const mergeProgress = (
  local: Record<string, CardProgress>,
  remote: CardProgress[],
): Record<string, CardProgress> => {
  const merged = { ...local };
  for (const record of remote) {
    const cached = merged[record.card_id];
    if (
      !cached ||
      record.reps > cached.reps ||
      (record.reps === cached.reps && Date.parse(record.due_date) >= Date.parse(cached.due_date))
    ) {
      merged[record.card_id] = record;
    }
  }
  return merged;
};

export class UserProgressService {
  private progress: Record<string, CardProgress>;

  constructor(private readonly userId: string) {
    this.progress = readLocalProgress(userId);
  }

  getSnapshot() {
    return this.progress;
  }

  getReviewedToday() {
    try {
      return Number(localStorage.getItem(dailyCountKey(this.userId, dayKey()))) || 0;
    } catch (error) {
      console.warn('Não foi possível ler a meta diária local:', error);
      return 0;
    }
  }

  async loadRemote() {
    const client = getSupabaseClient();
    if (!client) return this.progress;

    const { data, error } = await client
      .from('user_flashcard_progress')
      .select('card_id, due_date, stability, difficulty, reps, lapses, state')
      .eq('user_id', this.userId);

    if (error) {
      console.error('Não foi possível sincronizar o progresso dos flashcards:', error);
      throw error;
    }

    this.progress = mergeProgress(this.progress, (data || []) as CardProgress[]);
    this.persistLocal();
    return this.progress;
  }

  review(cardId: string, rating: ReviewRating) {
    const previous = this.progress[cardId];
    const now = new Date();
    const reps = (previous?.reps || 0) + 1;
    const lapses = (previous?.lapses || 0) + (rating === 1 ? 1 : 0);
    const previousStability = previous?.stability || 0;
    const previousDifficulty = previous?.difficulty || 5;

    // Keep the ts-fsrs card state and rating values so these records remain portable.
    const difficulty = Math.min(10, Math.max(1,
      previousDifficulty + (rating === 1 ? 1.2 : rating === 4 ? -0.8 : rating === 2 ? 0.3 : -0.3),
    ));
    const stability = rating === 1
      ? Math.max(0.1, previousStability * 0.2 || 0.1)
      : Math.max(1, previousStability * (rating === 2 ? 1.2 : rating === 3 ? 2.4 : 3.5) || rating);
    const intervalDays = rating === 1 ? 0 : rating === 2 ? 1 : Math.max(1, Math.round(stability));
    const due = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    const previousState = previous?.state ?? 0;
    const state = rating === 1
      ? previousState >= 2 ? 3 : 1
      : rating === 2 && previousState === 0 ? 1 : 2;
    const result: CardProgress = {
      card_id: cardId,
      due_date: due.toISOString(),
      stability,
      difficulty,
      reps,
      lapses,
      state,
    };

    this.progress = { ...this.progress, [cardId]: result };
    this.persistLocal();
    this.incrementDailyCount();
    return { progress: result, sync: this.syncRecord(result) };
  }

  private persistLocal() {
    try {
      localStorage.setItem(progressCacheKey(this.userId), JSON.stringify(this.progress));
    } catch (error) {
      console.error('Não foi possível salvar o progresso local dos flashcards:', error);
    }
  }

  private incrementDailyCount() {
    try {
      const key = dailyCountKey(this.userId, dayKey());
      const count = Number(localStorage.getItem(key)) || 0;
      localStorage.setItem(key, String(count + 1));
    } catch (error) {
      console.warn('Não foi possível atualizar a meta diária local:', error);
    }
  }

  private async syncRecord(record: CardProgress) {
    const client = getSupabaseClient();
    if (!client) return 'local' as const;

    const { error } = await client
      .from('user_flashcard_progress')
      .upsert(
        { user_id: this.userId, ...record },
        { onConflict: 'user_id,card_id' },
      );

    if (error) {
      console.error('Não foi possível salvar o progresso dos flashcards no Supabase:', error);
      return 'error' as const;
    }
    return 'synced' as const;
  }
}

