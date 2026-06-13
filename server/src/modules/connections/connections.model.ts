import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "../auth/auth.model";

/** Which providers the user has chosen to connect (consent-first model). */
export const connections = pgTable(
  "connections",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // gmail | googlecalendar | slack | github
    status: text("status").notNull().default("disconnected"),
    accountLabel: text("account_label"),
    corsairAccountId: text("corsair_account_id"),
    connectedAt: timestamp("connected_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("connections_user_provider_uq").on(t.userId, t.provider)],
);
