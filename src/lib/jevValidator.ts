// Server-only helper: validates Portuguese input with TypeSafe AI's Jev model (Noul primitive)
// before spending tokens on expensive LLM translation calls.
// Docs: https://docs.typesafe.ai/primitives/noul
import { noul, TypeSafeClient } from '@typesafe-ai/sdk';

const CONFIDENCE_THRESHOLD = 0.6;

let client: TypeSafeClient | null | undefined;

// Lazily creates the client so the app keeps working even if TYPESAFE_API_KEY isn't set yet.
const getClient = (): TypeSafeClient | null => {
  if (client !== undefined) return client;
  if (!process.env.TYPESAFE_API_KEY) {
    console.warn('TYPESAFE_API_KEY não configurada: validação do Jev será ignorada.');
    client = null;
    return client;
  }
  client = new TypeSafeClient({ apiKey: process.env.TYPESAFE_API_KEY, defaultModel: 'jev-latest' });
  return client;
};

export interface PhraseValidationResult {
  /** true when the phrase is coherent enough to translate. */
  isValid: boolean;
  /** Probability (0-1) that the phrase makes sense, as returned by Jev. */
  probability: number;
}

/**
 * Asks Jev (Noul primitive) whether a Portuguese phrase has enough syntactic
 * sense and acceptable spelling to be worth translating.
 * If TYPESAFE_API_KEY isn't configured, or the call fails, it fails open
 * (treats the phrase as valid) so translation keeps working.
 */
export async function validatePortuguesePhrase(text: string): Promise<PhraseValidationResult> {
  const cleanText = text.trim();
  if (!cleanText) return { isValid: false, probability: 0 };

  const typeSafeClient = getClient();
  if (!typeSafeClient) return { isValid: true, probability: 1 };

  try {
    const response = await typeSafeClient.systemOne({
      state: cleanText,
      questions: {
        makes_sense: noul(
          'A frase inserida em português possui nexo, sentido sintático e ortografia aceitável para ser traduzida?'
        ),
      },
    });

    const probability = response.answers.makes_sense.noul;

    if (probability < CONFIDENCE_THRESHOLD) {
      return { isValid: false, probability };
    }

    return { isValid: true, probability };
  } catch (err) {
    console.error('Falha ao validar frase com o Jev, permitindo tradução por segurança:', err);
    return { isValid: true, probability: 1 };
  }
}
