import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { verifySignature } from "../common/utils/webhookSignature";

const SECRET = "test-secret";
function sign(body: Buffer, ts: string) {
  return createHmac("sha256", SECRET).update(`${ts}.`).update(body).digest("hex");
}

describe("webhook signature verification", () => {
  const body = Buffer.from(JSON.stringify({ id: "evt_1", type: "gmail.message.received" }));

  it("accepts a valid signature", () => {
    const ts = String(Math.floor(Date.now() / 1000));
    expect(verifySignature(body, sign(body, ts), ts, SECRET)).toBe(true);
  });
  it("rejects a tampered body", () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = sign(body, ts);
    expect(verifySignature(Buffer.from("evil"), sig, ts, SECRET)).toBe(false);
  });
  it("rejects stale timestamps (replay protection)", () => {
    const ts = String(Math.floor(Date.now() / 1000) - 600);
    expect(verifySignature(body, sign(body, ts), ts, SECRET)).toBe(false);
  });
  it("rejects missing signature", () => {
    expect(verifySignature(body, undefined, String(Date.now() / 1000), SECRET)).toBe(false);
  });
});
