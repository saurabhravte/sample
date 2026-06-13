/** Inbox DTOs — zod request schemas shared end-to-end with the client. */
export { DraftReplyRequest, ReminderRequest, SendEmailRequest, SnoozeRequest } from "@momentum/shared";

import { z } from "zod";

export const InboxListQuery = z.object({
  priority: z.string().optional(),
  label: z.string().optional(),
  limit: z.coerce.number().max(100).optional(),
});
