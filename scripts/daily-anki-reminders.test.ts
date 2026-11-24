import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DAILY_ANKI_REMINDER_MESSAGES,
  selectDailyAnkiReminderMessage,
} from '../src/lib/dailyAnkiReminderMessages';

test('provides 15 distinct short messages without emoji', () => {
  assert.equal(DAILY_ANKI_REMINDER_MESSAGES.length, 15);
  assert.equal(new Set(DAILY_ANKI_REMINDER_MESSAGES).size, 15);
  assert.ok(DAILY_ANKI_REMINDER_MESSAGES.every((message) => message.length <= 150));
  assert.ok(DAILY_ANKI_REMINDER_MESSAGES.every((message) => !/[\u{1F300}-\u{1FAFF}]/u.test(message)));
});

test('does not repeat any of the previous 14 daily messages', () => {
  const sentMessages: string[] = [];

  for (let day = 0; day < DAILY_ANKI_REMINDER_MESSAGES.length * 2; day += 1) {
    const message = selectDailyAnkiReminderMessage(sentMessages.slice(-14), day);
    assert.ok(!sentMessages.slice(-14).includes(message));
    sentMessages.push(message);
  }
});

test('uses a deterministic fallback after an interrupted schedule', () => {
  const recentMessages = DAILY_ANKI_REMINDER_MESSAGES.slice(0, 5);
  assert.equal(
    selectDailyAnkiReminderMessage(recentMessages, 123),
    selectDailyAnkiReminderMessage(recentMessages, 123),
  );
});
