import { z } from "zod";

/* ───────────────────────── Providers & connections ──────────────────── */

export const Provider = z.enum(["gmail", "googlecalendar", "slack", "github"]);
export type Provider = z.infer<typeof Provider>;

export const ConnectionStatus = z.enum(["disconnected", "connecting", "connected", "error"]);

export const ConnectionDto = z.object({
  provider: Provider,
  status: ConnectionStatus,
  accountLabel: z.string().nullable(),
  connectedAt: z.string().datetime().nullable(),
});
export type ConnectionDto = z.infer<typeof ConnectionDto>;

/* ───────────────────────── Email ─────────────────────────────────────── */

export const EmailPriority = z.enum(["urgent", "needs_reply", "waiting", "fyi", "newsletter"]);
export type EmailPriority = z.infer<typeof EmailPriority>;

export const SmartLabel = z.enum(["client", "invoice", "interview", "project", "none"]);
export type SmartLabel = z.infer<typeof SmartLabel>;

export const TriageDecision = z.enum(["important", "needs_reply", "ignore"]);

export const EmailSummaryDto = z.object({
  id: z.string(),
  threadId: z.string(),
  from: z.string(),
  to: z.array(z.string()).default([]),
  subject: z.string(),
  snippet: z.string(),
  receivedAt: z.string(),
  unread: z.boolean(),
  priority: EmailPriority.nullable(),
  smartLabel: SmartLabel.nullable(),
  snoozedUntil: z.string().nullable(),
  hasReminder: z.boolean().default(false),
});
export type EmailSummaryDto = z.infer<typeof EmailSummaryDto>;

export const SnoozeRequest = z.object({
  emailId: z.string().min(1),
  threadId: z.string().min(1),
  until: z.string().datetime(), // UTC ISO; client converts from user tz
});

export const ReminderRequest = z.object({
  emailId: z.string().min(1),
  threadId: z.string().min(1),
  remindAt: z.string().datetime(),
  note: z.string().max(500).optional(),
});

export const DraftReplyRequest = z.object({
  threadId: z.string().min(1),
  tone: z.enum(["neutral", "friendly", "formal", "brief"]).default("neutral"),
  instruction: z.string().max(1000).optional(),
});

export const SendEmailRequest = z.object({
  to: z.array(z.string().email()).min(1),
  cc: z.array(z.string().email()).default([]),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(50_000),
  threadId: z.string().optional(),
  // Undo-send: server holds the email for `delaySeconds` before dispatch.
  delaySeconds: z.number().int().min(0).max(120).default(30),
});

/* ───────────────────────── Calendar ─────────────────────────────────── */

export const CreateEventRequest = z.object({
  title: z.string().min(1).max(300),
  start: z.string().datetime(),
  end: z.string().datetime(),
  attendees: z.array(z.string().email()).default([]),
  description: z.string().max(5000).optional(),
  sourceThreadId: z.string().optional(), // for Email → Event chips
});

export const EventDto = z.object({
  id: z.string(),
  title: z.string(),
  start: z.string(),
  end: z.string(),
  attendees: z.array(z.string()).default([]),
  conflict: z.boolean().default(false),
  meetLink: z.string().nullable().optional(),
});
export type EventDto = z.infer<typeof EventDto>;

/* ───────────────────────── Tasks / unified board ─────────────────────── */

export const TaskSource = z.enum(["email", "slack", "github", "manual", "agent"]);
export const TaskStatus = z.enum(["todo", "doing", "done"]);

export const TaskDto = z.object({
  id: z.string(),
  title: z.string(),
  source: TaskSource,
  sourceRef: z.string().nullable(),
  due: z.string().nullable(),
  status: TaskStatus,
  createdAt: z.string(),
});
export type TaskDto = z.infer<typeof TaskDto>;

/* ───────────────────────── Catch Me Up ──────────────────────────────── */

export const CatchUpItem = z.object({
  id: z.string(),
  kind: z.enum(["email", "slack", "github_pr", "github_issue", "calendar"]),
  urgency: z.number().min(0).max(100),
  title: z.string(),
  summary: z.string(),
  occurredAt: z.string(),
  actions: z.array(z.enum(["reply", "snooze", "task", "open", "approve_draft"])),
  ref: z.record(z.string(), z.string()).default({}),
});
export type CatchUpItem = z.infer<typeof CatchUpItem>;

export const CatchUpResponse = z.object({
  since: z.string(),
  headline: z.string(),
  items: z.array(CatchUpItem),
  stats: z.object({
    emails: z.number(),
    slackThreads: z.number(),
    prs: z.number(),
    meetingsToday: z.number(),
  }),
});
export type CatchUpResponse = z.infer<typeof CatchUpResponse>;

/* ───────────────────────── Command bar / agent ──────────────────────── */

export const CommandRequest = z.object({
  input: z.string().min(1).max(2000),
});

// Every side-effectful action the agent proposes lands here first.
export const ProposedAction = z.object({
  id: z.string(),
  kind: z.enum(["send_email", "create_event", "update_event", "slack_post", "github_create_issue"]),
  description: z.string(),
  payload: z.record(z.string(), z.unknown()),
  status: z.enum(["pending", "approved", "rejected", "executed", "failed"]),
  createdAt: z.string(),
});
export type ProposedAction = z.infer<typeof ProposedAction>;

export const CommandResponse = z.object({
  reply: z.string(),
  proposals: z.array(ProposedAction),
});
export type CommandResponse = z.infer<typeof CommandResponse>;

/* ───────────────────────── Search ───────────────────────────────────── */

export const SearchRequest = z.object({
  q: z.string().min(1).max(500),
  mode: z.enum(["local", "gmail"]).default("local"),
  // structured Gmail advanced-search builder fields
  from: z.string().optional(),
  to: z.string().optional(),
  hasAttachment: z.boolean().optional(),
  after: z.string().optional(),
  before: z.string().optional(),
  label: z.string().optional(),
});

export const SearchHit = z.object({
  id: z.string(),
  kind: z.enum(["email", "event"]),
  title: z.string(),
  snippet: z.string(),
  occurredAt: z.string(),
  score: z.number(),
});
export type SearchHit = z.infer<typeof SearchHit>;

/* ───────────────────────── Auth ─────────────────────────────────────── */

export const RegisterRequest = z.object({
  email: z.string().email(),
  password: z.string().min(10).max(200),
  name: z.string().min(1).max(120),
  timezone: z.string().default("UTC"), // IANA
});

export const LoginRequest = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const MeDto = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  timezone: z.string(),
  settings: z.object({
    weeklySummary: z.boolean(),
    shutdownRitualHour: z.number().min(0).max(23),
    notificationBundleMinutes: z.number(),
  }),
});
export type MeDto = z.infer<typeof MeDto>;

/* ───────────────────────── API envelope ─────────────────────────────── */

export type ApiOk<T> = { success: true; statusCode: number; message: string; data: T };
export type ApiErr = {
  success: false;
  statusCode: number;
  message: string;
  error: { code: string; message: string };
  errors?: unknown[];
};
export type ApiResponse<T> = ApiOk<T> | ApiErr;
