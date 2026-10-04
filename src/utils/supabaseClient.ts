// Supabase Client Helper
// Reads environment variables safely configured in the hosting environment (Netlify / Server / Vite)
// Supports process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY and client-side fallbacks
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '../types';
import { apiFetch } from '../lib/api';

export interface StudentFeedbackRecord {
  id: string;
  auth_user_id: string;
  student_name: string;
  student_email: string;
  answers: {
    message?: string;
    platform?: string;
    improve?: string;
    expectations?: string;
    other?: string;
  };
  status: 'new' | 'reviewing' | 'answered';
  admin_reply: string | null;
  created_at: string;
  updated_at: string;
}

export const getSupabaseConfig = () => {
  let storedConfig: { url?: string; anonKey?: string; appUrl?: string } = {};
  try {
    if (typeof localStorage !== 'undefined') {
      storedConfig = JSON.parse(localStorage.getItem('bia_supabase_public_config') || '{}');
    }
  } catch {}

  const url =
    storedConfig.url ||
    (typeof process !== 'undefined' && process.env && process.env.SUPABASE_URL) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_SUPABASE_URL) ||
    '';

  const anonKey =
    storedConfig.anonKey ||
    (typeof process !== 'undefined' && process.env && process.env.SUPABASE_ANON_KEY) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_SUPABASE_ANON_KEY) ||
    '';

  const appUrl = storedConfig.appUrl ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_PUBLIC_APP_URL) ||
    '';

  return { url, anonKey, appUrl };
};

let cachedClient: SupabaseClient | null = null;
let cachedConfigKey = '';

export const getSupabaseClient = () => {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) return null;
  const configKey = `${url}\n${anonKey}`;
  if (cachedClient && cachedConfigKey === configKey) return cachedClient;

  cachedConfigKey = configKey;
  cachedClient = createClient(url, anonKey, {
    // Session persistence + URL detection are required for the Google OAuth
    // redirect flow (signInWithGoogle) to resolve into a session on return.
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  return cachedClient;
};

const getAuthenticatedAccessToken = async () => {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase não está configurado.');
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error('Entre novamente para continuar.');
  return accessToken;
};

// Google OAuth creates a Supabase account for new identities and signs in
// existing identities. The server then creates or refreshes the app profile.
export const signInWithGoogle = async () => {
  const client = getSupabaseClient();
  if (!client) return { ok: false, reason: 'offline' as const };

  try {
    const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).toString();
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    });

    if (error) {
      console.warn('Supabase Google sign-in failed:', error);
      return { ok: false, reason: 'error' as const, message: error.message };
    }
    return { ok: true as const };
  } catch (error) {
    console.error('Supabase Google sign-in request failed:', error);
    return {
      ok: false,
      reason: 'error' as const,
      message: error instanceof Error ? error.message : 'Não foi possível conectar ao login do Google.'
    };
  }
};

export const registerAuthenticatedProfile = async (
  locationConsent: boolean,
  geolocation?: { country: string; regionName: string; city: string }
): Promise<UserProfile> => {
  const accessToken = await getAuthenticatedAccessToken();

  const response = await apiFetch('/api/auth/profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      locationConsent,
      ip_country: locationConsent ? geolocation?.country || null : null,
      ip_region: locationConsent ? geolocation?.regionName || null : null,
      ip_city: locationConsent ? geolocation?.city || null : null
    })
  });

  const result = await response.json();
  if (!response.ok || !result.profile) {
    throw new Error(result.error || 'Não foi possível salvar seu perfil de acesso.');
  }

  return result.profile as UserProfile;
};

export const registerGoogleProfile = registerAuthenticatedProfile;

export const redeemAuthenticatedTrialCoupon = async (code: string) => {
  const accessToken = await getAuthenticatedAccessToken();

  const response = await apiFetch('/api/auth/redeem-coupon', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ code })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Não foi possível validar o cupom.');
  return result as { ok: boolean; reason?: string; coupon?: { code: string; days: number }; expires_at?: string };
};

export const redeemGoogleTrialCoupon = redeemAuthenticatedTrialCoupon;

export const createTrialCoupon = async (coupon: {
  id: string;
  code: string;
  days: number;
  notes?: string;
  expiresAt?: string | null;
}) => {
  const accessToken = await getAuthenticatedAccessToken();

  const response = await apiFetch('/api/admin/trial-coupons', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      id: coupon.id,
      code: coupon.code,
      days: coupon.days,
      notes: coupon.notes || null,
      expires_at: coupon.expiresAt || null
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Não foi possível criar o cupom compartilhado.');
  return result.coupon as Record<string, unknown>;
};

export const fetchTrialCoupons = async () => {
  const accessToken = await getAuthenticatedAccessToken();

  const response = await apiFetch('/api/admin/trial-coupons', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Não foi possível carregar os cupons compartilhados.');
  return (result.coupons || []) as Record<string, unknown>[];
};

export const deleteTrialCoupon = async (id: string) => {
  const accessToken = await getAuthenticatedAccessToken();

  const response = await apiFetch(`/api/admin/trial-coupons/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Não foi possível excluir o cupom.');
};

export const deleteExpiredBrazilianFriendMessages = async () => {
  const client = getSupabaseClient();
  if (!client) return { ok: false, deleted: 0 };

  try {
    const { data, error } = await client.rpc('cleanup_expired_brazilian_friend_messages_count');

    if (error) throw error;
    return { ok: true, deleted: Number(data) || 0 };
  } catch (error) {
    console.warn('Expired Brazilian Friends messages cleanup failed:', error);
    return { ok: false, deleted: 0 };
  }
};

export const syncUserProfileToSupabase = async (profile: UserProfile) => {
  const client = getSupabaseClient();
  if (!client || !profile?.email) return null;

  try {
    const { data, error } = await client
      .from('profiles')
      .upsert({
        id: profile.id,
        email: profile.email.toLowerCase(),
        full_name: profile.full_name || profile.email.split('@')[0],
        role: profile.role,
        status: profile.status,
        data_expiracao: profile.data_expiracao || null,
        permissions: profile.permissions,
        ip_country: profile.ip_country || null,
        ip_region: profile.ip_region || null,
        ip_city: profile.ip_city || null,
        created_at: profile.created_at,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .select();

    if (error) throw error;
    return data?.[0] ?? null;
  } catch (error) {
    console.warn('Supabase profile sync failed:', error);
    return null;
  }
};

export const syncSubscriptionToSupabase = async (email: string, status: string, expiresAt?: string | null) => {
  const client = getSupabaseClient();
  if (!client || !email) return null;

  try {
    const { data, error } = await client
      .from('bia_subscription_profiles')
      .upsert({
        email: email.toLowerCase(),
        status,
        subscription_expires_at: expiresAt || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'email' })
      .select();

    if (error) throw error;
    return data?.[0] ?? null;
  } catch (error) {
    console.warn('Supabase subscription sync failed:', error);
    return null;
  }
};

export const getSubscriptionStatusFromSupabase = async (email: string) => {
  const client = getSupabaseClient();
  if (!client || !email) return null;

  try {
    const { data, error } = await client
      .from('bia_subscription_profiles')
      .select('status, subscription_expires_at')
      .ilike('email', email.trim().toLowerCase())
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.warn('Supabase subscription read failed:', error);
    return null;
  }
};

export const syncStoriesToSupabase = async (stories: any[]) => {
  const client = getSupabaseClient();
  if (!client || !Array.isArray(stories) || stories.length === 0) return [];

  try {
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user) return [];

    const ownPendingStories = stories.filter((story) =>
      story.studentId === authData.user.id && (!story.status || story.status === 'pending')
    );
    if (ownPendingStories.length === 0) return [];

    const rows = ownPendingStories.map((story) => ({
      id: String(story.id),
      student_id: authData.user.id,
      student_name: story.studentName || 'Aluno BIA',
      title: story.title || 'Story',
      category: story.category || 'challenge',
      prompt_used: story.promptUsed || story.title || 'Story',
      video_url: story.videoUrl || null,
      thumbnail_url: story.thumbnailUrl || null,
      created_at: story.createdAt || new Date().toISOString(),
      status: 'pending',
      likes_count: Number(story.likesCount || 0),
      instagram_handle: story.instagramHandle || null
    }));

    const { data, error } = await client
      .from('stories')
      .upsert(rows, { onConflict: 'id' })
      .select();

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn('Supabase stories sync failed:', error);
    return [];
  }
};

export const loadStoriesFromSupabase = async () => {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('stories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((story: any) => ({
      id: String(story.id),
      studentId: story.student_id,
      studentName: story.student_name,
      title: story.title,
      category: story.category,
      promptUsed: story.prompt_used,
      videoUrl: story.video_url,
      thumbnailUrl: story.thumbnail_url,
      createdAt: story.created_at,
      status: story.status,
      likesCount: Number(story.likes_count || 0),
      instagramHandle: story.instagram_handle || undefined
    }));
  } catch (error) {
    console.warn('Supabase stories load failed:', error);
    return [];
  }
};

export const syncSharedContentToSupabase = async (contentKey: string, payload: unknown) => {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase não está configurado para salvar o conteúdo compartilhado.');
  if (!contentKey) throw new Error('A chave do conteúdo compartilhado está vazia.');

  try {
    const { data, error } = await client
      .from('bia_shared_content')
      .upsert({ content_key: contentKey, payload, updated_at: new Date().toISOString() }, { onConflict: 'content_key' })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.warn('Supabase shared content sync failed:', error);
    throw error;
  }
};

export const loadSharedContentFromSupabase = async <T>(contentKey: string): Promise<T | null> => {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase não está configurado para carregar o conteúdo compartilhado.');
  if (!contentKey) throw new Error('A chave do conteúdo compartilhado está vazia.');

  try {
    const { data, error } = await client
      .from('bia_shared_content')
      .select('payload')
      .eq('content_key', contentKey)
      .maybeSingle();
    if (error) throw error;
    return (data?.payload as T) || null;
  } catch (error) {
    console.warn('Supabase shared content load failed:', error);
    throw error;
  }
};

export const syncStudentProgressToSupabase = async (userId: string, progress: {
  sessions: unknown;
  glossary: unknown;
  learnedWords: unknown;
}) => {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase não está configurado para salvar o progresso.');
  if (!userId) throw new Error('O identificador do aluno está vazio.');

  try {
    const { data, error } = await client
      .from('bia_student_progress')
      .upsert({
        user_id: userId,
        sessions: progress.sessions,
        glossary: progress.glossary,
        learned_words: progress.learnedWords,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.warn('Supabase student progress sync failed:', error);
    throw error;
  }
};

export const loadStudentProgressFromSupabase = async (userId: string) => {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase não está configurado para carregar o progresso.');
  if (!userId) throw new Error('O identificador do aluno está vazio.');

  try {
    const { data, error } = await client
      .from('bia_student_progress')
      .select('sessions, glossary, learned_words')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (error) {
    console.warn('Supabase student progress load failed:', error);
    throw error;
  }
};

export const submitStudentFeedback = async (feedback: {
  authUserId: string;
  studentName: string;
  studentEmail: string;
  answers: { message: string };
}) => {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase não está configurado para enviar o feedback.');
  if (!feedback.authUserId) throw new Error('Não foi possível identificar a conta autenticada.');

  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (authData.user?.id !== feedback.authUserId) {
    throw new Error('Sua sessão expirou. Entre novamente para enviar o feedback.');
  }

  const { data, error } = await client
    .from('bia_student_feedback')
    .insert({
      auth_user_id: feedback.authUserId,
      student_name: feedback.studentName.trim(),
      student_email: feedback.studentEmail.trim().toLowerCase(),
      answers: feedback.answers,
    })
    .select('id, status, created_at')
    .single();

  if (error) {
    console.error('Student feedback submission failed:', error);
    throw error;
  }
  return data as Pick<StudentFeedbackRecord, 'id' | 'status' | 'created_at'>;
};

export const loadStudentFeedback = async () => {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase não está configurado para carregar feedbacks.');

  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('Entre novamente para ver os feedbacks.');

  const { data, error } = await client
    .from('bia_student_feedback')
    .select('id, auth_user_id, student_name, student_email, answers, status, admin_reply, created_at, updated_at')
    .eq('auth_user_id', authData.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Student feedback history load failed:', error);
    throw error;
  }
  return (data || []) as StudentFeedbackRecord[];
};

export const loadAllStudentFeedback = async () => {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase não está configurado para carregar feedbacks.');

  const { data, error } = await client
    .from('bia_student_feedback')
    .select('id, auth_user_id, student_name, student_email, answers, status, admin_reply, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Admin feedback list load failed:', error);
    throw error;
  }
  return (data || []) as StudentFeedbackRecord[];
};

export const updateStudentFeedback = async (
  id: string,
  update: Pick<StudentFeedbackRecord, 'status' | 'admin_reply'>
) => {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase não está configurado para atualizar feedbacks.');
  if (!id) throw new Error('O identificador do feedback está vazio.');

  const { data, error } = await client
    .from('bia_student_feedback')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
    .single();

  if (error) {
    console.error('Admin feedback update failed:', error);
    throw error;
  }
  return data;
};

export const findUserProfileByEmail = async (email: string) => {
  const client = getSupabaseClient();
  if (!client || !email) return null;

  try {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .ilike('email', email.trim().toLowerCase())
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.warn('Supabase profile fetch failed:', error);
    return null;
  }
};

// Reads a coupon's live state from the shared database so single-use validation
// works across every device/browser, instead of only the local one.
export const fetchCouponFromSupabase = async (code: string) => {
  if (!code) return null;

  const response = await apiFetch(`/api/trial-coupons/${encodeURIComponent(code.trim().toUpperCase())}`);
  if (response.status === 404) return null;
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Falha ao validar cupom.');
  return result.coupon || null;
};

// Atomically marks a coupon as used ONLY if it is still unused, preventing the
// same code from being redeemed twice across different devices/sessions.
export const redeemCouponInSupabase = async (code: string, usedByEmail: string) => {
  const client = getSupabaseClient();
  if (!client || !code) return { ok: false, reason: 'offline' as const };

  try {
    const { data: sessionData } = await client.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken || sessionData.session?.user.email?.trim().toLowerCase() !== usedByEmail.trim().toLowerCase()) {
      return { ok: false, reason: 'unauthenticated' as const };
    }
    const response = await apiFetch('/api/auth/redeem-coupon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ code: code.trim().toUpperCase() })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Falha ao resgatar cupom.');
    if (!result.ok) return { ok: false, reason: result.reason || 'already_used' as const };
    return { ok: true, coupon: result.coupon };
  } catch (error) {
    console.warn('Authenticated trial coupon redeem failed:', error);
    return { ok: false, reason: 'error' as const };
  }
};

export const getMercadoPagoServerToken = () => {
  return (
    (typeof process !== 'undefined' && process.env && process.env.MERCADO_PAGO_TOKEN) ||
    (typeof process !== 'undefined' && process.env && process.env.MP_ACCESS_TOKEN) ||
    ''
  );
};

export const supabase = getSupabaseClient();
