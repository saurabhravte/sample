"use client";

import { useState } from "react";
import type { ProposedAction } from "@momentum/shared";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";

const KIND_META: Record<ProposedAction["kind"], { icon: string; label: string }> = {
  send_email: { icon: "✉", label: "Send email" },
  create_event: { icon: "▦", label: "Create event" },
  update_event: { icon: "▦", label: "Update event" },
  slack_post: { icon: "💬", label: "Post to Slack" },
  github_create_issue: { icon: "⎇", label: "Create issue" },
};

export function ApprovalCard({ action, onDecided }: { action: ProposedAction; onDecided?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState(action.status);
  const toast = useToast();
  const meta = KIND_META[action.kind];

  async function decide(decision: "approve" | "reject") {
    setBusy(true);
    try {
      const updated = await api.decide(action.id, decision);
      setState(updated.status);
      toast(
        decision === "approve" ? `Approved — ${meta.label.toLowerCase()} executed` : "Rejected, nothing was sent",
        decision === "approve" ? "success" : "info",
      );
      onDecided?.();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "error");
    } finally {
      setBusy(false);
    }
  }

  const payloadPreview = (() => {
    const p = action.payload as Record<string, unknown>;
    const lines: string[] = [];
    for (const [k, v] of Object.entries(p)) {
      if (v == null) continue;
      const s = Array.isArray(v) ? v.join(", ") : String(v);
      lines.push(`${k}: ${s.length > 140 ? s.slice(0, 140) + "…" : s}`);
    }
    return lines.slice(0, 6);
  })();

  return (
    <div className="card border-accent/30 p-4 animate-rise">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span>{meta.icon}</span> {meta.label}
        </span>
        <span
          className={`chip ${
            state === "pending"
              ? "bg-accent/15 text-accent"
              : state === "executed" || state === "approved"
                ? "bg-fyi/15 text-fyi"
                : state === "failed"
                  ? "bg-urgent/15 text-urgent"
                  : "bg-ink-800 text-ink-400"
          }`}
        >
          {state}
        </span>
      </div>
      <p className="mt-2 text-sm text-ink-200">{action.description}</p>
      <pre className="mt-2 overflow-x-auto rounded-lg bg-ink-950/70 p-2.5 font-mono text-[11px] leading-relaxed text-ink-300">
        {payloadPreview.join("\n")}
      </pre>
      {state === "pending" && (
        <div className="mt-3 flex gap-2">
          <button className="btn-primary flex-1" onClick={() => decide("approve")} disabled={busy}>
            Approve & run
          </button>
          <button className="btn-ghost flex-1" onClick={() => decide("reject")} disabled={busy}>
            Reject
          </button>
        </div>
      )}
      <p className="mt-2 text-[10px] text-ink-400">Momentum never sends without you.</p>
    </div>
  );
}
