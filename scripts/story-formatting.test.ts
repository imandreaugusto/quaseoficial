import assert from 'node:assert/strict';
import test from 'node:test';
import { formatLyricsLibrary, formatStoryLibrary, formatStoryText } from '../src/lib/storyFormatting';
import { StoryItem } from '../src/types';

test('formats story text into readable paragraphs without changing its words', () => {
  const text = 'First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence. Sixth sentence.';
  const formatted = formatStoryText(text, 'story');

  assert.equal(formatted.split('\n\n').length, 2);
  assert.equal(formatted.replace(/\s+/g, ' '), text);
});

test('keeps four short sentences together instead of creating an extra paragraph', () => {
  const text = 'One sentence. Two sentences. Three sentences. Four sentences.';

  assert.equal(formatStoryText(text, 'story'), text);
});

test('organizes lyrics into four-line stanzas while preserving their words', () => {
  const text = 'Line one\nLine two\nLine three\nLine four\nLine five\nLine six\nLine seven\nLine eight';
  const formatted = formatStoryText(text, 'music');

  assert.equal(formatted.split('\n\n').length, 2);
  assert.equal(formatted.replace(/\s+/g, ' '), text.replace(/\s+/g, ' '));
});

test('preserves explicit lyric stanzas', () => {
  const text = 'First lyric\nSecond lyric\n\nThird lyric\nFourth lyric';

  assert.equal(formatStoryText(text, 'music'), text);
});

test('formats existing Brazilian Music lyrics and translations into readable stanzas', () => {
  const library = [{
    id: 'song-1',
    lyrics: 'Original line one\nOriginal line two\nOriginal line three\nOriginal line four\nOriginal line five',
    translatedLyrics: 'Translated line one\nTranslated line two\nTranslated line three\nTranslated line four\nTranslated line five',
  }];
  const formatted = formatLyricsLibrary(library);

  assert.equal(formatted[0].lyrics?.split('\n\n').length, 2);
  assert.equal(formatted[0].translatedLyrics?.split('\n\n').length, 2);
  assert.equal(formatLyricsLibrary(formatted), formatted);
});

test('formats existing library texts and leaves already formatted stories unchanged', () => {
  const library: StoryItem[] = [{
    id: 1,
    type: 'story',
    cat: 'TEST',
    title: 'Test',
    level: 'A1',
    text: 'One sentence.\nTwo sentences.\nThree sentences.\nFour sentences.',
  }];
  const formatted = formatStoryLibrary(library);

  assert.notEqual(formatted, library);
  assert.equal(formatted[0].text, 'One sentence. Two sentences. Three sentences. Four sentences.');
  assert.equal(formatStoryLibrary(formatted), formatted);
});
