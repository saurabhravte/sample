import type { Request, Response } from "express";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "../../common/config/db";
import { Decision } from "./dto/command.dto";
import { ApiError } from "../../common/utils/apiError";
import { sendResponse } from "../../common/utils/apiResponse";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { runCommand, resolveProposal } from "./command.service";

/** Natural-language ACTION bar: "reschedule my 3pm and tell Raj on Slack". */
export const run = asyncHandler(async (req: Request, res: Response) => {
  sendResponse(res, 200, await runCommand(req.user!.id, req.user!.timezone, req.body.input));
});

export const listActions = asyncHandler(async (req: Request, res: Response) => {
  const rows = await db
    .select()
    .from(schema.proposedActions)
    .where(eq(schema.proposedActions.userId, req.user!.id))
    .orderBy(desc(schema.proposedActions.createdAt))
    .limit(30);
  sendResponse(res, 200, rows);
});

/** Approval gate — the ONLY route that lets a proposal touch the outside world. */
export const decide = asyncHandler(async (req: Request, res: Response) => {
  const decision = Decision.parse(req.params.decision);
  const result = await resolveProposal(req.user!.id, req.params.id, decision === "approve");
  if (!result) throw ApiError.notFound("Proposal not found or already resolved");
  sendResponse(res, 200, result);
});
