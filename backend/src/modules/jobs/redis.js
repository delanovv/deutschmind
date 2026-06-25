import IORedis from "ioredis";

export const redisEnabled = Boolean(process.env.REDIS_URL);
export const redis = redisEnabled
  ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: false })
  : null;

export async function cacheGet(key) {
  if (!redis) return null;
  const value = await redis.get(key);
  return value ? JSON.parse(value) : null;
}

export async function cacheSet(key, value, ttlSeconds = 3600) {
  if (!redis) return;
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
}

export async function cacheDeletePattern(pattern) {
  if (!redis) return;
  let cursor = "0";
  do {
    const [next, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
    cursor = next;
    if (keys.length) await redis.del(...keys);
  } while (cursor !== "0");
}

