"use client";

import { useMemo, useState } from "react";
import type { EmailPriority, EmailSummaryDto } from "@momentum/shared";
import { api } from "@/lib/api";
import { useAsync, useShortcuts } from "@/lib/hooks";
import { useToast } from "@/components/Toast";
import { EmailViewer } from "@/components/EmailViewer";
import { useFocusMode } from "@/lib/store";
import { LABEL_META, PRIORITY_META, timeAgo } from "@/lib/format";

const TABS: { key: EmailPriority | "all" | "follow-ups"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "urgent", label: "Urgent" },
  { key: "needs_reply", label: "Needs reply" },
  { key: "waiting", label: "Waiting" },
  { key: "fyi", label: "FYI" },
  { key: "newsletter", label: "Newsletter" },
  { key: "follow-ups", label: "⏰ Follow-ups" },
];

const SNOOZE_PRESETS = [
  { label: "3 hours", ms: 3 * 3600_000 },
  { label: "This evening", evening: true },
  { label: "Tomorrow 9am", tomorrow: true },
  { label: "Next week", ms: 7 * 24 * 3600_000 },
];

export default function InboxPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [label, setLabel] = useState<string | null>(null);
  const [selected, setSelected] = useState<EmailSummaryDto | null>(null);
  const [cursor, setCursor] = useState(0);
  const focus = useFocusMode();
  const toast = useToast();

  const list = useAsync(
    () =>
      tab === "follow-ups"
        ? api.followUps()
        : api.inbox({ priority: tab === "all" ? undefined : tab, label: label ?? undefined }),
    [tab, label],
  );

  const emails = useMemo(() => {
    let e = list.data ?? [];
    if (focus) e = e.filter((m) => m.priority === "urgent" || m.priority === "needs_reply");
    return e;
  }, [list.data, focus]);

  async function sync() {
    toast("Syncing inbox via Corsair…", "info");
    try {
      const { synced } = await api.syncInbox();
      toast(`Synced ${synced} messages — classified & embedded`, "success");
      list.reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Sync failed", "error");
    }
  }

  async function snooze(email: EmailSummaryDto, preset: (typeof SNOOZE_PRESETS)[number]) {
    let until: Date;
    if (preset.evening) {
      until = new Date();
      until.setHours(18, 0, 0, 0);
      if (until.getTime() < Date.now()) until.setDate(until.getDate() + 1);
    } else if (preset.tomorrow) {
      until = new Date();
      until.setDate(until.getDate() + 1);
      until.setHours(9, 0, 0, 0);
    } else {
      until = new Date(Date.now() + (preset.ms ?? 0));
    }
    await api.snooze({ emailId: email.id, until: until.toISOString() });
    toast(`Snoozed until ${until.toLocaleString()}`, "success");
    setSelected(null);
    list.reload();
  }

  useShortcuts({
    j: () => setCursor((c) => Math.min(c + 1, emails.length - 1)),
    k: () => setCursor((c) => Math.max(c - 1, 0)),
    enter: () => emails[cursor] && setSelected(emails[cursor]),
    o: () => emails[cursor] && setSelected(emails[cursor]),
    u: () => setSelected(null),
  });

  return (
    <div className="mx-auto max-w-6xl">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Inbox</h1>
        <button className="btn-ghost" onClick={sync}>
          ⟳ Sync now
        </button>
      </header>

      {/* priority tabs */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setCursor(0);
              setSelected(null);
            }}
            className={`chip ${tab === t.key ? "bg-accent/15 text-accent" : "bg-ink-800 text-ink-300 hover:text-ink-100"}`}
          >
            {t.label}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-ink-700" />
        {(["client", "invoice", "interview", "project"] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLabel(label === l ? null : l)}
            className={`chip ${label === l ? LABEL_META[l] : "bg-ink-850 text-ink-400 hover:text-ink-200"}`}
          >
            #{l}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        {/* list */}
        <ul className={`space-y-1.5 ${selected ? "lg:col-span-2" : "lg:col-span-5"}`}>
          {list.loading && <li className="py-8 text-center text-sm text-ink-400 animate-pulse-soft">loading…</li>}
          {!list.loading && emails.length === 0 && (
            <li className="py-8 text-center text-sm text-ink-400">
              {tab === "follow-ups" ? "No threads waiting on a reply. ✨" : "Inbox zero in this view."}
            </li>
          )}
          {emails.map((m, idx) => (
            <li key={m.id}>
              <button
                onClick={() => {
                  setSelected(m);
                  setCursor(idx);
                }}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-left transition ${
                  idx === cursor ? "border-accent/40 bg-ink-850" : "border-transparent hover:bg-ink-850"
                } ${selected?.id === m.id ? "bg-ink-850" : ""}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className={`truncate text-sm ${m.unread ? "font-semibold text-ink-100" : "text-ink-300"}`}>
                    {m.from.replace(/<.*>/, "").trim() || m.from}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-ink-400">{timeAgo(m.receivedAt)}</span>
                </div>
                <p className={`mt-0.5 truncate text-sm ${m.unread ? "text-ink-100" : "text-ink-300"}`}>{m.subject}</p>
                <p className="mt-0.5 truncate text-xs text-ink-400">{m.snippet}</p>
                <div className="mt-1.5 flex gap-1.5">
                  {m.priority && (
                    <span className={`chip ${PRIORITY_META[m.priority].cls}`}>{PRIORITY_META[m.priority].label}</span>
                  )}
                  {m.smartLabel && m.smartLabel !== "none" && (
                    <span className={`chip ${LABEL_META[m.smartLabel]}`}>#{m.smartLabel}</span>
                  )}
                  {m.hasReminder && <span className="chip bg-ink-800 text-ink-300">⏰</span>}
                </div>
              </button>
            </li>
          ))}
        </ul>

        {/* thread pane */}
        {selected && (
          <div className="lg:col-span-3">
            <ThreadPane
              email={selected}
              onClose={() => setSelected(null)}
              onSnooze={(p) => snooze(selected, p)}
              onChanged={() => list.reload()}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ThreadPane({
  email,
  onClose,
  onSnooze,
  onChanged,
}: {
  email: EmailSummaryDto;
  onClose: () => void;
  onSnooze: (p: (typeof SNOOZE_PRESETS)[number]) => void;
  onChanged: () => void;
}) {
  const thread = useAsync(() => api.thread(email.threadId), [email.threadId]);
  const toast = useToast();
  const [draft, setDraft] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);

  async function makeDraft(kind: "reply" | "followup") {
    setDrafting(true);
    try {
      const r =
        kind === "reply" ? await api.draftReply({ threadId: email.threadId }) : await api.followUp(email.threadId);
      setDraft(r.draft);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Draft failed", "error");
    } finally {
      setDrafting(false);
    }
  }

  async function send() {
    if (!draft) return;
    try {
      const { jobId, undoUntil } = await api.send({
        to: [email.from],
        subject: email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`,
        body: draft,
        threadId: email.threadId,
      });
      const secs = Math.max(1, Math.round((new Date(undoUntil).getTime() - Date.now()) / 1000));
      toast(
        `Sending in ${secs}s…`,
        "info",
        { label: "Undo", onClick: () => api.undoSend(jobId).then(() => toast("Send cancelled", "success")) },
        secs * 1000,
      );
      setDraft(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Send failed", "error");
    }
  }

  async function extractTasks() {
    try {
      const tasks = await api.extractTasks(email.threadId);
      toast(
        tasks.length ? `Extracted ${tasks.length} task(s) → board` : "No action items found",
        tasks.length ? "success" : "info",
      );
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Extraction failed", "error");
    }
  }

  async function createEventFromHint() {
    const hint = thread.data?.meetingHint;
    if (!hint) return;
    try {
      const start = new Date(hint.start);
      const end = new Date(start.getTime() + 30 * 60_000);
      await api.createEvent({
        title: hint.title,
        start: start.toISOString(),
        end: end.toISOString(),
        attendees: hint.attendees,
      });
      toast("Event created — invites sent to the thread participants", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Event creation failed", "error");
    }
  }

  useShortcuts({
    r: () => makeDraft("reply"),
    s: () => setSnoozeOpen((v) => !v),
    e: () => extractTasks(),
  });

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display font-semibold">{email.subject}</h2>
          <p className="mt-0.5 text-xs text-ink-400">{email.from}</p>
        </div>
        <button className="text-ink-400 hover:text-ink-100" onClick={onClose} title="Close (u)">
          ✕
        </button>
      </div>

      {/* email → calendar chip: the most direct answer to "invites take too many steps" */}
      {thread.data?.meetingHint && (
        <button
          onClick={createEventFromHint}
          className="mt-3 flex w-full items-center gap-2 rounded-xl border border-accent/40 bg-accent/5 px-3 py-2 text-left text-sm text-accent hover:bg-accent/10"
        >
          ▦ Meeting detected: “{thread.data.meetingHint.title}” —{" "}
          {new Date(thread.data.meetingHint.start).toLocaleString()}.
          <span className="ml-auto shrink-0 font-semibold">Create event →</span>
        </button>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => makeDraft("reply")} disabled={drafting}>
          {drafting ? "drafting…" : "↩ AI reply"} <span className="kbd">r</span>
        </button>
        <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => makeDraft("followup")} disabled={drafting}>
          👋 “Just checking in…”
        </button>
        <div className="relative">
          <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setSnoozeOpen((v) => !v)}>
            ◷ Snooze <span className="kbd">s</span>
          </button>
          {snoozeOpen && (
            <div className="card absolute z-10 mt-1 w-44 p-1.5">
              {SNOOZE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  className="block w-full rounded-lg px-3 py-1.5 text-left text-xs text-ink-200 hover:bg-ink-800"
                  onClick={() => onSnooze(p)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={extractTasks}>
          ✓ Extract tasks <span className="kbd">e</span>
        </button>
        <button
          className="btn-ghost !px-3 !py-1.5 text-xs"
          onClick={async () => {
            const remindAt = new Date(Date.now() + 24 * 3600_000).toISOString();
            await api.reminder({ threadId: email.threadId, remindAt });
            toast("Reminder set for tomorrow", "success");
          }}
        >
          ⏰ Remind me
        </button>
      </div>

      {/* draft editor */}
      {draft !== null && (
        <div className="mt-4 rounded-xl border border-accent/30 bg-ink-850 p-3">
          <p className="mb-2 text-[11px] text-ink-400">
            AI draft — edit freely. Nothing sends until you click, and you get a 30s undo.
          </p>
          <textarea className="input h-36 resize-none" value={draft} onChange={(e) => setDraft(e.target.value)} />
          <div className="mt-2 flex justify-end gap-2">
            <button className="btn-ghost !py-1.5 text-xs" onClick={() => setDraft(null)}>
              Discard
            </button>
            <button className="btn-primary !py-1.5 text-xs" onClick={send}>
              Send with undo
            </button>
          </div>
        </div>
      )}

      {/* messages */}
      <div className="mt-4 space-y-4">
        {thread.loading && <p className="text-sm text-ink-400 animate-pulse-soft">loading thread…</p>}
        {thread.data?.messages.map((m) => (
          <div key={m.id}>
            <div className="mb-1.5 flex items-baseline justify-between text-xs text-ink-400">
              <span>{m.from}</span>
              <span className="font-mono">{new Date(m.date).toLocaleString()}</span>
            </div>
            <EmailViewer html={m.html} text={m.text} />
          </div>
        ))}
      </div>
    </div>
  );
}
