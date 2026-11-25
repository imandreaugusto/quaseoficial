import { getSupabaseClient } from '../utils/supabaseClient';
import { curatedCollocations, getMockEntry, normalizeWordKey } from './data';
import type {
  CulturalEntry,
  DictionaryApiEntry,
  UserHighlight,
} from './types';

export interface DictionaryLookup {
  entry: CulturalEntry | null;
  collocations: string[];
  notices: string[];
}

const requestJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Consulta indisponível (${response.status}).`);
  return response.json() as Promise<T>;
};

const createPublicEntry = (
  word: string,
  apiEntries: DictionaryApiEntry[],
): CulturalEntry | null => {
  const firstEntry = apiEntries[0];
  if (!firstEntry) return null;

  const roles = (firstEntry.meanings ?? []).flatMap((meaning) => {
    const definition = meaning.definitions?.find((item) => item.definition)?.definition;
    return definition
      ? [{
          label: meaning.partOfSpeech || 'Uso',
          meaning: definition,
          ipa: firstEntry.phonetic || firstEntry.phonetics?.find((item) => item.text)?.text,
        }]
      : [];
  });

  if (!roles.length) return null;
  const examples = (firstEntry.meanings ?? [])
    .flatMap((meaning) => meaning.definitions ?? [])
    .filter((definition) => definition.example)
    .slice(0, 3)
    .map((definition) => ({
      sentence: definition.example || '',
      translation: 'Exemplo da Free Dictionary API, sem tradução automática.',
    }));

  return {
    word_key: normalizeWordKey(word),
    word: firstEntry.word || word,
    scenario_tag: '',
    grammatical_roles: roles,
    phonetic_tips: 'Pronúncia fonética fornecida pela Free Dictionary API. Use o áudio para ouvir a palavra.',
    connected_speech: {
      formal: word,
      natural: word,
      meaning: 'Ainda não há uma forma de fala conectada cadastrada para este termo.',
    },
    false_twin_comparison: {
      otherWord: '',
      searchedWordUsage: '',
      otherWordUsage: '',
    },
    cultural_usage: 'Esta definição vem da Free Dictionary API. O contexto cultural deste termo ainda não foi curado.',
    brazilian_pitfalls: 'Ainda não há uma armadilha de tradução cadastrada para este termo.',
    social_temp: 'neutral',
    examples_json: examples,
  };
};

export const lookupDictionary = async (term: string): Promise<DictionaryLookup> => {
  const word = normalizeWordKey(term);
  const client = getSupabaseClient();
  const notices: string[] = [];

  const culturalRequest = client
    ? client
        .from('cultural_dictionary')
        .select('*')
        .eq('word_key', word)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null });
  const dictionaryRequest = requestJson<DictionaryApiEntry[]>(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
  );
  const collocationRequest = Promise.all([
    requestJson<Array<{ word?: string }>>(
      `https://api.datamuse.com/words?rel_jja=${encodeURIComponent(word)}&max=8`,
    ),
    requestJson<Array<{ word?: string }>>(
      `https://api.datamuse.com/words?rel_jjb=${encodeURIComponent(word)}&max=8`,
    ),
  ]);

  const [culturalResult, dictionaryResult, collocationResult] = await Promise.allSettled([
    culturalRequest,
    dictionaryRequest,
    collocationRequest,
  ]);

  let entry: CulturalEntry | null = null;
  if (culturalResult.status === 'fulfilled') {
    if (culturalResult.value.error) {
      notices.push('O catálogo Supabase não respondeu; mostrando a definição pública ou o conteúdo de demonstração.');
    } else {
      entry = culturalResult.value.data as CulturalEntry | null;
    }
  } else {
    notices.push('O catálogo Supabase não respondeu; mostrando a definição pública ou o conteúdo de demonstração.');
  }

  let publicEntry: CulturalEntry | null = null;
  if (dictionaryResult.status === 'fulfilled') {
    publicEntry = createPublicEntry(word, dictionaryResult.value);
  } else {
    notices.push('A Free Dictionary API está indisponível no momento.');
  }

  let collocations: string[] = [];
  if (collocationResult.status === 'fulfilled') {
    collocations = [...collocationResult.value[0], ...collocationResult.value[1]]
      .map((item) => item.word?.trim())
      .filter((item): item is string => Boolean(item))
      .filter((item, index, all) => all.findIndex((other) => other.toLowerCase() === item.toLowerCase()) === index)
      .slice(0, 10);
  } else {
    collocations = curatedCollocations[word] ?? [];
    notices.push(collocations.length
      ? 'A Datamuse está indisponível neste domínio; exibindo combinações curadas para este termo.'
      : 'As combinações da Datamuse não puderam ser carregadas.');
  }

  return {
    entry: entry || getMockEntry(word) || publicEntry,
    collocations,
    notices,
  };
};

const highlightCacheKey = (userId: string) => `dictionary-action:highlights:${userId}`;

export const readCachedHighlights = (userId: string): UserHighlight[] => {
  try {
    const cached = localStorage.getItem(highlightCacheKey(userId));
    if (!cached) return [];
    const parsed: unknown = JSON.parse(cached);
    return Array.isArray(parsed) ? parsed as UserHighlight[] : [];
  } catch (error) {
    console.warn('Não foi possível ler o cache local dos grifos:', error);
    return [];
  }
};

export const cacheHighlights = (userId: string, highlights: UserHighlight[]) => {
  try {
    localStorage.setItem(highlightCacheKey(userId), JSON.stringify(highlights));
  } catch (error) {
    console.warn('Não foi possível atualizar o cache local dos grifos:', error);
  }
};

export const loadHighlightsFromSupabase = async (userId: string) => {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client
    .from('user_text_highlights')
    .select('id,user_id,word_key,highlighted_text,color_tag,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as UserHighlight[];
};

export const syncHighlightToSupabase = async (highlight: UserHighlight) => {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client
    .from('user_text_highlights')
    .upsert(highlight, { onConflict: 'user_id,word_key,highlighted_text' });
  if (error) throw error;
};

export const deleteHighlightFromSupabase = async (highlight: UserHighlight) => {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client
    .from('user_text_highlights')
    .delete()
    .eq('id', highlight.id)
    .eq('user_id', highlight.user_id);
  if (error) throw error;
};
