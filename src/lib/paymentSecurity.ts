import { createHmac, timingSafeEqual } from 'node:crypto';

export const ABACATEPAY_WEBHOOK_HMAC_KEY =
  't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9';

export const normalizeEmail = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

export const subscriptionPriceCents = (rawValue: string | undefined): number => {
  const amount = rawValue === undefined || rawValue.trim() === '' ? 10 : Number(rawValue);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) {
    throw new Error('SUBSCRIPTION_PRICE_REAIS precisa ser maior que zero e menor ou igual a 10000.');
  }
  return Math.round(amount * 100);
};

const constantTimeStringEquals = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

export const verifyWebhookSecret = (provided: unknown, expected: string | undefined): boolean =>
  typeof provided === 'string' && Boolean(expected) && constantTimeStringEquals(provided, expected!);

export const verifyAbacatePaySignature = (
  rawBody: Buffer | undefined,
  signature: string | undefined,
  key = ABACATEPAY_WEBHOOK_HMAC_KEY
): boolean => {
  if (!rawBody || !signature) return false;
  const expected = createHmac('sha256', key).update(rawBody).digest();
  const received = Buffer.from(signature.trim(), 'base64');
  return received.length === expected.length && timingSafeEqual(received, expected);
};

export const abacatePayApiEndpoint = (
  configuredBase: string | undefined,
  resource: 'transparents/create' | 'transparents/check'
): string => {
  const base = (configuredBase?.trim() || 'https://api.abacatepay.com').replace(/\/+$/, '');
  const versionedBase = base.endsWith('/v2') ? base : `${base}/v2`;
  return `${versionedBase}/${resource}`;
};