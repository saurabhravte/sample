import { z } from "zod";

/**
 * Base DTO helpers + the API envelope contract every endpoint follows.
 * Module DTOs live in modules/<name>/dto/ and compose these.
 */
export const IdParam = z.object({ id: z.string().min(1) });

export const PaginationQuery = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

// Envelope types are shared end-to-end with the client.
export type { ApiOk, ApiErr, ApiResponse } from "@momentum/shared";
