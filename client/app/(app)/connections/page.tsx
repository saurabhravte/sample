"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { Check, ExternalLink, Lock, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { useToast } from "@/components/Toast";
import { PROVIDER_META } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Slack + GitHub authenticate with a token (Corsair stores it encrypted with
 * the KEK envelope). Gmail + Calendar use OAuth — Corsair builds the consent
 * URL with a signed state and we redirect there.
 *
 * NOTE ON "ONE LINK": the chosen UX is Corsair's self-service connect link.
 * That API (`tenant.connectLink.create()`) lives in the HOSTED @corsair-dev/app
 * SDK. This repo's backend runs the SELF-HOSTED `corsair` SDK, which exposes
 * per-plugin OAuth via `generateOAuthUrl` instead. We deliver the same
 * single-flow experience (this stepped page drives every plugin) on top of the
 * SDK that's actually installed. See CHANGES.md for the hosted-SDK migration.
 */
const KEY_PROVIDERS: Record<string, { label: string; hint: string; placeholder: string; docs: string }> = {
  slack: {
    label: "Slack bot token",
    hint: "Create a Slack app → OAuth & Permissions → Bot User OAuth Token.",
    placeholder: "xoxb-…",
    docs: "https://api.slack.com/apps",
  },
  github: {
    label: "GitHub personal access token",
    hint: "Fine-grained token with repo + PR read is enough.",
    placeholder: "github_pat_…",
    docs: "https://github.com/settings/tokens",
  },
};

const ORDER = ["gmail", "googlecalendar", "slack", "github"] as const;

function KeyModal({ provider, onClose, onDone }: { provider: string; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const meta = KEY_PROVIDERS[provider]!;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ apiKey: string }>();

  const submit = handleSubmit(async ({ apiKey }) => {
    try {
      await api.connect(provider, apiKey.trim());
      toast(`${PROVIDER_META[provider].name} connected — token stored encrypted`, "success");
      onDone();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not store the token", "error");
    }
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/70 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <form className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2 className="font-display text-lg font-bold">Connect {PROVIDER_META[provider].name}</h2>
        <p className="mt-2 text-sm text-muted">{meta.hint}</p>
        <a
          href={meta.docs}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-xs text-accent hover:underline"
        >
          Where do I get this? <ExternalLink className="h-3 w-3" />
        </a>
        <label className="mt-4 block text-xs text-muted">{meta.label}</label>
        <input
          className="input mt-1"
          type="password"
          autoComplete="off"
          placeholder={meta.placeholder}
          {...register("apiKey", {
            required: "Token is required",
            minLength: { value: 8, message: "That token looks too short" },
            maxLength: { value: 512, message: "That token looks too long" },
          })}
        />
        {errors.apiKey && <p className="mt-1 text-xs text-urgent">{errors.apiKey.message}</p>}
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-faint">
          <Lock className="h-3 w-3" /> Encrypted at rest with the Corsair KEK envelope. Never logged.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-ghost !py-1.5 text-xs" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary !py-1.5 text-xs" disabled={isSubmitting}>
            {isSubmitting ? "Storing…" : "Connect"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ConnectionsInner() {
  const focus = useSearchParams().get("focus");
  const { data: conns, reload } = useAsync(() => api.connections());
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [keyModal, setKeyModal] = useState<string | null>(null);

  const connected: string[] = (conns ?? []).filter((c) => c.status === "connected").map((c) => c.provider);
  const doneCount = ORDER.filter((p) => connected.includes(p)).length;
  const currentStep = ORDER.find((p) => (p === "gmail" || p === "googlecalendar") && !connected.includes(p)) ?? null;

  async function connect(provider: string) {
    if (KEY_PROVIDERS[provider]) {
      setKeyModal(provider);
      return;
    }
    setBusy(provider);
    try {
      const { redirectUrl } = await api.connect(provider);
      if (redirectUrl) window.location.href = redirectUrl; // Corsair-built OAuth consent URL
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not start connection", "error");
      setBusy(null);
    }
  }

  async function disconnect(provider: string) {
    setBusy(provider);
    try {
      await api.disconnect(provider);
      toast(`${PROVIDER_META[provider].name} disconnected — credential wiped, cached data purged`, "success");
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Disconnect failed", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl animate-rise">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">Connect your tools</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Signing in only identifies you — nothing connects until you flip it on here. Each service asks for the minimum
          scopes, and disconnecting wipes the credential and purges everything cached.
        </p>
      </header>

      {/* progress */}
      <div className="card mb-6 flex items-center gap-4 p-4">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-sm font-semibold text-accent">
          {doneCount}/{ORDER.length}
        </div>
        <div className="flex-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${(doneCount / ORDER.length) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            {currentStep
              ? `Next step: connect ${PROVIDER_META[currentStep].name} to unlock your dashboard.`
              : "Core tools connected — Slack and GitHub are optional extras."}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {ORDER.map((key, i) => {
          const meta = PROVIDER_META[key];
          const on = connected.includes(key);
          const required = key === "gmail" || key === "googlecalendar";
          const isCurrent = currentStep === key;
          const highlight = focus === key;
          return (
            <div
              key={key}
              className={cn(
                "card relative p-5 transition",
                on && "border-accent/40",
                (isCurrent || highlight) && "ring-2 ring-accent/30",
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface-2 text-xl">{meta.icon}</span>
                  <div>
                    <h3 className="font-display font-semibold leading-none">{meta.name}</h3>
                    <span className="mt-1 inline-block text-[11px] text-faint">Step {i + 1}</span>
                  </div>
                </div>
                {on ? (
                  <span className="chip bg-fyi/15 text-fyi">
                    <Check className="h-3 w-3" /> connected
                  </span>
                ) : required ? (
                  <span className="chip bg-accent/15 text-accent">core</span>
                ) : (
                  <span className="chip bg-surface-2 text-muted">optional</span>
                )}
              </div>

              <p className="mt-3 text-sm text-muted">{meta.blurb}</p>
              <p className="mt-2 flex items-center gap-1 text-[11px] text-faint">
                <Lock className="h-3 w-3" /> {meta.scope}
              </p>

              <div className="mt-4">
                {on ? (
                  <button className="btn-danger w-full" onClick={() => disconnect(key)} disabled={busy === key}>
                    {busy === key ? "…" : "Disconnect & purge"}
                  </button>
                ) : (
                  <button
                    className={cn("w-full", isCurrent ? "btn-primary" : "btn-ghost")}
                    onClick={() => connect(key)}
                    disabled={busy === key}
                  >
                    {busy === key
                      ? "Redirecting…"
                      : KEY_PROVIDERS[key]
                        ? `Add ${meta.name} token`
                        : `Connect ${meta.name}`}
                    {!busy && isCurrent && <ArrowRight className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {keyModal && (
        <KeyModal
          provider={keyModal}
          onClose={() => setKeyModal(null)}
          onDone={async () => {
            setKeyModal(null);
            await reload();
          }}
        />
      )}
    </div>
  );
}

export default function ConnectionsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted">Loading connections…</div>}>
      <ConnectionsInner />
    </Suspense>
  );
}
