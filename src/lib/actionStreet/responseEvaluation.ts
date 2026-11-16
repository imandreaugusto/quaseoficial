import type { ActionStreetResponseEvaluation } from '../../types/actionStreet';

const CONFIDENCE_THRESHOLD = 0.6;

export function buildActionStreetResponseEvaluation(relevance: number, clarity: number): ActionStreetResponseEvaluation {
  for (const [label, value] of [['relevance', relevance], ['clarity', clarity]] as const) {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error(`Jev returned an invalid ${label} confidence.`);
    }
  }

  const isValid = relevance >= CONFIDENCE_THRESHOLD && clarity >= CONFIDENCE_THRESHOLD;
  return {
    isValid,
    relevance,
    clarity,
    feedback: isValid
      ? 'Boa resposta! Ela está clara e combina com a situação.'
      : relevance < CONFIDENCE_THRESHOLD
        ? 'Tente responder diretamente ao que o personagem pediu. Você pode usar uma frase diferente das sugestões.'
        : 'A ideia faz sentido; ajuste a frase em inglês para que fique mais fácil de entender.',
  };
}
