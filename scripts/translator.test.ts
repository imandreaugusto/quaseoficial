import assert from 'node:assert/strict';
import test from 'node:test';
import { translateText } from '../src/lib/translator';

test('rejects multi-word input before calling any translation provider', async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error('Translation providers must not be called for phrases.');
  };

  try {
    await assert.rejects(
      translateText('hello world'),
      /somente para palavras individuais/
    );
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
