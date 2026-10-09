import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getAdminSubscriptionStatus,
  getEffectiveSubscriptionStatus,
  getSubscriptionDaysRemaining,
  isActiveSubscription
} from '../src/lib/subscriptionStatus';

const now = Date.parse('2026-01-01T12:00:00.000Z');

test('keeps an active subscription active while its expiration is in the future', () => {
  const expiration = '2026-01-02T12:00:00.000Z';
  assert.equal(isActiveSubscription('active', expiration, now), true);
  assert.equal(getEffectiveSubscriptionStatus('active', expiration, now), 'active');
});

test('treats expired, missing, and invalid active expiration dates as expired', () => {
  assert.equal(getEffectiveSubscriptionStatus('active', '2026-01-01T11:59:59.000Z', now), 'expired');
  assert.equal(getEffectiveSubscriptionStatus('active', null, now), 'expired');
  assert.equal(getEffectiveSubscriptionStatus('active', 'not-a-date', now), 'expired');
});

test('does not promote pending or trial accounts because they have a future expiration', () => {
  const expiration = '2026-01-02T12:00:00.000Z';
  assert.equal(getEffectiveSubscriptionStatus('pending', expiration, now), 'pending');
  assert.equal(getEffectiveSubscriptionStatus('trial', expiration, now), 'pending');
});

test('requires a canonical active subscription and falls back safely for legacy profiles', () => {
  const futureExpiration = '2026-01-02T12:00:00.000Z';

  assert.equal(getAdminSubscriptionStatus('active', futureExpiration, 'pending', null, now), 'active');
  assert.equal(getAdminSubscriptionStatus('active', 'not-a-date', 'active', futureExpiration, now), 'expired');
  assert.equal(getAdminSubscriptionStatus(null, 'not-a-date', 'expired', null, now), 'expired');
  assert.equal(getAdminSubscriptionStatus(null, null, 'active', futureExpiration, now), 'pending');
  assert.equal(getAdminSubscriptionStatus('pending', futureExpiration, 'active', futureExpiration, now), 'pending');
});

test('calculates days remaining from an absolute timestamp and excludes expired subscriptions', () => {
  assert.equal(getSubscriptionDaysRemaining('active', '2026-01-02T11:59:59.000Z', now), 1);
  assert.equal(getSubscriptionDaysRemaining('active', '2026-01-01T12:00:00.000Z', now), null);
  assert.equal(getSubscriptionDaysRemaining('pending', '2026-01-02T12:00:00.000Z', now), null);
});
