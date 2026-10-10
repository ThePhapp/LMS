function clientKey(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function createRateLimiter({ windowMs, max, code = 'RATE_LIMITED', message = 'Too many requests' }) {
  const entries = new Map();
  const maxEntries = 10_000;

  return (req, res, next) => {
    const now = Date.now();
    const key = clientKey(req);
    let entry = entries.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      entries.set(key, entry);
    }

    entry.count += 1;
    const remaining = Math.max(0, max - entry.count);
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entries.size > maxEntries) {
      for (const [storedKey, storedEntry] of entries) {
        if (storedEntry.resetAt <= now || entries.size > maxEntries) entries.delete(storedKey);
      }
    }

    if (entry.count > max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({ code, message });
    }

    return next();
  };
}

module.exports = { createRateLimiter };
