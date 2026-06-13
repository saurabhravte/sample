"use client";

import {
  Mail,
  Calendar,
  Slack,
  Github,
  Inbox,
  CalendarClock,
  CheckSquare,
  Plug,
  ArrowUpRight,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { BentoCard } from "@/components/dashboard/bento-card";
import { ProgressChart, type ProgressPoint } from "@/components/dashboard/progress-chart";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/use-fetch";
import { cn } from "@/lib/utils";

/* ---- Backend contract (adjust paths/fields to match your server) ----
   GET /api/connections  -> { providers: { gmail, googlecalendar, slack, github } }
   GET /api/dashboard/overview -> { unread, meetingsToday, openTasks }
   GET /api/activity?limit=5   -> { items: [{ id, level, title, message }] }
------------------------------------------------------------------------- */
const ENDPOINTS = {
  connections: "/api/connections",
  overview: "/api/dashboard/overview",
  activity: "/api/activity?limit=5",
};

type Providers = Record<"gmail" | "googlecalendar" | "slack" | "github", boolean>;
type Overview = { unread: number; meetingsToday: number; openTasks: number };
type Activity = {
  items: { id: string; level: "success" | "warning" | "error" | "neutral"; title: string; message: string }[];
};

const TOOLS: { key: keyof Providers; name: string; icon: typeof Mail; color: string }[] = [
  { key: "gmail", name: "Gmail", icon: Mail, color: "#EA4335" },
  { key: "googlecalendar", name: "Calendar", icon: Calendar, color: "#1A73E8" },
  { key: "slack", name: "Slack", icon: Slack, color: "#611F69" },
  { key: "github", name: "GitHub", icon: Github, color: "#24292F" },
];

function Stat({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: typeof Inbox;
  label: string;
  value?: number;
  loading: boolean;
}) {
  return (
    <BentoCard>
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-surface-2 text-ink">
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-4 text-sm text-muted">{label}</p>
      {loading ? (
        <span className="mt-1 block h-7 w-12 animate-pulse rounded bg-surface-2" />
      ) : (
        <p className="text-2xl font-semibold tracking-tight">{value ?? "—"}</p>
      )}
    </BentoCard>
  );
}

export default function DashboardPage() {
  const conn = useFetch<Providers>(ENDPOINTS.connections);
  const overview = useFetch<Overview>(ENDPOINTS.overview);
  const activity = useFetch<Activity>(ENDPOINTS.activity);
  const stats = useFetch<{ series: ProgressPoint[] }>("/api/tasks/stats?days=14");

  const providers = conn.data;
  const connectedCount = providers ? Object.values(providers).filter(Boolean).length : 0;
  const hasAnyConnection = connectedCount > 0;

  async function toggleTool(key: string, currentlyOn: boolean) {
    try {
      if (currentlyOn) {
        await api.disconnect(key);
        conn.reload();
      } else {
        const res = await api.connect(key);
        // OAuth providers (gmail/calendar) redirect to consent; key providers need the modal.
        if (res.redirectUrl) window.location.href = res.redirectUrl;
        else window.location.href = `/connections?focus=${key}`;
      }
    } catch {
      conn.reload();
    }
  }

  return (
    <div className="space-y-4">
      {/* Empty state — only when we know nothing is connected */}
      {!conn.loading && !conn.error && !hasAnyConnection && (
        <BentoCard className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-surface-2 text-ink">
              <Plug className="h-5 w-5" />
            </span>
            <div>
              <p className="font-medium">Nothing connected yet</p>
              <p className="text-sm text-muted">Connect a tool to start seeing your day here.</p>
            </div>
          </div>
          <Link href="/connections" className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-bg">
            Connect tools
          </Link>
        </BentoCard>
      )}

      {/* Stat row — dynamic counts */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          icon={Plug}
          label="Connected tools"
          value={hasAnyConnection ? connectedCount : undefined}
          loading={conn.loading}
        />
        <Stat icon={Inbox} label="Unread" value={overview.data?.unread} loading={overview.loading} />
        <Stat
          icon={CalendarClock}
          label="Meetings today"
          value={overview.data?.meetingsToday}
          loading={overview.loading}
        />
        <Stat icon={CheckSquare} label="Open tasks" value={overview.data?.openTasks} loading={overview.loading} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Connected tools — dynamic status from /api/connections */}
        <BentoCard className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium">Your tools</h2>
            <Link href="/connections" className="text-xs text-muted hover:text-ink">
              Manage
            </Link>
          </div>

          {conn.error ? (
            <ErrorRow message={conn.error} onRetry={conn.reload} />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {TOOLS.map((t) => {
                const isOn = Boolean(providers?.[t.key]);
                return (
                  <div key={t.key} className="flex flex-col items-start gap-3 rounded-lg border border-line bg-bg p-3">
                    <div className="flex w-full items-start justify-between">
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-surface-2 text-ink">
                        <t.icon className="h-4 w-4" />
                      </span>
                      <Switch
                        checked={isOn}
                        disabled={conn.loading}
                        label={`Toggle ${t.name}`}
                        onChange={() => toggleTool(t.key, isOn)}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                        {/* the only bright color: a tiny live status dot */}
                        <span
                          className={cn("h-1.5 w-1.5 rounded-full", conn.loading && "animate-pulse")}
                          style={{ background: isOn ? t.color : "rgb(var(--faint))" }}
                        />
                        {conn.loading ? "Checking" : isOn ? "Connected" : "Off"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </BentoCard>

        {/* Activity — dynamic, with bright pills as the only color */}
        <BentoCard>
          <h2 className="mb-4 font-medium">Recent activity</h2>
          {activity.error ? (
            <ErrorRow message={activity.error} onRetry={activity.reload} />
          ) : activity.loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <span key={i} className="block h-8 animate-pulse rounded-full bg-surface-2" />
              ))}
            </div>
          ) : activity.data && activity.data.items.length > 0 ? (
            <div className="space-y-2.5">
              {activity.data.items.map((a) => (
                <StatusBadge key={a.id} variant={a.level} label={a.title} withArrow={false}>
                  {a.message}
                </StatusBadge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No activity yet. Actions you approve will show up here.</p>
          )}
        </BentoCard>
      </div>

      {/* Summary (daily/weekly/monthly toggle) + daily progress graph */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SummaryCard />
        <ProgressChart data={stats.data?.series} loading={stats.loading} />
      </div>

      {/* Catch Me Up — neutral, action button stays black */}
      <BentoCard className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-medium">Catch me up</h2>
          <p className="text-sm text-muted">
            Summarize everything that happened across your connected tools while you were away.
          </p>
        </div>
        <button
          disabled={!hasAnyConnection}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
            hasAnyConnection ? "bg-ink text-bg" : "cursor-not-allowed bg-surface-2 text-faint",
          )}
        >
          Run catch-up <ArrowUpRight className="h-4 w-4" />
        </button>
      </BentoCard>
    </div>
  );
}

function ErrorRow({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
      <p className="text-sm text-rose-600 dark:text-rose-400">Couldn&apos;t load — {message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-bg"
      >
        <RotateCcw className="h-3.5 w-3.5" /> Retry
      </button>
    </div>
  );
}
