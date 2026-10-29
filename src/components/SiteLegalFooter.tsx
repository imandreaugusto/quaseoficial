import React, { useEffect, useState } from 'react';
import { Info, Mail, MessageCircle, Sparkles, X } from 'lucide-react';
import { US_LANDMARKS } from '../data';
import { InstagramIcon, SOCIAL_LINKS, TikTokIcon, YouTubeIcon } from './SocialLinksBar';
import { SubscriptionInfoModal } from './SubscriptionInfoModal';

interface SiteLegalFooterProps {
  onStartSubscription?: () => void;
}

export const SiteLegalFooter: React.FC<SiteLegalFooterProps> = ({ onStartSubscription }) => {
  const [isLegalInfoOpen, setIsLegalInfoOpen] = useState(false);
  const [isPlatformInfoOpen, setIsPlatformInfoOpen] = useState(false);

  useEffect(() => {
    if (!isLegalInfoOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsLegalInfoOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isLegalInfoOpen]);

  return (
    <>
      <button
        type="button"
        aria-label="Abrir informações da plataforma, contato e informações legais"
        aria-haspopup="dialog"
        aria-expanded={isLegalInfoOpen}
        onClick={() => setIsLegalInfoOpen(true)}
        className="fixed bottom-[max(0.5rem,env(safe-area-inset-bottom))] left-[max(0.5rem,env(safe-area-inset-left))] z-[6500] flex h-11 w-11 items-center justify-center bg-transparent text-white/45 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <Info size={14} />
      </button>

      {isLegalInfoOpen && (
        <div
          className="fixed inset-0 z-[7000] flex items-end justify-center bg-black/65 p-4 backdrop-blur-sm sm:items-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsLegalInfoOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="site-info-title"
            className="max-h-[min(85dvh,48rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/15 bg-slate-950 p-5 text-white shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="site-info-title" className="text-sm font-bold">Informações</h2>
              <button
                type="button"
                aria-label="Fechar informações"
                onClick={() => setIsLegalInfoOpen(false)}
                className="rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-2 text-sm">
              <button
                type="button"
                onClick={() => {
                  setIsLegalInfoOpen(false);
                  setIsPlatformInfoOpen(true);
                }}
                className="flex min-h-11 items-center gap-2 rounded-xl px-3 py-2.5 text-left font-medium text-amber-200 transition hover:bg-white/10 hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <Sparkles size={16} className="text-amber-300" />
                Conheça a plataforma e os planos
              </button>
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
              <details className="rounded-xl border border-white/10 px-3 py-2.5 text-white/80">
                <summary className="cursor-pointer font-medium hover:text-white">
                  Créditos das fotografias
                </summary>
                <ul className="mt-3 grid gap-3 text-xs leading-5 text-white/65">
                  {US_LANDMARKS.map((landmark) => {
                    if (!landmark.attribution) return null;

                    return (
                      <li key={landmark.url} className="border-t border-white/10 pt-3 first:border-0 first:pt-0">
                        <p className="font-semibold text-white/85">{landmark.name}</p>
                        <p>
                          Foto de {landmark.attribution.author}.{' '}
                          <a
                            href={landmark.attribution.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-2 hover:text-white"
                          >
                            Origem
                          </a>
                          {' · '}
                          <a
                            href={landmark.attribution.licenseUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-2 hover:text-white"
                          >
                            {landmark.attribution.licenseName}
                          </a>
                          {' · '}
                          {landmark.attribution.modification}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </details>
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

      <SubscriptionInfoModal
        isOpen={isPlatformInfoOpen}
        onClose={() => setIsPlatformInfoOpen(false)}
        onStartSubscription={() => {
          setIsPlatformInfoOpen(false);
          onStartSubscription?.();
        }}
      />
    </>
  );
};