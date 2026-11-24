import assert from 'node:assert/strict';
import test from 'node:test';
import { ensureAdminAppsInOrder, ensureStudentAppsInOrder } from '../src/lib/appMenuOrder';

test('adds fixed navigation items and missing apps to legacy subscriber orders', () => {
  const appIds = ['home', 'actionstreet', 'readclub', 'flashcards', 'holybible', 'settings'];
  const order = ensureStudentAppsInOrder(['home', 'readclub', 'holybible'], appIds);

  assert.deepEqual(order, ['home', 'actionstreet', 'readclub', 'flashcards', 'holybible', 'settings']);
});

test('preserves selected positions for apps already in the menu', () => {
  const savedOrder = ['home', 'readclub', 'brazilianfriends', 'flashcards', 'holybible', 'actionstreet', 'settings'];
  const appIds = ['home', 'actionstreet', 'brazilianfriends', 'readclub', 'flashcards', 'holybible', 'settings'];

  assert.deepEqual(ensureStudentAppsInOrder(savedOrder, appIds), savedOrder);
});

test('adds Brazilian Anki and missing navigation items to legacy CEO orders', () => {
  const appIds = ['home', 'work', 'actionstreet', 'readclub', 'flashcards', 'settings'];
  const order = ensureAdminAppsInOrder(['home', 'readclub', 'settings'], appIds);

  assert.deepEqual(order, ['home', 'work', 'actionstreet', 'readclub', 'flashcards', 'settings']);
});
