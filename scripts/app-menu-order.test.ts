import assert from 'node:assert/strict';
import test from 'node:test';
import { ensureStudentAppsInOrder } from '../src/lib/appMenuOrder';

test('adds Action Street and Brazilian Anki to legacy subscriber menu orders', () => {
  const order = ensureStudentAppsInOrder(['home', 'readclub', 'holybible']);

  assert.deepEqual(order, ['home', 'actionstreet', 'readclub', 'flashcards', 'holybible']);
});

test('preserves CEO-selected positions for apps already in the menu', () => {
  const savedOrder = ['home', 'readclub', 'brazilianfriends', 'flashcards', 'holybible', 'actionstreet'];

  assert.deepEqual(ensureStudentAppsInOrder(savedOrder), savedOrder);
});
