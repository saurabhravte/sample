import { Router, raw } from "express";
import { handleCorsairWebhook } from "./webhooks.controller";

/** Raw body + signature auth (NOT session auth). */
export const webhooksRouter = Router();

webhooksRouter.post("/corsair", raw({ type: "*/*", limit: "1mb" }), handleCorsairWebhook);
