"use client";

import type {
  ApiResponse,
  CatchUpResponse,
  CommandResponse,
  ConnectionDto,
  EmailSummaryDto,
  EventDto,
  MeDto,
  ProposedAction,
  SearchHit,
  TaskDto,
} from "@momentum/shared";

/**
 * All requests go to /api/* — Next.js rewrites proxy to the Express server
 * in dev; in prod, put both behind the same origin (reverse proxy) or set
 * NEXT_PUBLIC_API_URL. Cookies always sent (httpOnly session).
 */
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  let body: ApiResponse<T>;
  try {
    body = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError("bad_response", "Unexpected server response", res.status);
  }
  if (!body.success) throw new ApiError(body.error.code, body.error.message ?? body.message, res.status);
  return body.data;
}

const get = <T>(p: string) => call<T>(p);
const post = <T>(p: string, data?: unknown) =>
  call<T>(p, { method: "POST", body: data === undefined ? undefined : JSON.stringify(data) });
const patch = <T>(p: string, data: unknown) => call<T>(p, { method: "PATCH", body: JSON.stringify(data) });

export const api = {
  // auth
  me: () => get<MeDto>("/auth/me"),
  register: (d: { email: string; password: string; name: string }) => post<MeDto>("/auth/register", d),
  login: (d: { email: string; password: string }) => post<MeDto>("/auth/login", d),
  logout: () => post<null>("/auth/logout"),
  googleLoginUrl: () => `${BASE}/api/auth/google`,

  // connections (consent-first)
  connections: () => get<ConnectionDto[]>("/connections"),
  connect: (provider: string, apiKey?: string) =>
    post<{ redirectUrl: string | null; needsKey: boolean }>(
      `/connections/${provider}/connect`,
      apiKey ? { apiKey } : {},
    ),
  disconnect: (provider: string) => post<null>(`/connections/${provider}/disconnect`),

  // inbox
  syncInbox: () => post<{ synced: number }>("/inbox/sync"),
  inbox: (q?: { priority?: string; label?: string }) => {
    const s = new URLSearchParams();
    if (q?.priority) s.set("priority", q.priority);
    if (q?.label) s.set("label", q.label);
    const qs = s.toString();
    return get<EmailSummaryDto[]>(`/inbox${qs ? `?${qs}` : ""}`);
  },
  thread: (threadId: string) =>
    get<{
      messages: { id: string; from: string; date: string; html: string | null; text: string }[];
      subject: string;
      meetingHint: { title: string; start: string; attendees: string[] } | null;
    }>(`/inbox/thread/${encodeURIComponent(threadId)}`),
  snooze: (d: { emailId: string; until: string }) => post<null>("/inbox/snooze", d),
  reminder: (d: { threadId: string; remindAt: string; note?: string }) => post<null>("/inbox/reminder", d),
  draftReply: (d: { threadId: string; tone?: string; instructions?: string }) =>
    post<{ draft: string }>("/inbox/draft-reply", d),
  followUp: (threadId: string) => post<{ draft: string }>(`/inbox/follow-up/${encodeURIComponent(threadId)}`),
  followUps: () => get<EmailSummaryDto[]>("/inbox/follow-ups"),
  send: (d: { to: string[]; subject: string; body: string; threadId?: string; delaySeconds?: number }) =>
    post<{ jobId: string; undoUntil: string }>("/inbox/send", d),
  undoSend: (jobId: string) => post<null>(`/inbox/send/${jobId}/undo`),
  extractTasks: (threadId: string) => post<TaskDto[]>(`/inbox/extract-tasks/${encodeURIComponent(threadId)}`),

  // calendar
  events: (range?: { from?: string; to?: string }) => {
    const s = new URLSearchParams(range as Record<string, string>);
    const qs = s.toString();
    return get<EventDto[]>(`/calendar/events${qs ? `?${qs}` : ""}`);
  },
  createEvent: (d: { title: string; start: string; end: string; attendees?: string[]; description?: string }) =>
    post<EventDto>("/calendar/events", d),
  brief: (eventId: string) =>
    get<{ event: EventDto; attendees: string[]; recentEmails: SearchHit[]; talkingPoints: string[] }>(
      `/calendar/events/${encodeURIComponent(eventId)}/brief`,
    ),
  availability: () => get<{ slots: { start: string; end: string }[]; text: string }>("/calendar/availability"),

  // catch up
  catchUp: (hours?: number) => get<CatchUpResponse>(`/catch-up${hours ? `?hours=${hours}` : ""}`),
  contextStats: () =>
    get<{ switches: number; bundled: number; interruptionsSaved: number; week: string }>("/catch-up/context-stats"),

  // command bar / agent
  command: (text: string) => post<CommandResponse>("/command", { text }),
  proposals: () => get<ProposedAction[]>("/command/actions"),
  decide: (id: string, decision: "approve" | "reject") => post<ProposedAction>(`/command/actions/${id}/${decision}`),

  // search
  search: (d: {
    mode: "local" | "gmail";
    q?: string;
    from?: string;
    to?: string;
    hasAttachment?: boolean;
    after?: string;
    before?: string;
    label?: string;
  }) =>
    post<{
      engine: string;
      tookMs?: number;
      hits?: SearchHit[];
      query?: string;
      result?: unknown;
    }>("/search", d),

  // tasks + activity
  tasks: () => get<TaskDto[]>("/tasks"),
  createTask: (d: { title: string; due?: string }) => post<TaskDto>("/tasks", { ...d, source: "manual" }),
  updateTask: (id: string, status: "todo" | "doing" | "done") => patch<TaskDto>(`/tasks/${id}`, { status }),
  editTask: (id: string, d: { title?: string; due?: string | null; labelIds?: string[] }) =>
    patch<TaskDto>(`/tasks/${id}`, d),

  // labels (presets + custom)
  labels: () => get<{ id: string; name: string; color: string; isPreset: boolean }[]>("/labels"),
  createLabel: (d: { name: string; color: string }) =>
    post<{ id: string; name: string; color: string; isPreset: boolean }>("/labels", d),
  deleteLabel: (id: string) => call<{ deleted: string }>(`/labels/${id}`, { method: "DELETE" }),
  activity: () => get<{ id: string; action: string; summary: string; at: string }[]>("/tasks/activity"),

  // integrations
  slackChannels: () => get<{ channelId: string; name: string; members: number }[]>("/integrations/slack/unread"),
  slackCatchUp: (channelId: string) =>
    post<{ summary: string; actionItems: string[] }>(`/integrations/slack/catch-up/${channelId}`),
  slackToTask: (d: { channelId: string; ts: string; text: string }) =>
    post<{ id: string }>("/integrations/slack/to-task", d),
  reviewQueue: () =>
    get<{
      briefing: string;
      prs: { id: string; title: string; url: string; repo: string; updatedAt: string | null }[];
    }>("/integrations/github/review-queue"),
  emailToIssue: (d: { threadId: string; owner: string; repo: string }) =>
    post<{ htmlUrl?: string; number?: number }>("/integrations/github/issue-from-email", d),
};
export type ApiEnvelope<T> = {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
};

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, { credentials: "include", signal });
  const json = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!res.ok || !json?.success) {
    throw new Error(json?.message ?? `Request failed (${res.status})`);
  }
  return json.data;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!res.ok || !json?.success) {
    throw new Error(json?.message ?? `Request failed (${res.status})`);
  }
  return json.data;
}
