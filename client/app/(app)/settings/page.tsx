"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useMe } from "@/lib/hooks";
import { useToast } from "@/components/Toast";

export default function SettingsPage() {
  const { me } = useMe();
  const router = useRouter();
  const toast = useToast();

  async function logout() {
    await api.logout();
    toast("Signed out", "info");
    router.replace("/login");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-bold">Settings</h1>

      <section className="card mt-6 p-5">
        <h2 className="font-display text-sm font-semibold text-accent">Profile</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <Row k="Name" v={me?.name ?? "—"} />
          <Row k="Email" v={me?.email ?? "—"} />
          <Row k="Timezone" v={`${me?.timezone ?? "—"} (all times stored in UTC, rendered in your zone)`} />
        </dl>
      </section>

      <section className="card mt-5 p-5">
        <h2 className="font-display text-sm font-semibold text-accent">Rituals & reports</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <Row
            k="Weekly summary"
            v={me?.settings.weeklySummary ? "On — Mondays, with your Cost-of-Context stat" : "Off"}
          />
          <Row
            k="Shutdown ritual"
            v={`${me?.settings.shutdownRitualHour ?? 18}:00 — what you finished, what rolls over, drafts to approve`}
          />
          <Row
            k="Notification bundling"
            v={`Low-priority alerts batched every ${me?.settings.notificationBundleMinutes ?? 30} min`}
          />
        </dl>
      </section>

      <section className="card mt-5 p-5">
        <h2 className="font-display text-sm font-semibold text-accent">Connections & data</h2>
        <p className="mt-2 text-sm text-ink-300">
          Manage which services are connected. Disconnecting revokes the OAuth token and purges every cached entity for
          that provider — emails, events, messages, all of it.
        </p>
        <Link href="/connections" className="btn-ghost mt-3">
          Manage connections →
        </Link>
      </section>

      <section className="card mt-5 border-urgent/30 p-5">
        <h2 className="font-display text-sm font-semibold text-urgent">Session</h2>
        <button className="btn-danger mt-3" onClick={logout}>
          Sign out
        </button>
      </section>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-6">
      <dt className="shrink-0 text-ink-400">{k}</dt>
      <dd className="text-right text-ink-100">{v}</dd>
    </div>
  );
}
