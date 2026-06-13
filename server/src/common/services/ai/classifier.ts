import { z } from "zod";
import { EmailPriority, SmartLabel, TriageDecision } from "@momentum/shared";
import { fenceUntrusted, jsonCompletion } from "./llm";

const Classification = z.object({
  priority: EmailPriority,
  smartLabel: SmartLabel,
  triage: TriageDecision,
  reason: z.string().max(200),
});
export type Classification = z.infer<typeof Classification>;

const SYSTEM = `You triage emails for a busy professional. Classify each email:
priority: urgent (time-critical, blocking), needs_reply (a human expects an answer),
waiting (you are waiting on them), fyi (informational), newsletter (bulk/marketing).
smartLabel: client | invoice | interview | project | none.
triage: important | needs_reply | ignore.
Schema: {"priority":"...","smartLabel":"...","triage":"...","reason":"..."}`;

/** Heuristic fallback so the inbox still works with no ANTHROPIC_API_KEY. */
export function heuristicClassify(subject: string, from: string, snippet: string): Classification {
  const s = `${subject} ${snippet}`.toLowerCase();
  const f = from.toLowerCase();
  if (/unsubscribe|newsletter|digest|no-?reply|noreply/.test(`${s} ${f}`))
    return { priority: "newsletter", smartLabel: "none", triage: "ignore", reason: "bulk sender" };
  if (/urgent|asap|today|deadline|action required|final notice/.test(s))
    return { priority: "urgent", smartLabel: detectLabel(s), triage: "important", reason: "urgency keywords" };
  if (/\?|can you|could you|please|let me know|thoughts/.test(s))
    return { priority: "needs_reply", smartLabel: detectLabel(s), triage: "needs_reply", reason: "question detected" };
  return { priority: "fyi", smartLabel: detectLabel(s), triage: "ignore", reason: "default" };
}
function detectLabel(s: string): Classification["smartLabel"] {
  if (/invoice|payment|billing|receipt/.test(s)) return "invoice";
  if (/interview|candidate|recruiter|hiring/.test(s)) return "interview";
  if (/client|proposal|contract|sow/.test(s)) return "client";
  if (/sprint|milestone|deploy|release|ticket/.test(s)) return "project";
  return "none";
}

export async function classifyEmail(input: {
  subject: string;
  from: string;
  snippet: string;
  hasApiKey: boolean;
}): Promise<Classification> {
  if (!input.hasApiKey) return heuristicClassify(input.subject, input.from, input.snippet);
  try {
    return await jsonCompletion({
      system: SYSTEM,
      user: [
        fenceUntrusted("email_subject", input.subject),
        fenceUntrusted("email_from", input.from),
        fenceUntrusted("email_body", input.snippet),
      ].join("\n"),
      parse: (raw) => Classification.parse(raw),
    });
  } catch {
    return heuristicClassify(input.subject, input.from, input.snippet);
  }
}
