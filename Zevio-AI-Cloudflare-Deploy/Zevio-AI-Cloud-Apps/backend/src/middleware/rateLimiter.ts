import { Request, Response, NextFunction } from "express";

interface RateRecord {
  count: number;
  resetTime: number;
}

export function createRateLimiter(windowMs: number = 60000, maxRequests: number = 60) {
  const records = new Map<string, RateRecord>();

  // Cleanup old records periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of records.entries()) {
      if (now > record.resetTime) {
        records.delete(key);
      }
    }
  }, 120000);

  return (req: Request, res: Response, next: NextFunction): void => {
    const clientKey = req.ip || req.socket.remoteAddress || "anonymous";
    const now = Date.now();

    const current = records.get(clientKey);

    if (!current || now > current.resetTime) {
      records.set(clientKey, {
        count: 1,
        resetTime: now + windowMs
      });
      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", maxRequests - 1);
      return next();
    }

    if (current.count >= maxRequests) {
      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", 0);
      res.setHeader("Retry-After", Math.ceil((current.resetTime - now) / 1000));
      res.status(429).json({
        error: "Rate limit exceeded. Please wait a few seconds before sending more requests."
      });
      return;
    }

    current.count += 1;
    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", maxRequests - current.count);
    next();
  };
}

