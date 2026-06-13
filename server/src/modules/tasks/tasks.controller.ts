import type { Request, Response } from "express";
import { nanoid } from "nanoid";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "../../common/config/db";
import { ApiError } from "../../common/utils/apiError";
import { sendResponse } from "../../common/utils/apiResponse";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { listActivity } from "../../common/services/activity.service";

/** Unified board: email + slack + github tasks in one view. */
export const listTasks = asyncHandler(async (req: Request, res: Response) => {
  const rows = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.userId, req.user!.id))
    .orderBy(desc(schema.tasks.createdAt))
    .limit(200);
  sendResponse(res, 200, rows);
});

export const createTask = asyncHandler(async (req: Request, res: Response) => {
  const id = nanoid();
  await db.insert(schema.tasks).values({
    id,
    userId: req.user!.id,
    title: req.body.title,
    source: req.body.source,
    sourceRef: req.body.sourceRef,
    due: req.body.due ? new Date(req.body.due) : null,
  });
  sendResponse(res, 201, { id }, "Task created");
});

/**
 * Patch a task. Accepts any subset of { status, title, due, labelIds }.
 * Sets/clears completedAt when status crosses the done boundary so the daily
 * progress graph has a real timestamp to group on.
 */
export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  const patch: Record<string, unknown> = {};
  if (req.body.title !== undefined) patch.title = req.body.title;
  if (req.body.due !== undefined) patch.due = req.body.due ? new Date(req.body.due) : null;
  if (req.body.labelIds !== undefined) patch.labelIds = req.body.labelIds;
  if (req.body.status !== undefined) {
    patch.status = req.body.status;
    patch.completedAt = req.body.status === "done" ? new Date() : null;
  }

  const updated = await db
    .update(schema.tasks)
    .set(patch)
    .where(and(eq(schema.tasks.id, req.params.id), eq(schema.tasks.userId, req.user!.id)))
    .returning();
  if (!updated.length) throw ApiError.notFound("Task not found");
  sendResponse(res, 200, updated[0]);
});

/**
 * Completed-per-day series for the dashboard progress graph.
 * GET /api/tasks/stats?days=14 -> { series: [{ date: "YYYY-MM-DD", completed }] }
 * Days with zero completions are filled in so the chart has a continuous axis.
 */
export const taskStats = asyncHandler(async (req: Request, res: Response) => {
  const days = Math.min(Math.max(Number(req.query.days) || 14, 1), 90);
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      day: sql<string>`to_char(${schema.tasks.completedAt}, 'YYYY-MM-DD')`,
      completed: sql<number>`count(*)::int`,
    })
    .from(schema.tasks)
    .where(
      and(
        eq(schema.tasks.userId, req.user!.id),
        eq(schema.tasks.status, "done"),
        gte(schema.tasks.completedAt, since),
      ),
    )
    .groupBy(sql`1`);

  const counts = new Map(rows.map((r) => [r.day, Number(r.completed)]));
  const series: { date: string; completed: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    series.push({ date: key, completed: counts.get(key) ?? 0 });
  }
  sendResponse(res, 200, { series });
});

export const activity = asyncHandler(async (req: Request, res: Response) => {
  sendResponse(res, 200, await listActivity(req.user!.id));
});
