import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Plane, RotateCcw } from 'lucide-react';
import gsap from 'gsap';
import { useActionStreet } from '../ActionStreetContext';
import { glass } from '../shared/glass';
import Map3DViewer, { type DiveStage } from './Map3DViewer';

interface Props {
  cityId: string;
  onComplete: () => void;
  onBack: () => void;
}

export default function Map3DExplorer({ cityId, onComplete, onBack }: Props) {
  const { getCityData } = useActionStreet();
  const city = getCityData(cityId);
  const [stage, setStage] = useState<DiveStage>('loading');
  const [attempt, setAttempt] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const leaving = useRef(false);
  const exitContext = useRef<gsap.Context | null>(null);

  useEffect(() => () => exitContext.current?.revert(), []);

  if (!city) return null;

  const captions: Record<DiveStage, string> = {
    loading: 'Preparando o voo...',
    flying: `Sobrevoando os EUA rumo a ${city.city}`,
    route: `Trajeto: ${city.route3D.name}`,
    landing: 'Pousando na rua...',
    failed: 'Não foi possível carregar o mapa 3D',
  };

  const enterStreet = () => {
    if (leaving.current) return;
    leaving.current = true;
    const stage = stageRef.current;
    if (!stage) return;
    exitContext.current?.revert();
    exitContext.current = gsap.context(() => {
      gsap.to(stage, { opacity: 0, scale: 1.08, duration: 0.8, ease: 'power2.inOut', onComplete });
    }, stage);
  };

  return (
    <div className="absolute inset-0 bg-slate-950 text-white">
      <div ref={stageRef} className="absolute inset-0">
        <Map3DViewer key={attempt} city={city} onStage={setStage} onDiveComplete={enterStreet} />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-slate-950/70 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950/70 to-transparent" />
      </div>

      <header className="absolute inset-x-0 top-[4.25rem] z-10 flex items-center justify-between gap-3 px-4 sm:px-6">
        <button type="button" onClick={onBack} aria-label="Voltar ao lobby" className={glass.iconButton}>
          <ArrowLeft className="h-5 w-5" />
        </button>
      </header>

      <div className="absolute inset-x-0 bottom-6 z-10 flex justify-center px-4">
        {stage === 'failed' ? (
          <div className={`flex max-w-md flex-col items-center gap-3 p-5 text-center ${glass.panelOverImagery}`}>
            <p className="font-bold">{captions.failed}</p>
            <p className="text-sm text-white/70">Verifique sua conexão e tente novamente. A chegada à rua só acontece depois desta etapa.</p>
            <button type="button" onClick={() => {
              leaving.current = false;
              setStage('loading');
              setAttempt((current) => current + 1);
            }} className={glass.primaryButton}>
              <RotateCcw className="h-4 w-4" />
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className={`flex items-center gap-3 px-5 py-3 ${glass.panelOverImagery}`} role="status" aria-live="polite">
            <Plane className="h-4 w-4 text-blue-300" />
            <span className="text-sm font-bold">{captions[stage]}</span>
          </div>
        )}
      </div>
    </div>
  );
}
