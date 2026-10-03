// Supabase Client Helper
// Reads environment variables safely configured in the hosting environment (Netlify / Server / Vite)
// Supports process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY and client-side fallbacks
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '../types';
import { apiFetch } from '../lib/api';

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

// Redirects the browser to Google via Supabase Auth. On return, the session
// can be read with getSupabaseClient()?.auth.getSession().
export const signInWithGoogle = async () => {
  const client = getSupabaseClient();
  if (!client) return { ok: false, reason: 'offline' as const };

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
};

export const registerGoogleProfile = async (
  locationConsent: boolean,
  geolocation?: { country: string; regionName: string; city: string }
): Promise<UserProfile> => {
  const client = getSupabaseClient();
  if (!client) throw new Error('Autenticação indisponível: Supabase não configurado.');

  const { data } = await client.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error('Sessão não encontrada. Entre novamente.');

  const response = await apiFetch('/api/auth/google/profile', {
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

export const redeemGoogleTrialCoupon = async (code: string) => {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase não está configurado.');

  const { data } = await client.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error('Entre com o Google antes de resgatar um cupom.');

  const response = await apiFetch('/api/auth/google/redeem-coupon', {
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
  if (!client || !contentKey) return null;

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
    return null;
  }
};

export const loadSharedContentFromSupabase = async <T>(contentKey: string): Promise<T | null> => {
  const client = getSupabaseClient();
  if (!client || !contentKey) return null;

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
    return null;
  }
};

export const syncStudentProgressToSupabase = async (userId: string, progress: {
  sessions: unknown;
  glossary: unknown;
  learnedWords: unknown;
}) => {
  const client = getSupabaseClient();
  if (!client || !userId) return null;

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
    return null;
  }
};

export const loadStudentProgressFromSupabase = async (userId: string) => {
  const client = getSupabaseClient();
  if (!client || !userId) return null;

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
    return null;
  }
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
  const client = getSupabaseClient();
  if (!client || !code) return null;

  try {
    const { data, error } = await client.rpc('check_trial_coupon', {
      requested_code: code.trim().toUpperCase()
    });

    if (error) throw error;
    return data?.ok ? data.coupon : null;
  } catch (error) {
    console.warn('Supabase coupon fetch failed:', error);
    return null;
  }
};

// Atomically marks a coupon as used ONLY if it is still unused, preventing the
// same code from being redeemed twice across different devices/sessions.
export const redeemCouponInSupabase = async (code: string, usedByEmail: string) => {
  const client = getSupabaseClient();
  if (!client || !code) return { ok: false, reason: 'offline' as const };

  try {
    const { data, error } = await client.rpc('redeem_trial_coupon', {
      requested_code: code.trim().toUpperCase(),
      redeemer_email: usedByEmail.trim().toLowerCase()
    });

    if (error) throw error;
    if (!data?.ok) return { ok: false, reason: data?.reason || 'already_used' as const };
    return { ok: true, coupon: data.coupon };
  } catch (error) {
    console.warn('Supabase coupon redeem failed:', error);
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
