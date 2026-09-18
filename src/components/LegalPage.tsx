import React from 'react';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { BrazilianLogo } from './BrazilianLogo';

type LegalKind = 'terms' | 'privacy';

interface LegalPageProps {
  kind: LegalKind;
}

const sections = {
  terms: [
    ['1. Sobre o serviço', 'O Brazilian in Action é uma plataforma educacional para estudo de inglês, com conteúdos de leitura, conversação, vocabulário, música, exercícios e interação entre assinantes.'],
    ['2. Conta e acesso', 'O usuário deve fornecer informações verdadeiras, manter sua senha em segurança e utilizar a conta de forma pessoal. O acesso depende da situação da assinatura ou de um cupom promocional válido.'],
    ['3. Assinatura e pagamento', 'A assinatura mensal é exibida na plataforma antes da confirmação. Os pagamentos são processados pela Abacate Pay, incluindo Pix e os procedimentos de confirmação, segurança e suporte próprios do provedor.'],
    ['4. Cancelamento e suporte', 'Dúvidas sobre acesso, cobrança ou cancelamento podem ser encaminhadas para brazilianinaction@gmail.com ou pelo canal oficial de WhatsApp informado na plataforma. Solicitações serão analisadas e respondidas em prazo razoável.'],
    ['5. Uso aceitável', 'É proibido utilizar a plataforma para fraude, abuso, assédio, tentativa de acesso não autorizado, distribuição de conteúdo ilegal ou qualquer atividade que prejudique outros usuários ou o serviço.'],
    ['6. Disponibilidade', 'Buscamos manter a plataforma disponível, mas podem ocorrer manutenções, atualizações ou interrupções por falhas de internet, provedores externos ou motivos de segurança.'],
    ['7. Contato empresarial', 'Brazilian in Action · CNPJ 65.698.927/0001-92 · brazilianinaction@gmail.com.'],
  ],
  privacy: [
    ['1. Dados coletados', 'Podemos coletar nome, e-mail, dados de cadastro, situação da assinatura, registros de pagamento fornecidos pelo provedor, preferências de uso, localização aproximada quando informada pelo navegador e mensagens do Brazilian Friends.'],
    ['2. Para que usamos os dados', 'Os dados são usados para criar e proteger contas, liberar módulos, confirmar assinaturas, processar suporte, manter o Brazilian Friends, prevenir abuso, melhorar a experiência e cumprir obrigações legais.'],
    ['3. Pagamentos', 'Os dados de pagamento são processados pela Abacate Pay. A Brazilian in Action não solicita nem armazena senha bancária ou dados completos de cartão. O provedor pode tratar dados conforme seus próprios termos e política de privacidade.'],
    ['4. Retenção', 'Mensagens do Brazilian Friends são mantidas por até 7 dias. Dados de conta, assinatura, cobrança e registros necessários podem ser mantidos pelo período necessário à prestação do serviço, segurança, atendimento e cumprimento de obrigações legais.'],
    ['5. Compartilhamento', 'Não vendemos dados pessoais. Podemos compartilhar somente o necessário com provedores que sustentam autenticação, hospedagem, pagamentos, banco de dados e segurança, sempre para operar o serviço.'],
    ['6. Direitos do usuário', 'Você pode solicitar confirmação, acesso, correção ou exclusão de dados pessoais, observadas as informações que precisamos manter por obrigação legal ou para prevenir fraude. Envie a solicitação para brazilianinaction@gmail.com.'],
    ['7. Segurança e contato', 'Aplicamos controles técnicos e administrativos compatíveis com o serviço. Em caso de dúvida ou incidente percebido, entre em contato imediatamente por brazilianinaction@gmail.com.'],
  ],
};

export const LegalPage: React.FC<LegalPageProps> = ({ kind }) => {
  const isTerms = kind === 'terms';
  const title = isTerms ? 'Termos de Uso' : 'Política de Privacidade';
  const intro = isTerms
    ? 'Leia como funciona o Brazilian in Action, as regras de utilização, o acesso por assinatura e os canais de suporte.'
    : 'Entenda quais dados podem ser tratados, por que são necessários, por quanto tempo ficam armazenados e quais são seus direitos.';

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <a href="./" className="flex items-center gap-3 text-white no-underline">
            <BrazilianLogo size="sm" />
            <span className="text-sm font-semibold">Brazilian in Action</span>
          </a>
          <a href="./" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs text-white/75 hover:bg-white/10">
            <ArrowLeft size={14} /> Voltar para a plataforma
          </a>
        </header>

        <section className="rounded-3xl border border-white/15 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl sm:p-10">
          <div className="mb-8 flex items-start gap-4">
            <div className="rounded-2xl bg-amber-500/15 p-3 text-amber-300">
              {isTerms ? <ShieldCheck size={22} /> : <Mail size={22} />}
            </div>
            <div>
              <p className="mb-2 text-[11px] uppercase tracking-[0.22em] text-amber-300">Brazilian in Action</p>
              <h1 className="text-2xl font-bold sm:text-4xl">{title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">{intro}</p>
            </div>
          </div>

          <div className="space-y-7 text-sm leading-7 text-white/75">
            {sections[kind].map(([heading, content]) => (
              <section key={heading}>
                <h2 className="mb-1 text-base font-bold text-white">{heading}</h2>
                <p>{content}</p>
              </section>
            ))}
          </div>

          <p className="mt-10 border-t border-white/10 pt-5 text-xs text-white/45">
            Última atualização: 18 de setembro de 2026. Para esclarecimentos, escreva para brazilianinaction@gmail.com.
          </p>
        </section>
      </div>
    </main>
  );
};
