"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { useToast } from "@/components/Toast";
import { timeAgo } from "@/lib/format";

export default function ReviewPage() {
  const queue = useAsync(() => api.reviewQueue());
  const slack = useAsync(() => api.slackChannels());
  const toast = useToast();
  const [summary, setSummary] = useState<{ channel: string; summary: string; actionItems: string[] } | null>(null);
  const [busyChannel, setBusyChannel] = useState<string | null>(null);

  async function catchUp(channelId: string, name: string) {
    setBusyChannel(channelId);
    try {
      const r = await api.slackCatchUp(channelId);
      setSummary({ channel: name, ...r });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Catch-up failed", "error");
    } finally {
      setBusyChannel(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-2xl font-bold">Review queue</h1>
      <p className="mt-1 text-sm text-ink-400">
        PRs and conversations waiting on you — with AI briefings so you can triage in seconds.
      </p>

      {/* GitHub PRs */}
      <section className="card mt-6 p-5">
        <h2 className="font-display text-sm font-semibold text-accent">⎇ PRs awaiting your review</h2>
        {queue.loading && <p className="mt-3 text-sm text-ink-400 animate-pulse-soft">loading…</p>}
        {queue.data && (
          <>
            <p className="mt-3 whitespace-pre-wrap rounded-xl bg-ink-850 p-3 text-sm text-ink-200">
              {queue.data.briefing}
            </p>
            <ul className="mt-3 space-y-2">
              {queue.data.prs.map((pr) => {
                const stale = pr.updatedAt ? Date.now() - new Date(pr.updatedAt).getTime() > 48 * 3600_000 : false;
                return (
                  <li key={pr.id} className="flex items-center gap-3 rounded-xl border border-ink-800 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink-100">{pr.title}</p>
                      <p className="font-mono text-[11px] text-ink-400">
                        {pr.repo}
                        {pr.updatedAt ? ` · updated ${timeAgo(pr.updatedAt)}` : ""}
                      </p>
                    </div>
                    {stale && (
                      <span className="chip bg-urgent/15 text-urgent" title="A reviewer reminder can be sent via Slack">
                        stale &gt;48h
                      </span>
                    )}
                    <a className="btn-ghost !px-3 !py-1.5 text-xs" href={pr.url} target="_blank" rel="noreferrer">
                      Review ↗
                    </a>
                  </li>
                );
              })}
              {queue.data.prs.length === 0 && <li className="text-sm text-ink-400">Queue is clear. 🎉</li>}
            </ul>
          </>
        )}
        {queue.error && (
          <p className="mt-3 text-sm text-ink-400">
            Connect GitHub on the{" "}
            <a href="/connections" className="text-accent hover:underline">
              connections page
            </a>{" "}
            to see your review queue.
          </p>
        )}
      </section>

      {/* Slack catch-up */}
      <section className="card mt-5 p-5">
        <h2 className="font-display text-sm font-semibold text-accent">💬 Slack — your channels</h2>
        {slack.error && (
          <p className="mt-3 text-sm text-ink-400">
            Connect Slack on the{" "}
            <a href="/connections" className="text-accent hover:underline">
              connections page
            </a>{" "}
            for channel catch-ups.
          </p>
        )}
        <ul className="mt-3 space-y-2">
          {(slack.data ?? []).map((c) => (
            <li key={c.channelId} className="flex items-center gap-3 rounded-xl border border-ink-800 px-3 py-2.5">
              <span className="flex-1 text-sm text-ink-100">#{c.name}</span>
              <span className="chip bg-ink-800 text-ink-300">{c.members} members</span>
              <button
                className="btn-ghost !px-3 !py-1.5 text-xs"
                onClick={() => catchUp(c.channelId, c.name)}
                disabled={busyChannel === c.channelId}
              >
                {busyChannel === c.channelId ? "summarizing…" : "⚡ Catch up"}
              </button>
            </li>
          ))}
          {slack.data?.length === 0 && (
            <li className="text-sm text-ink-400">
              No channels in the Corsair cache yet — connect Slack, then catch up.
            </li>
          )}
        </ul>

        {summary && (
          <div className="mt-4 rounded-xl border border-accent/30 bg-ink-850 p-4">
            <h3 className="text-sm font-semibold text-accent">#{summary.channel} in 10 seconds</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink-200">{summary.summary}</p>
            {summary.actionItems.length > 0 && (
              <>
                <h4 className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Action items</h4>
                <ul className="mt-1 space-y-1.5">
                  {summary.actionItems.map((a, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 text-sm text-ink-200">
                      <span>• {a}</span>
                      <button
                        className="kbd hover:text-accent"
                        onClick={async () => {
                          await api.createTask({ title: a });
                          toast("Added to task board", "success");
                        }}
                      >
                        + task
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
