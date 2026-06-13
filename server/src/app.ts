import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./common/config/env";
import { errorHandler } from "./common/middleware/error.middleware";
import { apiLimiter } from "./common/middleware/rateLimit.middleware";
import { requireAuth } from "./modules/auth/auth.middleware";
import { authRouter } from "./modules/auth/auth.routes";
import { pricingRouter } from "./modules/pricing/pricing.routes";
import { connectionsRouter } from "./modules/connections/connections.routes";
import { inboxRouter } from "./modules/inbox/inbox.routes";
import { calendarRouter } from "./modules/calendar/calendar.routes";
import { catchupRouter } from "./modules/catchup/catchup.routes";
import { commandRouter } from "./modules/command/command.routes";
import { searchRouter } from "./modules/search/search.routes";
import { tasksRouter } from "./modules/tasks/tasks.routes";
import { labelsRouter } from "./modules/labels/labels.routes";
import { summaryRouter } from "./modules/summary/summary.routes";
import { aichatRouter } from "./modules/aichat/aichat.routes";
import { integrationsRouter } from "./modules/integrations/integrations.routes";
import { webhooksRouter } from "./modules/webhooks/webhooks.routes";

/** Express builds the app; node:http owns the listener (see server.ts). */
export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin: [env.WEB_ORIGIN], // strict allowlist
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE"],
    }),
  );
  app.use(cookieParser());
  // Webhooks need raw body — their router applies express.raw itself, so JSON
  // parsing is skipped for that path.
  app.use((req, res, next) =>
    req.path.startsWith("/api/webhooks") ? next() : express.json({ limit: "256kb" })(req, res, next),
  );

  app.get("/healthz", (_req, res) => res.json({ success: true, statusCode: 200, message: "OK", data: { up: true } }));

  /* ── API: one router per module ── */
  const api = express.Router();
  // Webhooks: raw body + signature auth (NOT session auth), mounted first.
  api.use("/webhooks", webhooksRouter);
  api.use("/auth", authRouter);
  api.use("/pricing", pricingRouter);
  // Everything below requires a session and is rate-limited per user.
  api.use(requireAuth, apiLimiter);
  api.use("/connections", connectionsRouter);
  api.use("/inbox", inboxRouter);
  api.use("/calendar", calendarRouter);
  api.use("/catch-up", catchupRouter);
  api.use("/command", commandRouter);
  api.use("/search", searchRouter);
  api.use("/tasks", tasksRouter);
  api.use("/labels", labelsRouter);
  api.use("/summary", summaryRouter);
  api.use("/ai-chat", aichatRouter);
  api.use("/integrations", integrationsRouter);
  app.use("/api", api);

  app.use((_req, res) =>
    res.status(404).json({
      success: false,
      statusCode: 404,
      message: "No such route",
      error: { code: "NOT_FOUND", message: "No such route" },
    }),
  );
  app.use(errorHandler);
  return app;
}
