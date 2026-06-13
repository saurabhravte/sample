import type { Request, Response } from "express";
import { and, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "../../common/config/db";
import { sendResponse } from "../../common/utils/apiResponse";
import { asyncHandler } from "../../common/utils/asyncHandler";

const RANGES = { daily: 1, weekly: 7, monthly: 30 } as const;
type Range = keyof typeof RANGES;

/**
 * GET /api/summary?range=daily|weekly|monthly
 * Deterministic digest from the user's own data (no LLM needed). Returns a
 * headline + bullets the SummaryCard renders. Swap in the Anthropic/Haiku
 * summarizer here if you want a written narrative instead.
 */
export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  const range = (["daily", "weekly", "monthly"].includes(String(req.query.range)) ? req.query.range : "daily") as Range;
  const userId = req.user!.id;
  const since = new Date();
  since.setDate(since.getDate() - RANGES[range]);

  const [created, completed, open] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.tasks)
      .where(and(eq(schema.tasks.userId, userId), gte(schema.tasks.createdAt, since))),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.tasks)
      .where(and(eq(schema.tasks.userId, userId), eq(schema.tasks.status, "done"), gte(schema.tasks.completedAt, since))),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.tasks)
      .where(and(eq(schema.tasks.userId, userId), sql`${schema.tasks.status} <> 'done'`)),
  ]);

  const createdN = Number(created[0]?.n ?? 0);
  const completedN = Number(completed[0]?.n ?? 0);
  const openN = Number(open[0]?.n ?? 0);
  const label = range === "daily" ? "today" : range === "weekly" ? "this week" : "this month";

  sendResponse(res, 200, {
    headline:
      completedN > 0
        ? `You closed out ${completedN} task${completedN === 1 ? "" : "s"} ${label} — nice momentum.`
        : `Nothing finished yet ${label}. ${openN} task${openN === 1 ? "" : "s"} waiting.`,
    bullets: [
      `${completedN} completed ${label}`,
      `${createdN} added ${label}`,
      `${openN} still open across the board`,
    ],
  });
});
