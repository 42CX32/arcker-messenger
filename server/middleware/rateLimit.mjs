// rateLimit.mjs - created by script
const rateLimit = new Map();

export function rateLimiter(limit = 10, window = 60000) { // 10 requests per minute
  return (req, res, next) => {
    const key = req.user?.id || req.ip;
    const now = Date.now();
    if (!rateLimit.has(key)) {
      rateLimit.set(key, { count: 1, reset: now + window });
      return next();
    }
    const data = rateLimit.get(key);
    if (now > data.reset) {
      rateLimit.set(key, { count: 1, reset: now + window });
      return next();
    }
    data.count++;
    if (data.count > limit) {
      return res.status(429).json({ error: 'Too many requests, slow down' });
    }
    next();
  };
}