import React from 'react';
import { ExternalLink, Tv } from 'lucide-react';

interface LiveStageTopBarProps {
  isBroadcasting: boolean;
  onOpenPopoutStage: () => void;
  accentColor?: string;
}

export const LiveStageTopBar: React.FC<LiveStageTopBarProps> = ({
  isBroadcasting,
  onOpenPopoutStage,
  accentColor = '#f59e0b'
}) => {
  return (
    <header className="w-full bg-neutral-950/90 border-b border-white/10 px-4 py-2.5 flex items-center justify-between backdrop-blur-md">
      {/* Lado Esquerdo: Identificação e Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Tv size={16} className="text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            Brazilian Live Studio
          </span>
        </div>

        <div className="h-3 w-px bg-white/20" />

        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isBroadcasting ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-600'
            }`}
          />
          <span className="text-[11px] font-mono text-white/60">
            {isBroadcasting ? 'Sinal Ativo' : 'Aguardando Transmissão'}
          </span>
        </div>
      </div>

      {/* Lado Direito: Botão Minimalista Abrir Palco Pop-out */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenPopoutStage}
          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-medium border border-white/15 hover:border-amber-500/50 flex items-center gap-2 cursor-pointer transition-all duration-150 shadow-sm"
          title="Abrir janela limpa sem controles para 2ª tela, projetor ou OBS"
        >
          <ExternalLink size={13} className="text-amber-400" />
          <span>Abrir Palco (Pop-out)</span>
        </button>
      </div>
    </header>
  );
};
