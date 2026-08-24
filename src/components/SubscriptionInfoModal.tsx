import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGatewaySettings } from '../hooks/useGatewaySettings';
import { 
  Sparkles, 
  X, 
  Check, 
  Zap, 
  BookOpen, 
  PenTool, 
  HelpCircle, 
  ArrowLeftRight, 
  MessageSquare, 
  Languages, 
  Youtube, 
  ShieldCheck, 
  CreditCard,
  QrCode,
  ArrowRight,
  Globe,
  Instagram
} from 'lucide-react';
import { BrazilianLogo } from './BrazilianLogo';

interface SubscriptionInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartSubscription: () => void;
}

export const SubscriptionInfoModal: React.FC<SubscriptionInfoModalProps> = ({
  isOpen,
  onClose,
  onStartSubscription
}) => {
  const [gatewaySettings] = useGatewaySettings();
  if (!isOpen) return null;

  const priceFormatted = gatewaySettings.subscriptionPrice.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const dailyPrice = (gatewaySettings.subscriptionPrice / 30).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const modules = [
    {
      icon: BookOpen,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/30',
      title: 'ReadClub Interativo',
      desc: 'Histórias graduadas (A1 a C2), áudio narrado por nativos, tradução instantânea e controle de vocabulário aprendido.'
    },
    {
      icon: PenTool,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/30',
      title: 'Brazilian Board',
      desc: 'Quadro interativo dinâmico para anotações, desenhos, quadros visuais e fixação mental dos tópicos.'
    },
    {
      icon: HelpCircle,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      title: 'Brazilian Quiz',
      desc: 'Quizzes gamificados inteligentes para testar e fixar gramática, vocabulário e expressões do dia a dia.'
    },
    {
      icon: ArrowLeftRight,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/30',
      title: 'BIA Compare',
      desc: 'Comparador interativo de estruturas, falsos amigos e nuances entre o Inglês e o Português brasileiro.'
    },
    {
      icon: MessageSquare,
      color: 'text-pink-400',
      bg: 'bg-pink-500/10 border-pink-500/30',
      title: 'Laboratório de Conversação',
      desc: 'Tópicos guiados do cotidiano, expressões práticas e estratégias para destravar seu speaking.'
    },
    {
      icon: Languages,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/30',
      title: 'BIA Tradutor Inteligente',
      desc: 'Tradução com contexto cultural, explicações gramaticais e exemplos práticos para o seu vocabulário.'
    },
    {
      icon: Youtube,
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/30',
      title: 'Player BIA Tube',
      desc: 'Hub de vídeos imersivos do YouTube selecionados pedagogicamente para acelerar seu listening.'
    }
  ];

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md overflow-y-auto custom-scrollbar">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="glass-card w-full max-w-2xl p-5 sm:p-7 rounded-3xl relative overflow-hidden flex flex-col shadow-2xl border border-amber-500/40 my-auto"
      >
        {/* Glow Effects */}
        <div className="absolute -top-24 -right-24 w-52 h-52 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-52 h-52 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all cursor-pointer z-20"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-white/15 flex items-center justify-center shadow-lg shrink-0">
            <BrazilianLogo size="sm" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-extrabold uppercase tracking-wider mb-0.5">
              <Sparkles size={11} className="text-amber-400" />
              <span>Assinatura Mensal Completa</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white">
              Como funciona a Assinatura do Brazilian in Action?
            </h2>
          </div>
        </div>

        {/* Price & Pix Highlight Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-neutral-900 to-amber-500/20 border border-amber-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 mb-5 shadow-lg">
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <QrCode size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Pagamento 100% via PIX Instantâneo</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.2 rounded font-bold">
                  Liberação Imediata
                </span>
              </div>
              <div className="text-[11px] text-white/60">
                Sem contrato de fidelidade • Cancele quando quiser • Acesso a todas as ferramentas
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
              R$ {priceFormatted}<span className="text-xs text-white/70 font-normal">/mês</span>
            </div>
            <div className="text-[10px] text-white/50">Apenas R$ {dailyPrice} por dia</div>
          </div>
        </div>

        {/* Modules Included */}
        <div className="space-y-2 mb-6 max-h-[42vh] overflow-y-auto custom-scrollbar pr-1">
          <div className="text-xs font-black text-white/80 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Zap size={14} className="text-amber-400" />
            <span>O que você tem acesso na plataforma:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {modules.map((mod, idx) => {
              const IconComp = mod.icon;
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border ${mod.bg} bg-neutral-900/60 backdrop-blur-md transition-all flex items-start gap-2.5`}
                >
                  <div className={`p-2 rounded-xl bg-black/40 ${mod.color} shrink-0 mt-0.5`}>
                    <IconComp size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white">{mod.title}</div>
                    <div className="text-[11px] text-white/60 leading-tight mt-0.5">{mod.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Benefits Quick List */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-5 text-[11px] text-white/80">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10">
            <Check size={14} className="text-emerald-400 shrink-0" />
            <span>Acesso ilimitado 24/7</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10">
            <Check size={14} className="text-emerald-400 shrink-0" />
            <span>Celular, Tablet ou PC</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10">
            <Check size={14} className="text-emerald-400 shrink-0" />
            <span>Novos conteúdos sempre</span>
          </div>
        </div>

        {/* CTA Button */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onStartSubscription();
          }}
          className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm tracking-wide transition-all cursor-pointer shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 active:scale-95 group"
        >
          <span>QUERO ASSINAR AGORA POR R$ {priceFormatted}/MÊS</span>
          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </motion.div>
    </div>
  );
};
