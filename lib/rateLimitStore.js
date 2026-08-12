// express-rate-limit's default store is in-process memory, which does NOT share state
// across concurrent serverless function instances/regions - under real concurrent load the
// effective limit ends up higher than configured, since each cold instance starts its own
// counter. This module returns a Redis-backed store when REDIS_URL is configured (shared,
// correct limits across instances), and transparently falls back to the default in-memory
// store otherwise - so the app still works with zero extra infrastructure if you don't set
// REDIS_URL, it just loses the "correct under concurrency" guarantee until you do.
//
// Requires the optional dependencies `ioredis` and `rate-limit-redis` to be installed for
// the Redis path. If they aren't installed, or REDIS_URL is unreachable at startup, this
// logs a warning and returns undefined so express-rate-limit uses its built-in memory store.

export async function createRateLimitStore() {
  if (!process.env.REDIS_URL) {
    return undefined;
  }

  try {
    const [{ default: Redis }, { RedisStore }] = await Promise.all([
      import('ioredis'),
      import('rate-limit-redis'),
    ]);

    const client = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
    });

    client.on('error', (err) => {
      console.error('Redis rate-limit store error (falling back to in-memory for affected requests):', err.message);
    });

    await client.connect();

    return new RedisStore({
      sendCommand: (...args) => client.call(...args),
    });
  } catch (err) {
    console.warn(
      'REDIS_URL is set but the Redis-backed rate limit store could not be initialized ' +
      '(install ioredis + rate-limit-redis, and verify REDIS_URL). Falling back to in-memory rate limiting:',
      err.message
    );
    return undefined;
  }
}
