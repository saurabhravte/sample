import type { Request, Response } from "express";
import { z } from "zod";
import { sendResponse } from "../../common/utils/apiResponse";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { catchMeUp, contextStats } from "./catchup.service";

export const getCatchUp = asyncHandler(async (req: Request, res: Response) => {
  const q = z
    .object({
      hours: z.coerce
        .number()
        .min(1)
        .max(24 * 7)
        .default(8),
    })
    .parse(req.query);
  const since = new Date(Date.now() - q.hours * 3_600_000);
  sendResponse(res, 200, await catchMeUp(req.user!.id, since));
});

/** Cost-of-Context weekly insight. */
export const getContextStats = asyncHandler(async (req: Request, res: Response) => {
  const since = new Date(Date.now() - 7 * 86_400_000);
  sendResponse(res, 200, await contextStats(req.user!.id, since));
});
