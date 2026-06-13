import { createHash } from "node:crypto";

/**
 * Local embedding for pgvector search.
 *
 * Default: a deterministic feature-hashing embedder (no external calls, free,
 * works offline). Swap `embed` for Voyage/OpenAI in prod by changing one
 * function — the 1536-dim column stays the same.
 */
const DIM = 1536;

export function embed(text: string): number[] {
  const v = new Float32Array(DIM);
  const tokens = text.toLowerCase().match(/[a-z0-9]{2,}/g) ?? [];
  for (const tok of tokens) {
    const h = createHash("sha1").update(tok).digest();
    const idx = h.readUInt32BE(0) % DIM;
    const sign = h[4]! % 2 === 0 ? 1 : -1;
    v[idx] += sign;
  }
  let norm = 0;
  for (let i = 0; i < DIM; i++) norm += v[i]! * v[i]!;
  norm = Math.sqrt(norm) || 1;
  return Array.from(v, (x) => x / norm);
}
