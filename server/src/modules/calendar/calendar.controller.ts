import type { Request, Response } from "express";
import { z } from "zod";
import { env } from "../../common/config/env";
import { AvailabilityQuery, EventsRangeQuery } from "./dto/calendar.dto";
import { sendResponse } from "../../common/utils/apiResponse";
import { asyncHandler } from "../../common/utils/asyncHandler";
import * as calSvc from "./calendar.service";
import * as emailSvc from "../inbox/inbox.service";
import { schedulePreMeetingBriefs } from "../../common/jobs/workers";
import { fenceUntrusted, jsonCompletion } from "../../common/services/ai/llm";

export const listEvents = asyncHandler(async (req: Request, res: Response) => {
  const q = EventsRangeQuery.parse(req.query);
  sendResponse(res, 200, await calSvc.listEvents(req.user!.id, q.from, q.to));
});

export const createEvent = asyncHandler(async (req: Request, res: Response) => {
  const created = await calSvc.createEvent(req.user!.id, req.body);
  await schedulePreMeetingBriefs(req.user!.id);
  sendResponse(res, 201, created, "Event created");
});

/** Meeting brief: participants + recent related email + suggested agenda. */
export const eventBrief = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const now = new Date();
  const week = new Date(now.getTime() + 7 * 86_400_000);
  const events = await calSvc.listEvents(userId, now.toISOString(), week.toISOString());
  const event = events.find((e) => e.id === req.params.eventId);
  if (!event) return sendResponse(res, 200, null);

  // Pull recent email involving attendees from the LOCAL cache (fast)
  const related = (
    await Promise.all(event.attendees.slice(0, 5).map((a) => emailSvc.localSearch(userId, a, 3)))
  ).flat();

  let talkingPoints: string[] = [];
  if (env.ANTHROPIC_API_KEY && related.length) {
    const out = await jsonCompletion({
      system: `Suggest 3 concise talking points for the meeting. Schema: {"points":["..."]}`,
      user: [
        `Meeting: ${event.title} with ${event.attendees.join(", ")}`,
        fenceUntrusted("related_email", related.map((r) => `${r.subject}: ${r.snippet}`).join("\n")),
      ].join("\n"),
      parse: (raw) => z.object({ points: z.array(z.string()) }).parse(raw),
    });
    talkingPoints = out.points;
  }
  sendResponse(res, 200, {
    event,
    relatedEmail: related.map((r) => ({ subject: r.subject, snippet: r.snippet, threadId: r.thread_id })),
    talkingPoints,
  });
});

/** Share-my-availability: free slots for the next N days, paste-ready. */
export const availability = asyncHandler(async (req: Request, res: Response) => {
  const q = AvailabilityQuery.parse(req.query);
  const userId = req.user!.id;
  const out: Array<{ day: string; slots: Array<{ start: string; end: string }> }> = [];
  for (let d = 0; d < q.days; d++) {
    const dayStart = new Date();
    dayStart.setUTCDate(dayStart.getUTCDate() + d);
    dayStart.setUTCHours(9, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCHours(17, 0, 0, 0);
    const events = await calSvc.listEvents(userId, dayStart.toISOString(), dayEnd.toISOString());
    out.push({
      day: dayStart.toISOString().slice(0, 10),
      slots: calSvc.freeSlots(events, dayStart.toISOString(), dayEnd.toISOString(), 30).slice(0, 6),
    });
  }
  sendResponse(res, 200, out);
});
