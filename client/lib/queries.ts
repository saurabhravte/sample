"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ConnectionDto, TaskDto } from "@momentum/shared";
import { api } from "@/lib/api";

/** Central query keys so invalidation stays consistent. */
export const qk = {
  connections: ["connections"] as const,
  tasks: ["tasks"] as const,
  activity: ["activity"] as const,
  overview: ["overview"] as const,
};

/* ---- Example migrations. Use these in place of useFetch/useAsync. ---- */

export function useConnections() {
  return useQuery<ConnectionDto[]>({ queryKey: qk.connections, queryFn: () => api.connections() });
}

export function useTasks() {
  return useQuery<TaskDto[]>({ queryKey: qk.tasks, queryFn: () => api.tasks() });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: { title: string; due?: string }) => api.createTask(d),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.tasks }),
  });
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskDto["status"] }) => api.updateTask(id, status),
    // optimistic update for the smooth experience the todo asks for
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: qk.tasks });
      const prev = qc.getQueryData<TaskDto[]>(qk.tasks);
      qc.setQueryData<TaskDto[]>(qk.tasks, (old) => old?.map((t) => (t.id === id ? { ...t, status } : t)) ?? []);
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(qk.tasks, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.tasks }),
  });
}

export function useConnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ provider, apiKey }: { provider: string; apiKey?: string }) => api.connect(provider, apiKey),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.connections }),
  });
}

export function useDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (provider: string) => api.disconnect(provider),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.connections }),
  });
}
