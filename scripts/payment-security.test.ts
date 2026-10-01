import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import {
  normalizeEmail,
  subscriptionPriceCents,
  verifyAbacatePaySignature,
  verifyWebhookSecret
} from '../src/lib/paymentSecurity';

test('normalizes payer email before binding a payment', () => {
  assert.equal(normalizeEmail('  Student@Example.COM '), 'student@example.com');
  assert.equal(normalizeEmail(null), '');
});

test('uses the server default price and rejects invalid amounts', () => {
  assert.equal(subscriptionPriceCents(undefined), 1000);
  assert.equal(subscriptionPriceCents('12.5'), 1250);
  assert.throws(() => subscriptionPriceCents('0'));
  assert.throws(() => subscriptionPriceCents('NaN'));
});

test('requires the URL webhook secret and compares it safely', () => {
  assert.equal(verifyWebhookSecret('matching-secret', 'matching-secret'), true);
  assert.equal(verifyWebhookSecret('wrong-secret', 'matching-secret'), false);
  assert.equal(verifyWebhookSecret('matching-secret', undefined), false);
});

test('validates the AbacatePay HMAC against the exact raw body', () => {
  const body = Buffer.from('{"id":"evt_1","event":"transparent.completed"}');
  const signature = createHmac('sha256', 'test-public-key').update(body).digest('base64');

  assert.equal(verifyAbacatePaySignature(body, signature, 'test-public-key'), true);
  assert.equal(verifyAbacatePaySignature(Buffer.from(`${body.toString()} `), signature, 'test-public-key'), false);
  assert.equal(verifyAbacatePaySignature(body, undefined, 'test-public-key'), false);
});