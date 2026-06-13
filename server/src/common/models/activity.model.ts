import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "../../modules/auth/auth.model";

/** Visible audit trail of everything automations/the agent did. */
export const activityLog = pgTable(
  "activity_log",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    actor: text("actor").notNull(), // user | agent | automation
    action: text("action").notNull(), // e.g. "email.snoozed", "event.created"
    // log IDs and labels only — NEVER bodies/tokens/message content
    refId: text("ref_id"),
    summary: text("summary").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("activity_user_idx").on(t.userId, t.createdAt)],
);
