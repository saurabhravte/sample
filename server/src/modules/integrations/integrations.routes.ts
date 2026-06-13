import { Router } from "express";
import { validateBody } from "../../common/middleware/validate.middleware";
import { IssueFromEmailDto, SlackToTaskDto } from "./dto/integrations.dto";
import { aiLimiter } from "../../common/middleware/rateLimit.middleware";
import * as integrationsController from "./integrations.controller";

export const integrationsRouter = Router();

/* Slack */
integrationsRouter.get("/slack/unread", integrationsController.slackUnread);
integrationsRouter.post("/slack/catch-up/:channelId", aiLimiter, integrationsController.slackCatchUp);
integrationsRouter.post("/slack/to-task", validateBody(SlackToTaskDto), integrationsController.slackToTask);

/* GitHub */
integrationsRouter.get("/github/review-queue", integrationsController.githubReviewQueue);
integrationsRouter.post(
  "/github/issue-from-email",
  validateBody(IssueFromEmailDto),
  integrationsController.issueFromEmail,
);
