// Minimal in-memory TTL cache. Not shared across serverless instances/regions - that's
// fine for its purpose here (short-lived caching of rarely-changing rows like a single
// mock_tests row's is_hidden/is_premium/duration flags), where a few seconds of staleness
// per cold instance is an acceptable tradeoff for cutting a DB round-trip off the hot path
// of starting an exam. Do NOT use this for anything where staleness could be a security
// or correctness problem (e.g. never cache auth checks or per-user data).

const store = new Map(); // key -> { value, expiresAt }

export function cacheGet(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

export function cacheSet(key, value, ttlMs) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function cacheDelete(key) {
  store.delete(key);
}

// Prevent unbounded growth in a long-lived process (local dev / non-serverless deploys).
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.expiresAt) store.delete(key);
  }
}, 60_000).unref?.();
