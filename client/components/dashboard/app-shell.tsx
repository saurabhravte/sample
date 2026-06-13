"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar, MobileSidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { CommandPalette } from "@/components/CommandPalette";
import { useShortcuts, useAuthGate } from "@/lib/hooks";
import { useUiStore } from "@/lib/store";

const SHORTCUTS: [string, string][] = [
  ["⌘K", "Command bar (act / search)"],
  ["g d", "Overview"],
  ["g i", "Inbox"],
  ["g a", "Calendar"],
  ["g t", "Tasks"],
  ["g c", "Catch Me Up"],
  ["g r", "Review queue"],
  ["f", "Focus mode"],
  ["?", "This sheet"],
];

/**
 * ONE shell for the whole authenticated app. Both /dashboard and every
 * feature page under (app) render through this, so the sidebar, topbar,
 * command palette and shortcuts are identical everywhere — the duplicate
 * shells/sidebars that made navigation feel broken are gone.
 *
 * Auth is dual: a Clerk session OR the custom Express session lets you in.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { loading, authed } = useAuthGate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { focusMode, paletteOpen, helpOpen, toggleFocus, togglePalette, setPaletteOpen, toggleHelp } = useUiStore();

  useShortcuts({
    "mod+k": togglePalette,
    "g d": () => router.push("/dashboard"),
    "g i": () => router.push("/inbox"),
    "g a": () => router.push("/calendar"),
    "g t": () => router.push("/tasks"),
    "g c": () => router.push("/catch-up"),
    "g r": () => router.push("/review"),
    f: toggleFocus,
    "?": toggleHelp,
  });

  // Gate: once we know neither auth is present, send to /login.
  useEffect(() => {
    if (!loading && !authed) router.replace("/login");
  }, [loading, authed, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="animate-pulse-soft text-sm text-muted">Loading your workspace…</div>
      </div>
    );
  }
  if (!authed) return null;

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 py-5 sm:px-6">
          {focusMode && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-accent/30 bg-accent-soft px-4 py-2 text-xs text-accent">
              ◐ Focus mode — only urgent and needs-reply items are visible. Press <span className="kbd">f</span> to
              exit.
            </div>
          )}
          {children}
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {helpOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/70 p-6 backdrop-blur-sm"
          onClick={toggleHelp}
        >
          <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-lg font-bold">Keyboard shortcuts</h2>
            <ul className="mt-4 space-y-2">
              {SHORTCUTS.map(([k, d]) => (
                <li key={k} className="flex items-center justify-between text-sm">
                  <span className="text-muted">{d}</span>
                  <span className="kbd">{k}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
