import { useEffect, useState } from 'react';
import { SPACE_MOMENT_INSIGHT_EVENT, type SpaceMomentInsightDetail } from '../lib/brazilianSpaceEvents';
import './BrazilianSpace.css';

export function BrazilianSpaceMomentInsight({
  onOpenSpace
}: {
  onOpenSpace: (draft: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    const handleMoment = (event: Event) => {
      const detail = (event as CustomEvent<SpaceMomentInsightDetail>).detail;
      setDraft(typeof detail?.draft === 'string' ? detail.draft.slice(0, 2000) : '');
      setIsOpen(true);
    };
    window.addEventListener(SPACE_MOMENT_INSIGHT_EVENT, handleMoment);
    return () => window.removeEventListener(SPACE_MOMENT_INSIGHT_EVENT, handleMoment);
  }, []);

  if (!isOpen) return null;
  return (
    <div className="space-moment-backdrop" role="presentation">
      <section className="space-moment-dialog" role="dialog" aria-modal="true" aria-labelledby="space-moment-title">
        <button className="space-moment-close" type="button" aria-label="Fechar" onClick={() => setIsOpen(false)}>×</button>
        <span className="space-eyebrow">BRAZILIAN SPACE</span>
        <h2 id="space-moment-title">Gostou? Compartilhe um insight no Brazilian Space com um clique</h2>
        <p>Seu aprendizado pode ajudar outros alunos a avancarem.</p>
        <button
          className="space-primary-button"
          type="button"
          onClick={() => {
            setIsOpen(false);
            onOpenSpace(draft);
          }}
        >
          Compartilhar insight
        </button>
      </section>
    </div>
  );
}
