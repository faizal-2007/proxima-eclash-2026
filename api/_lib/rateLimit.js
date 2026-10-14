import crypto from 'node:crypto';

const windows = new Map();
const WINDOW_MS = 60 * 60 * 1000;
let submissionQueue = Promise.resolve();

const keyDigest = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

const getClientIp = (req) => {
  const forwarded = req.headers?.['x-vercel-forwarded-for'] || req.headers?.['x-forwarded-for'];
  const ip = Array.isArray(forwarded) ? forwarded[0] : String(forwarded || '').split(',')[0];
  return ip.trim() || 'unknown';
};

export const checkRateLimit = ({
  req,
  namespace,
  identity = '',
  limit,
  ipLimit = limit,
  identityLimit = limit,
  windowMs = WINDOW_MS,
}) => {
  const ip = getClientIp(req);
  const now = Date.now();
  const keys = [{ key: `${namespace}:ip:${keyDigest(ip)}`, limit: ipLimit }];
  if (identity) {
    keys.push({
      key: `${namespace}:identity:${keyDigest(identity.trim().toLowerCase())}`,
      limit: identityLimit,
    });
  }

  for (const { key } of keys) {
    const current = windows.get(key);
    if (current && current.expiresAt <= now) windows.delete(key);
  }

  const blocked = keys
    .map(({ key, limit: keyLimit }) => ({ current: windows.get(key), limit: keyLimit }))
    .find(({ current, limit: keyLimit }) => current && current.count >= keyLimit);
  if (blocked?.current) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((blocked.current.expiresAt - now) / 1000)),
    };
  }

  for (const { key } of keys) {
    const current = windows.get(key);
    windows.set(key, {
      count: (current?.count || 0) + 1,
      expiresAt: current?.expiresAt || now + windowMs,
    });
  }

  // Keep the per-instance store bounded and discard expired entries opportunistically.
  if (windows.size > 5000) {
    for (const [key, value] of windows) {
      if (value.expiresAt <= now) windows.delete(key);
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
};

export const serializeRegistrationSubmission = async (operation) => {
  const previous = submissionQueue;
  let release;
  submissionQueue = new Promise((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await operation();
  } finally {
    release();
  }
};
