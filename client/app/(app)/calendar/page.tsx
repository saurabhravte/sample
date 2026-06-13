"use client";

import { useState } from "react";
import type { EventDto } from "@momentum/shared";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { useToast } from "@/components/Toast";
import { fmtDay, fmtTime } from "@/lib/format";

export default function CalendarPage() {
  const events = useAsync(() => api.events());
  const toast = useToast();
  const [briefFor, setBriefFor] = useState<EventDto | null>(null);
  const [creating, setCreating] = useState(false);

  // group by day
  const byDay = new Map<string, EventDto[]>();
  for (const e of events.data ?? []) {
    const k = new Date(e.start).toDateString();
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  }
  const days = [...byDay.entries()].sort((a, b) => +new Date(a[0]) - +new Date(b[0]));
  const conflicts = (events.data ?? []).filter((e) => e.conflict).length;

  async function shareAvailability() {
    try {
      const { text } = await api.availability();
      await navigator.clipboard.writeText(text);
      toast("Free slots copied — paste into any reply (Calendly-without-Calendly)", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not compute availability", "error");
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Calendar</h1>
          {conflicts > 0 ? (
            <p className="mt-1 text-sm text-urgent">
              ⚠ {conflicts} double-booked slot{conflicts > 1 ? "s" : ""} detected
            </p>
          ) : (
            <p className="mt-1 text-sm text-ink-400">No conflicts — your week is clean.</p>
          )}
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={shareAvailability}>
            ⧉ Share my availability
          </button>
          <button className="btn-primary" onClick={() => setCreating(true)}>
            + New event
          </button>
        </div>
      </header>

      <div className="mt-6 space-y-6">
        {events.loading && <p className="text-sm text-ink-400 animate-pulse-soft">loading events…</p>}
        {!events.loading && days.length === 0 && (
          <p className="py-10 text-center text-sm text-ink-400">
            No upcoming events. Connect Google Calendar or create one.
          </p>
        )}
        {days.map(([day, list]) => (
          <section key={day}>
            <h2 className="font-display text-sm font-semibold text-accent">{fmtDay(list[0].start)}</h2>
            <ul className="mt-2 space-y-2">
              {list
                .sort((a, b) => +new Date(a.start) - +new Date(b.start))
                .map((e) => (
                  <li key={e.id} className={`card flex items-center gap-4 p-4 ${e.conflict ? "border-urgent/40" : ""}`}>
                    <div className="w-24 shrink-0 font-mono text-xs text-ink-300">
                      {fmtTime(e.start)}
                      <span className="text-ink-500"> – {fmtTime(e.end)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-100">{e.title}</p>
                      {e.attendees.length > 0 && (
                        <p className="truncate text-xs text-ink-400">
                          {e.attendees.slice(0, 4).join(", ")}
                          {e.attendees.length > 4 ? ` +${e.attendees.length - 4}` : ""}
                        </p>
                      )}
                    </div>
                    {e.conflict && <span className="chip bg-urgent/15 text-urgent">conflict</span>}
                    {e.meetLink && (
                      <a
                        href={e.meetLink}
                        target="_blank"
                        rel="noreferrer"
                        className="chip bg-fyi/15 text-fyi hover:underline"
                      >
                        join
                      </a>
                    )}
                    <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setBriefFor(e)}>
                      📋 Brief
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>

      {briefFor && <BriefModal event={briefFor} onClose={() => setBriefFor(null)} />}
      {creating && (
        <CreateEventModal
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            events.reload();
          }}
        />
      )}
    </div>
  );
}

function BriefModal({ event, onClose }: { event: EventDto; onClose: () => void }) {
  const brief = useAsync(() => api.brief(event.id), [event.id]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/70 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="card max-h-[80vh] w-full max-w-lg overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-bold">📋 {event.title}</h2>
        <p className="mt-1 text-xs text-ink-400">
          {fmtDay(event.start)} · {fmtTime(event.start)}–{fmtTime(event.end)} · this brief is also pushed 10 min before
          the meeting
        </p>
        {brief.loading && <p className="mt-4 text-sm text-ink-400 animate-pulse-soft">assembling context…</p>}
        {brief.data && (
          <>
            <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-accent">Participants</h3>
            <p className="mt-1 text-sm text-ink-200">{brief.data.attendees.join(", ") || "Just you"}</p>

            <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-accent">Recent threads with them</h3>
            <ul className="mt-1 space-y-1.5">
              {brief.data.recentEmails.map((h) => (
                <li key={h.id} className="rounded-lg bg-ink-850 px-3 py-2 text-sm">
                  <p className="truncate text-ink-100">{h.title}</p>
                  <p className="truncate text-xs text-ink-400">{h.snippet}</p>
                </li>
              ))}
              {brief.data.recentEmails.length === 0 && (
                <li className="text-sm text-ink-400">No recent email context.</li>
              )}
            </ul>

            <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-accent">Suggested talking points</h3>
            <ul className="mt-1 list-inside space-y-1 text-sm text-ink-200">
              {brief.data.talkingPoints.map((t, i) => (
                <li key={i}>• {t}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function CreateEventModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [duration, setDuration] = useState(30);
  const [attendees, setAttendees] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const s = new Date(start);
      await api.createEvent({
        title,
        start: s.toISOString(),
        end: new Date(s.getTime() + duration * 60_000).toISOString(),
        attendees: attendees
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
      });
      toast("Event created — Google sends invites to all attendees", "success");
      onCreated();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not create event", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/70 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <form className="card w-full max-w-md space-y-3 p-6" onClick={(e) => e.stopPropagation()} onSubmit={create}>
        <h2 className="font-display text-lg font-bold">New event — one screen, zero hunting</h2>
        <input
          className="input"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input
          className="input"
          type="datetime-local"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          required
        />
        <div className="flex gap-2">
          {[15, 30, 45, 60].map((d) => (
            <button
              type="button"
              key={d}
              onClick={() => setDuration(d)}
              className={`chip ${duration === d ? "bg-accent/15 text-accent" : "bg-ink-800 text-ink-300"}`}
            >
              {d}m
            </button>
          ))}
        </div>
        <input
          className="input"
          placeholder="Attendees (comma-separated emails)"
          value={attendees}
          onChange={(e) => setAttendees(e.target.value)}
        />
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" disabled={busy}>
            {busy ? "…" : "Create & invite"}
          </button>
        </div>
      </form>
    </div>
  );
}
