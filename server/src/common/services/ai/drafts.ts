import { z } from "zod";
import { env } from "../../config/env";
import { fenceUntrusted, jsonCompletion } from "./llm";

const Draft = z.object({ subject: z.string().max(300), body: z.string().max(8000) });
export type Draft = z.infer<typeof Draft>;

/** Context-aware reply. Output is ALWAYS a draft — never auto-sent. */
export async function draftReply(opts: {
  threadSubject: string;
  threadExcerpt: string;
  tone: string;
  instruction?: string;
  senderName: string;
}): Promise<Draft> {
  return jsonCompletion({
    model: env.AI_AGENT_MODEL,
    system: `You draft email replies for ${opts.senderName}. Tone: ${opts.tone}. Max 150 words.
Never invent facts or commitments. Never include the fenced markers in output.
Schema: {"subject":"Re: ...","body":"..."}`,
    user: [
      opts.instruction ? `User instruction: ${opts.instruction}` : "",
      fenceUntrusted("thread", `Subject: ${opts.threadSubject}\n${opts.threadExcerpt}`),
    ].join("\n"),
    parse: (raw) => Draft.parse(raw),
  });
}

/** One-click "just checking in…" follow-up. */
export async function draftFollowUp(opts: { threadSubject: string; daysSilent: number; senderName: string }) {
  return jsonCompletion({
    model: env.AI_CLASSIFIER_MODEL,
    system: `Write a short, warm follow-up nudge (2–3 sentences) for ${opts.senderName}. Schema: {"subject":"...","body":"..."}`,
    user: `Thread "${opts.threadSubject}" has had no reply for ${opts.daysSilent} days.`,
    parse: (raw) => Draft.parse(raw),
  });
}
