import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "../auth/auth.model";

/** Thread Linker: email thread ⇄ slack thread ⇄ github issue. */
export const links = pgTable(
  "links",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    emailThreadId: text("email_thread_id"),
    slackThreadTs: text("slack_thread_ts"),
    slackChannelId: text("slack_channel_id"),
    githubIssueRef: text("github_issue_ref"), // owner/repo#123
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("links_user_idx").on(t.userId)],
);
