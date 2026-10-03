import React, { useEffect, useState } from 'react';
import { Info, Mail, MessageCircle, X } from 'lucide-react';
import { InstagramIcon, SOCIAL_LINKS, TikTokIcon, YouTubeIcon } from './SocialLinksBar';

export const SiteLegalFooter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen]);

  return (
    <footer className="flex w-full justify-end px-1 pb-1 pt-1">
      <button
        type="button"
        aria-label="Informações de contato e legais"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white/60 transition hover:border-white/30 hover:bg-black/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <Info size={17} />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/65 p-4 backdrop-blur-sm sm:items-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="site-info-title"
            className="w-full max-w-sm rounded-2xl border border-white/15 bg-slate-950 p-5 text-white shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="site-info-title" className="text-sm font-bold">Informações</h2>
              <button
                type="button"
                aria-label="Fechar informações"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-2 text-sm">
              <a
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-white/80 transition hover:bg-white/10 hover:text-white"
                href="https://mail.google.com/mail/?view=cm&fs=1&to=brazilianinaction@gmail.com"
                target="_blank"
                rel="noreferrer"
              >
                <Mail size={16} className="text-amber-300" />
                Fale conosco por e-mail
              </a>
              <a
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-white/80 transition hover:bg-white/10 hover:text-white"
                href="https://whatsapp.com/channel/0029Vb8DViVLdQef42OGsV1m"
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={16} className="text-emerald-300" />
                WhatsApp
              </a>
              <a className="rounded-xl px-3 py-2.5 text-white/80 transition hover:bg-white/10 hover:text-white" href="?legal=terms">
                Termos de uso
              </a>
              <a className="rounded-xl px-3 py-2.5 text-white/80 transition hover:bg-white/10 hover:text-white" href="?legal=privacy">
                Política de privacidade
              </a>
            </div>

            <div className="mt-2 flex justify-center gap-2 border-t border-white/10 pt-3">
              <a
                href={SOCIAL_LINKS.youtube}
                target="_blank"
                rel="noreferrer"
                aria-label="YouTube oficial"
                className="rounded-lg p-2 text-white/65 transition hover:bg-white/10 hover:text-red-400"
              >
                <YouTubeIcon size={18} />
              </a>
              <a
                href={SOCIAL_LINKS.tiktok}
                target="_blank"
                rel="noreferrer"
                aria-label="TikTok oficial"
                className="rounded-lg p-2 text-white/65 transition hover:bg-white/10 hover:text-cyan-300"
              >
                <TikTokIcon size={18} />
              </a>
              <a
                href={SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram oficial"
                className="rounded-lg p-2 text-white/65 transition hover:bg-white/10 hover:text-pink-400"
              >
                <InstagramIcon size={18} />
              </a>
            </div>

            <p className="mt-4 border-t border-white/10 pt-3 text-center text-[11px] text-white/45">
              Brazilian in Action · CNPJ 65.698.927/0001-92
            </p>
          </section>
        </div>
      )}
    </footer>
  );
};