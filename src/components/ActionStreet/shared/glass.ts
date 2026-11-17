// Tokens de vidro alinhados à identidade da plataforma (ver BrazilianGames e .bia-glass-skin em index.css).
export const glass = {
  panel: 'rounded-3xl border border-white/20 bg-white/[0.08] shadow-[0_8px_40px_rgba(0,0,0,0.25)] backdrop-blur-2xl',
  // Sobre imagens claras/movimentadas (360º) o vidro precisa de mais tinta para manter o contraste de leitura.
  panelOverImagery: 'rounded-3xl border border-white/20 bg-slate-950/55 shadow-[0_8px_40px_rgba(0,0,0,0.35)] backdrop-blur-2xl',
  chip: 'rounded-full border border-white/20 bg-white/10 backdrop-blur-xl',
  chipActive: 'border-blue-300/60 bg-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.45)]',
  iconButton:
    'inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 p-2.5 text-white/85 backdrop-blur-xl transition hover:bg-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70',
  primaryButton:
    'inline-flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-gradient-to-r from-blue-500 to-violet-500 px-5 py-3 font-extrabold text-white shadow-lg shadow-violet-500/25 transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200/80',
  secondaryButton:
    'inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 font-bold text-white/90 backdrop-blur-xl transition hover:bg-white/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70',
  label: 'text-[10px] font-bold uppercase tracking-wider text-white/60',
  backdrop: 'bg-slate-950/20 backdrop-blur-[1px]',
} as const;
