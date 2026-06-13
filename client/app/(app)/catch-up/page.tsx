"use client";

import { useState } from "react";
import Link from "next/link";
import type { CatchUpItem } from "@momentum/shared";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { useToast } from "@/components/Toast";
import { UrgencyDot } from "@/components/UrgencyDot";
import { useFocusMode } from "@/lib/store";
import { timeAgo } from "@/lib/format";

const WINDOWS = [
  { label: "3 hours", hours: 3 },
  { label: "Today", hours: 12 },
  { label: "24 hours", hours: 24 },
  { label: "The weekend", hours: 72 },
];

const KIND_ICON: Record<CatchUpItem["kind"], string> = {
  email: "✉",
  slack: "💬",
  github_pr: "⎇",
  github_issue: "◉",
  calendar: "▦",
};

export default function CatchUpPage() {
  const [hours, setHours] = useState(12);
  const focus = useFocusMode();
  const { data, loading, reload } = useAsync(() => api.catchUp(hours), [hours]);
  const toast = useToast();
  const [draft, setDraft] = useState<{ item: CatchUpItem; text: string } | null>(null);

  const items = (data?.items ?? []).filter((i) => !focus || i.urgency >= 70);

  async function quickAction(item: CatchUpItem, action: string) {
    try {
      if (action === "snooze" && item.ref.emailId) {
        const until = new Date(Date.now() + 3 * 3600_000).toISOString();
        await api.snooze({ emailId: item.ref.emailId, until });
        toast("Snoozed for 3 hours — it'll resurface", "success");
        reload();
      } else if (action === "task") {
        await api.createTask({ title: item.title });
        toast("Added to your task board", "success");
      } else if (action === "reply" && item.ref.threadId) {
        const { draft: text } = await api.draftReply({ threadId: item.ref.threadId });
        setDraft({ item, text });
      } else if (action === "open" && item.ref.url) {
        window.open(item.ref.url, "_blank");
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Action failed", "error");
    }
  }

  async function sendDraft() {
    if (!draft?.item.ref.threadId) return;
    try {
      const to = draft.item.ref.from ? [draft.item.ref.from] : [];
      const { jobId, undoUntil } = await api.send({
        to,
        subject: `Re: ${draft.item.title}`,
        body: draft.text,
        threadId: draft.item.ref.threadId,
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

  return (
    <div className="mx-auto max-w-3xl">
      <header className="text-center">
        <h1 className="font-display text-3xl font-bold">☀ Catch Me Up</h1>
        <p className="mt-2 text-sm text-ink-400">I was offline for…</p>
        <div className="mt-3 flex justify-center gap-2">
          {WINDOWS.map((w) => (
            <button
              key={w.hours}
              onClick={() => setHours(w.hours)}
              className={`chip ${hours === w.hours ? "bg-accent/15 text-accent" : "bg-ink-800 text-ink-300 hover:text-ink-100"}`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <p className="mt-10 text-center text-sm text-ink-400 animate-pulse-soft">scanning your workspace…</p>
      ) : (
        <>
          <div className="card mt-6 border-accent/30 p-5 text-center">
            <p className="font-display text-lg">{data?.headline}</p>
            <div className="mt-3 flex justify-center gap-6 font-mono text-[11px] text-ink-400">
              <span>✉ {data?.stats.emails} emails</span>
              <span>💬 {data?.stats.slackThreads} threads</span>
              <span>⎇ {data?.stats.prs} PRs</span>
              <span>▦ {data?.stats.meetingsToday} meetings today</span>
            </div>
          </div>

          <ul className="mt-5 space-y-2.5">
            {items.map((i) => (
              <li key={i.id} className="card p-4 animate-rise">
                <div className="flex items-start gap-3">
                  <UrgencyDot urgency={i.urgency} />
                  <span className="text-base leading-none">{KIND_ICON[i.kind]}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm font-medium text-ink-100">{i.title}</p>
                      <span className="shrink-0 font-mono text-[11px] text-ink-400">{timeAgo(i.occurredAt)}</span>
                    </div>
                    <p className="mt-1 text-sm text-ink-300">{i.summary}</p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {i.actions.map((a) => (
                        <button
                          key={a}
                          onClick={() => quickAction(i, a)}
                          className="rounded-lg border border-ink-700 px-2.5 py-1 text-xs text-ink-200 hover:border-accent/50 hover:text-accent"
                        >
                          {a === "reply"
                            ? "↩ draft reply"
                            : a === "snooze"
                              ? "◷ snooze 3h"
                              : a === "task"
                                ? "✓ to task"
                                : a === "approve_draft"
                                  ? "✓ approve"
                                  : "↗ open"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </li>
            ))}
            {items.length === 0 && (
              <li className="py-10 text-center text-sm text-ink-400">
                Nothing needs you from this window.{" "}
                <Link href="/dashboard" className="text-accent hover:underline">
                  Back to the dashboard →
                </Link>
              </li>
            )}
          </ul>
        </>
      )}

      {/* Draft reply modal — draft-first, you approve the send */}
      {draft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/70 p-6 backdrop-blur-sm"
          onClick={() => setDraft(null)}
        >
          <div className="card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display font-semibold">AI draft — re: {draft.item.title}</h2>
            <textarea
              className="input mt-3 h-44 resize-none font-body"
              value={draft.text}
              onChange={(e) => setDraft({ ...draft, text: e.target.value })}
            />
            <div className="mt-3 flex justify-between">
              <span className="self-center text-[11px] text-ink-400">30s undo window after send</span>
              <div className="flex gap-2">
                <button className="btn-ghost" onClick={() => setDraft(null)}>
                  Discard
                </button>
                <button className="btn-primary" onClick={sendDraft}>
                  Send with undo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
