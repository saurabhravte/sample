import { nanoid } from "nanoid";
import { and, desc, eq, isNull, lt, or, sql } from "drizzle-orm";
import type { EmailSummaryDto } from "@momentum/shared";
import { db, schema } from "../../common/config/db";
import { corsairFor } from "../../common/config/corsair";
import { env } from "../../common/config/env";
import { classifyEmail } from "../../common/services/ai/classifier";
import { embed } from "../../common/services/ai/embeddings";
import { logActivity } from "../../common/services/activity.service";

/**
 * EmailService — every Corsair call is wrapped here so tests can stub this
 * layer with fixtures, and every method takes userId as its first parameter.
 */

type GmailMessage = {
  id?: string;
  threadId?: string;
  snippet?: string;
  internalDate?: string;
  labelIds?: string[];
  payload?: GmailPart;
};
type GmailPart = {
  mimeType?: string;
  headers?: Array<{ name?: string; value?: string }>;
  body?: { data?: string; size?: number };
  parts?: GmailPart[];
};

function header(m: GmailMessage, name: string): string {
  return m.payload?.headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

/** Pull recent messages via Corsair (live), upsert derived metadata locally. */
export async function syncInbox(userId: string, max = 30): Promise<void> {
  const tenant = corsairFor(userId);
  // Corsair pattern: corsair.[plugin].api.[group].[method] — Gmail-style:
  // list returns ids, get(format: metadata) returns headers + snippet.
  const res = await tenant.gmail.api.messages.list({ maxResults: max, labelIds: ["INBOX"] });
  const ids = (res.messages ?? []).filter((m) => m.id && m.threadId);

  for (const stub of ids) {
    const existing = await db
      .select({ id: schema.emailMeta.id })
      .from(schema.emailMeta)
      .where(and(eq(schema.emailMeta.userId, userId), eq(schema.emailMeta.emailId, stub.id!)))
      .limit(1);
    if (existing.length) continue;

    const m = (await tenant.gmail.api.messages.get({
      id: stub.id!,
      format: "metadata",
      metadataHeaders: ["Subject", "From", "To", "Date"],
    })) as GmailMessage;

    const subject = header(m, "Subject") || "(no subject)";
    const from = header(m, "From");
    const snippet = m.snippet ?? "";
    const cls = await classifyEmail({ subject, from, snippet, hasApiKey: !!env.ANTHROPIC_API_KEY });

    await db.insert(schema.emailMeta).values({
      id: nanoid(),
      userId,
      emailId: stub.id!,
      threadId: stub.threadId!,
      subject,
      fromAddr: from,
      snippet,
      receivedAt: m.internalDate ? new Date(Number(m.internalDate)) : new Date(),
      priority: cls.priority,
      smartLabel: cls.smartLabel === "none" ? null : cls.smartLabel,
      triage: cls.triage,
      embedding: embed(`${subject}\n${snippet}`),
    });
  }
}

export async function listInbox(
  userId: string,
  opts: { priority?: string; label?: string; limit?: number },
): Promise<EmailSummaryDto[]> {
  const now = new Date();
  const conds = [
    eq(schema.emailMeta.userId, userId),
    or(isNull(schema.emailMeta.snoozedUntil), lt(schema.emailMeta.snoozedUntil, now)),
  ];
  if (opts.priority) conds.push(eq(schema.emailMeta.priority, opts.priority));
  if (opts.label) conds.push(eq(schema.emailMeta.smartLabel, opts.label));

  const rows = await db
    .select()
    .from(schema.emailMeta)
    .where(and(...conds))
    .orderBy(desc(schema.emailMeta.receivedAt))
    .limit(opts.limit ?? 50);

  return rows.map((r) => ({
    id: r.emailId,
    threadId: r.threadId,
    from: r.fromAddr,
    to: [],
    subject: r.subject,
    snippet: r.snippet,
    receivedAt: (r.receivedAt ?? r.createdAt).toISOString(),
    unread: true,
    priority: (r.priority ?? null) as EmailSummaryDto["priority"],
    smartLabel: (r.smartLabel ?? null) as EmailSummaryDto["smartLabel"],
    snoozedUntil: r.snoozedUntil?.toISOString() ?? null,
    hasReminder: false,
  }));
}

export async function getThread(userId: string, threadId: string) {
  const tenant = corsairFor(userId);
  return tenant.gmail.api.threads.get({ id: threadId, format: "full" });
}

function decodeB64Url(data?: string): string {
  if (!data) return "";
  try {
    return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  } catch {
    return "";
  }
}

function findPart(part: GmailPart | undefined, mime: string): GmailPart | undefined {
  if (!part) return undefined;
  if (part.mimeType === mime && part.body?.data) return part;
  for (const p of part.parts ?? []) {
    const hit = findPart(p, mime);
    if (hit) return hit;
  }
  return undefined;
}

/** Thread → the exact shape the UI renders: per-message from/date/html/text. */
export async function getThreadNormalized(userId: string, threadId: string) {
  const thread = (await getThread(userId, threadId)) as { id?: string; messages?: GmailMessage[] };
  const msgs = thread.messages ?? [];
  return {
    subject: msgs[0] ? header(msgs[0], "Subject") || "(no subject)" : "(no subject)",
    messages: msgs.map((m) => ({
      id: m.id ?? "",
      from: header(m, "From"),
      date: m.internalDate ? new Date(Number(m.internalDate)).toISOString() : new Date().toISOString(),
      html: decodeB64Url(findPart(m.payload, "text/html")?.body?.data) || null,
      text: decodeB64Url(findPart(m.payload, "text/plain")?.body?.data) || m.snippet || "",
      snippet: m.snippet ?? "",
    })),
  };
}

export async function snoozeEmail(userId: string, emailId: string, threadId: string, until: Date) {
  const updated = await db
    .update(schema.emailMeta)
    .set({ snoozedUntil: until })
    .where(and(eq(schema.emailMeta.userId, userId), eq(schema.emailMeta.emailId, emailId)))
    .returning({ id: schema.emailMeta.id });
  if (!updated.length) {
    await db.insert(schema.emailMeta).values({
      id: nanoid(),
      userId,
      emailId,
      threadId,
      snoozedUntil: until,
    });
  }
  await logActivity(userId, "user", "email.snoozed", `Snoozed until ${until.toISOString()}`, emailId);
}

/** Resurface job target: clear snooze + return rows that just woke up. */
export async function wakeSnoozed(userId: string) {
  const now = new Date();
  return db
    .update(schema.emailMeta)
    .set({ snoozedUntil: null })
    .where(and(eq(schema.emailMeta.userId, userId), lt(schema.emailMeta.snoozedUntil, now)))
    .returning({ emailId: schema.emailMeta.emailId, subject: schema.emailMeta.subject });
}

/** Build an RFC 2822 message and base64url-encode it — gmail.messages.send takes `raw`. */
export function buildRawMime(p: { to: string[]; cc?: string[]; subject: string; body: string }): string {
  const lines = [
    `To: ${p.to.join(", ")}`,
    ...(p.cc?.length ? [`Cc: ${p.cc.join(", ")}`] : []),
    `Subject: ${p.subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    p.body,
  ];
  return Buffer.from(lines.join("\r\n"), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Real Gmail send via Corsair — only ever called from the approval/undo paths. */
export async function sendEmail(
  userId: string,
  payload: { to: string[]; cc?: string[]; subject: string; body: string; threadId?: string },
) {
  const tenant = corsairFor(userId);
  const result = await tenant.gmail.api.messages.send({
    raw: buildRawMime(payload),
    threadId: payload.threadId,
  });
  await logActivity(
    userId,
    "automation",
    "email.sent",
    `Sent “${payload.subject}” to ${payload.to.length} recipient(s)`,
  );
  return result;
}

/** Follow-up detector: threads where we sent last and silence > N days. */
export async function staleThreads(userId: string, days = 3) {
  const cutoff = new Date(Date.now() - days * 86_400_000);
  return db
    .select()
    .from(schema.emailMeta)
    .where(and(eq(schema.emailMeta.userId, userId), lt(schema.emailMeta.awaitingReplySince, cutoff)))
    .orderBy(desc(schema.emailMeta.awaitingReplySince))
    .limit(20);
}

/** Local pgvector semantic search — sub-second, no Gmail API round-trip. */
export async function localSearch(userId: string, query: string, limit = 12) {
  const qvec = `[${embed(query).join(",")}]`;
  const rows = await db.execute(sql`
    SELECT email_id, thread_id, subject, snippet, received_at,
           1 - (embedding <=> ${qvec}::vector) AS score
    FROM email_meta
    WHERE user_id = ${userId} AND embedding IS NOT NULL
    ORDER BY embedding <=> ${qvec}::vector
    LIMIT ${limit}
  `);
  return rows.rows as Array<{
    email_id: string;
    thread_id: string;
    subject: string;
    snippet: string;
    received_at: Date | null;
    score: number;
  }>;
}

/** Corsair search API passthrough for the Gmail advanced-search builder. */
export async function gmailSearch(userId: string, q: string) {
  const tenant = corsairFor(userId);
  return tenant.gmail.api.messages.list({ q, maxResults: 25 });
}
