"use client";

import Link from "next/link";

const NODES = [
  { key: "gmail", icon: "✉️", deg: 0 },
  { key: "googlecalendar", icon: "📅", deg: 90 },
  { key: "slack", icon: "💬", deg: 180 },
  { key: "github", icon: "🐙", deg: 270 },
];

/**
 * The Momentum signature ring: four services around one center.
 * `connected` lights up nodes; the center is the Catch Me Up sun.
 */
export function ServiceRing({
  connected = [],
  size = 280,
  centerHref = "/catch-up",
  centerLabel = "Catch me up",
}: {
  connected?: string[];
  size?: number;
  centerHref?: string;
  centerLabel?: string;
}) {
  const r = size / 2 - 28;
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      {/* rings */}
      <div className="absolute inset-0 rounded-full border border-ink-700/70" />
      <div className="absolute inset-6 rounded-full border border-dashed border-ink-700/50 animate-ring-slow" />
      <div className="absolute inset-12 rounded-full border border-ink-800" />

      {/* service nodes (counter-rotated so icons stay upright) */}
      <div className="absolute inset-0 animate-ring">
        {NODES.map((n) => {
          const rad = (n.deg * Math.PI) / 180;
          const x = size / 2 + r * Math.cos(rad) - 22;
          const y = size / 2 + r * Math.sin(rad) - 22;
          const on = connected.includes(n.key);
          return (
            <div key={n.key} className="absolute h-11 w-11" style={{ left: x, top: y }}>
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full border text-lg backdrop-blur animate-ring-slow ${
                  on ? "border-accent/60 bg-ink-850 shadow-glow" : "border-ink-700 bg-ink-900/80 opacity-50 grayscale"
                }`}
                style={{ animationDirection: "reverse" }}
                title={n.key}
              >
                {n.icon}
              </div>
            </div>
          );
        })}
      </div>

      {/* center action */}
      <Link
        href={centerHref}
        className="group absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-accent text-center text-white shadow-glow transition hover:scale-105"
      >
        <span className="font-display text-[13px] font-bold leading-tight">{centerLabel}</span>
        <span className="mt-0.5 text-[10px] opacity-70">⌘K anywhere</span>
      </Link>
    </div>
  );
}
