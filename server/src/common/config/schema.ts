/**
 * Schema barrel: every module owns its own *.model.ts; this file re-exports
 * them all so Drizzle (and drizzle-kit) see one schema object.
 */
export * from "../../modules/auth/auth.model";
export * from "../../modules/connections/connections.model";
export * from "../../modules/inbox/inbox.model";
export * from "../../modules/tasks/tasks.model";
export * from "../../modules/labels/labels.model";
export * from "../../modules/integrations/integrations.model";
export * from "../../modules/command/command.model";
export * from "../../modules/catchup/catchup.model";
export * from "../../modules/webhooks/webhooks.model";
export * from "../models/activity.model";
