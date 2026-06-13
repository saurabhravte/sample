import type { NextFunction, Request, Response } from "express";
import { and, eq, gt } from "drizzle-orm";
import { db, schema } from "../../common/config/db";
import { ApiError } from "../../common/utils/apiError";
import { SESSION_COOKIE } from "../../common/constants";

/**
 * Tenant identity is derived from the session cookie ONLY.
 * We never accept a userId/tenantId from the client.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return next(ApiError.unauthorized());

  const rows = await db
    .select({
      userId: schema.sessions.userId,
      email: schema.users.email,
      name: schema.users.name,
      timezone: schema.users.timezone,
      settings: schema.users.settings,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, token), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);

  const row = rows[0];
  if (!row) return next(ApiError.unauthorized("Session expired"));
  req.user = {
    id: row.userId,
    email: row.email,
    name: row.name,
    timezone: row.timezone,
    settings: row.settings as Record<string, unknown>,
  };
  next();
}
