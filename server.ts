import express from 'express';
import path from 'path';
import http from 'http';
import { spawn } from 'child_process';
import { WebSocketServer, WebSocket } from 'ws';
import * as webPush from 'web-push';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import { validatePortuguesePhrase } from './src/lib/jevValidator';
import {
  abacatePayApiEndpoint,
  hasActiveSubscription,
  normalizeEmail,
  subscriptionPriceCents,
  verifyAbacatePaySignature,
  verifyWebhookSecret
} from './src/lib/paymentSecurity';
import { getAdminSubscriptionStatus } from './src/lib/subscriptionStatus';
import { CEO_EMAIL } from './src/utils/security';

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3000;
  const webPushPublicKey = process.env.WEB_PUSH_PUBLIC_KEY || '';
  const webPushPrivateKey = process.env.WEB_PUSH_PRIVATE_KEY || '';
  const webPushConfigured = Boolean(webPushPublicKey && webPushPrivateKey);
  if (webPushConfigured) {
    webPush.setVapidDetails(
      'https://brazilian-in-action-i036.onrender.com/',
      webPushPublicKey,
      webPushPrivateKey
    );
  }

  // Set up WebSocket server for direct RTMP streaming via FFmpeg
  const wss = new WebSocketServer({ server, path: '/api/rtmp-stream' });

  wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
    console.log('⚡ Client connected to RTMP WebSocket bridge');
    const urlParams = new URLSearchParams(req.url?.split('?')[1] || '');
    const serverUrl = urlParams.get('serverUrl') || 'rtmp://a.rtmp.youtube.com/live2';
    const streamKey = urlParams.get('streamKey') || '';

    if (!streamKey) {
      console.error('❌ Missing RTMP streamKey');
      ws.send(JSON.stringify({ type: 'error', message: 'Chave de transmissão (streamKey) ausente' }));
      ws.close();
      return;
    }

    const cleanServerUrl = serverUrl.replace(/\/+$/, '');
    const rtmpDestination = `${cleanServerUrl}/${streamKey}`;

    console.log(`🚀 Spawning FFmpeg process to stream to: ${cleanServerUrl}/••••`);

    const ffmpegArgs = [
      '-f', 'webm',
      '-analyzeduration', '3000000',
      '-probesize', '3000000',
      '-i', 'pipe:0',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-pix_fmt', 'yuv420p',
      '-g', '60',
      '-keyint_min', '60',
      '-b:v', '2500k',
      '-maxrate', '2500k',
      '-bufsize', '5000k',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100',
      '-ac', '2',
      '-f', 'flv',
      rtmpDestination
    ];

    const ffmpeg = spawn('ffmpeg', ffmpegArgs);

    ffmpeg.stdin.on('error', (err) => {
      console.warn('FFmpeg stdin pipe warning/error:', err.message);
    });

    ws.send(JSON.stringify({ type: 'status', state: 'connected', message: 'Conectado ao ponte FFmpeg! Enviando sinal de vídeo e áudio para o YouTube Studio...' }));

    ffmpeg.stdout.on('data', (data) => {
      console.log(`[FFmpeg stdout]: ${data}`);
    });

    ffmpeg.stderr.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('frame=') || msg.includes('fps=') || msg.includes('bitrate=')) {
        ws.send(JSON.stringify({ type: 'status', message: `🔴 AO VIVO NO YOUTUBE | Transmitindo: ${msg.trim().slice(0, 70)}` }));
      } else if (msg.includes('Error') || msg.includes('failed') || msg.includes('Server error')) {
        console.error(`[FFmpeg stderr error]: ${msg}`);
        ws.send(JSON.stringify({ type: 'error', message: msg }));
      }
    });

    ffmpeg.on('close', (code, signal) => {
      console.log(`FFmpeg process exited with code ${code}, signal ${signal}`);
      ws.send(JSON.stringify({ type: 'status', state: 'stopped', message: `FFmpeg finalizado (código ${code})` }));
    });

    ffmpeg.on('error', (err) => {
      console.error('FFmpeg process error:', err);
      ws.send(JSON.stringify({ type: 'error', message: `Erro ao executar FFmpeg: ${err.message}` }));
    });

    ws.on('message', (message: Buffer, isBinary: boolean) => {
      if (isBinary) {
        if (ffmpeg.stdin.writable) {
          ffmpeg.stdin.write(message);
        }
      } else {
        try {
          const parsed = JSON.parse(message.toString());
          if (parsed.type === 'stop') {
            console.log('Stop signal received from client');
            if (ffmpeg.stdin.writable) {
              ffmpeg.stdin.end();
            }
          }
        } catch (e) {
          // ignore non-json text
        }
      }
    });

    ws.on('close', () => {
      console.log('⚡ Client disconnected from RTMP WebSocket bridge. Terminating FFmpeg...');
      if (ffmpeg.stdin.writable) {
        ffmpeg.stdin.end();
      }
      ffmpeg.kill('SIGINT');
    });

    ws.on('error', (err) => {
      console.error('WebSocket client error:', err);
      if (ffmpeg.stdin.writable) {
        ffmpeg.stdin.end();
      }
      ffmpeg.kill('SIGKILL');
    });
  });

  // Keep the signed bytes available while retaining parsed JSON for handlers.
  app.use(express.json({
    verify: (req, _res, buffer) => {
      (req as typeof req & { rawBody?: Buffer }).rawBody = Buffer.from(buffer);
    }
  }));

  const getSupabaseServiceConfig = () => {
    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) throw new Error('Supabase server credentials are not configured.');
    return { url: url.replace(/\/$/, ''), serviceRoleKey };
  };

  const supabaseServiceRequest = async (resource: string, init: RequestInit = {}) => {
    const { url, serviceRoleKey } = getSupabaseServiceConfig();
    const headers = new Headers(init.headers);
    headers.set('apikey', serviceRoleKey);
    headers.set('Authorization', `Bearer ${serviceRoleKey}`);
    if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    return fetch(`${url}/rest/v1/${resource}`, { ...init, headers });
  };

  const registerAuthenticatedProfileDirectly = async (profileData: {
    id: string;
    email: string;
    fullName: string;
    photoUrl: string | null;
    locationConsent: boolean;
    ipCountry: string | null;
    ipRegion: string | null;
    ipCity: string | null;
  }) => {
    const select = 'id,auth_user_id,email,full_name,first_name,last_name,profile_state,profile_city,profile_country,photo_url,role,status,data_expiracao,email_verified,permissions,ip_country,ip_region,ip_city,location_consent,created_at,updated_at';
    const findProfile = async (filter: string) => {
      const response = await supabaseServiceRequest(`profiles?${filter}&select=${select}&limit=1`);
      if (!response.ok) throw new Error(`Supabase profile lookup failed (${response.status}): ${await response.text()}`);
      const profiles = await response.json() as Record<string, unknown>[];
      return profiles[0] || null;
    };

    let savedProfile = await findProfile(`auth_user_id=eq.${encodeURIComponent(profileData.id)}`);
    if (!savedProfile) {
      savedProfile = await findProfile(`email=ilike.${encodeURIComponent(profileData.email)}`);
    }
    if (
      savedProfile &&
      typeof savedProfile.email === 'string' &&
      savedProfile.email.trim().toLowerCase() !== profileData.email
    ) {
      throw new Error('Supabase returned a profile that does not match the authenticated email.');
    }

    if (savedProfile?.auth_user_id && savedProfile.auth_user_id !== profileData.id) {
      throw new Error('The email is already linked to a different authenticated account.');
    }

    const profileChanges = {
      auth_user_id: profileData.id,
      email: profileData.email,
      full_name: profileData.fullName || savedProfile?.full_name || profileData.email.split('@')[0],
      photo_url: savedProfile?.photo_url || profileData.photoUrl || null,
      email_verified: true,
      location_consent: Boolean(savedProfile?.location_consent || profileData.locationConsent),
      ...(profileData.locationConsent ? {
        ip_country: profileData.ipCountry || savedProfile?.ip_country || null,
        ip_region: profileData.ipRegion || savedProfile?.ip_region || null,
        ip_city: profileData.ipCity || savedProfile?.ip_city || null
      } : {})
    };

    if (savedProfile) {
      const response = await supabaseServiceRequest(`profiles?id=eq.${encodeURIComponent(String(savedProfile.id))}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(profileChanges)
      });
      if (!response.ok) throw new Error(`Supabase profile update failed (${response.status}): ${await response.text()}`);
      const profiles = await response.json() as Record<string, unknown>[];
      savedProfile = profiles[0];
    } else {
      const response = await supabaseServiceRequest('profiles', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          id: profileData.id,
          ...profileChanges,
          role: 'student',
          status: 'pending'
        })
      });
      if (!response.ok) {
        const details = await response.text();
        if (response.status === 409) {
          const concurrentProfile = await findProfile(`auth_user_id=eq.${encodeURIComponent(profileData.id)}`)
            || await findProfile(`email=ilike.${encodeURIComponent(profileData.email)}`);
          if (
            concurrentProfile &&
            (!concurrentProfile.auth_user_id || concurrentProfile.auth_user_id === profileData.id) &&
            typeof concurrentProfile.email === 'string' &&
            concurrentProfile.email.trim().toLowerCase() === profileData.email
          ) {
            savedProfile = concurrentProfile;
          } else {
            throw new Error(`Supabase profile insert conflict (${response.status}): ${details}`);
          }
        } else {
          throw new Error(`Supabase profile insert failed (${response.status}): ${details}`);
        }
      } else {
        const profiles = await response.json() as Record<string, unknown>[];
        savedProfile = profiles[0];
      }

      if (response.status === 409 && savedProfile) {
        const updateResponse = await supabaseServiceRequest(`profiles?id=eq.${encodeURIComponent(String(savedProfile.id))}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(profileChanges)
        });
        if (!updateResponse.ok) {
          throw new Error(`Supabase concurrent profile update failed (${updateResponse.status}): ${await updateResponse.text()}`);
        }
        const profiles = await updateResponse.json() as Record<string, unknown>[];
        savedProfile = profiles[0];
      }
    }

    if (!savedProfile) throw new Error('Supabase did not return the saved profile.');

    const subscriptionLookup = await supabaseServiceRequest(
      `bia_subscription_profiles?email=ilike.${encodeURIComponent(profileData.email)}&select=email,user_id,status,subscription_expires_at&limit=1`
    );
    if (!subscriptionLookup.ok) {
      throw new Error(`Supabase subscription lookup failed (${subscriptionLookup.status}): ${await subscriptionLookup.text()}`);
    }
    const subscriptions = await subscriptionLookup.json() as Record<string, unknown>[];
    const savedSubscription = subscriptions.find((subscription) =>
      typeof subscription.email === 'string' &&
      subscription.email.trim().toLowerCase() === profileData.email
    );
    if (savedSubscription) {
      const subscriptionUpdate = await supabaseServiceRequest(
        `bia_subscription_profiles?email=eq.${encodeURIComponent(String(savedSubscription.email))}`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            email: profileData.email,
            user_id: profileData.id,
            updated_at: new Date().toISOString()
          })
        }
      );
      if (!subscriptionUpdate.ok) {
        throw new Error(`Supabase subscription link failed (${subscriptionUpdate.status}): ${await subscriptionUpdate.text()}`);
      }
    } else {
      const expiresAt = typeof savedProfile.data_expiracao === 'string' ? savedProfile.data_expiracao : null;
      const isActive = savedProfile.status === 'active' && expiresAt !== null && Date.parse(expiresAt) > Date.now();
      const subscriptionInsert = await supabaseServiceRequest('bia_subscription_profiles', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          email: profileData.email,
          user_id: profileData.id,
          status: isActive ? 'active' : 'pending',
          subscription_expires_at: isActive ? expiresAt : null
        })
      });
      if (!subscriptionInsert.ok && subscriptionInsert.status !== 409) {
        throw new Error(`Supabase subscription insert failed (${subscriptionInsert.status}): ${await subscriptionInsert.text()}`);
      }
    }

    return savedProfile;
  };

  const getSupabaseUserFromRequest = async (request: express.Request) => {
    const token = request.header('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    const supabaseUrl = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!token || !supabaseUrl || !anonKey) return null;

    const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` }
    });
    if (!response.ok) return null;
    return await response.json() as {
      id: string;
      email?: string;
      email_confirmed_at?: string | null;
      user_metadata?: Record<string, unknown>;
    };
  };

  const getAuthenticatedProfileByAuthId = async (authUserId: string) => {
    const response = await supabaseServiceRequest(
      `profiles?auth_user_id=eq.${encodeURIComponent(authUserId)}&select=id,auth_user_id,email,full_name,photo_url,role,status,data_expiracao,permissions,ip_country,ip_region,ip_city,location_consent&limit=1`
    );
    if (!response.ok) throw new Error(`Supabase profile read failed (${response.status}).`);
    const profiles = await response.json() as Record<string, unknown>[];
    return profiles[0] || null;
  };

  const rateLimitBuckets = new Map<string, { startedAt: number; count: number }>();
  const isRateLimited = (key: string, limit: number, windowMs: number) => {
    const now = Date.now();
    const bucket = rateLimitBuckets.get(key);
    if (!bucket || now - bucket.startedAt >= windowMs) {
      rateLimitBuckets.set(key, { startedAt: now, count: 1 });
      return false;
    }
    if (bucket.count >= limit) return true;
    bucket.count += 1;
    return false;
  };

  const activateRegisteredPayment = async (paymentId: string, eventId?: string | null) => {
    const response = await supabaseServiceRequest('rpc/activate_bia_payment', {
      method: 'POST',
      body: JSON.stringify({ p_payment_id: paymentId, p_event_id: eventId || null })
    });
    if (!response.ok) throw new Error(`Supabase payment activation failed (${response.status}).`);
    return await response.json() as { ok: boolean; duplicate?: boolean; reason?: string; subscription_expires_at?: string };
  };

  const getAbatePayPaymentStatus = async (paymentId: string) => {
    const abatePayToken = process.env.ABACATEPAY_API_KEY || process.env.ABATEPAY_TOKEN;
    const apiBaseUrl = (process.env.ABACATEPAY_API_URL || 'https://api.abacatepay.com').replace(/\/$/, '');
    const statusTemplate = process.env.ABATEPAY_STATUS_URL_TEMPLATE || `${abacatePayApiEndpoint(apiBaseUrl, 'transparents/check')}?id={id}`;
    if (!abatePayToken) throw new Error('ABATEPAY_TOKEN is not configured.');

    const response = await fetch(statusTemplate.replace('{id}', encodeURIComponent(paymentId)), {
      headers: { Authorization: `Bearer ${abatePayToken}` }
    });
    if (!response.ok) throw new Error(`AbatePay status check failed (${response.status}).`);

    const responseData = await response.json() as any;
    const payment = responseData.data || responseData;
    const status = String(payment.status || payment.paymentStatus || '').toLowerCase();
    return {
      id: String(payment.id || paymentId),
      status,
      isApproved: ['approved', 'paid', 'completed', 'confirmed'].includes(status),
      eventId: String(payment.eventId || payment.event_id || '') || null
    };
  };

  const allowedOrigins = new Set([
    'https://imandreaugusto.github.io',
    'http://localhost:5173',
    'http://localhost:3000'
  ]);
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    }
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Baseline security headers; Cloudflare can add WAF, rate limits and TLS at the edge.
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
    next();
  });

  const isSubscriptionBootstrapRoute = (request: express.Request) => {
    const route = `${request.baseUrl}${request.path}`;
    if (request.method === 'GET' && ['/api/health', '/api/public-config'].includes(route)) return true;
    if (request.method === 'GET' && route.startsWith('/api/trial-coupons/')) return true;
    if (request.method === 'POST' && [
      '/api/auth/profile',
      '/api/auth/google/profile',
      '/api/auth/profile/details',
      '/api/auth/redeem-coupon',
      '/api/auth/google/redeem-coupon',
      '/api/payments/create-pix',
      '/api/webhook/payment'
    ].includes(route)) return true;
    return request.method === 'GET' && route.startsWith('/api/payments/status/');
  };

  app.use('/api', async (req, res, next) => {
    if (isSubscriptionBootstrapRoute(req)) return next();

    try {
      const authUser = await getSupabaseUserFromRequest(req);
      const email = normalizeEmail(authUser?.email);
      if (!authUser?.id || !email || !authUser.email_confirmed_at) {
        return res.status(401).json({ error: 'Entre com uma conta verificada para acessar a plataforma.' });
      }

      if (email === CEO_EMAIL) return next();

      const profile = await getAuthenticatedProfileByAuthId(authUser.id);
      if (
        !profile ||
        profile.auth_user_id !== authUser.id ||
        normalizeEmail(profile.email) !== email ||
        profile.role === 'admin'
      ) {
        return res.status(403).json({ error: 'O perfil desta conta não está autorizado.' });
      }

      const subscriptionResponse = await supabaseServiceRequest(
        `bia_subscription_profiles?user_id=eq.${encodeURIComponent(authUser.id)}&email=eq.${encodeURIComponent(email)}&select=status,subscription_expires_at&limit=1`
      );
      if (!subscriptionResponse.ok) {
        console.error('Platform subscription lookup failed:', subscriptionResponse.status, await subscriptionResponse.text());
        return res.status(503).json({ error: 'Não foi possível confirmar sua assinatura. Tente novamente.' });
      }

      const subscriptions = await subscriptionResponse.json() as {
        status: string;
        subscription_expires_at: string | null;
      }[];
      const subscription = subscriptions[0];
      if (!subscription || !hasActiveSubscription(subscription.status, subscription.subscription_expires_at)) {
        return res.status(402).json({ error: 'Assinatura expirada ou não encontrada. Pague ou resgate um cupom para liberar o acesso.' });
      }

      return next();
    } catch (error: any) {
      console.error('Platform access verification failed:', error?.message || error);
      return res.status(503).json({ error: 'Não foi possível verificar a autorização agora. Tente novamente.' });
    }
  });

  // 1. Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      time: new Date().toISOString(),
      supabaseConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      abatePayConfigured: Boolean(process.env.ABACATEPAY_API_KEY || process.env.ABATEPAY_TOKEN),
      webPushConfigured
    });
  });

  app.get('/api/public-config', (_req, res) => {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.json({
      url: url?.replace(/\/$/, '') || null,
      anonKey: anonKey || null,
      appUrl: process.env.PUBLIC_APP_URL || null,
      webPushPublicKey: webPushConfigured ? webPushPublicKey : null
    });
  });

  const registerAuthenticatedProfile = async (req: express.Request, res: express.Response) => {
    try {
      const authUser = await getSupabaseUserFromRequest(req);
      const email = normalizeEmail(authUser?.email);
      if (!authUser?.id || !email || !authUser.email_confirmed_at) {
        return res.status(401).json({ error: 'Confirme seu e-mail e entre novamente para concluir o cadastro.' });
      }
      if (isRateLimited(`auth-profile:${authUser.id}`, 10, 60_000)) {
        return res.status(429).json({ error: 'Muitas tentativas. Aguarde e tente novamente.' });
      }

      const metadata = authUser.user_metadata || {};
      const locationConsent = req.body?.locationConsent === true;
      const submittedName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
      const metadataName = typeof metadata.full_name === 'string'
        ? metadata.full_name
        : typeof metadata.name === 'string' ? metadata.name : '';
      const savedProfileResponse = await supabaseServiceRequest(
        `profiles?auth_user_id=eq.${encodeURIComponent(authUser.id)}&select=id,email,photo_url&limit=1`
      );
      if (!savedProfileResponse.ok) {
        throw new Error(`Supabase profile lookup failed (${savedProfileResponse.status}): ${await savedProfileResponse.text()}`);
      }
      let existingProfile = (await savedProfileResponse.json() as Record<string, unknown>[])[0] || null;
      if (!existingProfile) {
        const emailProfileResponse = await supabaseServiceRequest(
          `profiles?email=ilike.${encodeURIComponent(email)}&select=id,email,photo_url&limit=1`
        );
        if (!emailProfileResponse.ok) {
          throw new Error(`Supabase profile lookup failed (${emailProfileResponse.status}): ${await emailProfileResponse.text()}`);
        }
        existingProfile = (await emailProfileResponse.json() as Record<string, unknown>[])[0] || null;
      }
      const profilePayload = {
        p_id: authUser.id,
        p_email: email,
        p_full_name: submittedName || metadataName || null,
        p_photo_url: existingProfile?.photo_url || metadata.avatar_url || metadata.picture || null,
        p_location_consent: locationConsent,
        p_ip_country: locationConsent ? req.body?.ip_country || null : null,
        p_ip_region: locationConsent ? req.body?.ip_region || null : null,
        p_ip_city: locationConsent ? req.body?.ip_city || null : null
      };
      const profileResponse = await supabaseServiceRequest('rpc/register_google_profile', {
        method: 'POST',
        body: JSON.stringify(profilePayload)
      });
      if (!profileResponse.ok) {
        const details = await profileResponse.text();
        console.warn('Supabase profile registration RPC failed; attempting direct profile registration:', profileResponse.status, details);
        const profile = await registerAuthenticatedProfileDirectly({
          id: authUser.id,
          email,
          fullName: submittedName || metadataName,
          photoUrl: typeof (metadata.avatar_url || metadata.picture) === 'string' ? String(metadata.avatar_url || metadata.picture) : null,
          locationConsent,
          ipCountry: locationConsent && typeof req.body?.ip_country === 'string' ? req.body.ip_country : null,
          ipRegion: locationConsent && typeof req.body?.ip_region === 'string' ? req.body.ip_region : null,
          ipCity: locationConsent && typeof req.body?.ip_city === 'string' ? req.body.ip_city : null
        });
        return res.status(200).json({ profile });
      }

      const result = await profileResponse.json() as Record<string, unknown>[];
      const profile = Array.isArray(result) ? result[0] : result;
      if (!profile) return res.status(502).json({ error: 'Supabase não retornou o perfil criado.' });
      return res.status(200).json({ profile });
    } catch (error: any) {
      console.error('Authenticated profile registration failed:', error.message);
      return res.status(502).json({
        error: 'Sua conta Google foi autenticada, mas não foi possível salvar o perfil agora. Tente novamente; você não precisa criar outra conta.'
      });
    }
  };
  app.post('/api/auth/profile', registerAuthenticatedProfile);
  app.post('/api/auth/google/profile', registerAuthenticatedProfile);

  app.post('/api/auth/profile/details', async (req, res) => {
    try {
      const authUser = await getSupabaseUserFromRequest(req);
      if (!authUser?.id || !authUser.email_confirmed_at) {
        return res.status(401).json({ error: 'Confirme seu e-mail e entre novamente para salvar o perfil.' });
      }
      if (isRateLimited(`auth-profile-details:${authUser.id}`, 10, 60_000)) {
        return res.status(429).json({ error: 'Muitas tentativas. Aguarde e tente novamente.' });
      }

      const fields = {
        first_name: typeof req.body?.firstName === 'string' ? req.body.firstName.trim() : '',
        last_name: typeof req.body?.lastName === 'string' ? req.body.lastName.trim() : '',
        profile_state: typeof req.body?.state === 'string' ? req.body.state.trim() : '',
        profile_city: typeof req.body?.city === 'string' ? req.body.city.trim() : '',
        profile_country: typeof req.body?.country === 'string' ? req.body.country.trim() : ''
      };
      if (
        !fields.first_name || fields.first_name.length > 80 ||
        !fields.last_name || fields.last_name.length > 80 ||
        !fields.profile_state || fields.profile_state.length > 100 ||
        !fields.profile_city || fields.profile_city.length > 100 ||
        !fields.profile_country || fields.profile_country.length > 100
      ) {
        return res.status(400).json({ error: 'Preencha nome, sobrenome, estado/região, cidade e país.' });
      }

      const photoUrl = typeof req.body?.photoUrl === 'string' ? req.body.photoUrl : null;
      const validPhotoUrl = !photoUrl ||
        (photoUrl.length <= 70_000 &&
          (/^https:\/\/[^\s]+$/i.test(photoUrl) ||
            /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(photoUrl)));
      if (!validPhotoUrl) {
        return res.status(400).json({ error: 'A foto não é válida ou ficou grande demais. Escolha outra imagem.' });
      }

      const profileResponse = await supabaseServiceRequest('rpc/save_bia_student_profile', {
        method: 'POST',
        body: JSON.stringify({
          p_auth_user_id: authUser.id,
          p_first_name: fields.first_name,
          p_last_name: fields.last_name,
          p_profile_state: fields.profile_state,
          p_profile_city: fields.profile_city,
          p_profile_country: fields.profile_country,
          p_photo_url: photoUrl
        })
      });
      if (!profileResponse.ok) {
        console.error('Student profile save failed:', profileResponse.status, await profileResponse.text());
        return res.status(502).json({ error: 'Não foi possível salvar o perfil. Tente novamente em instantes.' });
      }

      const result = await profileResponse.json() as Record<string, unknown>[];
      const profile = Array.isArray(result) ? result[0] : result;
      if (!profile) return res.status(502).json({ error: 'O servidor não confirmou o perfil salvo.' });
      return res.json({ profile });
    } catch (error: any) {
      console.error('Student profile save failed:', error.message);
      return res.status(500).json({ error: 'Falha ao salvar o perfil. Tente novamente.' });
    }
  });

  app.get('/api/trial-coupons/:code', async (req, res) => {
    try {
      const code = typeof req.params.code === 'string' ? req.params.code.trim().toUpperCase() : '';
      if (!/^[A-Z0-9-]{4,100}$/.test(code)) return res.status(400).json({ error: 'Cupom inválido.' });
      if (isRateLimited(`trial-coupon-check:${req.ip}`, 30, 60_000)) {
        return res.status(429).json({ error: 'Muitas tentativas de validação. Aguarde um minuto.' });
      }

      const response = await supabaseServiceRequest('rpc/check_trial_coupon', {
        method: 'POST',
        body: JSON.stringify({ requested_code: code })
      });
      if (!response.ok) {
        console.error('Trial coupon lookup failed:', response.status, await response.text());
        return res.status(502).json({ error: 'Não foi possível validar o cupom no servidor.' });
      }
      const result = await response.json() as { ok?: boolean; coupon?: Record<string, unknown> };
      if (!result.ok || !result.coupon) return res.status(404).json({ error: 'Cupom inválido, expirado ou já utilizado.' });
      return res.status(200).json({ coupon: result.coupon });
    } catch (error: any) {
      console.error('Trial coupon lookup failed:', error.message);
      return res.status(500).json({ error: 'Falha ao validar o cupom.' });
    }
  });

  const redeemAuthenticatedCoupon = async (req: express.Request, res: express.Response) => {
    try {
      const authUser = await getSupabaseUserFromRequest(req);
      const email = normalizeEmail(authUser?.email);
      const code = typeof req.body?.code === 'string' ? req.body.code.trim().toUpperCase() : '';
      if (!authUser?.id || !email || !authUser.email_confirmed_at) {
        return res.status(401).json({ error: 'Confirme seu e-mail e entre novamente para resgatar o cupom.' });
      }
      if (isRateLimited(`auth-coupon:${authUser.id}`, 8, 60_000)) {
        return res.status(429).json({ error: 'Muitas tentativas de cupom. Aguarde e tente novamente.' });
      }
      if (!/^[A-Z0-9-]{4,100}$/.test(code)) return res.status(400).json({ error: 'Cupom inválido.' });

      const response = await supabaseServiceRequest('rpc/redeem_google_trial_coupon', {
        method: 'POST',
        body: JSON.stringify({ p_code: code, p_email: email, p_user_id: authUser.id })
      });
      if (!response.ok) {
        console.error('Authenticated coupon redemption failed:', response.status, await response.text());
        return res.status(502).json({ error: 'Não foi possível resgatar o cupom no servidor.' });
      }
      return res.status(200).json(await response.json());
    } catch (error: any) {
      console.error('Authenticated coupon redemption failed:', error.message);
      return res.status(500).json({ error: 'Falha ao resgatar o cupom.' });
    }
  };
  app.post('/api/auth/redeem-coupon', redeemAuthenticatedCoupon);
  app.post('/api/auth/google/redeem-coupon', redeemAuthenticatedCoupon);

  const getVerifiedCeo = async (req: express.Request) => {
    const authUser = await getSupabaseUserFromRequest(req);
    if (!authUser?.id || !authUser.email_confirmed_at || normalizeEmail(authUser.email) !== CEO_EMAIL) return null;
    return authUser;
  };

  app.get('/api/admin/subscribers', async (req, res) => {
    try {
      const authUser = await getVerifiedCeo(req);
      if (!authUser) return res.status(403).json({ error: 'Somente a conta CEO pode consultar os assinantes.' });

      const profileFields = [
        'id', 'auth_user_id', 'email', 'full_name', 'first_name', 'last_name',
        'profile_state', 'profile_city', 'profile_country', 'photo_url',
        'location_consent', 'role', 'status', 'data_expiracao', 'permissions',
        'email_verified', 'ip_country', 'ip_region', 'ip_city', 'cupom_usado',
        'created_at', 'updated_at'
      ].join(',');
      const profiles: Record<string, unknown>[] = [];
      const pageSize = 500;
      for (let offset = 0; ; offset += pageSize) {
        const response = await supabaseServiceRequest(
          `profiles?role=eq.student&select=${profileFields}&order=id.asc&limit=${pageSize}&offset=${offset}`
        );
        if (!response.ok) {
          console.error('Admin subscriber profile lookup failed:', response.status, await response.text());
          return res.status(502).json({ error: 'Não foi possível carregar os perfis dos assinantes.' });
        }
        const page = await response.json() as Record<string, unknown>[];
        profiles.push(...page);
        if (page.length < pageSize) break;
      }

      const accountIds = [...new Set(profiles.flatMap((profile) => [
        typeof profile.id === 'string' ? profile.id : '',
        typeof profile.auth_user_id === 'string' ? profile.auth_user_id : ''
      ]).filter(Boolean))];
      const subscriptions: Record<string, unknown>[] = [];
      for (let index = 0; index < accountIds.length; index += 100) {
        const ids = accountIds.slice(index, index + 100);
        const response = await supabaseServiceRequest(
          `bia_subscription_profiles?user_id=in.(${ids.map(encodeURIComponent).join(',')})&select=user_id,email,status,subscription_expires_at,updated_at`
        );
        if (!response.ok) {
          console.error('Admin subscriber subscription lookup failed:', response.status, await response.text());
          return res.status(502).json({ error: 'Não foi possível confirmar as assinaturas dos alunos.' });
        }
        subscriptions.push(...await response.json() as Record<string, unknown>[]);
      }

      const profileEmails = [...new Set(profiles
        .map((profile) => normalizeEmail(profile.email))
        .filter((email) => email && email !== CEO_EMAIL))];
      for (let index = 0; index < profileEmails.length; index += 100) {
        const emails = profileEmails.slice(index, index + 100);
        const response = await supabaseServiceRequest(
          `bia_subscription_profiles?email=in.(${emails.map((email) => `"${encodeURIComponent(email)}"`).join(',')})&select=user_id,email,status,subscription_expires_at,updated_at`
        );
        if (!response.ok) {
          console.error('Admin subscriber subscription lookup failed:', response.status, await response.text());
          return res.status(502).json({ error: 'Não foi possível confirmar as assinaturas dos alunos.' });
        }
        subscriptions.push(...await response.json() as Record<string, unknown>[]);
      }

      const subscriptionByUserId = new Map<string, Record<string, unknown>>();
      const subscriptionByEmail = new Map<string, Record<string, unknown>>();
      for (const subscription of subscriptions) {
        const userId = typeof subscription.user_id === 'string' ? subscription.user_id : '';
        const email = normalizeEmail(subscription.email);
        const currentUpdatedAt = typeof subscription.updated_at === 'string' ? Date.parse(subscription.updated_at) : 0;
        const previousByUserId = subscriptionByUserId.get(userId);
        const previousByEmail = subscriptionByEmail.get(email);
        const previousUserUpdatedAt = typeof previousByUserId?.updated_at === 'string' ? Date.parse(previousByUserId.updated_at) : 0;
        const previousEmailUpdatedAt = typeof previousByEmail?.updated_at === 'string' ? Date.parse(previousByEmail.updated_at) : 0;
        if (userId && (!previousByUserId || currentUpdatedAt >= previousUserUpdatedAt)) {
          subscriptionByUserId.set(userId, subscription);
        }
        if (email && (!previousByEmail || currentUpdatedAt >= previousEmailUpdatedAt)) {
          subscriptionByEmail.set(email, subscription);
        }
      }

      profiles.sort((left, right) => {
        const updatedAt = (profile: Record<string, unknown>) => {
          const raw = profile.updated_at || profile.created_at;
          const timestamp = typeof raw === 'string' ? Date.parse(raw) : Number.NaN;
          return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
        };
        return updatedAt(right) - updatedAt(left);
      });

      const seenStudents = new Set<string>();
      const students = profiles.flatMap((profile) => {
        const email = normalizeEmail(profile.email);
        const id = typeof profile.id === 'string' ? profile.id : '';
        const authUserId = typeof profile.auth_user_id === 'string' ? profile.auth_user_id : '';
        const identity = authUserId
          ? authUserId
          : id || email;
        if (!email || email === CEO_EMAIL || !identity || seenStudents.has(identity) || seenStudents.has(email)) return [];
        seenStudents.add(identity);
        seenStudents.add(email);

        const emailSubscription = subscriptionByEmail.get(email);
        const emailSubscriptionUserId = typeof emailSubscription?.user_id === 'string' ? emailSubscription.user_id : '';
        const emailSubscriptionBelongsToProfile = !emailSubscriptionUserId ||
          emailSubscriptionUserId === authUserId ||
          emailSubscriptionUserId === id;
        const subscription = subscriptionByUserId.get(authUserId) ||
          subscriptionByUserId.get(id) ||
          (emailSubscriptionBelongsToProfile ? emailSubscription : undefined);
        const expiresAt = typeof subscription?.subscription_expires_at === 'string' ? subscription.subscription_expires_at : null;
        const status = getAdminSubscriptionStatus(
          subscription?.status,
          subscription?.subscription_expires_at,
          profile.status,
          profile.data_expiracao
        );

        return [{
          ...profile,
          email,
          status,
          data_expiracao: expiresAt
        }];
      });

      res.setHeader('Cache-Control', 'no-store');
      return res.json({ subscribers: students });
    } catch (error: any) {
      console.error('Admin subscriber list failed:', error?.message || error);
      return res.status(500).json({ error: 'Falha ao carregar os assinantes.' });
    }
  });

  app.post('/api/admin/subscribers/:id/subscription', async (req, res) => {
    try {
      const authUser = await getVerifiedCeo(req);
      if (!authUser) return res.status(403).json({ error: 'Somente a conta CEO pode alterar assinaturas.' });
      if (isRateLimited(`admin-subscription:${authUser.id}`, 60, 60_000)) {
        return res.status(429).json({ error: 'Muitas alterações de assinatura. Aguarde um momento.' });
      }

      const userId = req.params.id;
      if (!userId || userId.length > 200) return res.status(400).json({ error: 'Identificador de aluno inválido.' });
      const hasDays = Object.prototype.hasOwnProperty.call(req.body || {}, 'days');
      const days = hasDays ? Number(req.body.days) : null;
      const status = typeof req.body?.status === 'string' ? req.body.status : null;
      if (
        (hasDays && (!Number.isInteger(days) || days! < 1 || days! > 3650 || status !== null)) ||
        (!hasDays && !['active', 'pending', 'expired'].includes(status || ''))
      ) {
        return res.status(400).json({ error: 'Informe dias válidos ou um status de assinatura permitido.' });
      }

      const response = await supabaseServiceRequest('rpc/admin_manage_bia_subscription', {
        method: 'POST',
        body: JSON.stringify({ p_user_id: userId, p_status: status, p_days: days })
      });
      if (!response.ok) {
        console.error('Admin subscription update failed:', response.status, await response.text());
        return res.status(502).json({ error: 'Não foi possível salvar a assinatura do aluno.' });
      }

      const result = await response.json() as {
        ok: boolean;
        reason?: string;
        status?: string;
        subscription_expires_at?: string | null;
      };
      if (!result.ok) {
        const statusCode = result.reason === 'profile_not_found' ? 404 : 400;
        return res.status(statusCode).json({ error: 'O aluno não foi encontrado ou os dados da assinatura são inválidos.' });
      }
      return res.json({
        subscription: {
          status: result.status,
          data_expiracao: result.subscription_expires_at || null
        }
      });
    } catch (error: any) {
      console.error('Admin subscription update failed:', error?.message || error);
      return res.status(500).json({ error: 'Falha ao atualizar a assinatura.' });
    }
  });

  app.get('/api/admin/trial-coupons', async (req, res) => {
    try {
      const authUser = await getVerifiedCeo(req);
      if (!authUser) return res.status(403).json({ error: 'Somente a conta CEO pode gerenciar cupons.' });
      const response = await supabaseServiceRequest(
        'bia_trial_coupons?select=id,code,days,is_used,used_by_email,used_at,expires_at,notes,created_at&order=created_at.desc'
      );
      if (!response.ok) {
        console.error('Admin trial coupon list failed:', response.status, await response.text());
        return res.status(502).json({ error: 'Não foi possível carregar os cupons compartilhados.' });
      }
      return res.json({ coupons: await response.json() });
    } catch (error: any) {
      console.error('Admin trial coupon list failed:', error.message);
      return res.status(500).json({ error: 'Falha ao carregar os cupons.' });
    }
  });

  app.post('/api/admin/trial-coupons', async (req, res) => {
    try {
      const authUser = await getVerifiedCeo(req);
      if (!authUser) return res.status(403).json({ error: 'Somente a conta CEO pode gerenciar cupons.' });
      if (isRateLimited(`admin-coupons:${authUser.id}`, 30, 60_000)) {
        return res.status(429).json({ error: 'Muitos cupons criados. Aguarde um momento.' });
      }
      const code = typeof req.body?.code === 'string' ? req.body.code.trim().toUpperCase() : '';
      const days = Number(req.body?.days);
      const id = typeof req.body?.id === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(req.body.id)
        ? req.body.id
        : `coupon_${randomUUID()}`;
      const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim().slice(0, 200) : null;
      const expiresAt = req.body?.expires_at == null ? null : String(req.body.expires_at);
      if (!/^[A-Z0-9-]{4,100}$/.test(code) || days !== 2) {
        return res.status(400).json({ error: 'Código inválido. Cupons de degustação concedem exatamente 2 dias.' });
      }
      if (expiresAt && !Number.isFinite(Date.parse(expiresAt))) {
        return res.status(400).json({ error: 'Data de expiração inválida.' });
      }

      const response = await supabaseServiceRequest('bia_trial_coupons', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          id,
          code,
          days: 2,
          is_used: false,
          notes,
          expires_at: expiresAt
        })
      });
      if (response.status === 409) return res.status(409).json({ error: 'Este código de cupom já existe.' });
      if (!response.ok) {
        console.error('Admin trial coupon creation failed:', response.status, await response.text());
        return res.status(502).json({ error: 'Não foi possível salvar o cupom compartilhado.' });
      }
      const coupons = await response.json() as Record<string, unknown>[];
      return res.status(201).json({ coupon: coupons[0] });
    } catch (error: any) {
      console.error('Admin trial coupon creation failed:', error.message);
      return res.status(500).json({ error: 'Falha ao criar o cupom.' });
    }
  });

  app.delete('/api/admin/trial-coupons/:id', async (req, res) => {
    try {
      const authUser = await getVerifiedCeo(req);
      if (!authUser) return res.status(403).json({ error: 'Somente a conta CEO pode gerenciar cupons.' });
      const id = req.params.id;
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) return res.status(400).json({ error: 'Identificador de cupom inválido.' });

      const response = await supabaseServiceRequest(
        `bia_trial_coupons?id=eq.${encodeURIComponent(id)}&is_used=eq.false`,
        { method: 'DELETE', headers: { Prefer: 'return=representation' } }
      );
      if (!response.ok) {
        console.error('Admin trial coupon deletion failed:', response.status, await response.text());
        return res.status(502).json({ error: 'Não foi possível excluir o cupom.' });
      }
      const deletedCoupons = await response.json() as unknown[];
      if (deletedCoupons.length === 0) return res.status(404).json({ error: 'Cupom não encontrado ou já utilizado.' });
      return res.json({ ok: true });
    } catch (error: any) {
      console.error('Admin trial coupon deletion failed:', error.message);
      return res.status(500).json({ error: 'Falha ao excluir o cupom.' });
    }
  });

  // Brazilian Post: guarda apenas o link do post/reel no Instagram (sem armazenar vídeo na plataforma).
  const STORY_CATEGORIES = new Set(['challenge', 'episoden', 'readclub', 'expression', 'routine']);
  const INSTAGRAM_POST_URL = /^https:\/\/(?:www\.)?instagram\.com\/(p|reel|reels|tv)\/([A-Za-z0-9_-]{5,30})\/?(?:[?#].*)?$/i;
  const STORY_LINK_DAYS = 7;
  const STORY_RECORD_DAYS = 30;
  let lastStoryCleanup = 0;

  // Após 7 dias o link vira só um registro (nome, país, estado); após 30 dias o registro é apagado. Roda no máximo 1x/hora.
  const cleanupExpiredStories = async () => {
    if (Date.now() - lastStoryCleanup < 60 * 60_000) return;
    lastStoryCleanup = Date.now();
    try {
      const recordCutoff = new Date(Date.now() - STORY_RECORD_DAYS * 86_400_000).toISOString();
      await supabaseServiceRequest(`stories?created_at=lt.${encodeURIComponent(recordCutoff)}`, { method: 'DELETE' });

      const linkCutoff = new Date(Date.now() - STORY_LINK_DAYS * 86_400_000).toISOString();
      const expiredResponse = await supabaseServiceRequest(
        `stories?created_at=lt.${encodeURIComponent(linkCutoff)}&or=${encodeURIComponent('(video_url.not.is.null,title.neq.Registro)')}&select=id,student_id&limit=200`
      );
      if (!expiredResponse.ok) return;
      const expired = await expiredResponse.json() as { id: string; student_id?: string }[];
      if (expired.length === 0) return;

      const studentIds = [...new Set(expired.map((row) => row.student_id).filter((id): id is string => isFriendUserIdLike(id)))];
      const locations = new Map<string, string>();
      if (studentIds.length > 0) {
        const profilesResponse = await supabaseServiceRequest(
          `profiles?auth_user_id=in.(${studentIds.join(',')})&select=auth_user_id,ip_country,ip_region`
        );
        if (profilesResponse.ok) {
          const profiles = await profilesResponse.json() as { auth_user_id: string; ip_country?: string | null; ip_region?: string | null }[];
          profiles.forEach((profile) => {
            locations.set(profile.auth_user_id, [profile.ip_country, profile.ip_region].filter(Boolean).join(' · '));
          });
        }
      }

      await Promise.all(expired.map((row) => supabaseServiceRequest(`stories?id=eq.${encodeURIComponent(row.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          video_url: null,
          thumbnail_url: null,
          title: 'Registro',
          instagram_handle: null,
          prompt_used: (row.student_id && locations.get(row.student_id)) || ''
        })
      })));
    } catch (error: any) {
      console.warn('Story cleanup failed:', error.message);
    }
  };
  const isFriendUserIdLike = (value: unknown): value is string =>
    typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  const getVerifiedStoryUser = async (req: express.Request, res: express.Response) => {
    const authUser = await getSupabaseUserFromRequest(req);
    if (!authUser?.id || !authUser.email_confirmed_at) {
      res.status(401).json({ error: 'Entre novamente para usar o Brazilian Post.' });
      return null;
    }
    return authUser;
  };

  const isStoryAdmin = async (authUser: { id: string; email?: string }) => {
    if (normalizeEmail(authUser.email) === CEO_EMAIL) return true;
    const profile = await getAuthenticatedProfileByAuthId(authUser.id);
    return profile?.role === 'admin';
  };

  app.get('/api/stories', async (req, res) => {
    try {
      const authUser = await getVerifiedStoryUser(req, res);
      if (!authUser) return;
      const admin = await isStoryAdmin(authUser);
      void cleanupExpiredStories();
      const visibility = admin
        ? ''
        : `&or=${encodeURIComponent(`(status.in.(approved,featured),student_id.eq.${authUser.id})`)}`;
      const response = await supabaseServiceRequest(`stories?select=*&order=created_at.desc&limit=200${visibility}`);
      if (!response.ok) {
        console.error('Stories list failed:', response.status, await response.text());
        return res.status(502).json({ error: 'Não foi possível carregar os stories.' });
      }
      return res.json({ stories: await response.json(), isAdmin: admin });
    } catch (error: any) {
      console.error('Stories list failed:', error.message);
      return res.status(500).json({ error: 'Falha ao carregar os stories.' });
    }
  });

  app.post('/api/stories', async (req, res) => {
    try {
      const authUser = await getVerifiedStoryUser(req, res);
      if (!authUser) return;
      if (isRateLimited(`story-save:${authUser.id}`, 10, 10 * 60_000)) {
        return res.status(429).json({ error: 'Muitos envios seguidos. Aguarde alguns minutos.' });
      }
      const title = typeof req.body?.title === 'string' ? req.body.title.trim().slice(0, 120) : '';
      const category = typeof req.body?.category === 'string' ? req.body.category : '';
      const promptUsed = typeof req.body?.promptUsed === 'string' ? req.body.promptUsed.trim().slice(0, 120) : title;
      const postMatch = INSTAGRAM_POST_URL.exec(typeof req.body?.instagramUrl === 'string' ? req.body.instagramUrl.trim() : '');
      const instagramRaw = typeof req.body?.instagramHandle === 'string' ? req.body.instagramHandle.trim() : '';
      const instagramHandle = /^@?[A-Za-z0-9._]{1,30}$/.test(instagramRaw) ? `@${instagramRaw.replace(/^@/, '')}` : null;
      if (!title || !STORY_CATEGORIES.has(category) || !postMatch) {
        return res.status(400).json({ error: 'Cole o link de um post ou reel público do Instagram (instagram.com/reel/...).' });
      }
      const postType = postMatch[1].toLowerCase() === 'reels' ? 'reel' : postMatch[1].toLowerCase();
      const postUrl = `https://www.instagram.com/${postType}/${postMatch[2]}/`;

      const admin = await isStoryAdmin(authUser);
      const profile = await getAuthenticatedProfileByAuthId(authUser.id);
      const submittedName = admin && typeof req.body?.studentName === 'string' ? req.body.studentName.trim() : '';
      const studentName = (submittedName || String(profile?.full_name || authUser.email?.split('@')[0] || 'Aluno BIA')).slice(0, 80);
      const response = await supabaseServiceRequest('stories', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          id: `story-${randomUUID()}`,
          student_id: authUser.id,
          student_name: studentName,
          title,
          category,
          prompt_used: promptUsed,
          video_url: postUrl,
          status: admin ? 'featured' : 'pending',
          likes_count: 0,
          instagram_handle: instagramHandle
        })
      });
      if (!response.ok) {
        console.error('Story save failed:', response.status, await response.text());
        return res.status(502).json({ error: 'Não foi possível salvar o story.' });
      }
      const rows = await response.json() as Record<string, unknown>[];
      return res.status(201).json({ story: rows[0] });
    } catch (error: any) {
      console.error('Story save failed:', error.message);
      return res.status(500).json({ error: 'Falha ao salvar o story.' });
    }
  });

  app.post('/api/stories/:id/status', async (req, res) => {
    try {
      const authUser = await getVerifiedStoryUser(req, res);
      if (!authUser) return;
      if (!(await isStoryAdmin(authUser))) return res.status(403).json({ error: 'Somente a equipe BIA pode moderar stories.' });
      const id = req.params.id;
      const status = req.body?.status;
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id) || !['approved', 'featured'].includes(status)) {
        return res.status(400).json({ error: 'Dados de moderação inválidos.' });
      }
      const response = await supabaseServiceRequest(`stories?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ status })
      });
      if (!response.ok) {
        console.error('Story moderation failed:', response.status, await response.text());
        return res.status(502).json({ error: 'Não foi possível atualizar o story.' });
      }
      return res.json({ ok: true });
    } catch (error: any) {
      console.error('Story moderation failed:', error.message);
      return res.status(500).json({ error: 'Falha ao moderar o story.' });
    }
  });

  app.delete('/api/stories/:id', async (req, res) => {
    try {
      const authUser = await getVerifiedStoryUser(req, res);
      if (!authUser) return;
      const id = req.params.id;
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) return res.status(400).json({ error: 'Identificador inválido.' });

      const lookup = await supabaseServiceRequest(`stories?id=eq.${encodeURIComponent(id)}&select=student_id&limit=1`);
      if (!lookup.ok) return res.status(502).json({ error: 'Não foi possível localizar o story.' });
      const story = (await lookup.json() as { student_id?: string }[])[0];
      if (!story) return res.status(404).json({ error: 'Story não encontrado.' });
      if (story.student_id !== authUser.id && !(await isStoryAdmin(authUser))) {
        return res.status(403).json({ error: 'Você não pode excluir este story.' });
      }

      const response = await supabaseServiceRequest(`stories?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!response.ok) {
        console.error('Story deletion failed:', response.status, await response.text());
        return res.status(502).json({ error: 'Não foi possível excluir o story.' });
      }
      return res.json({ ok: true });
    } catch (error: any) {
      console.error('Story deletion failed:', error.message);
      return res.status(500).json({ error: 'Falha ao excluir o story.' });
    }
  });

  const friendsProfileFields = 'id,full_name,photo_url,status_message,first_name,last_name,profile_state,profile_city,profile_country';
  const friendsMessageFields = 'id,sender_id,receiver_id,body,created_at,expires_at';
  const isFriendUserId = (value: unknown): value is string =>
    typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  const isFriendCallRoomName = (value: unknown): value is string =>
    typeof value === 'string' &&
    /^brazilian-friends-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  const sendFriendsPushNotification = async (
    recipientId: string,
    payload: {
      title: string;
      body: string;
      url: string;
      tag?: string;
      requireInteraction?: boolean;
      actions?: { action: string; title: string }[];
    }
  ) => {
    if (!webPushConfigured) return;

    try {
      const query = new URLSearchParams({
        select: 'endpoint,subscription',
        user_id: `eq.${recipientId}`
      });
      const subscriptionsResponse = await supabaseServiceRequest(
        `brazilian_friends_push_subscriptions?${query.toString()}`
      );
      if (!subscriptionsResponse.ok) {
        console.error('Private notification subscription lookup failed:', subscriptionsResponse.status, await subscriptionsResponse.text());
        return;
      }

      const subscriptions = await subscriptionsResponse.json() as {
        endpoint: string;
        subscription: webPush.PushSubscription;
      }[];
      const deliveries = await Promise.allSettled(subscriptions.map(({ subscription }) =>
        webPush.sendNotification(subscription, JSON.stringify(payload), { TTL: 60, urgency: 'high' })
      ));
      const expiredEndpoints: string[] = [];
      deliveries.forEach((delivery, index) => {
        if (delivery.status !== 'rejected') return;
        console.error('Private notification delivery failed:', delivery.reason);
        if (delivery.reason instanceof webPush.WebPushError && [404, 410].includes(delivery.reason.statusCode)) {
          expiredEndpoints.push(subscriptions[index].endpoint);
        }
      });

      if (expiredEndpoints.length > 0) {
        const staleQuery = new URLSearchParams({
          endpoint: `in.(${expiredEndpoints.join(',')})`
        });
        const cleanupResponse = await supabaseServiceRequest(
          `brazilian_friends_push_subscriptions?${staleQuery.toString()}`,
          { method: 'DELETE' }
        );
        if (!cleanupResponse.ok) {
          console.error('Expired private notification subscription cleanup failed:', cleanupResponse.status, await cleanupResponse.text());
        }
      }
    } catch (error) {
      console.error('Private notification delivery failed:', error);
    }
  };

  app.post('/api/admin/updates-push', async (req, res) => {
    try {
      const authUser = await getSupabaseUserFromRequest(req);
      const email = normalizeEmail(authUser?.email);
      const authorizedEmails = [
        CEO_EMAIL,
        'brazilianinaction@gmail.com',
        'brazilianinactionidiomas@gmail.com'
      ];
      if (!authUser?.id || !authUser.email_confirmed_at || !email || !authorizedEmails.includes(email)) {
        return res.status(403).json({ error: 'Somente uma conta administrativa autorizada pode publicar avisos.' });
      }
      if (isRateLimited(`admin-updates-push:${authUser.id}`, 5, 5 * 60_000)) {
        return res.status(429).json({ error: 'Muitos avisos enviados. Aguarde antes de publicar outro.' });
      }
      if (!webPushConfigured) {
        return res.status(503).json({ error: 'As notificações para o telefone ainda não estão configuradas.' });
      }

      const title = typeof req.body?.title === 'string' ? req.body.title.trim().slice(0, 80) : '';
      const body = typeof req.body?.body === 'string' ? req.body.body.trim().slice(0, 1200) : '';
      if (!title || !body) return res.status(400).json({ error: 'O título e o texto do aviso são obrigatórios.' });

      const response = await supabaseServiceRequest('brazilian_friends_push_subscriptions?select=user_id');
      if (!response.ok) {
        console.error('Platform update notification subscriber lookup failed:', response.status, await response.text());
        return res.status(502).json({ error: 'Não foi possível localizar os dispositivos inscritos.' });
      }
      const subscriptions = await response.json() as { user_id: string }[];
      const recipients = [...new Set(subscriptions.map((subscription) => subscription.user_id).filter(Boolean))];
      await Promise.all(recipients.map((recipientId) => sendFriendsPushNotification(recipientId, {
        title: `Brazilian in Action · ${title}`,
        body,
        url: '/'
      })));
      return res.json({ ok: true, recipientCount: recipients.length });
    } catch (error) {
      console.error('Platform update notification broadcast failed:', error);
      return res.status(500).json({ error: 'Falha ao enviar notificações da plataforma.' });
    }
  });

  app.post('/api/friends/profile', async (req, res) => {
    try {
      const authUser = await getSupabaseUserFromRequest(req);
      const email = normalizeEmail(authUser?.email);
      if (!authUser?.id || !email || !authUser.email_confirmed_at) {
        return res.status(401).json({ error: 'Conecte sua conta Google para usar o chat.' });
      }
      if (isRateLimited(`friends-profile:${authUser.id}`, 30, 60_000)) {
        return res.status(429).json({ error: 'Muitas atualizações de perfil. Aguarde um momento.' });
      }

      const fullName = typeof req.body?.full_name === 'string'
        ? req.body.full_name.trim().slice(0, 80)
        : '';
      const photoUrl = typeof req.body?.photo_url === 'string' && req.body.photo_url.length <= 2_000_000
        ? req.body.photo_url
        : null;
      const statusMessage = typeof req.body?.status_message === 'string'
        ? req.body.status_message.trim().slice(0, 140) || null
        : null;
      if (!fullName) return res.status(400).json({ error: 'Nome de perfil inválido.' });

      const profileResponse = await supabaseServiceRequest('brazilian_friends_users?on_conflict=id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({
          id: authUser.id,
          email,
          full_name: fullName,
          photo_url: photoUrl,
          status_message: statusMessage,
          updated_at: new Date().toISOString()
        })
      });
      if (!profileResponse.ok) {
        console.error('Brazilian Friends profile persistence failed:', profileResponse.status, await profileResponse.text());
        return res.status(502).json({ error: 'Não foi possível salvar seu perfil do chat.' });
      }
      const profiles = await profileResponse.json() as Record<string, unknown>[];
      return res.json({ profile: profiles[0] || null });
    } catch (error: any) {
      console.error('Brazilian Friends profile endpoint failed:', error.message);
      return res.status(500).json({ error: 'Falha ao salvar o perfil do chat.' });
    }
  });

  app.get('/api/friends/profiles', async (req, res) => {
    try {
      const authUser = await getSupabaseUserFromRequest(req);
      if (!authUser?.id || !authUser.email_confirmed_at) {
        return res.status(401).json({ error: 'Conecte sua conta Google para usar o chat.' });
      }
      if (isRateLimited(`friends-profiles:${authUser.id}`, 60, 60_000)) {
        return res.status(429).json({ error: 'Muitas consultas de perfis. Aguarde um momento.' });
      }

      const profilesResponse = await supabaseServiceRequest(
        `brazilian_friends_users?select=${friendsProfileFields}&order=full_name.asc`
      );
      if (!profilesResponse.ok) {
        console.error('Brazilian Friends profile read failed:', profilesResponse.status, await profilesResponse.text());
        return res.status(502).json({ error: 'Não foi possível carregar os perfis do chat.' });
      }
      return res.json({ profiles: await profilesResponse.json() });
    } catch (error: any) {
      console.error('Brazilian Friends profiles endpoint failed:', error.message);
      return res.status(500).json({ error: 'Falha ao carregar os perfis do chat.' });
    }
  });

  app.post('/api/friends/push-subscriptions', async (req, res) => {
    try {
      const authUser = await getSupabaseUserFromRequest(req);
      if (!authUser?.id || !authUser.email_confirmed_at) {
        return res.status(401).json({ error: 'Conecte sua conta para ativar notificações privadas.' });
      }
      if (!webPushConfigured) return res.status(503).json({ error: 'As notificações push ainda não estão configuradas no servidor.' });
      if (isRateLimited(`friends-push-subscription:${authUser.id}`, 10, 60_000)) {
        return res.status(429).json({ error: 'Muitas alterações de notificações. Aguarde um momento.' });
      }

      const endpoint = typeof req.body?.endpoint === 'string' ? req.body.endpoint.trim() : '';
      const p256dh = typeof req.body?.keys?.p256dh === 'string' ? req.body.keys.p256dh : '';
      const auth = typeof req.body?.keys?.auth === 'string' ? req.body.keys.auth : '';
      let isSecureEndpoint = false;
      try {
        isSecureEndpoint = new URL(endpoint).protocol === 'https:';
      } catch {
        isSecureEndpoint = false;
      }
      if (!isSecureEndpoint || endpoint.length > 2048 || !p256dh || p256dh.length > 256 || !auth || auth.length > 256) {
        return res.status(400).json({ error: 'Inscrição de notificações inválida.' });
      }

      const subscription: webPush.PushSubscription = {
        endpoint,
        expirationTime: typeof req.body?.expirationTime === 'number' ? req.body.expirationTime : null,
        keys: { p256dh, auth }
      };
      const query = new URLSearchParams({ on_conflict: 'endpoint' });
      const response = await supabaseServiceRequest(`brazilian_friends_push_subscriptions?${query.toString()}`, {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({
          user_id: authUser.id,
          endpoint,
          subscription,
          updated_at: new Date().toISOString()
        })
      });
      if (!response.ok) {
        console.error('Brazilian Friends push subscription save failed:', response.status, await response.text());
        return res.status(502).json({ error: 'Não foi possível ativar as notificações.' });
      }
      return res.json({ ok: true });
    } catch (error: any) {
      console.error('Brazilian Friends push subscription save failed:', error.message);
      return res.status(500).json({ error: 'Falha ao ativar as notificações.' });
    }
  });

  app.delete('/api/friends/push-subscriptions', async (req, res) => {
    try {
      const authUser = await getSupabaseUserFromRequest(req);
      if (!authUser?.id || !authUser.email_confirmed_at) {
        return res.status(401).json({ error: 'Conecte sua conta para alterar as notificações.' });
      }
      const endpoint = typeof req.body?.endpoint === 'string' ? req.body.endpoint.trim() : '';
      if (!endpoint || endpoint.length > 2048) return res.status(400).json({ error: 'Inscrição de notificações inválida.' });

      const query = new URLSearchParams({
        user_id: `eq.${authUser.id}`,
        endpoint: `eq.${endpoint}`
      });
      const response = await supabaseServiceRequest(`brazilian_friends_push_subscriptions?${query.toString()}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        console.error('Brazilian Friends push subscription deletion failed:', response.status, await response.text());
        return res.status(502).json({ error: 'Não foi possível desativar as notificações.' });
      }
      return res.json({ ok: true });
    } catch (error: any) {
      console.error('Brazilian Friends push subscription deletion failed:', error.message);
      return res.status(500).json({ error: 'Falha ao desativar as notificações.' });
    }
  });

  app.get('/api/friends/call-invitations', async (req, res) => {
    try {
      const authUser = await getSupabaseUserFromRequest(req);
      if (!authUser?.id || !authUser.email_confirmed_at) {
        return res.status(401).json({ error: 'Conecte sua conta Google para ver convites.' });
      }
      if (isRateLimited(`friends-call-invitations:${authUser.id}`, 30, 60_000)) {
        return res.status(429).json({ error: 'Muitos pedidos de convites. Aguarde um momento.' });
      }

      const query = new URLSearchParams({
        select: 'id,room_name,inviter_id,created_at,expires_at',
        invitee_id: `eq.${authUser.id}`,
        status: 'eq.pending',
        expires_at: `gt.${new Date().toISOString()}`,
        order: 'created_at.desc',
        limit: '20'
      });
      const response = await supabaseServiceRequest(`brazilian_friends_call_invitations?${query.toString()}`);
      if (!response.ok) {
        console.error('Brazilian Friends call invitations read failed:', response.status, await response.text());
        return res.status(502).json({ error: 'Não foi possível carregar os convites de chamada.' });
      }
      return res.json({ invitations: await response.json() });
    } catch (error) {
      console.error('Brazilian Friends call invitations read failed:', error);
      return res.status(500).json({ error: 'Falha ao carregar os convites de chamada.' });
    }
  });

  app.post('/api/friends/call-invitations', async (req, res) => {
    try {
      const authUser = await getSupabaseUserFromRequest(req);
      if (!authUser?.id || !authUser.email_confirmed_at) {
        return res.status(401).json({ error: 'Conecte sua conta Google para convidar colegas.' });
      }
      if (isRateLimited(`friends-call-invite-send:${authUser.id}`, 10, 60_000)) {
        return res.status(429).json({ error: 'Muitos convites enviados. Aguarde um momento.' });
      }

      const roomName = req.body?.room_name;
      const requestedInvitees: unknown = req.body?.invitee_ids;
      if (!isFriendCallRoomName(roomName) || !Array.isArray(requestedInvitees) || requestedInvitees.length === 0 || requestedInvitees.length > 20) {
        return res.status(400).json({ error: 'Convite de chamada inválido.' });
      }
      if (!requestedInvitees.every(isFriendUserId)) {
        return res.status(400).json({ error: 'A lista de colegas contém um usuário inválido.' });
      }
      const inviteeIds = [...new Set(requestedInvitees as string[])];
      if (inviteeIds.includes(authUser.id)) {
        return res.status(400).json({ error: 'Você não pode convidar sua própria conta.' });
      }

      const profilesQuery = new URLSearchParams({
        select: 'id',
        id: `in.(${inviteeIds.join(',')})`
      });
      const profilesResponse = await supabaseServiceRequest(
        `brazilian_friends_users?${profilesQuery.toString()}`
      );
      if (!profilesResponse.ok) {
        console.error('Brazilian Friends call invitee lookup failed:', profilesResponse.status, await profilesResponse.text());
        return res.status(502).json({ error: 'Não foi possível verificar os colegas selecionados.' });
      }
      const profiles = await profilesResponse.json() as { id: string }[];
      if (profiles.length !== inviteeIds.length) {
        return res.status(400).json({ error: 'Um ou mais colegas selecionados não estão disponíveis.' });
      }

      const now = Date.now();
      const expiresAt = new Date(now + 60 * 60 * 1000).toISOString();
      const insertResponse = await supabaseServiceRequest(
        'brazilian_friends_call_invitations?on_conflict=room_name,invitee_id',
        {
        method: 'POST',
        headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
        body: JSON.stringify(inviteeIds.map((inviteeId) => ({
          room_name: roomName,
          inviter_id: authUser.id,
          invitee_id: inviteeId,
          expires_at: expiresAt
        })))
        }
      );
      if (!insertResponse.ok) {
        console.error('Brazilian Friends call invitation save failed:', insertResponse.status, await insertResponse.text());
        return res.status(502).json({ error: 'Não foi possível salvar os convites.' });
      }
      const invitations = await insertResponse.json() as {
        id: string;
        invitee_id: string;
        room_name: string;
      }[];
      const inviterQuery = new URLSearchParams({
        select: 'full_name',
        id: `eq.${authUser.id}`,
        limit: '1'
      });
      const inviterResponse = await supabaseServiceRequest(
        `brazilian_friends_users?${inviterQuery.toString()}`
      );
      let inviterName = authUser.email?.split('@')[0] || 'Um colega';
      if (inviterResponse.ok) {
        const inviterProfiles = await inviterResponse.json() as { full_name?: string | null }[];
        inviterName = inviterProfiles[0]?.full_name?.trim().slice(0, 80) || inviterName;
      } else {
        console.error('Brazilian Friends call inviter lookup failed:', inviterResponse.status, await inviterResponse.text());
      }

      await Promise.all(invitations.map((invitation) => sendFriendsPushNotification(invitation.invitee_id, {
        title: 'Convite para videochamada',
        body: `${inviterName} está ligando para você.`,
        url: `/?open=friends&callInvite=${encodeURIComponent(invitation.id)}`,
        tag: `brazilian-friends-call-${invitation.id}`,
        requireInteraction: true,
        actions: [
          { action: 'accept', title: 'Atender' },
          { action: 'decline', title: 'Recusar' }
        ]
      })));

      return res.status(201).json({
        invitations: invitations.map(({ id, invitee_id }) => ({ id, invitee_id })),
        expires_at: expiresAt
      });
    } catch (error) {
      console.error('Brazilian Friends call invitation creation failed:', error);
      return res.status(500).json({ error: 'Falha ao enviar os convites de chamada.' });
    }
  });

  app.post('/api/friends/call-invitations/:id/accept', async (req, res) => {
    try {
      const authUser = await getSupabaseUserFromRequest(req);
      if (!authUser?.id || !authUser.email_confirmed_at) {
        return res.status(401).json({ error: 'Conecte sua conta Google para aceitar o convite.' });
      }
      if (!isFriendUserId(req.params.id)) return res.status(400).json({ error: 'Convite inválido.' });

      const query = new URLSearchParams({
        id: `eq.${req.params.id}`,
        invitee_id: `eq.${authUser.id}`,
        status: 'eq.pending',
        expires_at: `gt.${new Date().toISOString()}`,
        select: 'id,room_name,inviter_id,created_at,expires_at'
      });
      const response = await supabaseServiceRequest(`brazilian_friends_call_invitations?${query.toString()}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ status: 'accepted', accepted_at: new Date().toISOString() })
      });
      if (!response.ok) {
        console.error('Brazilian Friends call invitation acceptance failed:', response.status, await response.text());
        return res.status(502).json({ error: 'Não foi possível aceitar o convite.' });
      }
      const invitations = await response.json() as Record<string, unknown>[];
      if (!invitations[0]) return res.status(404).json({ error: 'Este convite expirou ou não está mais disponível.' });
      return res.json({ invitation: invitations[0] });
    } catch (error) {
      console.error('Brazilian Friends call invitation acceptance failed:', error);
      return res.status(500).json({ error: 'Falha ao aceitar o convite.' });
    }
  });

  app.post('/api/friends/call-invitations/:id/decline', async (req, res) => {
    try {
      const authUser = await getSupabaseUserFromRequest(req);
      if (!authUser?.id || !authUser.email_confirmed_at) {
        return res.status(401).json({ error: 'Conecte sua conta Google para responder ao convite.' });
      }
      if (!isFriendUserId(req.params.id)) return res.status(400).json({ error: 'Convite inválido.' });

      const query = new URLSearchParams({
        id: `eq.${req.params.id}`,
        invitee_id: `eq.${authUser.id}`,
        status: 'eq.pending',
        select: 'id'
      });
      const response = await supabaseServiceRequest(`brazilian_friends_call_invitations?${query.toString()}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ status: 'declined' })
      });
      if (!response.ok) {
        console.error('Brazilian Friends call invitation decline failed:', response.status, await response.text());
        return res.status(502).json({ error: 'Não foi possível recusar o convite.' });
      }
      return res.json({ ok: true });
    } catch (error) {
      console.error('Brazilian Friends call invitation decline failed:', error);
      return res.status(500).json({ error: 'Falha ao recusar o convite.' });
    }
  });

  app.get('/api/friends/messages', async (req, res) => {
    try {
      const authUser = await getSupabaseUserFromRequest(req);
      if (!authUser?.id || !authUser.email_confirmed_at) {
        return res.status(401).json({ error: 'Conecte sua conta Google para usar o chat.' });
      }
      if (isRateLimited(`friends-messages-read:${authUser.id}`, 90, 60_000)) {
        return res.status(429).json({ error: 'Muitas consultas de mensagens. Aguarde um momento.' });
      }

      const recipientId = req.query.recipientId;
      const resource = isFriendUserId(recipientId)
        ? `brazilian_friends_messages?select=${friendsMessageFields}&or=(and(sender_id.eq.${authUser.id},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${authUser.id}))&order=created_at.asc&limit=200`
        : 'brazilian_friends_messages?select=id,sender_id,receiver_id,body,created_at,expires_at&receiver_id=is.null&order=created_at.asc&limit=200';
      const messagesResponse = await supabaseServiceRequest(resource);
      if (!messagesResponse.ok) {
        console.error('Brazilian Friends message read failed:', messagesResponse.status, await messagesResponse.text());
        return res.status(502).json({ error: 'Não foi possível carregar a conversa.' });
      }
      return res.json({ messages: await messagesResponse.json() });
    } catch (error: any) {
      console.error('Brazilian Friends messages endpoint failed:', error.message);
      return res.status(500).json({ error: 'Falha ao carregar a conversa.' });
    }
  });

  app.get('/api/friends/private-notifications', async (req, res) => {
    try {
      const authUser = await getSupabaseUserFromRequest(req);
      if (!authUser?.id || !authUser.email_confirmed_at) {
        return res.status(401).json({ error: 'Conecte sua conta Google para usar o chat.' });
      }
      if (isRateLimited(`friends-private-notifications:${authUser.id}`, 30, 60_000)) {
        return res.status(429).json({ error: 'Muitas consultas de mensagens privadas. Aguarde um momento.' });
      }

      const since = typeof req.query.since === 'string' ? req.query.since : '';
      const sinceTimestamp = Date.parse(since);
      if (!Number.isFinite(sinceTimestamp)) {
        return res.status(400).json({ error: 'Cursor de notificações inválido.' });
      }

      const query = new URLSearchParams({
        select: 'id,sender_id,created_at',
        receiver_id: `eq.${authUser.id}`,
        sender_id: `neq.${authUser.id}`,
        created_at: `gt.${since}`,
        expires_at: `gt.${new Date().toISOString()}`,
        order: 'created_at.asc',
        limit: '100'
      });
      const response = await supabaseServiceRequest(`brazilian_friends_messages?${query.toString()}`);
      if (!response.ok) {
        console.error('Brazilian Friends private notifications failed:', response.status, await response.text());
        return res.status(502).json({ error: 'Não foi possível verificar novas mensagens privadas.' });
      }
      return res.json({ messages: await response.json() });
    } catch (error: any) {
      console.error('Brazilian Friends private notifications endpoint failed:', error.message);
      return res.status(500).json({ error: 'Falha ao verificar mensagens privadas.' });
    }
  });

  app.post('/api/friends/messages', async (req, res) => {
    try {
      const authUser = await getSupabaseUserFromRequest(req);
      if (!authUser?.id || !authUser.email_confirmed_at) {
        return res.status(401).json({ error: 'Conecte sua conta Google para usar o chat.' });
      }
      if (isRateLimited(`friends-messages-send:${authUser.id}`, 20, 60_000)) {
        return res.status(429).json({ error: 'Muitas mensagens enviadas. Aguarde um momento.' });
      }

      const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
      const receiverId = req.body?.receiver_id === null || req.body?.receiver_id === undefined
        ? null
        : req.body.receiver_id;
      if (!body || body.length > 2000 || (receiverId !== null && (!isFriendUserId(receiverId) || receiverId === authUser.id))) {
        return res.status(400).json({ error: 'Mensagem inválida.' });
      }

      const messageResponse = await supabaseServiceRequest('brazilian_friends_messages', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          sender_id: authUser.id,
          receiver_id: receiverId,
          body,
          expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
        })
      });
      if (!messageResponse.ok) {
        console.error('Brazilian Friends message insert failed:', messageResponse.status, await messageResponse.text());
        return res.status(502).json({ error: 'Não foi possível enviar a mensagem.' });
      }
      const messages = await messageResponse.json() as Record<string, unknown>[];

      if (receiverId) {
        await sendFriendsPushNotification(receiverId, {
          title: 'Mensagem privada · Brazilian Friends',
          body: 'Você recebeu uma nova mensagem privada.',
          url: `/?open=friends&friend=${encodeURIComponent(authUser.id)}`
        });
      }

      return res.status(201).json({ message: messages[0] || null });
    } catch (error: any) {
      console.error('Brazilian Friends message endpoint failed:', error.message);
      return res.status(500).json({ error: 'Falha ao enviar a mensagem.' });
    }
  });

  app.get('/api/friends/pinned-messages', async (req, res) => {
    try {
      const authUser = await getSupabaseUserFromRequest(req);
      if (!authUser?.id || !authUser.email_confirmed_at) {
        return res.status(401).json({ error: 'Conecte sua conta Google para usar o chat.' });
      }
      const response = await supabaseServiceRequest(
        'brazilian_friends_pinned_messages?select=id,body,pinned_by,pinned_at&is_active=eq.true&order=pinned_at.desc&limit=3'
      );
      if (!response.ok) return res.status(502).json({ error: 'Não foi possível carregar as mensagens fixadas.' });
      return res.json({ pinnedMessages: await response.json() });
    } catch (error: any) {
      console.error('Brazilian Friends pinned message read failed:', error.message);
      return res.status(500).json({ error: 'Falha ao carregar as mensagens fixadas.' });
    }
  });

  app.post('/api/friends/pinned-messages', async (req, res) => {
    try {
      const authUser = await getSupabaseUserFromRequest(req);
      if (!authUser?.id || !authUser.email_confirmed_at) return res.status(401).json({ error: 'Sessão inválida.' });
      if (normalizeEmail(authUser.email) !== CEO_EMAIL) return res.status(403).json({ error: 'Somente André Augusto pode fixar mensagens.' });
      if (isRateLimited(`friends-pin:${authUser.id}`, 5, 60_000)) return res.status(429).json({ error: 'Muitas mensagens fixadas. Aguarde um momento.' });
      const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
      if (!body || body.length > 2000) return res.status(400).json({ error: 'Mensagem fixada inválida.' });
      const response = await supabaseServiceRequest('brazilian_friends_pinned_messages', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ body, pinned_by: CEO_EMAIL })
      });
      if (!response.ok) return res.status(502).json({ error: 'Não foi possível fixar a mensagem.' });
      const rows = await response.json() as Record<string, unknown>[];
      return res.status(201).json({ pinnedMessage: rows[0] || null });
    } catch (error: any) {
      console.error('Brazilian Friends pin failed:', error.message);
      return res.status(500).json({ error: 'Falha ao fixar a mensagem.' });
    }
  });

  app.delete('/api/friends/pinned-messages/:id', async (req, res) => {
    try {
      const authUser = await getSupabaseUserFromRequest(req);
      if (!authUser?.id || !authUser.email_confirmed_at) return res.status(401).json({ error: 'Sessão inválida.' });
      if (normalizeEmail(authUser.email) !== CEO_EMAIL) return res.status(403).json({ error: 'Somente André Augusto pode desafixar mensagens.' });
      if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.status(400).json({ error: 'Mensagem fixada inválida.' });
      const response = await supabaseServiceRequest(`brazilian_friends_pinned_messages?id=eq.${encodeURIComponent(req.params.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ is_active: false })
      });
      if (!response.ok) return res.status(502).json({ error: 'Não foi possível desafixar a mensagem.' });
      return res.status(204).end();
    } catch (error: any) {
      console.error('Brazilian Friends unpin failed:', error.message);
      return res.status(500).json({ error: 'Falha ao desafixar a mensagem.' });
    }
  });

  const getBrazilianGamesWeekStart = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const localDate = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)));
    localDate.setUTCDate(localDate.getUTCDate() - weekdays.indexOf(values.weekday));
    return localDate.toISOString().slice(0, 10);
  };

  const isEligibleForBrazilianGames = (profile: Record<string, unknown> | null) => {
    if (!profile) return false;
    if (profile.role === 'admin') return true;
    return profile.status === 'active' || profile.status === 'trial';
  };

  const brazilianGamePointLimits: Record<string, number> = {
    crossword: 50,
    'hex-words': 50,
    'word-search': 40,
    memory: 40,
    'picture-match': 50,
    'audio-quiz': 50,
    'sentence-scramble': 100,
    'visual-vocabulary': 50,
    'idiom-blocks': 110,
    flashcards: 50,
    'context-quest': 50,
    'word-rush': 110,
    'yes-no-speed': 50,
    'custom-quiz': 50,
    hangman: 10
  };

  app.post('/api/games/score', async (req, res) => {
    try {
      const authUser = await getSupabaseUserFromRequest(req);
      if (!authUser?.id || !authUser.email_confirmed_at) {
        return res.status(401).json({ error: 'Para registrar pontos, vincule sua conta a uma sessão Google/Supabase confirmada. Você ainda pode jogar sem sincronizar o placar.' });
      }
      if (isRateLimited(`games-score:${authUser.id}`, 12, 60_000)) {
        return res.status(429).json({ error: 'Muitas partidas enviadas. Aguarde um minuto.' });
      }

      const gameId = typeof req.body?.gameId === 'string' ? req.body.gameId : '';
      const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId : '';
      const points = Number(req.body?.points);
      const maxPoints = brazilianGamePointLimits[gameId];
      if (!maxPoints || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
        return res.status(400).json({ error: 'Partida inválida.' });
      }
      if (!Number.isInteger(points) || points < 1 || points > maxPoints) {
        return res.status(400).json({ error: 'Pontuação fora do limite permitido.' });
      }

      const profile = await getAuthenticatedProfileByAuthId(authUser.id);
      if (!isEligibleForBrazilianGames(profile)) {
        return res.status(403).json({ error: 'Perfil sem acesso ao ranking semanal.' });
      }

      const displayName = String(
        profile?.full_name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'Aluno'
      ).slice(0, 80);
      const response = await supabaseServiceRequest('bia_game_scores?on_conflict=auth_user_id,session_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
        body: JSON.stringify({
          auth_user_id: authUser.id,
          session_id: sessionId,
          game_id: gameId,
          display_name: displayName,
          points,
          week_start: getBrazilianGamesWeekStart()
        })
      });
      if (!response.ok) {
        console.error('Brazilian Games score insert failed:', response.status, await response.text());
        return res.status(502).json({ error: 'Não foi possível registrar os pontos.' });
      }

      const inserted = await response.json() as unknown[];
      return res.status(200).json({ saved: inserted.length > 0, duplicate: inserted.length === 0 });
    } catch (error: any) {
      console.error('Brazilian Games score endpoint failed:', error.message);
      return res.status(500).json({ error: 'Falha ao registrar a pontuação.' });
    }
  });

  app.get('/api/games/leaderboard', async (req, res) => {
    try {
      const authUser = await getSupabaseUserFromRequest(req);
      if (!authUser?.id || !authUser.email_confirmed_at) {
        return res.status(401).json({ error: 'Para participar do ranking, vincule sua conta a uma sessão Google/Supabase confirmada.' });
      }
      if (isRateLimited(`games-leaderboard:${authUser.id}`, 60, 60_000)) {
        return res.status(429).json({ error: 'Muitas consultas ao ranking. Aguarde um minuto.' });
      }

      const profile = await getAuthenticatedProfileByAuthId(authUser.id);
      if (!isEligibleForBrazilianGames(profile)) {
        return res.status(403).json({ error: 'Perfil sem acesso ao ranking semanal.' });
      }

      const weekStart = getBrazilianGamesWeekStart();
      const response = await supabaseServiceRequest('rpc/bia_get_weekly_game_leaderboard', {
        method: 'POST',
        body: JSON.stringify({ p_week_start: weekStart, p_auth_user_id: authUser.id })
      });
      if (!response.ok) {
        console.error('Brazilian Games leaderboard read failed:', response.status, await response.text());
        return res.status(502).json({ error: 'Não foi possível carregar o ranking.' });
      }

      return res.json({ weekStart, ...await response.json() });
    } catch (error: any) {
      console.error('Brazilian Games leaderboard endpoint failed:', error.message);
      return res.status(500).json({ error: 'Falha ao carregar o ranking semanal.' });
    }
  });

  // Pix is created only for a verified Supabase profile and at the server price.
  app.post('/api/payments/create-pix', async (req, res) => {
    try {
      const authUser = await getSupabaseUserFromRequest(req);
      const email = normalizeEmail(authUser?.email);
      if (!authUser?.id || !email || !authUser.email_confirmed_at) {
        return res.status(401).json({ error: 'Confirme seu e-mail e entre antes de criar uma cobrança.' });
      }
      if (isRateLimited(`pix-create:${authUser.id}`, 5, 60_000)) {
        return res.status(429).json({ error: 'Muitas cobranças solicitadas. Aguarde um minuto.' });
      }

      const profile = await getAuthenticatedProfileByAuthId(authUser.id);
      if (!profile || normalizeEmail(profile.email) !== email) {
        return res.status(403).json({ error: 'Perfil da conta não encontrado para esta sessão. Saia e entre novamente.' });
      }

      const abatePayToken = process.env.ABACATEPAY_API_KEY || process.env.ABATEPAY_TOKEN;
      const apiBaseUrl = (process.env.ABACATEPAY_API_URL || 'https://api.abacatepay.com').replace(/\/$/, '');
      const abatePayCreateUrl = process.env.ABATEPAY_CREATE_URL || abacatePayApiEndpoint(apiBaseUrl, 'transparents/create');
      const amountCents = subscriptionPriceCents(process.env.SUBSCRIPTION_PRICE_REAIS);

      if (!abatePayToken) {
        return res.status(503).json({ error: 'AbatePay não está configurado no servidor.' });
      }

      const fullName = String(profile.full_name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || email.split('@')[0]);
      const paymentData = {
        method: 'PIX',
        data: {
          amount: amountCents,
          description: 'Assinatura Mensal - Brazilian in Action Idiomas',
          expiresIn: 3600,
          metadata: {
            plan: 'brazilian-in-action-monthly',
            email,
            customerName: fullName
          }
        }
      };

      const response = await fetch(abatePayCreateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${abatePayToken}`,
          'X-Idempotency-Key': `bia-${randomUUID()}`
        },
        body: JSON.stringify(paymentData)
      });

      const data: any = await response.json();

      if (!response.ok) {
        console.error('❌ Erro na API da AbatePay:', data);
        return res.status(response.status).json({ error: data.message || data.error || 'Erro ao gerar Pix na AbatePay', details: data });
      }

      const billing = data.data || data;
      if (!billing.id) return res.status(502).json({ error: 'AbatePay não retornou o identificador da cobrança.' });

      const intentResponse = await supabaseServiceRequest('bia_payment_intents', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({
          payment_id: billing.id,
          user_id: authUser.id,
          email,
          amount_cents: amountCents,
          status: 'pending'
        })
      });
      if (!intentResponse.ok) {
        console.error('Payment intent persistence failed:', intentResponse.status, await intentResponse.text());
        return res.status(502).json({ error: 'A cobrança foi criada, mas não pôde ser vinculada à conta. Contate o suporte antes de pagar.' });
      }

      return res.status(200).json({
        id: billing.id,
        status: billing.status,
        qrCode: billing.brCode,
        qrCodeBase64: billing.brCodeBase64,
        ticketUrl: billing.url,
        amountCents
      });
    } catch (err: any) {
      console.error('❌ Erro interno ao criar Pix na AbatePay:', err);
      return res.status(500).json({ error: 'Erro interno ao processar cobrança Pix', message: err.message });
    }
  });

  // Payment status is scoped to the signed-in owner of the stored payment intent.
  app.get('/api/payments/status/:id', async (req, res) => {
    try {
      const authUser = await getSupabaseUserFromRequest(req);
      const email = normalizeEmail(authUser?.email);
      if (!authUser?.id || !email) return res.status(401).json({ error: 'Sessão inválida.' });
      if (isRateLimited(`pix-status:${authUser.id}`, 30, 60_000)) {
        return res.status(429).json({ error: 'Muitas consultas de pagamento. Aguarde alguns segundos.' });
      }

      const paymentId = req.params.id;
      if (!paymentId || paymentId.length > 200) return res.status(400).json({ error: 'Identificador de cobrança inválido.' });

      const intentResponse = await supabaseServiceRequest(
        `bia_payment_intents?payment_id=eq.${encodeURIComponent(paymentId)}&select=payment_id,user_id,email,status&limit=1`
      );
      if (!intentResponse.ok) throw new Error('Payment intent lookup failed.');
      const intents = await intentResponse.json() as { payment_id: string; user_id: string; email: string; status: string }[];
      const intent = intents[0];
      if (!intent || intent.user_id !== authUser.id || normalizeEmail(intent.email) !== email) {
        return res.status(404).json({ error: 'Cobrança não encontrada para esta conta.' });
      }

      const paymentStatus = await getAbatePayPaymentStatus(paymentId);
      if (paymentStatus.isApproved && intent.status !== 'active') {
        const activation = await activateRegisteredPayment(paymentId, paymentStatus.eventId);
        if (!activation.ok) return res.status(502).json({ error: 'Pagamento aprovado, mas a assinatura ainda não foi ativada.' });
        return res.status(200).json({ ...paymentStatus, subscriptionExpiresAt: activation.subscription_expires_at });
      }
      return res.status(200).json(paymentStatus);
    } catch (err: any) {
      console.error('AbatePay status check failed:', err.message);
      return res.status(502).json({ error: 'Não foi possível verificar a cobrança agora.' });
    }
  });

  // A webhook must pass both the configured URL secret and provider signature.
  app.post('/api/webhook/payment', async (req, res) => {
    try {
      const payload = req.body;
      const providedWebhookSecret = req.query.webhookSecret ?? req.query.secret;
      const webhookSecretValid = [process.env.ABATEPAY_WEBHOOK_SECRET, process.env.ABACATEPAY_WEBHOOK_SECRET]
        .some((secret) => verifyWebhookSecret(providedWebhookSecret, secret));
      const rawBody = (req as express.Request & { rawBody?: Buffer }).rawBody;
      const webhookHmacKey = process.env.ABACATEPAY_WEBHOOK_HMAC_KEY;
      if (!webhookSecretValid
        || !verifyAbacatePaySignature(rawBody, req.header('X-Webhook-Signature'), webhookHmacKey)) {
        return res.status(401).json({ error: 'Assinatura do webhook inválida.' });
      }

      const paymentId = String(payload.data?.id || payload.payment?.id || payload.id || '');
      if (!paymentId) return res.status(400).json({ error: 'Webhook sem identificador de cobrança.' });

      const intentResponse = await supabaseServiceRequest(
        `bia_payment_intents?payment_id=eq.${encodeURIComponent(paymentId)}&select=payment_id,status&limit=1`
      );
      if (!intentResponse.ok) throw new Error('Payment intent lookup failed.');
      const intents = await intentResponse.json() as { payment_id: string; status: string }[];
      if (!intents[0]) return res.status(404).json({ error: 'Cobrança não registrada.' });

      const paymentStatus = await getAbatePayPaymentStatus(paymentId);
      if (paymentStatus.isApproved) {
        const eventId = String(payload.eventId || payload.event_id || payload.event?.id || '') || null;
        const activation = await activateRegisteredPayment(paymentId, eventId);
        if (!activation.ok) throw new Error(activation.reason || 'Payment activation failed.');
      }
      return res.status(200).json({
        received: true,
        success: true,
        isApproved: paymentStatus.isApproved
      });
    } catch (error: any) {
      console.error('Payment webhook processing failed:', error.message);
      return res.status(500).json({ error: 'Erro interno ao processar webhook' });
    }
  });

  // 2. Gemini Conversation Generation endpoint
  app.post('/api/generate-conversation', async (req, res) => {
    const { level, goal, theme, duration } = req.body;

    if (!level || !goal || !theme || !duration) {
      res.status(400).json({ error: 'Missing required parameters: level, goal, theme, duration' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not defined. Falling back to high-quality mock speaking lesson generator.');
      // Provide a high-quality mock lesson based on the requested theme & level
      const mockLesson = generateMockLesson(level, goal, theme, duration);
      res.json({
        data: mockLesson,
        mocked: true,
        message: 'Aviso: Chave do Gemini não configurada. Exibindo lição de demonstração.'
      });
      return;
    }

    try {
      // Lazy initialize GoogleGenAI
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `You are an expert English teacher and curriculum developer for Brazilian students. Create a comprehensive, professional English conversation lesson tailored to:
Level: ${level}
Goal: ${goal}
Theme: ${theme}
Selected Duration Limit: ${duration}

Requirements:
1. 'title': A captivating title for the conversation lesson.
2. 'starter': A short, level-appropriate introductory text about the theme (${theme}) of about 80 to 250 words. Use appropriate grammar and vocabulary for the selected level. Keep it engaging.
3. 'warmup': 3 simple, friendly warm-up questions to ease the student into the topic.
4. 'mainDiscussion': 3 to 8 main discussion questions depending on the chosen duration (e.g. around 4 questions for 10-15 mins, more for 30-60 mins).
5. 'followup': 4 to 6 follow-up questions to probe deeper or extend answers (e.g. "Why?", "How did you feel?", "What is your main point?").
6. 'vocabulary': 10 to 20 key vocabulary words (depending on duration) related to the topic. For each word, provide:
   - 'word': the English word or expression
   - 'pos': its part of speech (noun, verb, adjective, adverb, etc.)
   - 'pronunciation': spelling-based pronunciation aid or simple IPA guides (e.g. /træv.əl/)
   - 'translation': Portuguese translation
   - 'example': An illustrative example sentence in English
7. 'expressions': 5 to 10 useful conversational expressions or phrases (e.g., fillers, opinion starters, connectors) relevant for the discussion.
8. 'grammarFocus': Name of the main grammatical structure highlighted or natural to this conversation topic (e.g., Present Perfect, Second Conditional, Past Simple, Comparatives).
9. 'teacherNotes': 3 to 5 teaching tips/suggestions specifically for the teacher running this speaking activity (e.g., focus on pronunciation, correction tips, encouragement).

IMPORTANT: Return the response exactly matching the requested JSON schema. Make sure the starter text uses suitable vocabulary and style matching the ${level} English level.`;

      const genConfig = {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            starter: { type: Type.STRING },
            warmup: { type: Type.ARRAY, items: { type: Type.STRING } },
            mainDiscussion: { type: Type.ARRAY, items: { type: Type.STRING } },
            followup: { type: Type.ARRAY, items: { type: Type.STRING } },
            vocabulary: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  pos: { type: Type.STRING },
                  pronunciation: { type: Type.STRING },
                  translation: { type: Type.STRING },
                  example: { type: Type.STRING }
                },
                required: ['word', 'pos', 'pronunciation', 'translation', 'example']
              }
            },
            expressions: { type: Type.ARRAY, items: { type: Type.STRING } },
            grammarFocus: { type: Type.STRING },
            teacherNotes: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: [
            'title',
            'starter',
            'warmup',
            'mainDiscussion',
            'followup',
            'vocabulary',
            'expressions',
            'grammarFocus',
            'teacherNotes'
          ]
        }
      };

      let responseText = '';
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: genConfig
        });
        responseText = response.text || '';
      } catch (err36: any) {
        console.warn('gemini-3.6-flash failed, trying gemini-flash-latest fallback:', err36?.message || err36);
        try {
          const fallbackRes = await ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: prompt,
            config: genConfig
          });
          responseText = fallbackRes.text || '';
        } catch (errFallback: any) {
          console.warn('gemini-flash-latest fallback also failed:', errFallback?.message || errFallback);
        }
      }

      if (!responseText) {
        throw new Error('Gemini returned an empty response');
      }

      const lessonData = JSON.parse(responseText);
      res.json({ data: lessonData, mocked: false });
    } catch (error: any) {
      console.error('Error in /api/generate-conversation:', error?.message || error);
      // Fallback gracefully to high quality mock lesson on Gemini API error / 503 high demand
      const mockLesson = generateMockLesson(level, goal, theme, duration);
      res.json({
        data: mockLesson,
        mocked: true,
        message: 'Aviso: O serviço da IA está temporariamente ocupado. A lição foi gerada com base em nosso acervo pedagógico!'
      });
    }
  });

  // 2b. Word Definition translation proxy endpoint
  app.post('/api/define-word', async (req, res) => {
    const { word, context } = req.body;
    if (!word) {
      res.status(400).json({ error: 'Missing word parameter' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const definition = getLocalDefinition(word);
      res.json({ data: definition, mocked: true });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      const prompt = `Define the English word "${word}" in the context of this sentence: "${context || ''}".
Return a JSON object with:
- "pos": Part of speech (e.g. noun, verb, adjective, adverb)
- "pronunciation": Simple visual phonetic spelling or IPA guide (e.g. /træv.əl/)
- "translation": Natural Portuguese translation of this word in this exact context
- "example": A short, clear English example sentence showing this word in use.`;

      const defSchema = {
        type: Type.OBJECT,
        properties: {
          pos: { type: Type.STRING },
          pronunciation: { type: Type.STRING },
          translation: { type: Type.STRING },
          example: { type: Type.STRING }
        },
        required: ['pos', 'pronunciation', 'translation', 'example']
      };

      let text = '';
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: defSchema
          }
        });
        text = response.text || '';
      } catch (e1: any) {
        try {
          const fallbackRes = await ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: defSchema
            }
          });
          text = fallbackRes.text || '';
        } catch (e2) {
          // ignore fallback error and let outer catch handle with getLocalDefinition
        }
      }

      const entry = JSON.parse(text || '{}');
      if (entry && entry.translation) {
        res.json({ data: entry, mocked: false });
        return;
      }
    } catch (e: any) {
      console.error('Error defining word with Gemini:', e);
    }

    // Fallback: Query Google Translate / MyMemory or local dictionary
    let translation = '';
    const cleanWord = String(word).trim();
    const localDictMatch = getLocalDefinition(cleanWord);

    if (localDictMatch && localDictMatch.translation && !localDictMatch.translation.startsWith('tradução de')) {
      res.json({ data: localDictMatch, mocked: true });
      return;
    }

    // Try Google Translate public API with User-Agent headers
    try {
      const gRes = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt&dt=t&q=${encodeURIComponent(cleanWord)}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
          }
        }
      );
      if (gRes.ok) {
        const gData = await gRes.json();
        if (Array.isArray(gData) && Array.isArray(gData[0]) && gData[0][0]) {
          translation = gData[0][0][0];
        }
      }
    } catch (err) {
      console.warn('Google translate endpoint failed in define-word:', err);
    }

    // Try MyMemory if needed
    if (!translation) {
      try {
        const mRes = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanWord)}&langpair=en|pt-BR`
        );
        if (mRes.ok) {
          const mData = await mRes.json();
          if (mData?.responseData?.translatedText) {
            translation = mData.responseData.translatedText;
          }
        }
      } catch (mErr) {
        console.warn('MyMemory translate endpoint failed in define-word:', mErr);
      }
    }

    translation = translation || cleanWord;

    res.json({
      data: {
        pos: localDictMatch?.pos || 'palavra',
        pronunciation: localDictMatch?.pronunciation || `/${cleanWord}/`,
        translation: translation,
        example: localDictMatch?.example || `Exemplo com "${cleanWord}".`
      },
      mocked: true
    });
  });

  // In-memory Server Translation Cache (< 1ms)
  const serverTransCache = new Map<string, string>();

  // 2c. Universal Translation endpoint for words, phrases, lyrics and full sentences (Default target: PT)
  app.post('/api/translate', async (req, res) => {
    const { text, sourceLang, targetLang } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Missing text parameter' });
      return;
    }

    const cleanText = text.trim();
    if (!cleanText) {
      res.status(400).json({ error: 'Text cannot be empty' });
      return;
    }

    const sl = sourceLang || 'auto';
    const tl = targetLang || 'pt'; // Default target is always Portuguese (pt-BR)

    const cacheKey = `${sl}->${tl}:${cleanText.toLowerCase()}`;
    if (serverTransCache.has(cacheKey)) {
      res.json({ translation: serverTransCache.get(cacheKey), source: 'cache', sl, tl });
      return;
    }

    // Helper: Fast Google GTX fetch
    const fetchGoogleGtx = async (): Promise<string> => {
      const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(cleanText)}`;
      const gRes = await fetch(gUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
        }
      });
      if (gRes.ok) {
        const gData = await gRes.json();
        if (Array.isArray(gData) && Array.isArray(gData[0])) {
          const translated = gData[0].map((item: any) => item[0]).filter(Boolean).join('');
          if (translated && translated.trim()) return translated.trim();
        }
      }
      throw new Error('GTX fail');
    };

    // Helper: Fast Google Clients5 fetch
    const fetchGoogleClients5 = async (): Promise<string> => {
      const cRes = await fetch(
        `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${sl}&tl=${tl}&q=${encodeURIComponent(cleanText)}`
      );
      if (cRes.ok) {
        const cData = await cRes.json();
        if (Array.isArray(cData) && cData[0] && typeof cData[0] === 'string' && cData[0].trim()) {
          return cData[0].trim();
        }
      }
      throw new Error('Clients5 fail');
    };

    // For single words or short phrases (< 15 words): Race the ultra-fast endpoints directly (~40ms)
    const wordCount = cleanText.split(/\s+/).length;
    if (wordCount <= 15) {
      try {
        const fastTranslation = await Promise.any([fetchGoogleGtx(), fetchGoogleClients5()]);
        if (fastTranslation) {
          serverTransCache.set(cacheKey, fastTranslation);
          res.json({ translation: fastTranslation, source: 'fast_google', sl, tl });
          return;
        }
      } catch (fastErr) {
        // Fall through to other providers
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // For long paragraphs or if fast endpoint failed: Try Gemini if key is present
    if (apiKey && wordCount > 15) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });

        const targetLangName = tl === 'en' ? 'English (en-US)' : 'Brazilian Portuguese (pt-BR)';
        const sourceLangName = sl === 'pt' ? 'Brazilian Portuguese (pt-BR)' : sl === 'en' ? 'English' : 'source language';

        const prompt = `You are a professional literary and musical translator. Translate the following text from ${sourceLangName} into natural, accurate ${targetLangName}. Preserve line breaks and structural formatting if it is lyrics.
Text to translate:
"""
${cleanText}
"""
Return ONLY a valid JSON object with the key "translation".`;

        const transSchema = {
          type: Type.OBJECT,
          properties: {
            translation: { type: Type.STRING }
          },
          required: ['translation']
        };

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: transSchema
          }
        });
        const responseText = response.text || '';
        const resultJson = JSON.parse(responseText || '{}');
        if (resultJson.translation) {
          serverTransCache.set(cacheKey, resultJson.translation);
          res.json({ translation: resultJson.translation, source: 'gemini', sl, tl });
          return;
        }
      } catch (geminiErr) {
        console.warn('Gemini translation failed, falling back to public translation endpoints', geminiErr);
      }
    }

    // High-reliability Fallback 1: Google Translate public API (gtx)
    try {
      const gResult = await fetchGoogleGtx();
      if (gResult) {
        serverTransCache.set(cacheKey, gResult);
        res.json({ translation: gResult, source: 'google_translate', sl, tl });
        return;
      }
    } catch (gErr) {
      console.warn('Google Translate public endpoint failed:', gErr);
    }

    // High-reliability Fallback 2: Google Translate Clients5 endpoint
    try {
      const cResult = await fetchGoogleClients5();
      if (cResult) {
        serverTransCache.set(cacheKey, cResult);
        res.json({ translation: cResult, source: 'google_clients5', sl, tl });
        return;
      }
    } catch (cErr) {
      console.warn('Google Translate clients5 endpoint failed:', cErr);
    }

    // High-reliability Fallback 3: Lingva Translate API
    try {
      const lRes = await fetch(`https://lingva.ml/api/v1/${sl}/${tl}/${encodeURIComponent(cleanText)}`);
      if (lRes.ok) {
        const lData = await lRes.json();
        if (lData?.translation && lData.translation.toLowerCase() !== cleanText.toLowerCase()) {
          serverTransCache.set(cacheKey, lData.translation);
          res.json({ translation: lData.translation, source: 'lingva', sl, tl });
          return;
        }
      }
    } catch (lErr) {
      console.warn('Lingva translate endpoint failed:', lErr);
    }

    // High-reliability Fallback 4: MyMemory Translation API
    try {
      const langpair = `${sl === 'auto' ? 'en' : sl}|${tl}`;
      const mRes = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText)}&langpair=${langpair}`
      );
      if (mRes.ok) {
        const mData = await mRes.json();
        if (mData?.responseData?.translatedText && mData.responseData.translatedText.toLowerCase() !== cleanText.toLowerCase()) {
          serverTransCache.set(cacheKey, mData.responseData.translatedText);
          res.json({ translation: mData.responseData.translatedText, source: 'mymemory', sl, tl });
          return;
        }
      }
    } catch (mErr) {
      console.warn('MyMemory translate endpoint failed:', mErr);
    }

    // High-reliability Fallback 5: Local dictionary lookup for single words
    const dictMatch = getLocalDefinition(cleanText);
    if (dictMatch && dictMatch.translation && !dictMatch.translation.startsWith('tradução de')) {
      res.json({ translation: dictMatch.translation, source: 'dictionary', sl, tl });
      return;
    }

    res.json({ translation: cleanText, source: 'raw', sl, tl });
  });

  // --- API Endpoint: /api/format-paragraphs ---
  app.post('/api/format-paragraphs', async (req, res) => {
    try {
      const { text, mode } = req.body || {};
      const cleanText = typeof text === 'string' ? text.trim() : '';

      if (!cleanText) {
        res.status(400).json({ error: 'Text cannot be empty' });
        return;
      }

      const smartFormatFallback = (raw: string) => {
        if (raw.includes('\n\n')) {
          return raw.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean).join('\n\n');
        }
        const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length > 3) {
          const stanzas: string[] = [];
          for (let i = 0; i < lines.length; i += 4) {
            stanzas.push(lines.slice(i, i + 4).join('\n'));
          }
          return stanzas.join('\n\n');
        }
        const sentences = raw.split(/(?<=[.?!])\s+/).filter(Boolean);
        if (sentences.length > 2) {
          const paras: string[] = [];
          for (let i = 0; i < sentences.length; i += 3) {
            paras.push(sentences.slice(i, i + 3).join(' '));
          }
          return paras.join('\n\n');
        }
        return raw;
      };

      const apiKey = process.env.GEMINI_API_KEY;

      if (apiKey) {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              },
            },
          });

          const prompt = `You are an expert language teacher and text layout optimizer.
Organize and format the following ${mode === 'lyrics' ? 'song lyrics into clear, readable stanzas' : 'text into natural, well-spaced paragraphs'}.
Rules:
1. Divide the content into logical stanzas or paragraphs separated by double newlines (\\n\\n).
2. DO NOT alter, add, remove, or translate any original words or lyrics. Keep the exact text and language unchanged!
3. Ensure every stanza or paragraph has 3 to 5 lines or sentences for maximum clarity when teaching.

Text to format:
"""
${cleanText}
"""

Return ONLY a valid JSON object with the key "formattedText".`;

          const formatSchema = {
            type: Type.OBJECT,
            properties: {
              formattedText: { type: Type.STRING },
            },
            required: ['formattedText'],
          };

          let responseText = '';
          try {
            const response = await ai.models.generateContent({
              model: 'gemini-3.6-flash',
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
                responseSchema: formatSchema,
              },
            });
            responseText = response.text || '';
          } catch (err36) {
            const fallbackRes = await ai.models.generateContent({
              model: 'gemini-flash-latest',
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
                responseSchema: formatSchema,
              },
            });
            responseText = fallbackRes.text || '';
          }

          if (responseText) {
            const parsed = JSON.parse(responseText);
            if (parsed.formattedText) {
              res.json({ formattedText: parsed.formattedText, source: 'gemini' });
              return;
            }
          }
        } catch (geminiErr) {
          console.warn('Gemini format-paragraphs failed, using smart fallback:', geminiErr);
        }
      }

      const fallbackFormatted = smartFormatFallback(cleanText);
      res.json({ formattedText: fallbackFormatted, source: 'smart-fallback' });
    } catch (error) {
      console.error('Format paragraphs endpoint error:', error);
      res.status(500).json({ error: 'Failed to format paragraphs' });
    }
  });

  // --- API Endpoint: /api/generate-quiz ---
  app.post('/api/generate-quiz', async (req, res) => {
    try {
      const { topic, level = 'Intermediário', numQuestions = 5 } = req.body || {};
      const cleanTopic = typeof topic === 'string' && topic.trim() ? topic.trim() : 'Falsos Cognatos e Expressões Idiomáticas';

      const fallbackQuiz = {
        title: `Quiz: ${cleanTopic}`,
        category: 'Personalizado',
        questions: [
          {
            id: 1,
            question: "What does the false friend 'Pretend' actually mean in English?",
            options: ['Fingir', 'Pretender / Ter intenção', 'Prestar atenção', 'Proteger'],
            correctAnswer: 0,
            explanation: "'Pretend' significa 'Fingir'. Para dizer 'pretender', usamos o verbo 'Intend'."
          },
          {
            id: 2,
            question: "Como se diz 'Tirar o cavalo da chuva' em um contexto natural em inglês?",
            options: ["Take the horse out of the rain", "Don't hold your breath", "Rain on my parade", "Raining cats and dogs"],
            correctAnswer: 1,
            explanation: "'Don't hold your breath' é a expressão equivalente para alertar alguém a não esperar que algo vá acontecer."
          },
          {
            id: 3,
            question: "Which of the following is correct when talking about your age?",
            options: ["I have 25 years old", "I am 25 years old", "I make 25 years", "I stay 25 years"],
            correctAnswer: 1,
            explanation: "Em inglês, nós 'somos' a nossa idade, usando o verbo TO BE (I am 25 years old), e não o verbo TER (have)."
          },
          {
            id: 4,
            question: "Qual é a pronúncia correta da terminação '-ed' em 'Worked'?",
            options: ["/worked/ (duas sílabas)", "/work-ed/", "/workt/ (som de T mudo no final)", "/work-id/"],
            correctAnswer: 2,
            explanation: "Como 'work' termina no som surdo /k/, o '-ed' é pronunciado como um som rápido de /t/: 'workt'."
          },
          {
            id: 5,
            question: "What is the meaning of the phrasal verb 'Give up'?",
            options: ["Desistir", "Entregar no alto", "Aumentar o volume", "Continuar"],
            correctAnswer: 0,
            explanation: "'Give up' significa 'desistir' ou 'interromper um hábito'."
          }
        ]
      };

      const apiKey = process.env.GEMINI_API_KEY;

      if (apiKey) {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              },
            },
          });

          const prompt = `You are a master English teacher specializing in teaching Brazilian students.
Generate an engaging, highly educational ${numQuestions}-question quiz on the topic: "${cleanTopic}".
Target Student Level: ${level}.

Instructions:
1. Formulate clear questions that test vocabulary, grammar, expressions, or cultural nuances between Brazilian Portuguese and English.
2. Provide exactly 4 distinct options per question.
3. Indicate the zero-based index (0, 1, 2, or 3) of the correct answer in "correctAnswer".
4. Provide a helpful, encouraging explanation in Portuguese in "explanation" explaining WHY that answer is correct and giving a quick tip.

Return ONLY a valid JSON object following the schema provided.`;

          const quizSchema = {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              category: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.NUMBER },
                    question: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    correctAnswer: { type: Type.NUMBER },
                    explanation: { type: Type.STRING },
                  },
                  required: ['id', 'question', 'options', 'correctAnswer', 'explanation'],
                },
              },
            },
            required: ['title', 'category', 'questions'],
          };

          let responseText = '';
          try {
            const response = await ai.models.generateContent({
              model: 'gemini-3.6-flash',
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
                responseSchema: quizSchema,
              },
            });
            responseText = response.text || '';
          } catch (err36) {
            const fallbackRes = await ai.models.generateContent({
              model: 'gemini-flash-latest',
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
                responseSchema: quizSchema,
              },
            });
            responseText = fallbackRes.text || '';
          }

          if (responseText) {
            const parsed = JSON.parse(responseText);
            if (parsed.questions && parsed.questions.length > 0) {
              res.json({ quiz: parsed, source: 'gemini' });
              return;
            }
          }
        } catch (geminiErr) {
          console.warn('Gemini quiz generation failed, using fallback quiz:', geminiErr);
        }
      }

      res.json({ quiz: fallbackQuiz, source: 'fallback' });
    } catch (error) {
      console.error('Generate quiz endpoint error:', error);
      res.status(500).json({ error: 'Failed to generate quiz' });
    }
  });

  // Helper for dynamic translation fallback when AI key is missing or API unavailable
  async function generateDynamicTranslationFallback(cleanText: string) {
    const lower = cleanText.toLowerCase();

    // Specific handler for pastor/church example as requested by user
    if (lower.includes('pastor') || lower.includes('amo sua vida')) {
      return {
        originalText: cleanText,
        detectedLanguage: 'pt',
        options: [
          {
            title: 'Opção 1 (Mais natural e comum no ambiente de igreja nos EUA):',
            english: "Thank you, Pastor. I appreciate you and you're a big inspiration to me.",
            phonetic: 'Thénk iu, Pás-tôr. Ai a-prí-xi-eit iu énd iur a bíg ins-pi-rêi-xân tu mi.',
            context: 'Tradução: "Obrigado, Pastor. Eu te valorizo/aprecio e você é uma grande inspiração para mim."'
          },
          {
            title: 'Opção 2 (Uma tradução muito usada para "amo sua vida", que soa como "sou grato por você existir/ter você na minha vida"):',
            english: "Thank you, Pastor. I'm so grateful for your life and I really look up to you.",
            phonetic: 'Thénk iu, Pás-tôr. Aim sou gréit-fûl fôr iur láif énd ai rí-li lúk âp tu iu.',
            context: 'Tradução: "Obrigado, Pastor. Sou muito grato pela sua vida e me inspiro muito em você."'
          },
          {
            title: 'Opção 3 (Um pouco mais informal/afetuosa):',
            english: "Thank you, Pastor. I love you too and you truly inspire me.",
            phonetic: 'Thénk iu, Pás-tôr. Ai lâv iu tú énd iu trú-li ins-pái-er mi.',
            context: 'Tradução: "Obrigado, Pastor. Eu te amo também e você realmente me inspira."'
          }
        ],
        culturalNote: 'Nota cultural: Dizer "I love your life" soa estranho em inglês. Os americanos costumam usar "I appreciate you" (eu te valorizo/aprecio) ou "I\'m grateful for your life" (sou grato pela sua vida) para expressar esse carinho e respeito. A expressão "look up to someone" significa admirar e se inspirar em alguém.',
        vocabularyHighlights: [
          { term: 'I appreciate you', meaning: 'Expressão essencial nos EUA para dizer que você valoriza alguém.' },
          { term: 'Look up to someone', meaning: 'Phrasal verb para demonstrar admiração e inspiração.' }
        ]
      };
    }

    // Dynamic Google Translate fetch for real translation of any custom phrase
    let mainTranslation = cleanText;
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(cleanText)}`;
      const gRes = await fetch(url);
      if (gRes.ok) {
        const data = await gRes.json();
        if (Array.isArray(data) && Array.isArray(data[0])) {
          const parts = data[0].map((item: any) => item && item[0]).filter(Boolean);
          if (parts.length > 0) {
            mainTranslation = parts.join(' ');
          }
        }
      }
    } catch (err) {
      console.warn('Google Translate fallback fetch error:', err);
    }

    let option1Text = mainTranslation;
    let option2Text = mainTranslation;
    let option3Text = mainTranslation;

    if (mainTranslation !== cleanText) {
      option1Text = mainTranslation;
      option2Text = mainTranslation.startsWith('I ')
        ? mainTranslation.replace(/^I /, "I'd like to say that I ")
        : `I would like to say: ${mainTranslation}`;
      option3Text = `Hey, ${mainTranslation.charAt(0).toLowerCase() + mainTranslation.slice(1)}`;
    }

    const literalEnglish = mainTranslation.toLowerCase();
    const dynamicCulturalNote = `Nota cultural: Dizer "${literalEnglish}" soa estranho em inglês. Os americanos costumam usar "${option1Text}" (${cleanText.toLowerCase()}) ou "${option2Text}" (Gostaria de dizer que ${cleanText.toLowerCase()}) para expressar esse carinho, respeito ou intenção com naturalidade.`;

    return {
      originalText: cleanText,
      detectedLanguage: 'pt',
      options: [
        {
          title: 'Opção 1 (Mais natural e comum em conversas diárias nos EUA):',
          english: option1Text,
          context: `Tradução: "${cleanText}"`
        },
        {
          title: 'Opção 2 (Tradução polida e respeitosa):',
          english: option2Text,
          context: `Tradução: "Gostaria de dizer que ${cleanText.toLowerCase()}"`
        },
        {
          title: 'Opção 3 (Tradução informal / comunicativa):',
          english: option3Text,
          context: `Tradução: "Ei, ${cleanText.toLowerCase()}"`
        }
      ],
      culturalNote: dynamicCulturalNote,
      vocabularyHighlights: [
        { term: 'American Phrasing', meaning: 'Adaptação do pensamento do português para a estrutura conversacional americana.' }
      ]
    };
  }

  // --- API Endpoint: /api/cultural-translate ---
  app.post('/api/cultural-translate', async (req, res) => {
    try {
      const { text } = req.body || {};
      const cleanText = typeof text === 'string' ? text.trim() : '';

      if (!cleanText) {
        res.status(400).json({ error: 'Texto para tradução é obrigatório' });
        return;
      }

      // Cheap Jev gate: blocks nonsensical/garbled input before the expensive Gemini call.
      const validation = await validatePortuguesePhrase(cleanText);
      if (!validation.isValid) {
        res.status(422).json({
          error: 'Não conseguimos entender essa frase. Revise a ortografia e o sentido antes de traduzir.',
          probability: validation.probability,
        });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;

      if (apiKey) {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              },
            },
          });

          const prompt = `You are a world-class native American English linguist, cultural coach, and translator helping Brazilian Portuguese speakers understand and speak natural everyday American English.
Input Text in Portuguese: "${cleanText}"

YOU MUST PROVIDE A RICH, DEEP LINGUISTIC & CULTURAL BREAKDOWN IN PORTUGUESE ACCORDING TO THESE SECTIONS:

1. "literalVsNative":
   - "literalEnglish": The exact word-for-word translation in English.
   - "whyItSoundsWrong": Explain clearly why this literal translation sounds unnatural, confusing, or strange to native American English speakers.
   - "nativeThinking": Explain the core concept/mindset native speakers use instead to express this exact intention.

2. "theWhyReason":
   - EXPLAIN THE "WHY" IN DETAIL (O Porquê das Coisas): Explain whether this is a grammatical rule, a cultural norm, a social boundary, or an idiomatic expression. Explain WHY Americans say it this way instead of the Portuguese way, so the learner understands the root logic (e.g. grammar structure, cultural mindset, historical usage).

3. "etiquetteTip":
   - Provide practical advice on social etiquette in the USA regarding this expression: Who can you say this to? (boss, friend, stranger, pastor, family), and when to use or avoid it.

4. "options":
   Provide 2 to 3 distinct translation options in natural American English.
   For each option, provide:
   - "badge": A clean, concise context label WITHOUT ANY EMOJIS (e.g. "Dia a Dia / Conversacional", "Formal / Profissional", "Informal / Amigos", "Comunidade / Religioso").
   - "title": Short title in Portuguese explaining the context.
   - "english": The exact natural English sentence.
   - "phonetic": A simplified phonetic pronunciation guide written using Portuguese-friendly syllables (e.g. "Thénk iu, Pás-tôr"), so a Brazilian speaker can read it aloud naturally.
   - "context": Portuguese translation prefixed with "Tradução: ".
   - "toneAndEmphasis": Practical tip on tone of voice, rhythm, or word emphasis when pronouncing this sentence in conversation.

5. "culturalNote":
   A clear, structured 2-3 sentence summary of the cultural context.

6. "vocabularyHighlights":
   1 to 3 key vocabulary terms, phrasal verbs, or idioms used in the options with Portuguese explanations.

Return ONLY a JSON object strictly following the schema.`;

          const culturalSchema = {
            type: Type.OBJECT,
            properties: {
              originalText: { type: Type.STRING },
              detectedLanguage: { type: Type.STRING },
              literalVsNative: {
                type: Type.OBJECT,
                properties: {
                  literalEnglish: { type: Type.STRING },
                  whyItSoundsWrong: { type: Type.STRING },
                  nativeThinking: { type: Type.STRING },
                },
                required: ['literalEnglish', 'whyItSoundsWrong', 'nativeThinking'],
              },
              theWhyReason: { type: Type.STRING },
              etiquetteTip: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    badge: { type: Type.STRING },
                    title: { type: Type.STRING },
                    english: { type: Type.STRING },
                    phonetic: { type: Type.STRING },
                    context: { type: Type.STRING },
                    toneAndEmphasis: { type: Type.STRING },
                  },
                  required: ['badge', 'title', 'english', 'phonetic', 'context', 'toneAndEmphasis'],
                },
              },
              culturalNote: { type: Type.STRING },
              vocabularyHighlights: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    term: { type: Type.STRING },
                    meaning: { type: Type.STRING },
                  },
                  required: ['term', 'meaning'],
                },
              },
            },
            required: ['originalText', 'literalVsNative', 'theWhyReason', 'etiquetteTip', 'options', 'culturalNote', 'vocabularyHighlights'],
          };

          let responseText = '';
          const modelsToTry = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.1-pro-preview'];
          for (const modelName of modelsToTry) {
            try {
              const response = await ai.models.generateContent({
                model: modelName,
                contents: prompt,
                config: {
                  responseMimeType: 'application/json',
                  responseSchema: culturalSchema,
                },
              });
              if (response && response.text) {
                responseText = response.text;
                break;
              }
            } catch (errModel: any) {
              console.warn(`Model ${modelName} failed in cultural-translate:`, errModel?.message || errModel);
            }
          }

          if (responseText) {
            const cleanJson = responseText
              .replace(/^```json\s*/i, '')
              .replace(/^```\s*/i, '')
              .replace(/```\s*$/, '')
              .trim();
            const parsed = JSON.parse(cleanJson);
            if (parsed && parsed.options && parsed.options.length > 0) {
              res.json({ translationData: parsed, source: 'gemini' });
              return;
            }
          }
        } catch (geminiErr) {
          console.warn('Gemini cultural translate process error, using dynamic fallback:', geminiErr);
        }
      }

      // Dynamic Fallback when AI key is missing or offline
      const fallbackData = await generateDynamicTranslationFallback(cleanText);
      res.json({ translationData: fallbackData, source: 'dynamic-fallback' });
    } catch (error) {
      console.error('Cultural translate endpoint error:', error);
      res.status(500).json({ error: 'Failed to process cultural translation' });
    }
  });
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} (NODE_ENV: ${process.env.NODE_ENV || 'development'})`);
  });
}

// Fallback high-quality mock speaking lesson generator
function generateMockLesson(level: string, goal: string, theme: string, duration: string) {
  const isBeginner = level === 'A1' || level === 'A2';
  
  const title = `${theme} Adventures (${level})`;
  
  let starter = '';
  if (isBeginner) {
    starter = `Hello! Today we are talking about ${theme.toLowerCase()}. Many people think ${theme.toLowerCase()} is very interesting and fun. For example, when you do activities with ${theme.toLowerCase()}, you can learn new things, meet new people, and understand different cultures. It is a wonderful topic for conversation! Let's share our ideas today.`;
  } else {
    starter = `Welcome to our speaking workshop focusing on ${theme.toLowerCase()}. Exploring ${theme.toLowerCase()} offers deep insights into our contemporary society, reflecting both personal aspirations and broader cultural trends. Whether we consider its historical implications or its rapid modern evolution, engaging with this topic allows us to expand our analytical expression and refine our communication skills in a natural context. Let's delve into our experiences and perspectives.`;
  }

  const warmup = [
    `How do you feel about ${theme.toLowerCase()} in general?`,
    `Do you think ${theme.toLowerCase()} is important for people of your age?`,
    `What is the first word that comes to your mind when you think of ${theme.toLowerCase()}?`
  ];

  const mainDiscussion = [
    `Can you describe your most memorable experience related to ${theme.toLowerCase()}?`,
    `How has your perspective on ${theme.toLowerCase()} changed over the last few years?`,
    `If you could change one thing about how society approaches ${theme.toLowerCase()}, what would it be?`,
    `In what ways does ${theme.toLowerCase()} influence your daily routine?`
  ];

  const followup = [
    `Why do you feel that way?`,
    `Could you elaborate or give an example?`,
    `Do your friends share the same opinion?`,
    `What would be the opposite point of view?`,
    `What do you think will happen in the future regarding this?`
  ];

  const vocabulary = [
    { word: 'Explore', pos: 'verb', pronunciation: '/ɪkˈsplɔːr/', translation: 'explorar', example: 'We love to explore new places when we have free time.' },
    { word: 'Perspective', pos: 'noun', pronunciation: '/pəˈspektɪv/', translation: 'perspectiva', example: 'Traveling gives you a fresh perspective on life.' },
    { word: 'Memorable', pos: 'adjective', pronunciation: '/ˈmemərəbl/', translation: 'memorável', example: 'Our talk yesterday was truly memorable and inspiring.' },
    { word: 'Challenge', pos: 'noun', pronunciation: '/ˈtʃælɪndʒ/', translation: 'desafio', example: 'Learning a new language is a fun challenge.' },
    { word: 'Influence', pos: 'verb', pronunciation: '/ˈɪnfluəns/', translation: 'influenciar', example: 'Music can influence our mood in many beautiful ways.' },
    { word: 'Express', pos: 'verb', pronunciation: '/ɪkˈspres/', translation: 'expressar', example: 'It is important to express your opinions clearly.' },
    { word: 'Fascinating', pos: 'adjective', pronunciation: '/ˈfæsɪneɪtɪŋ/', translation: 'fascinante', example: 'I find local histories and traditions absolutely fascinating.' },
    { word: 'Improve', pos: 'verb', pronunciation: '/ɪmˈpruːv/', translation: 'melhorar', example: 'Regular speaking practice will help you improve your fluency.' },
    { word: 'Community', pos: 'noun', pronunciation: '/kəˈmjuːnəti/', translation: 'comunidade', example: 'The local community welcomed the travelers with warm hearts.' },
    { word: 'Habit', pos: 'noun', pronunciation: '/ˈhæbɪt/', translation: 'hábito', example: 'Reading daily is an excellent habit to develop.' }
  ];

  const expressions = [
    'In my opinion...',
    'From my perspective...',
    'To be completely honest...',
    'That is an interesting question...',
    'As far as I am concerned...',
    'I have never thought about it that way before...'
  ];

  const grammarFocus = isBeginner ? 'Simple Present & Basic Adjectives' : 'Present Perfect & Conditional Clauses';

  const teacherNotes = [
    'Focus on building the student’s speaking confidence rather than immediate correction.',
    'Encourage the student to expand their answers with examples and the "Useful Expressions" listed.',
    'Review key vocabulary pronunciation like "Perspective" and "Memorable" before speaking.',
    'Keep corrections gentle and review them together in the final minutes.'
  ];

  return {
    title,
    starter,
    warmup,
    mainDiscussion,
    followup,
    vocabulary,
    expressions,
    grammarFocus,
    teacherNotes
  };
}

// Fallback visual dictionary definition dictionary helper
function getLocalDefinition(word: string) {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  const dictionary: Record<string, { pos: string; pronunciation: string; translation: string; example: string }> = {
    explore: { pos: 'verbo', pronunciation: '/ɪkˈsplɔːr/', translation: 'explorar', example: 'We love to explore new cultures.' },
    perspective: { pos: 'substantivo', pronunciation: '/pəˈspektɪv/', translation: 'perspectiva', example: 'It gives you a fresh perspective.' },
    memorable: { pos: 'adjetivo', pronunciation: '/ˈmemərəbl/', translation: 'memorável', example: 'It was a memorable dinner.' },
    challenge: { pos: 'substantivo', pronunciation: '/ˈtʃælɪndʒ/', translation: 'desafio', example: 'Learning English is a rewarding challenge.' },
    influence: { pos: 'verbo', pronunciation: '/ˈɪnfluəns/', translation: 'influenciar', example: 'Music can influence our mood.' },
    express: { pos: 'verbo', pronunciation: '/ɪkˈspres/', translation: 'expressar', example: 'It is important to express your ideas.' },
    fascinating: { pos: 'adjetivo', pronunciation: '/ˈfæsɪneɪtɪŋ/', translation: 'fascinante', example: 'I found the museum absolutely fascinating.' },
    improve: { pos: 'verbo', pronunciation: '/ɪmˈpruːv/', translation: 'melhorar', example: 'Speaking every day is the key to improve.' },
    community: { pos: 'substantivo', pronunciation: '/kəˈmjuːnəti/', translation: 'comunidade', example: 'We have a very supportive community here.' },
    habit: { pos: 'substantivo', pronunciation: '/ˈhæbɪt/', translation: 'hábito', example: 'Reading books is a healthy habit.' },
    travel: { pos: 'verbo', pronunciation: '/ˈtræv.əl/', translation: 'viajar', example: 'I want to travel around the world.' },
    food: { pos: 'substantivo', pronunciation: '/fuːd/', translation: 'comida / alimentação', example: 'Traditional food is part of local culture.' },
    technology: { pos: 'substantivo', pronunciation: '/tekˈnɒl.ə.dʒi/', translation: 'tecnologia', example: 'Technology makes communication easier.' },
    school: { pos: 'substantivo', pronunciation: '/skuːl/', translation: 'escola', example: 'They met at school many years ago.' },
    work: { pos: 'verbo', pronunciation: '/wɜːk/', translation: 'trabalhar / trabalho', example: 'I work as a software engineer.' },
    shopping: { pos: 'substantivo', pronunciation: '/ˈʃɒp.ɪŋ/', translation: 'compras', example: 'She went shopping for new clothes.' },
    sports: { pos: 'substantivo', pronunciation: '/spɔːts/', translation: 'esportes', example: 'Playing sports keeps you active.' },
    health: { pos: 'substantivo', pronunciation: '/helθ/', translation: 'saúde', example: 'Exercise is crucial for good health.' },
    routine: { pos: 'substantivo', pronunciation: '/ruːˈtiːn/', translation: 'rotina', example: 'A good morning routine starts the day right.' },
    music: { pos: 'substantivo', pronunciation: '/ˈmjuː.zɪk/', translation: 'música', example: 'I love listening to soft classical music.' },
    movies: { pos: 'substantivo', pronunciation: '/ˈmuː.viz/', translation: 'filmes', example: 'Watching movies is a great way to relax.' },
    books: { pos: 'substantivo', pronunciation: '/bʊks/', translation: 'livros', example: 'She has a large collection of fantasy books.' },
    media: { pos: 'substantivo', pronunciation: '/ˈmiː.di.ə/', translation: 'mídia / redes sociais', example: 'Social media can connect friends.' },
    environment: { pos: 'substantivo', pronunciation: '/ɪnˈvaɪ.rən.mənt/', translation: 'meio ambiente', example: 'We must protect our environment.' },
    animals: { pos: 'substantivo', pronunciation: '/ˈæn.ɪ.məlz/', translation: 'animais', example: 'Dogs are very friendly animals.' },
    family: { pos: 'substantivo', pronunciation: '/ˈfæm.əl.i/', translation: 'família', example: 'He loves spending time with his family.' },
    education: { pos: 'substantivo', pronunciation: '/ˌedʒ.ʊˈkeɪ.ʃən/', translation: 'educação', example: 'Education opens many professional doors.' },
    culture: { pos: 'substantivo', pronunciation: '/ˈkʌl.tʃər/', translation: 'cultura', example: 'Brazilian culture is very diverse and joyful.' },
    nature: { pos: 'substantivo', pronunciation: '/ˈneɪ.tʃər/', translation: 'natureza', example: 'Hiking is a great way to enjoy nature.' },
    weather: { pos: 'substantivo', pronunciation: '/ˈweð.ər/', translation: 'clima / tempo', example: 'The weather today is warm and sunny.' },
    hello: { pos: 'saudação', pronunciation: '/həˈloʊ/', translation: 'olá', example: 'Hello, how are you today?' },
    world: { pos: 'substantivo', pronunciation: '/wɜːrld/', translation: 'mundo', example: 'Welcome to our wonderful world.' },
    learn: { pos: 'verbo', pronunciation: '/lɜːrn/', translation: 'aprender', example: 'I want to learn English quickly.' },
    speak: { pos: 'verbo', pronunciation: '/spiːk/', translation: 'falar', example: 'She can speak three languages fluently.' },
    listen: { pos: 'verbo', pronunciation: '/ˈlɪs.ən/', translation: 'ouvir / escutar', example: 'Listen carefully to the recording.' },
    read: { pos: 'verbo', pronunciation: '/riːd/', translation: 'ler', example: 'Reading books expands your vocabulary.' },
    write: { pos: 'verbo', pronunciation: '/raɪt/', translation: 'escrever', example: 'Write your thoughts in a journal.' },
    friend: { pos: 'substantivo', pronunciation: '/frend/', translation: 'amigo(a)', example: 'She is my best friend from school.' },
    today: { pos: 'advérbio', pronunciation: '/təˈdeɪ/', translation: 'hoje', example: 'We have a special session today.' },
    people: { pos: 'substantivo', pronunciation: '/ˈpiː.pəl/', translation: 'pessoas / povo', example: 'Many people love traveling.' },
    time: { pos: 'substantivo', pronunciation: '/taɪm/', translation: 'tempo / hora', example: 'Take your time to practice speaking.' },
    life: { pos: 'substantivo', pronunciation: '/laɪf/', translation: 'vida', example: 'Enjoy every moment of your life.' },
    story: { pos: 'substantivo', pronunciation: '/ˈstɔː.ri/', translation: 'história', example: 'That was an inspiring short story.' },
    book: { pos: 'substantivo', pronunciation: '/bʊk/', translation: 'livro', example: 'This book teaches great concepts.' },
    word: { pos: 'substantivo', pronunciation: '/wɜːrd/', translation: 'palavra', example: 'What is the meaning of this word?' },
    sentence: { pos: 'substantivo', pronunciation: '/ˈsen.təns/', translation: 'frase / sentença', example: 'Translate the sentence into Portuguese.' },
    question: { pos: 'substantivo', pronunciation: '/ˈkwes.tʃən/', translation: 'pergunta / questão', example: 'Feel free to ask any question.' },
    answer: { pos: 'substantivo', pronunciation: '/ˈæn.sər/', translation: 'resposta / responder', example: 'That is a brilliant answer.' }
  };

  if (dictionary[clean]) {
    return dictionary[clean];
  }

  // Generic clean fallback
  return {
    pos: 'palavra',
    pronunciation: `/${word}/`,
    translation: word,
    example: `Como você usa "${word}" na sua conversação do dia a dia?`
  };
}

startServer().catch((err) => {
  console.error('Failed to start full-stack server:', err);
});
