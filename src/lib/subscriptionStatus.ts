import type { SubscriptionStatus } from '../types';

const parseExpiration = (expiresAt: unknown): number | null => {
  if (typeof expiresAt !== 'string' || !expiresAt) return null;
  const timestamp = Date.parse(expiresAt);
  return Number.isFinite(timestamp) ? timestamp : null;
};

export const isActiveSubscription = (
  status: SubscriptionStatus,
  expiresAt: string | null | undefined,
  now = Date.now()
): boolean => {
  if (status !== 'active' || !expiresAt) return false;
  const expiration = parseExpiration(expiresAt);
  return expiration !== null && expiration > now;
};

export const getEffectiveSubscriptionStatus = (
  status: SubscriptionStatus,
  expiresAt: string | null | undefined,
  now = Date.now()
): SubscriptionStatus => {
  if (status === 'active') return isActiveSubscription(status, expiresAt, now) ? 'active' : 'expired';
  if (status === 'trial') return 'pending';
  return status;
};

export const getAdminSubscriptionStatus = (
  subscriptionStatus: unknown,
  subscriptionExpiresAt: unknown,
  profileStatus: unknown,
  profileExpiresAt: unknown,
  now = Date.now()
): SubscriptionStatus => {
  if (subscriptionStatus === 'active') {
    return isActiveSubscription('active', typeof subscriptionExpiresAt === 'string' ? subscriptionExpiresAt : null, now)
      ? 'active'
      : 'expired';
  }
  if (subscriptionStatus === 'expired') return 'expired';
  if (subscriptionStatus === 'pending') return 'pending';

  if (profileStatus === 'expired') return 'expired';
  if (profileStatus === 'active') {
    const expiration = parseExpiration(profileExpiresAt);
    return expiration !== null && expiration <= now ? 'expired' : 'pending';
  }
  return 'pending';
};

export const getSubscriptionDaysRemaining = (
  status: SubscriptionStatus,
  expiresAt: string | null | undefined,
  now = Date.now()
): number | null => {
  if (!isActiveSubscription(status, expiresAt, now)) return null;
  const expiration = parseExpiration(expiresAt);
  return expiration === null ? null : Math.ceil((expiration - now) / 86_400_000);
};
