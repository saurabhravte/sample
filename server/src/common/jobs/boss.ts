import PgBoss from "pg-boss";
import { env } from "../config/env";

/**
 * pg-boss runs on the existing Postgres — no Redis. This single queue powers:
 * snooze resurfacing, reminders, undo-send dispatch, 10-min pre-meeting briefs,
 * the 6pm shutdown ritual, weekly summary, and the notification bundler.
 */
export const boss = new PgBoss(env.DATABASE_URL);

export const QUEUES = {
  SNOOZE_WAKE: "snooze-wake",
  REMINDER: "reminder-fire",
  SEND_EMAIL: "send-email-delayed", // undo-send: payload sits here for delaySeconds
  PRE_MEETING: "pre-meeting-brief",
  SHUTDOWN_RITUAL: "shutdown-ritual",
  WEEKLY_SUMMARY: "weekly-summary",
  NOTIF_BUNDLE: "notification-bundle",
  INBOX_SYNC: "inbox-sync",
} as const;
