import express from 'express';
import path from 'path';
import http from 'http';
import { spawn } from 'child_process';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3000;

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

  // JSON parser for API requests
  app.use(express.json());

  // 1. Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      time: new Date().toISOString(),
      supabaseConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      mercadoPagoConfigured: Boolean(process.env.MERCADO_PAGO_TOKEN)
    });
  });

  // 1.1 Endpoint para Criar Cobrança Pix Dinâmica no Mercado Pago (usando process.env.MERCADO_PAGO_TOKEN)
  app.post('/api/payments/create-pix', async (req, res) => {
    try {
      const { email, firstName, lastName, amount, description } = req.body;
      const mpToken = process.env.MERCADO_PAGO_TOKEN;

      if (!mpToken) {
        return res.status(400).json({ 
          error: 'MERCADO_PAGO_TOKEN não configurado no ambiente do servidor (Netlify / Node env).' 
        });
      }

      const paymentData = {
        transaction_amount: Number(amount) || 10.0,
        description: description || 'Assinatura Mensal - Brazilian in Action Idiomas',
        payment_method_id: 'pix',
        payer: {
          email: email || 'aluno@brazilianinaction.com',
          first_name: firstName || 'Aluno',
          last_name: lastName || 'BIA'
        },
        ...(process.env.PUBLIC_APP_URL
          ? { notification_url: `${process.env.PUBLIC_APP_URL.replace(/\/$/, '')}/api/webhook/payment` }
          : {})
      };

      const response = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mpToken}`,
          'X-Idempotency-Key': `pix-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
        },
        body: JSON.stringify(paymentData)
      });

      const data: any = await response.json();

      if (!response.ok) {
        console.error('❌ Erro na API do Mercado Pago:', data);
        return res.status(response.status).json({ error: data.message || 'Erro ao gerar Pix no Mercado Pago', details: data });
      }

      const pointOfInteraction = data.point_of_interaction?.transaction_data;
      return res.status(200).json({
        id: data.id,
        status: data.status,
        qrCode: pointOfInteraction?.qr_code,
        qrCodeBase64: pointOfInteraction?.qr_code_base64,
        ticketUrl: pointOfInteraction?.ticket_url
      });
    } catch (err: any) {
      console.error('❌ Erro interno ao criar Pix no Mercado Pago:', err);
      return res.status(500).json({ error: 'Erro interno ao processar cobrança Pix', message: err.message });
    }
  });

  // 1.2 Endpoint para Verificar Status do Pagamento no Mercado Pago
  app.get('/api/payments/status/:id', async (req, res) => {
    try {
      const paymentId = req.params.id;
      const mpToken = process.env.MERCADO_PAGO_TOKEN;

      if (!mpToken) {
        return res.status(400).json({ error: 'MERCADO_PAGO_TOKEN ausente' });
      }

      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${mpToken}`
        }
      });

      const data: any = await response.json();
      return res.status(200).json({
        id: data.id,
        status: data.status,
        statusDetail: data.status_detail,
        isApproved: data.status === 'approved',
        payerEmail: data.payer?.email
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Erro ao consultar status do pagamento' });
    }
  });

  const syncSubscriptionToSupabase = async (email: string, paymentId: string, expiresAt: string) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurado');
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/bia_subscription_profiles?on_conflict=email`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify({
        email: email.toLowerCase(),
        status: 'active',
        subscription_expires_at: expiresAt,
        last_payment_id: paymentId || null,
        updated_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Supabase respondeu ${response.status}: ${details}`);
    }

    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(email.toLowerCase())}`,
      {
        method: 'PATCH',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({
          status: 'active',
          data_expiracao: expiresAt,
          updated_at: new Date().toISOString()
        })
      }
    );

    if (!profileResponse.ok) {
      const details = await profileResponse.text();
      throw new Error(`Perfil não foi atualizado (${profileResponse.status}): ${details}`);
    }
  };

  // 1.3 Webhook de Pagamento Pix Automático (Mercado Pago / Asaas)
  app.post('/api/webhook/payment', async (req, res) => {
    try {
      const payload = req.body;
      const mpToken = process.env.MERCADO_PAGO_TOKEN;
      console.log('💳 Webhook de Pagamento Pix Recebido:', JSON.stringify(payload, null, 2));

      let isApproved = false;
      let payerEmail = '';
      let paymentId = '';

      // Tratamento Mercado Pago Webhook / IPN
      if (payload.type === 'payment' || payload.action === 'payment.created' || payload.action === 'payment.updated' || payload.data?.id) {
        paymentId = payload.data?.id || payload.id;
        if (paymentId && mpToken) {
          try {
            const checkRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
              headers: { 'Authorization': `Bearer ${mpToken}` }
            });
            if (checkRes.ok) {
              const paymentData: any = await checkRes.json();
              if (paymentData.status === 'approved') {
                isApproved = true;
                payerEmail = paymentData.payer?.email || '';
              }
            }
          } catch (e) {
            console.error('Erro ao verificar pagamento via token:', e);
          }
        }
      }

      // Tratamento Asaas Webhook
      if (payload.event === 'PAYMENT_RECEIVED' || payload.event === 'PAYMENT_CONFIRMED' || payload.status === 'approved') {
        isApproved = true;
        payerEmail = payload.payment?.customerEmail || payload.customer?.email || payload.email || '';
      }

      if (isApproved && payerEmail) {
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        try {
          await syncSubscriptionToSupabase(payerEmail, paymentId, expiresAt);
          console.log(`✅ Pagamento aprovado e assinatura sincronizada no Supabase: ${payerEmail}`);
        } catch (syncError: any) {
          console.error('❌ Pagamento aprovado, mas falhou a sincronização no Supabase:', syncError.message);
          return res.status(502).json({
            received: true,
            success: false,
            isApproved: true,
            error: 'Pagamento aprovado, mas a assinatura ainda não foi sincronizada'
          });
        }
      }

      return res.status(200).json({
        received: true,
        success: true,
        isApproved,
        message: 'Webhook processado com sucesso'
      });
    } catch (error: any) {
      console.error('❌ Erro no processamento do Webhook de Pagamento:', error);
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
