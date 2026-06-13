import type { Request, Response } from "express";
import { nanoid } from "nanoid";
import { db, schema } from "../../common/config/db";
import { sendResponse } from "../../common/utils/apiResponse";
import { asyncHandler } from "../../common/utils/asyncHandler";
import * as slackSvc from "./slack.service";
import * as ghSvc from "./github.service";

/* ── Slack ── */

export const slackUnread = asyncHandler(async (req: Request, res: Response) => {
  sendResponse(res, 200, await slackSvc.listMemberChannels(req.user!.id));
});

export const slackCatchUp = asyncHandler(async (req: Request, res: Response) => {
  sendResponse(res, 200, await slackSvc.summarizeChannel(req.user!.id, req.params.channelId));
});

/** Slack message → action item. */
export const slackToTask = asyncHandler(async (req: Request, res: Response) => {
  const id = nanoid();
  await db.insert(schema.tasks).values({
    id,
    userId: req.user!.id,
    title: req.body.text.slice(0, 300),
    source: "slack",
    sourceRef: req.body.ref,
  });
  sendResponse(res, 201, { id }, "Task created");
});

/* ── GitHub ── */

export const githubReviewQueue = asyncHandler(async (req: Request, res: Response) => {
  sendResponse(res, 200, await ghSvc.prBriefing(req.user!.id));
});

/** Email → GitHub issue, one click. */
export const issueFromEmail = asyncHandler(async (req: Request, res: Response) => {
  const { owner, repo, subject, snippet, threadId } = req.body;
  const body = `${snippet}\n\n_Created from an email thread via Momentum${threadId ? ` (thread ${threadId})` : ""}._`;
  const issue = await ghSvc.createIssue(req.user!.id, owner, repo, subject, body);
  // Thread Linker entry
  await db.insert(schema.links).values({
    id: nanoid(),
    userId: req.user!.id,
    emailThreadId: threadId ?? null,
    githubIssueRef: `${owner}/${repo}`,
    note: subject,
  });
  sendResponse(res, 201, issue, "Issue created");
});
