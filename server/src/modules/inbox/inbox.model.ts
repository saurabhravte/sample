import { pgTable, text, timestamp, boolean, index, uniqueIndex, customType } from "drizzle-orm/pg-core";
import { users } from "../auth/auth.model";

/** pgvector column (1536-dim, matches text-embedding models / Voyage) */
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(1536)";
  },
  toDriver(value) {
    return `[${value.join(",")}]`;
  },
});

/** Per-email derived metadata: priority, smart label, triage, embedding. */
export const emailMeta = pgTable(
  "email_meta",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    emailId: text("email_id").notNull(),
    threadId: text("thread_id").notNull(),
    subject: text("subject").notNull().default(""),
    fromAddr: text("from_addr").notNull().default(""),
    snippet: text("snippet").notNull().default(""),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    priority: text("priority"), // urgent | needs_reply | waiting | fyi | newsletter
    smartLabel: text("smart_label"), // client | invoice | interview | project | none
    triage: text("triage"), // important | needs_reply | ignore
    snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),
    embedding: vector("embedding"),
    awaitingReplySince: timestamp("awaiting_reply_since", { withTimezone: true }), // follow-up detector
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("email_meta_user_email_uq").on(t.userId, t.emailId),
    index("email_meta_user_thread_idx").on(t.userId, t.threadId),
    index("email_meta_user_priority_idx").on(t.userId, t.priority),
  ],
);

export const reminders = pgTable(
  "reminders",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    emailId: text("email_id").notNull(),
    threadId: text("thread_id").notNull(),
    remindAt: timestamp("remind_at", { withTimezone: true }).notNull(),
    note: text("note"),
    fired: boolean("fired").notNull().default(false),
  },
  (t) => [index("reminders_user_idx").on(t.userId, t.remindAt)],
);
