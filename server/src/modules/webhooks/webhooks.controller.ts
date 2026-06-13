import type { Request, Response } from "express";
import { nanoid } from "nanoid";
import { db, schema } from "../../common/config/db";
import { dispatchProviderWebhook } from "../../common/config/corsair";
import { env } from "../../common/config/env";
import { verifySignature } from "../../common/utils/webhookSignature";
import { classifyEmail } from "../../common/services/ai/classifier";
import { embed } from "../../common/services/ai/embeddings";

/**
 * Realtime via Corsair webhooks: new email / calendar / Slack / GitHub events
 * push here instead of polling Google.
 *
 * Hardening: signature verification, stale-timestamp rejection (replay),
 * idempotency on event ID (providers deliver duplicates).
 *
 * Note: this controller manages its own response envelope because it is
 * machine-facing (signature auth, raw body) rather than session-facing.
 */
export async function handleCorsairWebhook(req: Request, res: Response) {
  const sig = req.header("x-corsair-signature");
  const ts = req.header("x-corsair-timestamp");
  if (!verifySignature(req.body as Buffer, sig, ts, env.WEBHOOK_SIGNING_SECRET)) {
    return res.status(401).json({
      success: false,
      statusCode: 401,
      message: "Rejected",
      error: { code: "BAD_SIGNATURE", message: "Rejected" },
    });
  }

  const event = JSON.parse((req.body as Buffer).toString("utf8")) as {
    id: string;
    type: string; // e.g. gmail.message.received, googlecalendar.event.created
    tenantId: string;
    data: Record<string, unknown>;
  };

  // Idempotency: dedupe on provider event ID.
  try {
    await db.insert(schema.webhookDeliveries).values({ id: event.id, provider: event.type.split(".")[0]! });
  } catch {
    return res
      .status(200)
      .json({ success: true, statusCode: 200, message: "Duplicate delivery", data: { duplicate: true } });
  }

  // Hand the raw provider payload to the matching Corsair plugin webhook
  // handler (tenant-scoped) so its entity cache stays fresh.
  try {
    await dispatchProviderWebhook(
      event.tenantId,
      { headers: req.headers, body: event.data },
      JSON.stringify(event.data),
    );
  } catch {
    /* cache update is best-effort */
  }

  // Our derived pipeline: classify + embed new mail immediately → realtime inbox.
  if (event.type === "gmail.message.received") {
    const m = event.data as { id?: string; threadId?: string; subject?: string; from?: string; snippet?: string };
    if (m.id && m.threadId) {
      const cls = await classifyEmail({
        subject: m.subject ?? "",
        from: m.from ?? "",
        snippet: m.snippet ?? "",
        hasApiKey: !!env.ANTHROPIC_API_KEY,
      });
      await db
        .insert(schema.emailMeta)
        .values({
          id: nanoid(),
          userId: event.tenantId, // Corsair tenant == our user id
          emailId: m.id,
          threadId: m.threadId,
          subject: m.subject ?? "",
          fromAddr: m.from ?? "",
          snippet: m.snippet ?? "",
          receivedAt: new Date(),
          priority: cls.priority,
          smartLabel: cls.smartLabel === "none" ? null : cls.smartLabel,
          triage: cls.triage,
          embedding: embed(`${m.subject}\n${m.snippet}`),
        })
        .onConflictDoNothing();
    }
  }

  res.status(200).json({ success: true, statusCode: 200, message: "Received", data: { received: true } });
}
