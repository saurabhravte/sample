import type { EmailPriority, SmartLabel } from "@momentum/shared";

export function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "";
  const m = Math.round(ms / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return d < 7 ? `${d}d` : new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export const PRIORITY_META: Record<EmailPriority, { label: string; cls: string }> = {
  urgent: { label: "Urgent", cls: "bg-urgent/15 text-urgent" },
  needs_reply: { label: "Needs reply", cls: "bg-reply/15 text-reply" },
  waiting: { label: "Waiting", cls: "bg-waiting/15 text-waiting" },
  fyi: { label: "FYI", cls: "bg-fyi/15 text-fyi" },
  newsletter: { label: "Newsletter", cls: "bg-news/15 text-news" },
};

export const LABEL_META: Record<Exclude<SmartLabel, "none">, string> = {
  client: "bg-accent/15 text-accent",
  invoice: "bg-fyi/15 text-fyi",
  interview: "bg-waiting/20 text-ink-200",
  project: "bg-news/20 text-ink-200",
};

export const PROVIDER_META: Record<string, { name: string; icon: string; blurb: string; scope: string }> = {
  gmail: {
    name: "Gmail",
    icon: "✉️",
    blurb: "Priority inbox, snooze, AI drafts, undo-send.",
    scope: "Read & send mail on your behalf — only after you approve each send.",
  },
  googlecalendar: {
    name: "Google Calendar",
    icon: "📅",
    blurb: "Conflict detection, one-click invites, pre-meeting briefs.",
    scope: "Read events and create invites you confirm.",
  },
  slack: {
    name: "Slack",
    icon: "💬",
    blurb: "Channel catch-up summaries, standup detection, message → task.",
    scope: "Read channels you're in; post only with approval.",
  },
  github: {
    name: "GitHub",
    icon: "🐙",
    blurb: "PR review queue, briefings, email → issue.",
    scope: "Read PRs/issues; create issues you confirm.",
  },
};
