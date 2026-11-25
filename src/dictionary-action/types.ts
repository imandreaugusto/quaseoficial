export type HighlightColor = 'cyan' | 'amber' | 'emerald';

export interface GrammaticalRole {
  label: string;
  meaning: string;
  ipa?: string;
  pronunciationTip?: string;
}

export interface ConnectedSpeech {
  formal: string;
  natural: string;
  meaning: string;
}

export interface FalseTwinComparison {
  otherWord: string;
  searchedWordUsage: string;
  otherWordUsage: string;
}

export interface DictionaryExample {
  sentence: string;
  translation: string;
}

export interface CulturalEntry {
  word_key: string;
  word: string;
  scenario_tag: string;
  grammatical_roles: GrammaticalRole[];
  phonetic_tips: string;
  connected_speech: ConnectedSpeech;
  false_twin_comparison: FalseTwinComparison;
  cultural_usage: string;
  brazilian_pitfalls: string;
  social_temp: 'corporate' | 'neutral' | 'informal' | 'risk';
  examples_json: DictionaryExample[];
}

export interface UserHighlight {
  id: string;
  user_id: string;
  word_key: string;
  highlighted_text: string;
  color_tag: HighlightColor;
  created_at: string;
}

export interface DictionaryApiEntry {
  word?: string;
  phonetic?: string;
  phonetics?: Array<{ text?: string; audio?: string }>;
  meanings?: Array<{
    partOfSpeech?: string;
    definitions?: Array<{ definition?: string; example?: string }>;
  }>;
}
