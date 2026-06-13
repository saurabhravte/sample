"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { MeDto } from "@momentum/shared";
import { api, ApiError } from "./api";

/** Load the current user; redirect to /login on 401. */
export function useMe() {
  const [me, setMe] = useState<MeDto | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  useEffect(() => {
    api
      .me()
      .then(setMe)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) router.replace("/login");
      })
      .finally(() => setLoading(false));
  }, [router]);
  return { me, loading };
}

/** Tiny SWR-lite: load once, expose reload(). */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    return fnRef
      .current()
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Something went wrong"))
      .finally(() => setLoading(false));
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void reload(), deps);
  return { data, error, loading, reload, setData };
}

type ShortcutMap = Record<string, (e: KeyboardEvent) => void>;

/**
 * Power-user keys. Keys like "g i" are two-step sequences (Gmail style);
 * "mod+k" means Cmd/Ctrl+K. Ignores keystrokes while typing in inputs,
 * except mod+ combos.
 */
export function useShortcuts(map: ShortcutMap) {
  const pending = useRef<string | null>(null);
  const timer = useRef<number>();
  const mapRef = useRef(map);
  mapRef.current = map;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const inField =
        (e.target as HTMLElement)?.tagName === "INPUT" ||
        (e.target as HTMLElement)?.tagName === "TEXTAREA" ||
        (e.target as HTMLElement)?.isContentEditable;

      if (mod) {
        const combo = `mod+${e.key.toLowerCase()}`;
        if (mapRef.current[combo]) {
          e.preventDefault();
          mapRef.current[combo](e);
        }
        return;
      }
      if (inField) return;

      const k = e.key.toLowerCase();
      if (pending.current) {
        const seq = `${pending.current} ${k}`;
        pending.current = null;
        window.clearTimeout(timer.current);
        if (mapRef.current[seq]) {
          e.preventDefault();
          mapRef.current[seq](e);
          return;
        }
      }
      if (k === "g") {
        pending.current = "g";
        timer.current = window.setTimeout(() => (pending.current = null), 900);
        return;
      }
      if (mapRef.current[k]) {
        e.preventDefault();
        mapRef.current[k](e);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

/**
 * Dual-auth gate. The app supports BOTH a custom email/password session
 * (Express, drives all /api data) and Clerk. A user is "in" if either is
 * present. We do NOT auto-redirect here — the shell decides — so a Clerk
 * user is never bounced to /login just because they lack an Express session.
 *
 * NOTE: the Express backend authenticates its own session. To let a Clerk
 * session also drive backend data, verify the Clerk JWT in
 * server/src/modules/auth/auth.middleware.ts (see CHANGES.md).
 */

export function useAuthGate() {
  const [me, setMe] = useState<MeDto | null>(null);
  const [meChecked, setMeChecked] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .me()
      .then((u) => alive && setMe(u))
      .catch(() => alive && setMe(null))
      .finally(() => alive && setMeChecked(true));
    return () => {
      alive = false;
    };
  }, []);

  // Auth must match what the API enforces: the Express session cookie.
  // A Clerk session alone does NOT authenticate /api calls, so we don't treat
  // it as authed here — otherwise the app lets you in while every request 401s
  // with "Session expired".
  const loading = !meChecked;
  const authed = Boolean(me);
  return { loading, authed, me, clerkSignedIn: false };
}
