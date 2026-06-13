import { z } from "zod";

export const SlackToTaskDto = z.object({
  text: z.string().min(1).max(500),
  ref: z.string().optional(),
});

export const IssueFromEmailDto = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  subject: z.string().min(1),
  snippet: z.string().default(""),
  threadId: z.string().optional(),
});
