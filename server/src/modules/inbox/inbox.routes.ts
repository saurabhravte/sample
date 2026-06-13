import { Router } from "express";
import { DraftReplyRequest, ReminderRequest, SendEmailRequest, SnoozeRequest } from "./dto/inbox.dto";
import { validateBody } from "../../common/middleware/validate.middleware";
import { aiLimiter } from "../../common/middleware/rateLimit.middleware";
import * as inboxController from "./inbox.controller";

export const inboxRouter = Router();

inboxRouter.post("/sync", inboxController.syncInbox);
inboxRouter.get("/", inboxController.listInbox);
inboxRouter.get("/thread/:threadId", inboxController.getThread);
inboxRouter.post("/snooze", validateBody(SnoozeRequest), inboxController.snooze);
inboxRouter.post("/reminder", validateBody(ReminderRequest), inboxController.createReminder);
inboxRouter.post("/draft-reply", aiLimiter, validateBody(DraftReplyRequest), inboxController.draftReplyForThread);
inboxRouter.post("/follow-up/:threadId", aiLimiter, inboxController.followUp);
inboxRouter.get("/follow-ups", inboxController.listFollowUps);
inboxRouter.post("/send", validateBody(SendEmailRequest), inboxController.sendEmail);
inboxRouter.post("/send/:jobId/undo", inboxController.undoSend);
inboxRouter.post("/extract-tasks/:threadId", aiLimiter, inboxController.extractTasksFromThread);
