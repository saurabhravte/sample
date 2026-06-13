import type { EventDto } from "@momentum/shared";
import { corsairFor } from "../../common/config/corsair";
import { logActivity } from "../../common/services/activity.service";

type RawEvent = {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: Array<{ email: string }>;
  hangoutLink?: string;
};

/** Pure, unit-tested overlap math for the conflict detector. */
export function findConflicts(events: Array<{ id: string; start: string; end: string }>): Set<string> {
  const conflicted = new Set<string>();
  const sorted = [...events].sort((a, b) => a.start.localeCompare(b.start));
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j]!.start >= sorted[i]!.end) break;
      conflicted.add(sorted[i]!.id);
      conflicted.add(sorted[j]!.id);
    }
  }
  return conflicted;
}

export async function listEvents(userId: string, fromIso: string, toIso: string): Promise<EventDto[]> {
  const tenant = corsairFor(userId);
  // Real Corsair surface: events.getMany (Gmail-style list is "getMany" here).
  const res = (await tenant.googlecalendar.api.events.getMany({
    calendarId: "primary",
    timeMin: fromIso,
    timeMax: toIso,
    singleEvents: true,
    orderBy: "startTime",
  })) as { items?: RawEvent[] };

  const items = (res.items ?? []).map((e) => ({
    id: e.id,
    title: e.summary ?? "(untitled)",
    start: e.start?.dateTime ?? e.start?.date ?? "",
    end: e.end?.dateTime ?? e.end?.date ?? "",
    attendees: (e.attendees ?? []).map((a) => a.email),
    meetLink: e.hangoutLink ?? null,
    conflict: false,
  }));
  const conflicts = findConflicts(items);
  return items.map((e) => ({ ...e, conflict: conflicts.has(e.id) }));
}

export async function createEvent(
  userId: string,
  input: { title: string; start: string; end: string; attendees: string[]; description?: string },
) {
  const tenant = corsairFor(userId);
  const created = await tenant.googlecalendar.api.events.create({
    calendarId: "primary",
    event: {
      summary: input.title,
      start: { dateTime: input.start },
      end: { dateTime: input.end },
      attendees: input.attendees.map((email) => ({ email })),
      description: input.description,
    },
    sendUpdates: "all", // calendar invites go out — that's the point
  });
  await logActivity(
    userId,
    "automation",
    "event.created",
    `Created “${input.title}” (${input.attendees.length} invitee(s))`,
  );
  return created;
}

export async function updateEvent(userId: string, eventId: string, patch: Record<string, unknown>) {
  const tenant = corsairFor(userId);
  const updated = await tenant.googlecalendar.api.events.update({
    calendarId: "primary",
    id: eventId,
    event: patch,
    sendUpdates: "all",
  });
  await logActivity(userId, "automation", "event.updated", `Updated event`, eventId);
  return updated;
}

/** Share-my-availability: compute free slots from busy events (pure logic). */
export function freeSlots(
  busy: Array<{ start: string; end: string }>,
  dayStartIso: string,
  dayEndIso: string,
  slotMinutes = 30,
): Array<{ start: string; end: string }> {
  const slots: Array<{ start: string; end: string }> = [];
  let cursor = new Date(dayStartIso).getTime();
  const dayEnd = new Date(dayEndIso).getTime();
  const sortedBusy = [...busy]
    .map((b) => ({ s: new Date(b.start).getTime(), e: new Date(b.end).getTime() }))
    .sort((a, b) => a.s - b.s);
  for (const b of sortedBusy) {
    while (cursor + slotMinutes * 60_000 <= Math.min(b.s, dayEnd)) {
      slots.push({ start: new Date(cursor).toISOString(), end: new Date(cursor + slotMinutes * 60_000).toISOString() });
      cursor += slotMinutes * 60_000;
    }
    cursor = Math.max(cursor, b.e);
  }
  while (cursor + slotMinutes * 60_000 <= dayEnd) {
    slots.push({ start: new Date(cursor).toISOString(), end: new Date(cursor + slotMinutes * 60_000).toISOString() });
    cursor += slotMinutes * 60_000;
  }
  return slots;
}
