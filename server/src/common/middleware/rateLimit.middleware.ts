import rateLimit from "express-rate-limit";
import type { Request } from "express";

/** Per-user when authenticated, per-IP otherwise. */
const keyOf = (req: Request) => req.user?.id ?? req.ip ?? "anon";

export const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  keyGenerator: keyOf,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: "Slow down",
    error: { code: "RATE_LIMITED", message: "Slow down" },
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  keyGenerator: (req) => req.ip ?? "anon",
  message: {
    success: false,
    statusCode: 429,
    message: "Too many attempts, try later",
    error: { code: "RATE_LIMITED", message: "Too many attempts, try later" },
  },
});

export const aiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  keyGenerator: keyOf,
  message: {
    success: false,
    statusCode: 429,
    message: "AI rate limit reached",
    error: { code: "RATE_LIMITED", message: "AI rate limit reached" },
  },
});
