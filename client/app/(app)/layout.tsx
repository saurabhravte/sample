import { AppShell } from "@/components/dashboard/app-shell";

/**
 * All feature pages (inbox, calendar, tasks, review, catch-up, settings)
 * now share the exact same shell as /dashboard. No more second sidebar.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
