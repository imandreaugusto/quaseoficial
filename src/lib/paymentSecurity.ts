import { createHmac, timingSafeEqual } from 'node:crypto';

export const ABACATEPAY_WEBHOOK_PUBLIC_KEY =
  't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9';

export const normalizeEmail = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

export const hasActiveSubscription = (
  status: unknown,
  expiresAt: unknown,
  now = Date.now()
): boolean =>
  status === 'active' &&
  typeof expiresAt === 'string' &&
  Number.isFinite(Date.parse(expiresAt)) &&
  Date.parse(expiresAt) > now;

export const isAbacatePayPaymentApprovedStatus = (status: unknown): boolean =>
  typeof status === 'string' &&
  ['PAID', 'APPROVED', 'COMPLETED', 'CONFIRMED'].includes(status.trim().toUpperCase());

export const isAbacatePayPaymentCompletedEvent = (event: unknown): boolean =>
  typeof event === 'string' && event.trim().toLowerCase() === 'transparent.completed';

export const getAbacatePayPaymentId = (payload: unknown): string => {
  if (!payload || typeof payload !== 'object') return '';
  const root = payload as Record<string, unknown>;
  const data = root.data && typeof root.data === 'object'
    ? root.data as Record<string, unknown>
    : null;
  const transparent = data?.transparent && typeof data.transparent === 'object'
    ? data.transparent as Record<string, unknown>
    : null;
  const payment = root.payment && typeof root.payment === 'object'
    ? root.payment as Record<string, unknown>
    : null;
  const candidates = [transparent?.id, data?.id, payment?.id, root.id];
  return candidates.find((candidate): candidate is string =>
    typeof candidate === 'string' && candidate.trim().length > 0
  )?.trim() || '';
};

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
  key: string | undefined
): boolean => {
  if (!rawBody || !signature || !key) return false;
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