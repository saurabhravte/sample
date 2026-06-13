"use client";

import { useEffect, useState } from "react";
import { BentoCard } from "@/components/dashboard/bento-card";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { apiGet } from "@/lib/api";

type Range = "daily" | "weekly" | "monthly";
type SummaryData = { headline: string; bullets: string[] };

/**
 * Dynamic summary the user can scope (daily/weekly/monthly) and turn off.
 * Hits GET /api/summary?range=... — see server module in SETUP. The on/off
 * preference persists to localStorage so it survives reloads.
 */
export function SummaryCard() {
  const [enabled, setEnabled] = useState(true);
  const [range, setRange] = useState<Range>("daily");
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);

  // restore the on/off preference
  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("summary:enabled") : null;
    if (saved !== null) setEnabled(saved === "1");
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setLoading(true);
    apiGet<SummaryData>(`/api/summary?range=${range}`)
      .then((d) => alive && setData(d))
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [range, enabled]);

  function setEnabledPersist(v: boolean) {
    setEnabled(v);
    window.localStorage.setItem("summary:enabled", v ? "1" : "0");
  }

  return (
    <BentoCard>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-medium">Summary</h2>
        <div className="flex items-center gap-3">
          {enabled && (
            <Segmented<Range>
              value={range}
              onChange={setRange}
              options={[
                { value: "daily", label: "Daily" },
                { value: "weekly", label: "Weekly" },
                { value: "monthly", label: "Monthly" },
              ]}
            />
          )}
          <Switch checked={enabled} onChange={setEnabledPersist} label="Toggle summary" />
        </div>
      </div>

      {!enabled ? (
        <p className="text-sm text-muted">Summary is off. Flip the switch to see your {range} digest.</p>
      ) : loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <span key={i} className="block h-4 animate-pulse rounded bg-surface-2" />
          ))}
        </div>
      ) : data ? (
        <div>
          <p className="text-sm font-medium">{data.headline}</p>
          <ul className="mt-2 space-y-1.5">
            {data.bullets.map((b, i) => (
              <li key={i} className="flex gap-2 text-sm text-muted">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-faint" />
                {b}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-muted">Nothing to summarize for this period yet.</p>
      )}
    </BentoCard>
  );
}
