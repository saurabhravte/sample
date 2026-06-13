import type { Request, Response } from "express";
import { nanoid } from "nanoid";
import { and, eq } from "drizzle-orm";
import { InboxListQuery } from "./dto/inbox.dto";
import { db, schema } from "../../common/config/db";
import { env } from "../../common/config/env";
import { ApiError } from "../../common/utils/apiError";
import { sendResponse } from "../../common/utils/apiResponse";
import { asyncHandler } from "../../common/utils/asyncHandler";
import * as emailSvc from "./inbox.service";
import { draftFollowUp, draftReply } from "../../common/services/ai/drafts";
import { detectMeeting, extractTasks } from "../../common/services/ai/extract";
import { logActivity } from "../../common/services/activity.service";
import { boss, QUEUES } from "../../common/jobs/boss";

export const syncInbox = asyncHandler(async (req: Request, res: Response) => {
  await emailSvc.syncInbox(req.user!.id);
  sendResponse(res, 200, { synced: true }, "Inbox synced");
});

export const listInbox = asyncHandler(async (req: Request, res: Response) => {
  const q = InboxListQuery.parse(req.query);
  sendResponse(res, 200, await emailSvc.listInbox(req.user!.id, q));
});

export const getThread = asyncHandler(async (req: Request, res: Response) => {
  const thread = await emailSvc.getThreadNormalized(req.user!.id, req.params.threadId);
  // Email → Calendar chip: detect "can we meet Thursday at 4?"
  const text = thread.messages
    .map((m) => m.text || m.snippet)
    .join("\n---\n")
    .slice(0, 6000);
  const meeting = await detectMeeting(text, new Date(), !!env.ANTHROPIC_API_KEY);
  sendResponse(res, 200, { ...thread, meetingHint: meeting.found ? meeting : null });
});

export const snooze = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const until = new Date(req.body.until); // already UTC ISO from client
  await emailSvc.snoozeEmail(userId, req.body.emailId, req.body.threadId, until);
  await boss.send(
    QUEUES.SNOOZE_WAKE,
    { userId },
    { startAfter: until, singletonKey: `wake-${userId}-${req.body.emailId}` },
  );
  sendResponse(res, 200, { snoozedUntil: until.toISOString() }, "Snoozed");
});

export const createReminder = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const id = nanoid();
  const remindAt = new Date(req.body.remindAt);
  await db.insert(schema.reminders).values({
    id,
    userId,
    emailId: req.body.emailId,
    threadId: req.body.threadId,
    remindAt,
    note: req.body.note,
  });
  await boss.send(QUEUES.REMINDER, { userId, reminderId: id }, { startAfter: remindAt });
  sendResponse(res, 201, { id }, "Reminder created");
});

/** AI reply draft — always a draft, never sent from this endpoint. */
export const draftReplyForThread = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const thread = await emailSvc.getThreadNormalized(userId, req.body.threadId);
  const excerpt = thread.messages
    .map((m) => m.snippet || m.text)
    .join("\n---\n")
    .slice(0, 5000);
  const subject = thread.subject;
  const draft = await draftReply({
    threadSubject: subject,
    threadExcerpt: excerpt,
    tone: req.body.tone,
    instruction: req.body.instruction,
    senderName: req.user!.name,
  });
  await logActivity(userId, "agent", "draft.created", `Drafted reply for “${subject}”`, req.body.threadId);
  sendResponse(res, 200, draft);
});

/** One-click "just checking in…" for a stale thread. */
export const followUp = asyncHandler(async (req: Request, res: Response) => {
  const rows = await db
    .select()
    .from(schema.emailMeta)
    .where(and(eq(schema.emailMeta.userId, req.user!.id), eq(schema.emailMeta.threadId, req.params.threadId)))
    .limit(1);
  if (!rows[0]) throw ApiError.notFound("Thread not tracked");
  const days = rows[0].awaitingReplySince
    ? Math.floor((Date.now() - rows[0].awaitingReplySince.getTime()) / 86_400_000)
    : 3;
  sendResponse(
    res,
    200,
    await draftFollowUp({ threadSubject: rows[0].subject, daysSilent: days, senderName: req.user!.name }),
  );
});

export const listFollowUps = asyncHandler(async (req: Request, res: Response) => {
  sendResponse(res, 200, await emailSvc.staleThreads(req.user!.id));
});

/** Send with undo: queued for delaySeconds, cancellable until dispatch. */
export const sendEmail = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { delaySeconds, ...payload } = req.body;
  const jobId = await boss.send(
    QUEUES.SEND_EMAIL,
    { userId, payload },
    { startAfter: new Date(Date.now() + delaySeconds * 1000) },
  );
  await logActivity(userId, "user", "email.queued", `Queued “${payload.subject}” (undo window ${delaySeconds}s)`);
  sendResponse(res, 202, { jobId, undoUntil: new Date(Date.now() + delaySeconds * 1000).toISOString() }, "Queued");
});

export const undoSend = asyncHandler(async (req: Request, res: Response) => {
  await boss.cancel(QUEUES.SEND_EMAIL, req.params.jobId);
  await logActivity(req.user!.id, "user", "email.undone", "Cancelled a queued send");
  sendResponse(res, 200, { undone: true }, "Send cancelled");
});

/** Task extraction from a thread → unified board. */
export const extractTasksFromThread = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const thread = await emailSvc.getThreadNormalized(userId, req.params.threadId);
  const corpus = [thread.subject, ...thread.messages.map((m) => m.text || m.snippet)].join("\n---\n").slice(0, 6000);
  const { tasks } = await extractTasks("email", corpus, !!env.ANTHROPIC_API_KEY);
  const inserted = [];
  for (const t of tasks) {
    const id = nanoid();
    await db.insert(schema.tasks).values({
      id,
      userId,
      title: t.title,
      source: "email",
      sourceRef: req.params.threadId,
      due: t.due ? new Date(t.due) : null,
    });
    inserted.push({ id, ...t });
  }
  sendResponse(res, 201, inserted, "Tasks extracted");
});
