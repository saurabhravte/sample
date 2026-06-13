/** Calendar DTOs — zod request schemas shared end-to-end with the client. */
export { CreateEventRequest } from "@momentum/shared";

import { z } from "zod";

export const EventsRangeQuery = z.object({ from: z.string(), to: z.string() });
export const AvailabilityQuery = z.object({ days: z.coerce.number().min(1).max(14).default(3) });
