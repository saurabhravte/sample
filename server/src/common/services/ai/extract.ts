import { z } from "zod";
import { fenceUntrusted, jsonCompletion } from "./llm";

/* ── Task extraction (email & Slack → action items) ── */
const Tasks = z.object({ tasks: z.array(z.object({ title: z.string().max(200), due: z.string().nullable() })) });

export async function extractTasks(source: string, content: string, hasApiKey: boolean) {
  if (!hasApiKey) return { tasks: [] };
  try {
    return await jsonCompletion({
      system: `Extract concrete action items the reader must do. Empty array if none.
due: ISO date or null. Schema: {"tasks":[{"title":"...","due":null}]}`,
      user: fenceUntrusted(source, content),
      parse: (raw) => Tasks.parse(raw),
    });
  } catch {
    return { tasks: [] };
  }
}

/* ── Email → Calendar detection ("can we meet Thursday at 4?") ── */
const Meeting = z.object({
  found: z.boolean(),
  title: z.string().nullable(),
  startIso: z.string().nullable(),
  durationMinutes: z.number().nullable(),
});
export type MeetingHint = z.infer<typeof Meeting>;

const DOW = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** Deterministic regex pass — tested without an LLM, with a timezone-aware base date. */
export function detectMeetingHeuristic(text: string, now: Date): MeetingHint {
  const lower = text.toLowerCase();
  const dayHit = DOW.findIndex((d) => lower.includes(d));
  const timeMatch = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (dayHit === -1 || !timeMatch) return { found: false, title: null, startIso: null, durationMinutes: null };

  let hour = parseInt(timeMatch[1], 10) % 12;
  if (timeMatch[3] === "pm") hour += 12;
  const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;

  const d = new Date(now);
  const delta = (dayHit - d.getUTCDay() + 7) % 7 || 7; // "next <day>" → always future
  d.setUTCDate(d.getUTCDate() + delta);
  d.setUTCHours(hour, minute, 0, 0);
  return { found: true, title: "Meeting", startIso: d.toISOString(), durationMinutes: 30 };
}

export async function detectMeeting(content: string, now: Date, hasApiKey: boolean): Promise<MeetingHint> {
  const heuristic = detectMeetingHeuristic(content, now);
  if (!hasApiKey) return heuristic;
  try {
    return await jsonCompletion({
      system: `Detect a concrete meeting proposal in the text. Today (UTC) is ${now.toISOString()}.
Schema: {"found":bool,"title":string|null,"startIso":string|null,"durationMinutes":number|null}`,
      user: fenceUntrusted("message", content),
      parse: (raw) => Meeting.parse(raw),
    });
  } catch {
    return heuristic;
  }
}
