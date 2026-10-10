import { StoryItem } from '../types';

export const formatStoryText = (text: string, type: StoryItem['type']): string => {
  const normalized = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .trim();

  if (!normalized) return normalized;

  const paragraphs = normalized.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);

  if (type === 'music') {
    const hasExplicitStanzas = /\n\s*\n/.test(normalized);
    return paragraphs
      .flatMap((paragraph) => {
        let lines = paragraph.split('\n').map((line) => line.trim()).filter(Boolean);
        if (lines.length === 1) {
          const sentences = lines[0].split(/(?<=[.!?])\s+/).filter(Boolean);
          if (sentences.length > 1) {
            lines = sentences;
          } else {
            const words = lines[0].split(/\s+/);
            lines = [];
            for (let index = 0; index < words.length; index += 8) {
              lines.push(words.slice(index, index + 8).join(' '));
            }
          }
        }

        if (hasExplicitStanzas) return [lines.join('\n')];

        const stanzas: string[] = [];
        for (let index = 0; index < lines.length; index += 4) {
          stanzas.push(lines.slice(index, index + 4).join('\n'));
        }
        return stanzas;
      })
      .join('\n\n');
  }

  return paragraphs
    .flatMap((paragraph) => {
      const sentences = paragraph
        .replace(/\n+/g, ' ')
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter(Boolean);
      const grouped: string[] = [];

      if (sentences.length <= 3) return [sentences.join(' ')];

      const sentencesPerParagraph = Math.ceil(sentences.length / Math.ceil(sentences.length / 4));
      for (let index = 0; index < sentences.length; index += sentencesPerParagraph) {
        grouped.push(sentences.slice(index, index + sentencesPerParagraph).join(' '));
      }

      return grouped;
    })
    .join('\n\n');
};

export const formatStoryLibrary = (library: StoryItem[]): StoryItem[] => {
  let changed = false;
  const formatted = library.map((story) => {
    const text = formatStoryText(story.text || '', story.type);
    if (text === story.text) return story;
    changed = true;
    return { ...story, text };
  });

  return changed ? formatted : library;
};

export const formatLyricsLibrary = <T extends { lyrics?: string; translatedLyrics?: string }>(library: T[]): T[] => {
  let changed = false;
  const formatted = library.map((item) => {
    const lyrics = item.lyrics ? formatStoryText(item.lyrics, 'music') : item.lyrics;
    const translatedLyrics = item.translatedLyrics
      ? formatStoryText(item.translatedLyrics, 'music')
      : item.translatedLyrics;
    if (lyrics === item.lyrics && translatedLyrics === item.translatedLyrics) return item;
    changed = true;
    return { ...item, lyrics, translatedLyrics };
  });

  return changed ? formatted : library;
};
