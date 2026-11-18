import { ShieldAlert } from 'lucide-react';
import { glass } from '../shared/glass';

interface Props {
  stateName: string;
  days: number;
  onRenew: () => void;
  compact?: boolean;
}

export default function VisaNotice({ stateName, days, onRenew, compact = false }: Props) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-2xl border border-amber-300/40 bg-slate-950/85 px-4 py-3 text-left text-white shadow-[0_0_24px_rgba(251,191,36,0.18)]">
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-200">Visto expirado · revisão pendente</p>
        {!compact && (
          <p className="mt-1 text-sm leading-relaxed text-white/90">
            Você ficou {days} {days === 1 ? 'dia' : 'dias'} sem praticar em {stateName}! Faça uma revisão rápida de 2 minutos para renovar seu visto e manter seu bônus de moedas ativo.
          </p>
        )}
        <button type="button" onClick={onRenew} className={`mt-2 ${glass.primaryButton} !px-4 !py-2 text-xs`}>
          Renovar Visto
        </button>
      </div>
    </div>
  );
}
