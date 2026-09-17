import React, { useState, useEffect } from 'react';
import { stageBroadcaster } from '../lib/stageBroadcast';
import type { StageBroadcastState } from '../types';
import { QrCode, Clock } from 'lucide-react';

interface CleanStudentStageProps {
  initialState?: StageBroadcastState;
}

export const CleanStudentStage: React.FC<CleanStudentStageProps> = ({ initialState }) => {
  const [stageState, setStageState] = useState<StageBroadcastState>(() => {
    if (initialState) return initialState;
    const saved = localStorage.getItem('bia_live_stage_state');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      activeApp: 'home',
      headlineTitle: 'BRAZILIAN IN ACTION',
      headlineSubtitle: 'Transmissao ao vivo de ingles em tempo real',
      tickerText: 'Aulas ao vivo de conversacao • Pronuncia • Vocabulario nativo',
      showTicker: true,
      showHeadline: true,
      showPixQr: false,
      pixKey: 'contato@brazilianinaction.com',
      pixName: 'Brazilian in Action',
      timerSeconds: 0,
      isTimerRunning: false,
      themeColor: '#f59e0b',
      timestamp: Date.now()
    };
  });

  useEffect(() => {
    const unsubscribe = stageBroadcaster.subscribe((newState) => {
      setStageState(newState);
    });
    return () => unsubscribe();
  }, []);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <main className="w-screen h-screen bg-black text-white relative overflow-hidden flex flex-col justify-between select-none">
      
      {/* CAMADA PRINCIPAL DE CONTEÚDO (SLIDES / APP ESPELHADO) */}
      <section className="flex-1 w-full h-full relative flex items-center justify-center p-4">
        <div className="w-full h-full rounded-2xl bg-neutral-950 border border-white/5 flex items-center justify-center relative overflow-hidden">
          {/* O módulo selecionado pelo professor é renderizado aqui em tela cheia */}
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold tracking-tight text-white/90">
              {stageState.activeApp.toUpperCase()}
            </h1>
            <p className="text-xs text-white/40 font-mono mt-1">
              Sinal espelhado do palco do aluno
            </p>
          </div>

          {/* CRONÔMETRO FLUTUANTE DE PALCO */}
          {stageState.isTimerRunning && (
            <aside className="absolute top-4 right-4 bg-neutral-900/90 border border-white/10 px-3.5 py-1.5 rounded-xl flex items-center gap-2 shadow-2xl backdrop-blur-md">
              <Clock size={14} className="text-amber-400 animate-pulse" />
              <span className="text-sm font-mono font-bold text-white tracking-widest">
                {formatTimer(stageState.timerSeconds)}
              </span>
            </aside>
          )}

          {/* QR CODE PIX FLUTUANTE */}
          {stageState.showPixQr && (
            <aside className="absolute bottom-6 right-6 bg-neutral-900/95 border border-amber-500/30 p-3 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col items-center">
              <div className="w-24 h-24 bg-white rounded-xl flex items-center justify-center text-neutral-950">
                <QrCode size={80} />
              </div>
              <span className="text-[10px] font-bold text-amber-400 mt-2">Chave Pix</span>
              <span className="text-[9px] text-white/60 font-mono">{stageState.pixKey}</span>
            </aside>
          )}
        </div>
      </section>

      {/* OVERLAY INFERIOR: MANCHETE JORNALÍSTICA (ESTILO JP NEWS / FOX NEWS) */}
      {stageState.showHeadline && (
        <section className="w-full px-6 pb-2">
          <div className="bg-neutral-950/95 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md flex flex-col">
            <div className="px-4 py-2 border-b border-white/10 flex items-center gap-3 bg-neutral-900/80">
              <span className="px-2 py-0.5 rounded bg-amber-500 text-neutral-950 font-black text-[10px] tracking-wider uppercase">
                Ao Vivo
              </span>
              <h2 className="text-xs font-bold text-white tracking-tight">
                {stageState.headlineTitle}
              </h2>
            </div>
            <div className="px-4 py-1.5 bg-neutral-950">
              <p className="text-[11px] text-white/70">
                {stageState.headlineSubtitle}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* LETREIRO ROTATIVO INFERIOR (TICKER TAPE) */}
      {stageState.showTicker && (
        <footer className="w-full bg-neutral-900 border-t border-white/10 py-1 px-4 overflow-hidden flex items-center gap-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 shrink-0 font-mono">
            News Feed
          </span>
          <div className="flex-1 overflow-hidden whitespace-nowrap">
            <p className="text-[11px] text-white/80 font-medium inline-block animate-marquee">
              {stageState.tickerText}
            </p>
          </div>
        </footer>
      )}

    </main>
  );
};
