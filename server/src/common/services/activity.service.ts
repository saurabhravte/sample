import { nanoid } from "nanoid";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "../config/db";

/** Visible audit trail. Logs IDs + short summaries only — never content. */
export async function logActivity(
  userId: string,
  actor: "user" | "agent" | "automation",
  action: string,
  summary: string,
  refId?: string,
) {
  await db.insert(schema.activityLog).values({ id: nanoid(), userId, actor, action, summary, refId });
}

export async function listActivity(userId: string, limit = 50) {
  return db
    .select()
    .from(schema.activityLog)
    .where(eq(schema.activityLog.userId, userId))
    .orderBy(desc(schema.activityLog.createdAt))
    .limit(limit);
}
