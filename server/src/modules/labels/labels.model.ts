import { pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { users } from "../auth/auth.model";

/** User-created custom labels. Presets are virtual (defined in code, not stored). */
export const labels = pgTable(
  "labels",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull(),
    isPreset: boolean("is_preset").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("labels_user_idx").on(t.userId)],
);
