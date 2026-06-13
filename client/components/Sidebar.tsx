"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUiStore } from "@/lib/store";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "◎", key: "g d" },
  { href: "/catch-up", label: "Catch Me Up", icon: "☀", key: "g c" },
  { href: "/inbox", label: "Inbox", icon: "✉", key: "g i" },
  { href: "/calendar", label: "Calendar", icon: "▦", key: "g a" },
  { href: "/tasks", label: "Tasks", icon: "✓", key: "g t" },
  { href: "/review", label: "Review queue", icon: "⎇", key: "g r" },
  { href: "/settings", label: "Settings", icon: "⚙", key: "g s" },
];

export function Sidebar() {
  const focusMode = useUiStore((s) => s.focusMode);
  const onToggleFocus = useUiStore((s) => s.toggleFocus);
  const path = usePathname();
  return (
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-ink-800 bg-ink-900/60 px-3 py-5 backdrop-blur">
      <Link href="/dashboard" className="px-2 font-display text-lg font-bold">
        Moment<span className="text-accent">um</span>
      </Link>

      <nav className="mt-6 flex flex-1 flex-col gap-1">
        {NAV.map((n) => {
          const active = path?.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`group flex items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                active ? "bg-ink-800 text-accent" : "text-ink-300 hover:bg-ink-850 hover:text-ink-100"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className="w-4 text-center">{n.icon}</span>
                {n.label}
              </span>
              <span className="kbd opacity-0 transition group-hover:opacity-100">{n.key}</span>
            </Link>
          );
        })}
      </nav>

      <button
        onClick={onToggleFocus}
        className={`mt-2 flex items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
          focusMode ? "bg-accent/15 text-accent" : "text-ink-300 hover:bg-ink-850"
        }`}
        title="Mute all noise — show only critical items"
      >
        <span className="flex items-center gap-2.5">
          <span className="w-4 text-center">◐</span>Focus mode
        </span>
        <span className="kbd">f</span>
      </button>

      <div className="mt-4 rounded-xl border border-ink-800 px-3 py-2.5 text-[11px] text-ink-400">
        <span className="kbd">⌘K</span> command bar · <span className="kbd">?</span> shortcuts
      </div>
    </aside>
  );
}
