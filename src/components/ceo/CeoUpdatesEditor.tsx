import React, { useEffect, useState } from 'react';
import { BellRing, Check, EyeOff, Loader2, Send, Sparkles } from 'lucide-react';
import { loadUpdatesNotice, saveUpdatesNotice, UpdatesNotice } from '../../lib/updatesNotice';

const GLASS = 'rounded-3xl border border-white/20 bg-white/[0.08] backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.2)]';

// Caixa onde o CEO escreve as novidades que aparecem no selo "NEW" da Home de cada assinante.
export const CeoUpdatesEditor: React.FC = () => {
  const [current, setCurrent] = useState<UpdatesNotice | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void loadUpdatesNotice().then((notice) => {
      if (!notice) return;
      setCurrent(notice);
      setTitle(notice.title);
      setBody(notice.body);
    });
  }, []);

  const persist = async (notice: UpdatesNotice, successText: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await saveUpdatesNotice(notice);
      setCurrent(notice);
      setMessage({ type: 'success', text: successText });
    } catch {
      setMessage({ type: 'error', text: 'Não foi possível salvar agora. Confira a conexão e tente de novo.' });
    } finally {
      setBusy(false);
    }
  };

  const publish = () =>
    persist(
      { id: `new-${Date.now()}`, title: title.trim(), body: body.trim(), publishedAt: new Date().toISOString(), active: true },
      'Publicado! O selo NEW aparece para cada assinante nas 2 próximas visitas.'
    );

  const unpublish = () => (current ? persist({ ...current, active: false }, 'Aviso despublicado. O selo NEW não aparece mais.') : Promise.resolve());

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <section className={`space-y-4 p-6 ${GLASS}`} aria-label="Escrever novidades">
        <div className="flex items-center gap-2">
          <BellRing size={18} className="text-amber-200" />
          <h2 className="text-lg font-extrabold text-white">Novidades da plataforma</h2>
        </div>
        <p className="text-xs leading-relaxed text-white/65">
          Escreva as atualizações, novos menus e o que vem por aí. Cada assinante vê o selo NEW na Home nas 2 primeiras visitas depois de você publicar e pode fechar quando quiser.
        </p>
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-white/60">Título</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} placeholder="Ex.: Chegou o Brazilian Post!" className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white outline-none backdrop-blur-xl placeholder:text-white/40 focus:border-violet-300/70" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-white/60">Texto</span>
          <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={1200} rows={7} placeholder={'• Novo menu: Brazilian Post\n• Brazilian Games com visual novo\n• Read Club com marcador de página'} className="w-full resize-none rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm leading-relaxed text-white outline-none backdrop-blur-xl placeholder:text-white/40 focus:border-violet-300/70" />
          <span className="mt-1 block text-right text-[10px] text-white/45">{body.length}/1200</span>
        </label>
        {message && (
          <p role="status" className={`rounded-2xl border p-3 text-xs ${message.type === 'success' ? 'border-emerald-300/40 bg-emerald-400/15 text-emerald-100' : 'border-red-300/40 bg-red-400/15 text-red-100'}`}>{message.text}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void publish()} disabled={busy || !title.trim() || !body.trim()} className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-violet-500 px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white shadow-lg shadow-violet-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Publicar
          </button>
          {current?.active && (
            <button type="button" onClick={() => void unpublish()} disabled={busy} className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white/85 backdrop-blur-xl transition hover:bg-white/20 disabled:opacity-50">
              <EyeOff size={14} /> Despublicar
            </button>
          )}
        </div>
        <p className="flex items-center gap-1.5 text-[11px] text-white/55">
          {current?.active ? <><Check size={12} className="text-emerald-300" /> No ar desde {new Date(current.publishedAt).toLocaleString('pt-BR')}</> : 'Nenhum aviso no ar no momento.'}
        </p>
      </section>

      <section className="space-y-3" aria-label="Prévia do aviso">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/60">Prévia para o assinante</p>
        <div className="flex justify-end">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/90 backdrop-blur-xl"><Sparkles size={12} className="text-amber-200" /> New</span>
        </div>
        <div className="rounded-3xl border border-white/30 bg-white/20 p-5 shadow-[0_12px_50px_rgba(0,0,0,0.25)] backdrop-blur-2xl">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.25em] text-white/60">Novidades</p>
          <h3 className="text-base font-extrabold leading-snug text-white">{title.trim() || 'Título da novidade'}</h3>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-white/85">{body.trim() || 'O texto que você escrever aparece aqui.'}</p>
        </div>
      </section>
    </div>
  );
};
