"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BentoCard } from "@/components/dashboard/bento-card";
import { Icon } from "@/components/icons";

export type ProgressPoint = { date: string; completed: number };

/**
 * Daily progress area chart. Feed it `data` from /api/tasks/stats?days=N
 * (a {date, completed}[] series). Colors come from CSS vars so it themes.
 */
export function ProgressChart({ data, loading }: { data?: ProgressPoint[]; loading?: boolean }) {
  const series = data ?? [];
  const total = series.reduce((s, p) => s + p.completed, 0);

  return (
    <BentoCard>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-surface-2 text-ink">
            <Icon.Chart className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-medium leading-tight">Daily progress</h2>
            <p className="text-xs text-muted">{total} tasks completed in this window</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-44 animate-pulse rounded-lg bg-surface-2" />
      ) : series.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">No completions yet — finish a task to see it here.</p>
      ) : (
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="progressFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "rgb(var(--faint))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(d: string) => d.slice(5)}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "rgb(var(--faint))" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={32}
              />
              <Tooltip
                cursor={{ stroke: "rgb(var(--line))" }}
                contentStyle={{
                  background: "rgb(var(--surface))",
                  border: "1px solid rgb(var(--line))",
                  borderRadius: 10,
                  fontSize: 12,
                  color: "rgb(var(--ink))",
                }}
                labelStyle={{ color: "rgb(var(--muted))" }}
              />
              <Area
                type="monotone"
                dataKey="completed"
                stroke="rgb(var(--accent))"
                strokeWidth={2}
                fill="url(#progressFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </BentoCard>
  );
}
