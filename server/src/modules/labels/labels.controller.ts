import type { Request, Response } from "express";
import { nanoid } from "nanoid";
import { and, eq } from "drizzle-orm";
import { db, schema } from "../../common/config/db";
import { ApiError } from "../../common/utils/apiError";
import { sendResponse } from "../../common/utils/apiResponse";
import { asyncHandler } from "../../common/utils/asyncHandler";

/** 12 presets shipped to every user (kept in sync with client/lib/labels.ts). */
export const PRESET_LABELS = [
  { id: "client", name: "Client", color: "rgb(var(--accent))" },
  { id: "invoice", name: "Invoice", color: "rgb(var(--reply))" },
  { id: "interview", name: "Interview", color: "rgb(var(--waiting))" },
  { id: "project", name: "Project", color: "rgb(var(--fyi))" },
  { id: "urgent", name: "Urgent", color: "rgb(var(--urgent))" },
  { id: "personal", name: "Personal", color: "rgb(236 72 153)" },
  { id: "follow-up", name: "Follow-up", color: "rgb(14 165 233)" },
  { id: "waiting", name: "Waiting", color: "rgb(var(--news))" },
  { id: "idea", name: "Idea", color: "rgb(8 145 178)" },
  { id: "bug", name: "Bug", color: "rgb(239 68 68)" },
  { id: "meeting", name: "Meeting", color: "rgb(20 184 166)" },
  { id: "newsletter", name: "Newsletter", color: "rgb(100 116 139)" },
].map((l) => ({ ...l, isPreset: true }));

/** List = virtual presets + this user's custom labels. */
export const listLabels = asyncHandler(async (req: Request, res: Response) => {
  const customs = await db.select().from(schema.labels).where(eq(schema.labels.userId, req.user!.id));
  sendResponse(res, 200, [...PRESET_LABELS, ...customs.map((c) => ({ ...c, isPreset: false }))]);
});

export const createLabel = asyncHandler(async (req: Request, res: Response) => {
  const id = nanoid();
  const row = { id, userId: req.user!.id, name: req.body.name, color: req.body.color, isPreset: false };
  await db.insert(schema.labels).values(row);
  sendResponse(res, 201, row, "Label created");
});

export const deleteLabel = asyncHandler(async (req: Request, res: Response) => {
  const deleted = await db
    .delete(schema.labels)
    .where(and(eq(schema.labels.id, req.params.id), eq(schema.labels.userId, req.user!.id)))
    .returning({ id: schema.labels.id });
  if (!deleted.length) throw ApiError.notFound("Label not found");
  sendResponse(res, 200, { deleted: req.params.id });
});
