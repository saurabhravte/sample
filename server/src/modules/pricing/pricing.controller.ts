import type { Request, Response } from "express";
import { sendResponse } from "../../common/utils/apiResponse";
import { asyncHandler } from "../../common/utils/asyncHandler";

/**
 * Public pricing content so the landing page is data-driven (no redeploy to
 * change a price). Edit here (or back this with a DB/CMS later) and the page
 * updates. No auth — mounted before requireAuth.
 */
const PRICING = {
  currency: "₹",
  annualDiscount: 0.2,
  plans: [
    {
      name: "Starter",
      monthly: 0,
      blurb: "For trying Momentum with a single inbox.",
      features: ["1 connected tool", "Priority inbox", "Manual catch-up", "Community support"],
      cta: "Start free",
      highlight: false,
    },
    {
      name: "Pro",
      monthly: 799,
      blurb: "The full command center for one person.",
      features: [
        "All 4 tools connected",
        "⌘K action bar + proposals",
        "Catch Me Up + pre-meeting briefs",
        "Sub-second semantic search",
        "Undo send & shutdown ritual",
      ],
      cta: "Go Pro",
      highlight: true,
    },
    {
      name: "Team",
      monthly: 1499,
      blurb: "Shared context across a small team.",
      features: ["Everything in Pro", "Up to 10 seats", "Shared activity log", "Priority support"],
      cta: "Contact sales",
      highlight: false,
    },
  ],
};

export const getPricing = asyncHandler(async (_req: Request, res: Response) => {
  sendResponse(res, 200, PRICING);
});
