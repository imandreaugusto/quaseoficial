import { useEffect, useRef, useState } from 'react';
import { Check, LockKeyhole, Radio, X } from 'lucide-react';
import gsap from 'gsap';
import { getSecretMissionOptions, type SecretMission } from '../../../lib/actionStreet/secretPager';
import { glass } from '../shared/glass';

interface Props {
  mission: SecretMission;
  unlockAt: number | null;
  previewUrl: string | null;
  onClose: () => void;
  onAccept: () => void;
  onVerify: (correct: boolean, mission: SecretMission) => boolean;
  onOpenPassport: (stampId: string) => void;
}

export default function SecretPagerModal({ mission, unlockAt, previewUrl, onClose, onAccept, onVerify, onOpenPassport }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const options = useState(() => getSecretMissionOptions(mission))[0];
  const [result, setResult] = useState<'success' | 'failure' | null>(null);
  const [stampId, setStampId] = useState('');
  const verificationDay = unlockAt !== null;

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const context = gsap.context(() => {
      gsap.fromTo(card, { opacity: 0, y: 20, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.28, ease: 'power2.out' });
    }, card);
    return () => context.revert();
  }, []);

  useEffect(() => {
    if (!result || !cardRef.current) return;
    const card = cardRef.current;
    const scanner = card.querySelector<HTMLElement>('[data-pager-scanner]');
    const context = gsap.context(() => {
      if (result === 'success') {
        if (scanner) gsap.fromTo(scanner, { xPercent: -100 }, { xPercent: 100, duration: 0.85, ease: 'power1.inOut' });
        const reward = card.querySelector('[data-pager-reward]');
        if (reward) gsap.fromTo(reward, { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(1.7)' });
      } else {
        gsap.timeline()
          .to(card, { x: -6, duration: 0.05 })
          .to(card, { x: 6, duration: 0.05 })
          .to(card, { x: -4, duration: 0.05 })
          .to(card, { x: 4, duration: 0.05 })
          .to(card, { x: 0, duration: 0.06 });
      }
    }, card);
    return () => context.revert();
  }, [result]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && result === null) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, result]);

  const answer = (option: string) => {
    if (result !== null) return;
    const correct = option === mission.secretPhrase;
    const succeeded = onVerify(correct, mission);
    setResult(succeeded ? 'success' : 'failure');
    if (succeeded) setStampId(`secret-${mission.id}`);
  };

  return (
    <div className={`absolute inset-0 z-[70] flex items-center justify-center p-4 ${glass.backdrop}`} onClick={result ? undefined : onClose}>
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label="Mensagem criptografada"
        onClick={(event) => event.stopPropagation()}
        className={`relative w-full max-w-lg overflow-hidden p-6 text-white ${glass.modal}`}
      >
        {previewUrl && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-25 blur-[16px]"
            style={{ backgroundImage: `url("${previewUrl}")`, backgroundPosition: 'center', backgroundSize: 'cover' }}
          />
        )}
        {result === 'success' && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden">
            <div data-pager-scanner className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-emerald-300/25 to-transparent" />
          </div>
        )}
        <div className="relative">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className={glass.label}>Pager · mensagem criptografada</p>
              <h2 className="mt-1 flex items-center gap-2 text-xl font-black">
                <Radio className="h-5 w-5 text-emerald-200" />
                {result === 'success' ? 'ACCESS GRANTED' : result === 'failure' ? 'TRANSMISSION TERMINATED' : verificationDay ? 'Confirme a senha' : 'Interceptação recebida'}
              </h2>
            </div>
            <button type="button" onClick={onClose} aria-label="Fechar pager" className={glass.iconButton}>
              <X className="h-4 w-4" />
            </button>
          </div>

          {result ? (
            <div role="status" aria-live="polite" className={`rounded-2xl border px-4 py-4 ${result === 'success' ? 'border-emerald-300/50 bg-emerald-950/60' : 'border-rose-300/40 bg-rose-950/50'}`}>
              <p className="font-black">{result === 'success' ? 'Identidade confirmada.' : 'Senha incorreta. Sem recompensa desta vez.'}</p>
              {result === 'success' && (
                <p data-pager-reward className="mt-2 text-lg font-black text-amber-200">+{mission.rewardDollars} Action Dollars</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {result === 'success' && (
                  <button type="button" onClick={() => onOpenPassport(stampId)} className={glass.primaryButton}>
                    <Check className="h-4 w-4" /> Ver carimbo
                  </button>
                )}
                <button type="button" onClick={onClose} className={glass.secondaryButton}>Continuar na rua</button>
              </div>
            </div>
          ) : verificationDay ? (
            <div>
              <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/15 bg-slate-950/70 px-4 py-3">
                <LockKeyhole className="h-5 w-5 shrink-0 text-emerald-200" />
                <p className="text-sm leading-relaxed">O informante pediu a expressão que você recebeu ontem. Escolha a senha correta.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {options.map((option) => (
                  <button key={option} type="button" onClick={() => answer(option)} className={glass.secondaryButton}>
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-slate-950/75 p-4">
              <p className={glass.label}>{mission.informant} · {mission.role}</p>
              <p className="mt-2 text-sm leading-relaxed">{mission.briefing}</p>
              <div className="mt-4 rounded-xl border border-emerald-300/25 bg-emerald-950/40 p-3">
                <p className={glass.label}>Anote ou memorize esta expressão</p>
                <p className="mt-1 text-xl font-black text-emerald-100">“{mission.secretPhrase}”</p>
                <p className="mt-1 text-xs text-white/60">{mission.meaning}</p>
              </div>
              <button type="button" onClick={onAccept} className={`${glass.primaryButton} mt-4 w-full`}>
                Aceitar interceptação
              </button>
              <p className="mt-2 text-center text-[10px] text-white/45">A confirmação fica disponível após 24 horas.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
