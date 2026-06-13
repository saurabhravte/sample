import { pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { users } from "../auth/auth.model";

/** Context-switch tracking for the "Cost of Context" weekly insight. */
export const contextSwitches = pgTable(
  "context_switches",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fromSurface: text("from_surface").notNull(), // inbox | slack | github | calendar
    toSurface: text("to_surface").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ctx_user_idx").on(t.userId, t.at)],
);

/** Low-priority alerts held for the Notification Bundler window. */
export const pendingNotifications = pgTable(
  "pending_notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    refId: text("ref_id"),
    bundled: boolean("bundled").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pending_notif_user_idx").on(t.userId, t.bundled)],
);
