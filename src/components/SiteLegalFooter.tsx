import React from 'react';

export const SiteLegalFooter: React.FC = () => (
  <footer className="w-full px-1 pb-1 pt-1 text-left text-[8.5px] text-white/65">
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <a className="underline underline-offset-2 hover:text-white" href="mailto:brazilianinaction@gmail.com">
        Email
      </a>
      <a className="underline underline-offset-2 hover:text-white" href="https://whatsapp.com/channel/0029Vb8DViVLdQef42OGsV1m" target="_blank" rel="noreferrer">
        WhatsApp
      </a>
      <a className="underline underline-offset-2 hover:text-white" href="?legal=terms" target="_blank" rel="noreferrer">
        Termos
      </a>
      <a className="underline underline-offset-2 hover:text-white" href="?legal=privacy" target="_blank" rel="noreferrer">
        Privacidade
      </a>
    </div>
    <p className="mt-1 text-[8px]">CNPJ: 65.698.927/0001-92 · Brazilian in Action</p>
  </footer>
);