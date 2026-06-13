import type { CatchUpItem, CatchUpResponse } from "@momentum/shared";
import { and, eq, gte } from "drizzle-orm";
import { db, schema } from "../../common/config/db";
import * as emails from "../inbox/inbox.service";
import * as gh from "../integrations/github.service";
import * as cal from "../calendar/calendar.service";

/**
 * "Catch Me Up" — the one button. Pulls everything that happened since `since`
 * across Gmail + Slack + GitHub + Calendar, ranks by urgency, and attaches
 * one-click actions. Each provider is optional: we only query connected ones.
 */

const PRIORITY_URGENCY: Record<string, number> = {
  urgent: 95,
  needs_reply: 75,
  waiting: 55,
  fyi: 30,
  newsletter: 10,
};

export async function catchMeUp(userId: string, since: Date): Promise<CatchUpResponse> {
  const connected = await db
    .select({ provider: schema.connections.provider })
    .from(schema.connections)
    .where(and(eq(schema.connections.userId, userId), eq(schema.connections.status, "connected")));
  const has = new Set(connected.map((c) => c.provider));

  const items: CatchUpItem[] = [];
  let emailCount = 0,
    prCount = 0,
    meetingCount = 0;

  if (has.has("gmail")) {
    const rows = await db
      .select()
      .from(schema.emailMeta)
      .where(and(eq(schema.emailMeta.userId, userId), gte(schema.emailMeta.createdAt, since)));
    emailCount = rows.length;
    for (const r of rows) {
      if (r.priority === "newsletter") continue;
      items.push({
        id: `email-${r.emailId}`,
        kind: "email",
        urgency: PRIORITY_URGENCY[r.priority ?? "fyi"] ?? 30,
        title: r.subject,
        summary: `${r.fromAddr} — ${r.snippet.slice(0, 140)}`,
        occurredAt: (r.receivedAt ?? r.createdAt).toISOString(),
        actions:
          r.priority === "needs_reply" || r.priority === "urgent"
            ? ["reply", "snooze", "task"]
            : ["snooze", "task", "open"],
        ref: { emailId: r.emailId, threadId: r.threadId },
      });
    }
  }

  if (has.has("github")) {
    try {
      const prs = await gh.prsAwaitingReview(userId);
      prCount = prs.length;
      for (const p of prs) {
        items.push({
          id: `pr-${p.id}`,
          kind: "github_pr",
          urgency: gh.isStale(p.updatedAt) ? 80 : 60,
          title: `Review: ${p.title}`,
          summary: p.repo,
          occurredAt: p.updatedAt ?? new Date().toISOString(),
          actions: ["open", "task"],
          ref: { url: p.url },
        });
      }
    } catch {
      /* provider hiccup shouldn't kill catch-up */
    }
  }

  if (has.has("googlecalendar")) {
    try {
      const now = new Date();
      const eod = new Date(now);
      eod.setUTCHours(23, 59, 59, 999);
      const events = await cal.listEvents(userId, now.toISOString(), eod.toISOString());
      meetingCount = events.length;
      for (const e of events) {
        items.push({
          id: `event-${e.id}`,
          kind: "calendar",
          urgency: e.conflict ? 90 : 50,
          title: e.conflict ? `⚠ Double-booked: ${e.title}` : e.title,
          summary: `${e.attendees.length} attendee(s)`,
          occurredAt: e.start,
          actions: ["open"],
          ref: { eventId: e.id },
        });
      }
    } catch {
      /* same */
    }
  }

  items.sort((a, b) => b.urgency - a.urgency);
  const urgent = items.filter((i) => i.urgency >= 75).length;

  return {
    since: since.toISOString(),
    headline:
      urgent === 0
        ? "You're caught up. Nothing is on fire."
        : `${urgent} thing${urgent > 1 ? "s" : ""} need${urgent > 1 ? "" : "s"} you first — the rest can wait.`,
    items: items.slice(0, 40),
    stats: { emails: emailCount, slackThreads: 0, prs: prCount, meetingsToday: meetingCount },
  };
}

/** Cost-of-Context weekly stat. */
export async function contextStats(userId: string, since: Date) {
  const switches = await db
    .select()
    .from(schema.contextSwitches)
    .where(and(eq(schema.contextSwitches.userId, userId), gte(schema.contextSwitches.at, since)));
  const bundled = await db
    .select()
    .from(schema.pendingNotifications)
    .where(and(eq(schema.pendingNotifications.userId, userId), eq(schema.pendingNotifications.bundled, true)));
  return {
    switches: switches.length,
    bundledNotifications: bundled.length,
    estimatedInterruptionsSaved: Math.round(bundled.length * 0.8),
  };
}
