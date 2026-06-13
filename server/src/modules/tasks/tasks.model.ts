import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "../auth/auth.model";

export const tasks = pgTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    source: text("source").notNull(), // email | slack | github | manual | agent
    sourceRef: text("source_ref"),
    due: timestamp("due", { withTimezone: true }),
    status: text("status").notNull().default("todo"),
    // set when a task moves to "done" — powers the daily progress graph
    completedAt: timestamp("completed_at", { withTimezone: true }),
    // attached label ids (presets or user-created), stored as a JSON string array
    labelIds: text("label_ids").array(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("tasks_user_idx").on(t.userId, t.status)],
);
