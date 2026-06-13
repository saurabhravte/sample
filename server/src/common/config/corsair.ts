import { createCorsair } from "corsair";
import { gmail } from "@corsair-dev/gmail";
import { googlecalendar } from "@corsair-dev/googlecalendar";
import { slack } from "@corsair-dev/slack";
import { github } from "@corsair-dev/github";
import { pool } from "./db";
import { env } from "./env";

/**
 * THE decision that prevents user A reading user B's mail:
 * multiTenancy: true + corsair.withTenant(userId) on EVERY call path.
 *
 * Corsair gets the raw pg Pool (not the Drizzle client) per the docs;
 * app tables live in Drizzle on the same pool.
 */
export const corsair = createCorsair({
  plugins: [gmail(), googlecalendar(), slack(), github()],
  database: pool,
  kek: env.CORSAIR_KEK,
  multiTenancy: true,
});

/** Tenant-scoped handle. Never construct Corsair calls without this. */
export function corsairFor(userId: string) {
  return corsair.withTenant(userId);
}
export type TenantCorsair = ReturnType<typeof corsairFor>;

/* ── Webhook dispatch ───────────────────────────────────────────────────── */

type RawWebhook = { headers: Record<string, string | string[] | undefined>; body: unknown };
type BoundHook = {
  match: (r: RawWebhook) => boolean;
  handler: (req: { payload: unknown; headers: RawWebhook["headers"]; rawBody?: string }) => Promise<unknown>;
};

const PLUGIN_IDS = ["gmail", "googlecalendar", "slack", "github"] as const;

function* walkHooks(tree: Record<string, unknown>): Generator<BoundHook> {
  for (const node of Object.values(tree)) {
    if (!node || typeof node !== "object") continue;
    const n = node as Partial<BoundHook> & Record<string, unknown>;
    if (typeof n.match === "function" && typeof n.handler === "function") yield n as BoundHook;
    else yield* walkHooks(n as Record<string, unknown>);
  }
}

/**
 * Route a raw provider webhook into the matching Corsair plugin handler for
 * one tenant. Each bound handler verifies + upserts into Corsair's entity
 * cache; we return the handler results so callers can run derived pipelines.
 */
export async function dispatchProviderWebhook(userId: string, raw: RawWebhook, rawBody?: string) {
  const tenant = corsairFor(userId) as unknown as Record<
    string,
    { webhooks?: Record<string, unknown>; pluginWebhookMatcher?: (r: RawWebhook) => boolean }
  >;
  const results: Array<{ plugin: string; result: unknown }> = [];
  for (const plugin of PLUGIN_IDS) {
    const ns = tenant[plugin];
    if (!ns?.webhooks) continue;
    if (ns.pluginWebhookMatcher && !ns.pluginWebhookMatcher(raw)) continue;
    for (const hook of walkHooks(ns.webhooks)) {
      if (!hook.match(raw)) continue;
      results.push({ plugin, result: await hook.handler({ payload: raw.body, headers: raw.headers, rawBody }) });
    }
  }
  return results;
}
