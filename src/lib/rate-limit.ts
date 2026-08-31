/**
 * In-memory sliding window limiter. Per-instance only — on Vercel this does
 * not coordinate across lambdas, so it slows abuse rather than capping it.
 */

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

const MAX_KEYS = 10_000;

export function allowRequest(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;
  let bucket = buckets.get(key);
  if (!bucket) {
    if (buckets.size >= MAX_KEYS) buckets.clear();
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }
  bucket.timestamps = bucket.timestamps.filter((t) => t > windowStart);
  if (bucket.timestamps.length >= limit) return false;
  bucket.timestamps.push(now);
  return true;
}
