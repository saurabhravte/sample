"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
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
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
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
];

function SidebarBody({
  onNavigate,
  collapsed,
  onToggleCollapse,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
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

      <div className="mt-3 space-y-1 border-t border-line pt-3">
        <Link
          href="/settings"
          onClick={onNavigate}
          title={collapsed ? "Settings" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            collapsed && "justify-center px-0",
            pathname.startsWith("/settings")
              ? "bg-[rgb(var(--active-bg))] text-[rgb(var(--active-fg))]"
              : "text-muted hover:bg-surface-2 hover:text-ink",
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && "Settings"}
        </Link>

        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink",
              collapsed && "justify-center px-0",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4 shrink-0" />
            ) : (
              <PanelLeftClose className="h-4 w-4 shrink-0" />
            )}
            {!collapsed && "Collapse"}
          </button>
        )}
      </div>
    </>
  );
}

/** Desktop rail — collapsible (collapse toggle now lives inside the rail). */
export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);
  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-line bg-surface p-4 transition-[width] duration-200 lg:flex",
        collapsed ? "w-[76px] items-stretch px-2" : "w-72",
      )}
    >
      <SidebarBody collapsed={collapsed} onToggleCollapse={toggle} />
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
