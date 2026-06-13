import { describe, expect, it } from "vitest";
import { findConflicts, freeSlots } from "../modules/calendar/calendar.service";
import { heuristicClassify } from "../common/services/ai/classifier";
import { detectMeetingHeuristic } from "../common/services/ai/extract";
import { isStale } from "../modules/integrations/github.service";
import { isStandup } from "../modules/integrations/slack.service";

describe("conflict detector overlap math", () => {
  it("flags overlapping events and only those", () => {
    const out = findConflicts([
      { id: "a", start: "2026-06-12T10:00:00Z", end: "2026-06-12T11:00:00Z" },
      { id: "b", start: "2026-06-12T10:30:00Z", end: "2026-06-12T11:30:00Z" },
      { id: "c", start: "2026-06-12T12:00:00Z", end: "2026-06-12T13:00:00Z" },
    ]);
    expect(out.has("a")).toBe(true);
    expect(out.has("b")).toBe(true);
    expect(out.has("c")).toBe(false);
  });
  it("back-to-back is not a conflict", () => {
    const out = findConflicts([
      { id: "a", start: "2026-06-12T10:00:00Z", end: "2026-06-12T11:00:00Z" },
      { id: "b", start: "2026-06-12T11:00:00Z", end: "2026-06-12T12:00:00Z" },
    ]);
    expect(out.size).toBe(0);
  });
});

describe("share-my-availability free slots", () => {
  it("carves slots around busy blocks", () => {
    const slots = freeSlots(
      [{ start: "2026-06-12T10:00:00Z", end: "2026-06-12T11:00:00Z" }],
      "2026-06-12T09:00:00Z",
      "2026-06-12T12:00:00Z",
      30,
    );
    expect(slots.map((s) => s.start)).toEqual([
      "2026-06-12T09:00:00.000Z",
      "2026-06-12T09:30:00.000Z",
      "2026-06-12T11:00:00.000Z",
      "2026-06-12T11:30:00.000Z",
    ]);
  });
});

describe("priority classifier heuristics", () => {
  it("routes newsletters", () => {
    expect(heuristicClassify("Weekly digest", "noreply@news.com", "unsubscribe link").priority).toBe("newsletter");
  });
  it("routes urgency", () => {
    expect(heuristicClassify("URGENT: invoice overdue", "cfo@client.com", "please pay today").priority).toBe("urgent");
  });
  it("labels invoices", () => {
    expect(heuristicClassify("Invoice #42", "billing@acme.com", "payment due").smartLabel).toBe("invoice");
  });
  it("detects questions as needs_reply", () => {
    expect(heuristicClassify("Quick question", "raj@team.com", "Can you review this?").priority).toBe("needs_reply");
  });
});

describe("email → calendar detection (deterministic pass)", () => {
  const base = new Date("2026-06-12T08:00:00Z"); // a Friday
  it("parses 'thursday at 4pm' into a FUTURE date", () => {
    const hint = detectMeetingHeuristic("can we meet thursday at 4pm?", base);
    expect(hint.found).toBe(true);
    const d = new Date(hint.startIso!);
    expect(d.getUTCDay()).toBe(4); // Thursday
    expect(d.getTime()).toBeGreaterThan(base.getTime());
    expect(d.getUTCHours()).toBe(16);
  });
  it("same weekday rolls a full week forward, never today/past", () => {
    const hint = detectMeetingHeuristic("friday at 9am works", base);
    const d = new Date(hint.startIso!);
    expect(d.getTime() - base.getTime()).toBeGreaterThanOrEqual(6 * 86_400_000);
  });
  it("no false positives without a time", () => {
    expect(detectMeetingHeuristic("see you on thursday sometime", base).found).toBe(false);
  });
});

describe("stale PR threshold", () => {
  it("48h boundary", () => {
    expect(isStale(new Date(Date.now() - 49 * 3_600_000).toISOString())).toBe(true);
    expect(isStale(new Date(Date.now() - 47 * 3_600_000).toISOString())).toBe(false);
    expect(isStale(null)).toBe(false);
  });
});

describe("standup detection", () => {
  it("matches standup posts", () => {
    expect(isStandup("Daily standup: yesterday I shipped X, today Y, no blockers")).toBe(true);
    expect(isStandup("lunch anyone?")).toBe(false);
  });
});
