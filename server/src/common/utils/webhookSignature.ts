import { createHmac, timingSafeEqual } from "node:crypto";
import { MAX_SKEW_SECONDS } from "../constants";

/**
 * HMAC-SHA256 over `timestamp.body`, constant-time compare, ±300s replay window.
 */
export function verifySignature(
  rawBody: Buffer,
  signature: string | undefined,
  timestamp: string | undefined,
  secret: string,
): boolean {
  if (!signature || !timestamp || !secret) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > MAX_SKEW_SECONDS) return false; // replay
  const expected = createHmac("sha256", secret).update(`${timestamp}.`).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
