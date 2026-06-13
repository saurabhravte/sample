import type { Request, Response } from "express";
import { sendResponse } from "../../common/utils/apiResponse";
import { asyncHandler } from "../../common/utils/asyncHandler";
import * as emailSvc from "../inbox/inbox.service";

/**
 * Two engines, one endpoint:
 *  - local: pgvector over Corsair's cached entities — under a second, semantic
 *  - gmail: Corsair search API with a friendly advanced-search builder
 */
export const search = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const b = req.body;
  if (b.mode === "local") {
    const t0 = Date.now();
    const rows = await emailSvc.localSearch(userId, b.q);
    return sendResponse(res, 200, {
      engine: "local-pgvector",
      tookMs: Date.now() - t0,
      hits: rows.map((r) => ({
        id: r.email_id,
        kind: "email",
        title: r.subject,
        snippet: r.snippet,
        occurredAt: r.received_at?.toISOString() ?? "",
        score: r.score,
      })),
    });
  }
  // Build Gmail advanced query from structured fields
  const parts = [b.q];
  if (b.from) parts.push(`from:${b.from}`);
  if (b.to) parts.push(`to:${b.to}`);
  if (b.hasAttachment) parts.push("has:attachment");
  if (b.after) parts.push(`after:${b.after}`);
  if (b.before) parts.push(`before:${b.before}`);
  if (b.label) parts.push(`label:${b.label}`);
  const result = await emailSvc.gmailSearch(userId, parts.join(" "));
  sendResponse(res, 200, { engine: "gmail-advanced", query: parts.join(" "), result });
});
