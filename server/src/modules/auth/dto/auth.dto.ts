/**
 * Auth DTOs. The zod schemas are shared end-to-end (the Next.js client
 * validates the same shapes with react-hook-form), so the source of truth
 * lives in @momentum/shared and is re-exported here as the module's DTO.
 */
export { LoginRequest, RegisterRequest } from "@momentum/shared";
