"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Command, Menu, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useUiStore } from "@/lib/store";
import { api } from "@/lib/api";
import { getGreeting } from "@/lib/greeting";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { user, isSignedIn } = useUser();
  const togglePalette = useUiStore((s) => s.togglePalette);
  const router = useRouter();

  const displayName = user?.fullName || user?.firstName || user?.username || "there";

  // Compute the greeting on the client only, so SSR/CSR can't disagree.
  const [greeting, setGreeting] = useState<string>("Welcome back");
  useEffect(() => {
    setGreeting(getGreeting());
    // Refresh if the tab stays open across a time boundary.
    const id = setInterval(() => setGreeting(getGreeting()), 60_000);
    return () => clearInterval(id);
  }, []);

  async function customLogout() {
    try {
      await api.logout();
    } catch {
      /* ignore */
    }
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-bg/80 px-4 py-3 backdrop-blur-xl sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Open menu"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="hidden text-xs text-muted sm:block">{greeting},</p>
          <h1 className="truncate text-base font-semibold leading-tight sm:text-lg">{displayName}</h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={togglePalette}
          className="hidden items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-muted transition hover:text-ink sm:flex"
        >
          <span>Quick actions</span>
          <kbd className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
        </button>

        <button
          type="button"
          onClick={togglePalette}
          aria-label="Quick actions"
          className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-muted hover:text-ink sm:hidden"
        >
          <Command className="h-4 w-4" />
        </button>

        <ThemeToggle />

        {isSignedIn ? (
          <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "h-9 w-9" } }} />
        ) : (
          <button
            type="button"
            onClick={customLogout}
            aria-label="Sign out"
            className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-muted hover:text-ink"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </header>
  );
}
