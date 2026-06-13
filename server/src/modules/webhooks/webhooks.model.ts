import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** Processed webhook event IDs → idempotent handlers. */
export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: text("id").primaryKey(), // provider event id
  provider: text("provider").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});
