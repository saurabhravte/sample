import { pgTable, text, timestamp, boolean, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";

/* Every tenant-owned table carries user_id. The repository layer requires it
 * as a parameter, so an unscoped query is structurally impossible. */

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    name: text("name").notNull(),
    passwordHash: text("password_hash"), // null when Google-only
    googleSub: text("google_sub"), // null when password-only
    timezone: text("timezone").notNull().default("UTC"), // IANA; all storage is UTC
    settings: jsonb("settings")
      .notNull()
      .default({ weeklySummary: true, shutdownRitualHour: 18, notificationBundleMinutes: 30 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // random 256-bit token, stored hashed? for hackathon: opaque id
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);
