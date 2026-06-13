"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

type State<T> = { data?: T; error?: string; loading: boolean };

/** Tiny data hook: loading / error / data, with a reload(). Pass null to skip. */
export function useFetch<T>(path: string | null) {
  const [state, setState] = useState<State<T>>({ loading: Boolean(path) });

  const load = useCallback(
    (signal?: AbortSignal) => {
      if (!path) return;
      setState((s) => ({ ...s, loading: true, error: undefined }));
      apiGet<T>(path, signal)
        .then((data) => setState({ data, loading: false }))
        .catch((err: Error) => {
          if (err.name === "AbortError") return;
          setState({ error: err.message, loading: false });
        });
    },
    [path],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  return { ...state, reload: () => load() };
}
