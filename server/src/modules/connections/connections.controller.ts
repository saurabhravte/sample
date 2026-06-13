import type { Request, Response } from "express";
import { nanoid } from "nanoid";
import { and, eq } from "drizzle-orm";
import { generateOAuthUrl, processOAuthCallback } from "corsair/oauth";
import { OAuthCallbackQuery, Provider } from "./dto/connections.dto";
import { db, pool, schema } from "../../common/config/db";
import { corsair, corsairFor } from "../../common/config/corsair";
import { env } from "../../common/config/env";
import { OAUTH_PROVIDERS } from "../../common/constants";
import { ApiError } from "../../common/utils/apiError";
import { sendResponse } from "../../common/utils/apiResponse";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { logActivity } from "../../common/services/activity.service";

/**
 * Consent-first connections. Logging in with Google gives Momentum NOTHING but
 * identity. Each integration is connected here, one at a time, with its own
 * minimal credential via Corsair — and can be disconnected, which wipes the
 * stored credential and deletes cached entities for that account.
 *
 * Real Corsair surface used here:
 *  - generateOAuthUrl(corsair, plugin, { tenantId, redirectUri })  (gmail, googlecalendar)
 *  - processOAuthCallback(corsair, { code, state, redirectUri })   (shared callback — state is HMAC-signed and carries plugin + tenant)
 *  - tenant.<plugin>.keys.set_api_key(...)                         (slack bot token, github PAT)
 *  - corsair.manage.connectionStatus.get({ tenantId })             (source of truth for "connected")
 */
const REDIRECT_URI = `${env.API_ORIGIN}/api/connections/callback`;

async function upsertConnection(
  userId: string,
  provider: string,
  patch: Partial<typeof schema.connections.$inferInsert>,
) {
  await db
    .insert(schema.connections)
    .values({ id: nanoid(), userId, provider, ...patch })
    .onConflictDoUpdate({
      target: [schema.connections.userId, schema.connections.provider],
      set: patch,
    });
}

export const listConnections = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const [rows, status] = await Promise.all([
    db.select().from(schema.connections).where(eq(schema.connections.userId, userId)),
    // Corsair's own view of which plugins hold credentials for this tenant.
    corsair.manage.connectionStatus.get({ tenantId: userId }).catch(() => ({}) as Record<string, string>),
  ]);
  const byProvider = new Map(rows.map((r) => [r.provider, r]));
  const all = Provider.options.map((p) => {
    const r = byProvider.get(p);
    const corsairState = (status as Record<string, string>)[p];
    const connected = corsairState === "connected" || r?.status === "connected";
    return {
      provider: p,
      status: connected ? "connected" : (r?.status ?? "disconnected"),
      accountLabel: r?.accountLabel ?? null,
      connectedAt: r?.connectedAt?.toISOString() ?? null,
    };
  });
  sendResponse(res, 200, all);
});

/**
 * Begin connecting one provider.
 *  - OAuth plugins → returns the provider consent URL (Corsair builds it with
 *    a signed state carrying { plugin, tenantId }).
 *  - API-key plugins (slack bot token, github PAT) → expects { apiKey } in the
 *    body and stores it encrypted (KEK envelope) via the Corsair key manager.
 */
export const connectProvider = asyncHandler(async (req: Request, res: Response) => {
  const provider = Provider.parse(req.params.provider);
  const userId = req.user!.id;

  if (OAUTH_PROVIDERS.has(provider)) {
    const { url } = await generateOAuthUrl(corsair, provider, {
      tenantId: userId,
      redirectUri: REDIRECT_URI,
    });
    await upsertConnection(userId, provider, { status: "connecting" });
    return sendResponse(res, 200, { redirectUrl: url, needsKey: false });
  }

  // slack / github: API-key auth — no redirect, just store the key.
  if (!req.body.apiKey) {
    return sendResponse(res, 200, { redirectUrl: null, needsKey: true });
  }
  const tenant = corsairFor(userId) as unknown as Record<
    string,
    { keys: { set_api_key: (v: string | null) => Promise<void> } }
  >;
  await tenant[provider]!.keys.set_api_key(req.body.apiKey);
  await upsertConnection(userId, provider, { status: "connected", connectedAt: new Date() });
  await logActivity(userId, "user", "connection.connected", `Connected ${provider}`);
  sendResponse(res, 200, { redirectUrl: null, needsKey: false }, "Connected");
});

/**
 * Shared OAuth callback for all OAuth plugins. The HMAC-signed `state`
 * identifies plugin + tenant; we additionally require it to match the
 * logged-in session so a callback can never attach tokens to someone else.
 */
export const oauthCallback = asyncHandler(async (req: Request, res: Response) => {
  const q = OAuthCallbackQuery.parse(req.query);
  const { plugin, tenantId } = await processOAuthCallback(corsair, {
    code: q.code,
    state: q.state,
    redirectUri: REDIRECT_URI,
  });
  if (tenantId !== req.user!.id) throw ApiError.forbidden("OAuth state does not match session");

  await upsertConnection(tenantId, plugin, { status: "connected", connectedAt: new Date() });
  await logActivity(tenantId, "user", "connection.connected", `Connected ${plugin}`);
  res.redirect(`${env.WEB_ORIGIN}/connections?connected=${encodeURIComponent(plugin)}`);
});

/** Disconnect = wipe stored credential + delete cached entities. The inverse of consent. */
export const disconnectProvider = asyncHandler(async (req: Request, res: Response) => {
  const provider = Provider.parse(req.params.provider);
  const userId = req.user!.id;
  const tenant = corsairFor(userId) as unknown as Record<
    string,
    { keys: Record<string, (v: string | null) => Promise<void>> }
  >;

  // 1) Null every credential field for this account (encrypted at rest, now gone).
  const keys = tenant[provider]?.keys ?? {};
  const fields = OAUTH_PROVIDERS.has(provider)
    ? ["set_access_token", "set_refresh_token", "set_expires_at", "set_scope"]
    : ["set_api_key"];
  for (const f of fields) {
    try {
      await keys[f]?.(null);
    } catch {
      /* account may never have connected */
    }
  }

  // 2) Purge Corsair's cached entities + events for this tenant+integration.
  const purge = `
    DELETE FROM %TABLE% WHERE account_id IN (
      SELECT a.id FROM corsair_accounts a
      JOIN corsair_integrations i ON i.id = a.integration_id
      WHERE a.tenant_id = $1 AND i.name = $2
    )`;
  await pool.query(purge.replace("%TABLE%", "corsair_entities"), [userId, provider]).catch(() => {});
  await pool.query(purge.replace("%TABLE%", "corsair_events"), [userId, provider]).catch(() => {});

  // 3) Purge our derived data for the provider.
  if (provider === "gmail") {
    await db.delete(schema.emailMeta).where(eq(schema.emailMeta.userId, userId));
  }

  await db
    .update(schema.connections)
    .set({ status: "disconnected", corsairAccountId: null, accountLabel: null, connectedAt: null })
    .where(and(eq(schema.connections.userId, userId), eq(schema.connections.provider, provider)));
  await logActivity(userId, "user", "connection.disconnected", `Disconnected ${provider} and removed cached data`);
  sendResponse(res, 200, { disconnected: provider }, "Disconnected");
});
