import React from 'react';

export const SiteLegalFooter: React.FC = () => (
  <footer className="w-full px-4 py-4 text-center text-[10px] text-white/65 space-y-2">
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
      <a className="hover:text-white underline underline-offset-2" href="mailto:brazilianinaction@gmail.com">
        brazilianinaction@gmail.com
      </a>
      <a className="hover:text-white underline underline-offset-2" href="https://whatsapp.com/channel/0029Vb8DViVLdQef42OGsV1m" target="_blank" rel="noreferrer">
        WhatsApp
      </a>
      <a className="hover:text-white underline underline-offset-2" href="#terms">
        Termos de uso
      </a>
      <a className="hover:text-white underline underline-offset-2" href="#privacy">
        Política de privacidade
      </a>
    </div>
    <p>CNPJ: 65.698.927/0001-92 · Brazilian in Action</p>
    <details id="terms" className="mx-auto max-w-2xl text-left">
      <summary className="cursor-pointer text-white/80">Termos de uso</summary>
      <p className="mt-2 leading-relaxed">O acesso é pessoal e intransferível. O conteúdo da plataforma é destinado ao aprendizado de idiomas. Não é permitido copiar, redistribuir ou revender materiais sem autorização.</p>
    </details>
    <details id="privacy" className="mx-auto max-w-2xl text-left">
      <summary className="cursor-pointer text-white/80">Política de privacidade</summary>
      <p className="mt-2 leading-relaxed">Usamos os dados informados para autenticação, suporte, cobrança e melhoria da plataforma. Não armazenamos dados de cartão. Solicitações sobre seus dados podem ser feitas pelo e-mail brazilianinaction@gmail.com.</p>
    </details>
  </footer>
);