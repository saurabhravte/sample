"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutGrid,
  Inbox,
  Calendar,
  CheckSquare,
  Sun,
  GitPullRequest,
  Settings,
  Plug,
  Bot,
  Check,
  ArrowRight,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { api } from "@/lib/api";
import { useUiStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/workspace", label: "Work with AI", icon: Bot },
  { href: "/catch-up", label: "Catch Me Up", icon: Sun },
  { href: "/review", label: "Review queue", icon: GitPullRequest },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** Order matters: this is the "steps" the user follows to set up. */
const TOOLS = [
  { key: "gmail", name: "Gmail", core: true },
  { key: "googlecalendar", name: "Calendar", core: true },
  { key: "slack", name: "Slack", core: false },
  { key: "github", name: "GitHub", core: false },
] as const;

/**
 * The "connect your tools, with steps" panel that lives in the sidebar.
 * Reads real status from /api/connections; the first not-yet-connected core
 * tool is highlighted as the current step. Tapping a tool opens the full
 * Connections page where the Corsair-powered connect flow runs.
 */
function ConnectSteps({ onNavigate }: { onNavigate?: () => void }) {
  const [connected, setConnected] = useState<string[] | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .connections()
      .then((rows) => alive && setConnected(rows.filter((r) => r.status === "connected").map((r) => r.provider)))
      .catch(() => alive && setConnected([]));
    return () => {
      alive = false;
    };
  }, []);

  const isOn = (k: string) => connected?.includes(k) ?? false;
  const doneCount = connected ? TOOLS.filter((t) => isOn(t.key)).length : 0;
  const currentStep = TOOLS.find((t) => t.core && !isOn(t.key))?.key ?? null;

  return (
    <div className="rounded-2xl border border-line bg-bg p-3.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold">Connect your tools</p>
        <span className="text-[10px] text-muted">
          {doneCount}/{TOOLS.length}
        </span>
      </div>

      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${(doneCount / TOOLS.length) * 100}%` }}
        />
      </div>

      <ul className="mt-3 space-y-1">
        {TOOLS.map((t, i) => {
          const on = isOn(t.key);
          const isCurrent = currentStep === t.key;
          return (
            <li key={t.key}>
              <Link
                href={`/connections?focus=${t.key}`}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs transition-colors",
                  isCurrent ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-2 hover:text-ink",
                )}
              >
                <span
                  className={cn(
                    "grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] font-semibold",
                    on
                      ? "border-transparent bg-accent text-bg"
                      : isCurrent
                        ? "border-accent text-accent"
                        : "border-line text-faint",
                  )}
                >
                  {on ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span className="flex-1 font-medium">{t.name}</span>
                {on ? (
                  <span className="text-[10px] text-faint">Connected</span>
                ) : isCurrent ? (
                  <ArrowRight className="h-3.5 w-3.5" />
                ) : t.core ? (
                  <span className="text-[10px] text-faint">Core</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>

      <Link
        href="/connections"
        onClick={onNavigate}
        className="mt-3 block rounded-lg bg-ink px-3 py-2 text-center text-xs font-medium text-bg transition hover:opacity-90"
      >
        {doneCount === 0 ? "Start connecting" : "Manage connections"}
      </Link>
    </div>
  );
}

function SidebarBody({ onNavigate, collapsed }: { onNavigate?: () => void; collapsed?: boolean }) {
  const pathname = usePathname();
  return (
    <>
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className={cn("mb-7 flex items-center gap-2 px-2 font-semibold", collapsed && "justify-center px-0")}
      >
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-bg">
          <Logo className="h-4 w-auto" />
        </span>
        {!collapsed && "Momentum"}
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                collapsed && "justify-center px-0",
                active ? "bg-[rgb(var(--active-bg))] text-[rgb(var(--active-fg))]" : "text-muted hover:bg-surface-2 hover:text-ink",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && item.label}
            </Link>
          );
        })}

        <div className="my-3 h-px bg-line" />

        <Link
          href="/connections"
          onClick={onNavigate}
          title={collapsed ? "Connections" : undefined}
          className={cn(
            "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            collapsed && "justify-center px-0",
            pathname.startsWith("/connections")
              ? "bg-[rgb(var(--active-bg))] text-[rgb(var(--active-fg))]"
              : "text-muted hover:bg-surface-2 hover:text-ink",
          )}
        >
          <span className="flex items-center gap-3">
            <Plug className="h-4 w-4 shrink-0" />
            {!collapsed && "Connections"}
          </span>
          {!collapsed && (
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">Setup</span>
          )}
        </Link>
      </nav>

      {!collapsed && (
        <div className="mt-4">
          <ConnectSteps onNavigate={onNavigate} />
        </div>
      )}
    </>
  );
}

/** Desktop rail — collapsible (Fix #9). */
export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);
  return (
    <aside
      className={cn(
        "relative hidden shrink-0 flex-col border-r border-line bg-surface p-4 transition-[width] duration-200 lg:flex",
        collapsed ? "w-[76px] items-center px-2" : "w-72",
      )}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-6 z-10 grid h-6 w-6 place-items-center rounded-full border border-line bg-bg text-muted shadow-soft hover:text-ink"
      >
        {collapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
      </button>
      <SidebarBody collapsed={collapsed} />
    </aside>
  );
}

/** Mobile slide-over drawer. */
export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col border-r border-line bg-surface p-4 shadow-soft-lg animate-rise">
        <button
          onClick={onClose}
          aria-label="Close menu"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
        <SidebarBody onNavigate={onClose} />
      </aside>
    </div>
  );
}
