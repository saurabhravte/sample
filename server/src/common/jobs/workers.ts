import { boss, QUEUES } from "./boss";
import { db, schema } from "../config/db";
import { and, eq, lte } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as emailSvc from "../../modules/inbox/inbox.service";
import * as calSvc from "../../modules/calendar/calendar.service";
import * as slackSvc from "../../modules/integrations/slack.service";
import { logActivity } from "../services/activity.service";

export async function startWorkers() {
  await boss.start();
  for (const q of Object.values(QUEUES)) await boss.createQueue(q);

  /* Undo-send: the email only really goes out when this fires. Cancelling the
   * job within the delay window = undo. */
  await boss.work<{ userId: string; payload: Parameters<typeof emailSvc.sendEmail>[1] }>(
    QUEUES.SEND_EMAIL,
    async ([job]) => {
      await emailSvc.sendEmail(job.data.userId, job.data.payload);
    },
  );

  await boss.work<{ userId: string }>(QUEUES.SNOOZE_WAKE, async ([job]) => {
    const woke = await emailSvc.wakeSnoozed(job.data.userId);
    for (const w of woke) {
      await db.insert(schema.pendingNotifications).values({
        id: nanoid(),
        userId: job.data.userId,
        kind: "snooze_wake",
        title: `Back in your inbox: ${w.subject}`,
        refId: w.emailId,
      });
    }
  });

  await boss.work<{ userId: string; reminderId: string }>(QUEUES.REMINDER, async ([job]) => {
    const rows = await db
      .select()
      .from(schema.reminders)
      .where(and(eq(schema.reminders.id, job.data.reminderId), eq(schema.reminders.userId, job.data.userId)))
      .limit(1);
    const r = rows[0];
    if (!r || r.fired) return; // idempotent
    await db.update(schema.reminders).set({ fired: true }).where(eq(schema.reminders.id, r.id));
    await db.insert(schema.pendingNotifications).values({
      id: nanoid(),
      userId: r.userId,
      kind: "reminder",
      title: r.note ?? "Follow-up reminder",
      refId: r.emailId,
    });
    await logActivity(r.userId, "automation", "reminder.fired", "Follow-up reminder fired", r.emailId);
  });

  /* 10-min pre-meeting brief: pushed, not pulled. Posted as a Slack DM if
   * Slack is connected; always lands in the in-app notification tray. */
  await boss.work<{ userId: string; eventId: string; title: string }>(QUEUES.PRE_MEETING, async ([job]) => {
    const { userId, title, eventId } = job.data;
    await db.insert(schema.pendingNotifications).values({
      id: nanoid(),
      userId,
      kind: "pre_meeting",
      title: `Starts in 10 min: ${title}. Brief is ready.`,
      refId: eventId,
    });
    try {
      const conn = await db
        .select()
        .from(schema.connections)
        .where(
          and(
            eq(schema.connections.userId, userId),
            eq(schema.connections.provider, "slack"),
            eq(schema.connections.status, "connected"),
          ),
        )
        .limit(1);
      if (conn[0])
        await slackSvc.postMessage(
          userId,
          "@me",
          `🛰 Momentum: “${title}” starts in 10 minutes — your brief: open Momentum → Calendar.`,
        );
    } catch {
      /* best effort */
    }
    await logActivity(userId, "automation", "meeting.brief_pushed", `Pre-meeting brief for “${title}”`, eventId);
  });

  /* 6pm shutdown ritual — scheduled per-user in user's timezone at login. */
  await boss.work<{ userId: string }>(QUEUES.SHUTDOWN_RITUAL, async ([job]) => {
    await db.insert(schema.pendingNotifications).values({
      id: nanoid(),
      userId: job.data.userId,
      kind: "shutdown",
      title: "End-of-day review is ready — see what's done, what rolls over, and 2 quick replies.",
    });
  });

  await boss.work<{ userId: string }>(QUEUES.INBOX_SYNC, async ([job]) => {
    await emailSvc.syncInbox(job.data.userId, 30);
  });

  /* Notification bundler: flush low-priority alerts on the user's window. */
  await boss.work<{ userId: string }>(QUEUES.NOTIF_BUNDLE, async ([job]) => {
    const now = new Date();
    await db
      .update(schema.pendingNotifications)
      .set({ bundled: true })
      .where(
        and(
          eq(schema.pendingNotifications.userId, job.data.userId),
          eq(schema.pendingNotifications.bundled, false),
          lte(schema.pendingNotifications.createdAt, now),
        ),
      );
  });
}

/** Schedule the 10-min brief for every meeting in the next 24h. */
export async function schedulePreMeetingBriefs(userId: string) {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 3_600_000);
  const events = await calSvc.listEvents(userId, now.toISOString(), tomorrow.toISOString());
  for (const e of events) {
    const fireAt = new Date(new Date(e.start).getTime() - 10 * 60_000);
    if (fireAt <= now) continue;
    await boss.send(
      QUEUES.PRE_MEETING,
      { userId, eventId: e.id, title: e.title },
      {
        startAfter: fireAt,
        singletonKey: `brief-${userId}-${e.id}`, // dedupe across reschedules
      },
    );
  }
}
