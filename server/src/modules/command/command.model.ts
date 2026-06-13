import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { users } from "../auth/auth.model";

/** Agent proposals: every side-effectful action waits here for approval. */
export const proposedActions = pgTable(
  "proposed_actions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    description: text("description").notNull(),
    payload: jsonb("payload").notNull().default({}),
    status: text("status").notNull().default("pending"), // pending|approved|rejected|executed|failed
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [index("proposed_actions_user_idx").on(t.userId, t.status)],
);
