"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * TanStack Query provider (item 11). Wrap the app in this (added to layout.tsx).
 * Migrate data hooks gradually: replace `useFetch`/`useAsync` call-sites with
 * `useQuery`, and mutations (createTask, updateTask, connect/disconnect) with
 * `useMutation` + queryClient.invalidateQueries. See lib/queries.ts for keys.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
