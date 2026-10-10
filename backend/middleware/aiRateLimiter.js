const buckets = new Map();

function createAiRateLimiter({ windowMs = 60_000, maxRequests = 15 } = {}) {
  return (req, res, next) => {
    const now = Date.now();
    const key = req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`;
    const current = buckets.get(key);

    if (buckets.size > 5_000) {
      for (const [bucketKey, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(bucketKey);
      }
    }

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (current.count >= maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.set('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        message: 'Too many AI requests. Please try again shortly.',
      });
    }

    current.count += 1;
    return next();
  };
}

function clearAiRateLimitBuckets() {
  buckets.clear();
}

module.exports = { createAiRateLimiter, clearAiRateLimitBuckets };
