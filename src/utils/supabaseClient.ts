// Supabase Client Helper
// Reads environment variables safely configured in the hosting environment (Netlify / Server / Vite)
// Supports process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY and client-side fallbacks
import { createClient } from '@supabase/supabase-js';

export const getSupabaseConfig = () => {
  let storedConfig: { url?: string; anonKey?: string } = {};
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

  return { url, anonKey };
};

export const getSupabaseClient = () => {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
};

export const getMercadoPagoServerToken = () => {
  return (
    (typeof process !== 'undefined' && process.env && process.env.MERCADO_PAGO_TOKEN) ||
    (typeof process !== 'undefined' && process.env && process.env.MP_ACCESS_TOKEN) ||
    ''
  );
};

export const supabase = getSupabaseClient();
