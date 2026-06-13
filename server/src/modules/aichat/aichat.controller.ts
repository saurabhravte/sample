import type { Request, Response } from "express";
import { env } from "../../common/config/env";
import { anthropic } from "../../common/services/ai/llm";
import { sendResponse } from "../../common/utils/apiResponse";
import { asyncHandler } from "../../common/utils/asyncHandler";

/**
 * POST /api/ai-chat  { messages: [{role, content}] } -> { reply }
 *
 * Works with whatever you have configured, in priority order:
 *   1. ANTHROPIC_API_KEY  -> reuses the app's Anthropic client (AI_AGENT_MODEL)
 *   2. OPENROUTER_API_KEY -> a FREE model via OpenRouter (AI_FREE_MODEL)
 *   3. neither            -> a friendly stub so the UI still renders
 *
 * No tools are attached, so prompt-injected user text can only produce text.
 */
const SYSTEM =
  "You are Momentum's helpful work assistant. Be concise, friendly, and practical. " +
  "Help with drafting, summarizing, planning and brainstorming.";

export const chat = asyncHandler(async (req: Request, res: Response) => {
  const messages = req.body.messages as { role: "user" | "assistant"; content: string }[];

  // 1) Anthropic (the project already ships the SDK + key for its other AI features)
  if (env.ANTHROPIC_API_KEY) {
    const msg = await anthropic.messages.create({
      model: env.AI_AGENT_MODEL,
      max_tokens: 800,
      system: SYSTEM,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
    const reply =
      msg.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { text: string }).text)
        .join("\n")
        .trim() || "I didn't catch that — could you rephrase?";
    return sendResponse(res, 200, { reply });
  }

  // 2) Free model via OpenRouter
  if (env.OPENROUTER_API_KEY) {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
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
    return sendResponse(res, 200, { reply });
  }

  // 3) Stub
  return sendResponse(res, 200, {
    reply:
      "AI isn't configured yet. Add ANTHROPIC_API_KEY (the app already uses it elsewhere) " +
      "or a free OPENROUTER_API_KEY from openrouter.ai to the server .env, then restart.",
  });
});
