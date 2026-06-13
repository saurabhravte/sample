import type { Request, Response } from "express";
import { env } from "../../common/config/env";
import { sendResponse } from "../../common/utils/apiResponse";
import { asyncHandler } from "../../common/utils/asyncHandler";

/**
 * POST /api/ai-chat  { messages: [{role, content}] } -> { reply }
 *
 * Backed by a FREE model via OpenRouter's OpenAI-compatible endpoint. Set
 * OPENROUTER_API_KEY and (optionally) AI_FREE_MODEL in .env. Free model ids
 * look like "meta-llama/llama-3.1-8b-instruct:free". If no key is set we return
 * a friendly stub so the UI still works in local dev.
 *
 * Untrusted user content only — this endpoint has NO tools, so prompt-injected
 * text can do nothing but produce text.
 */
const SYSTEM =
  "You are Momentum's helpful work assistant. Be concise, friendly, and practical. " +
  "Help with drafting, summarizing, planning and brainstorming. You cannot access the user's email or calendar here.";

export const chat = asyncHandler(async (req: Request, res: Response) => {
  const messages = req.body.messages as { role: "user" | "assistant"; content: string }[];

  if (!env.OPENROUTER_API_KEY) {
    return sendResponse(res, 200, {
      reply:
        "AI is not configured yet. Add OPENROUTER_API_KEY (a free key from openrouter.ai) to the server .env, then restart — and I'll answer for real.",
    });
  }

  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.AI_FREE_MODEL,
      messages: [{ role: "system", content: SYSTEM }, ...messages],
      max_tokens: 800,
    }),
  });

  if (!r.ok) {
    return sendResponse(res, 200, { reply: "The free model is busy right now — please try again in a moment." });
  }
  const data = (await r.json()) as { choices?: { message?: { content?: string } }[] };
  const reply = data.choices?.[0]?.message?.content?.trim() || "I didn't catch that — could you rephrase?";
  sendResponse(res, 200, { reply });
});
