import type { Request, Response } from "express";
import argon2 from "argon2";
import { nanoid } from "nanoid";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "../../common/config/db";
import { env, isProd } from "../../common/config/env";
import { SESSION_COOKIE, SESSION_DAYS } from "../../common/constants";
import { ApiError } from "../../common/utils/apiError";
import { sendResponse } from "../../common/utils/apiResponse";
import { asyncHandler } from "../../common/utils/asyncHandler";

async function createSession(res: Response, userId: string) {
  const id = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(schema.sessions).values({ id, userId, expiresAt });
  res.cookie(SESSION_COOKIE, id, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

/* ── Email + password ── */

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name, timezone } = req.body;
  const existing = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (existing[0]) {
    // Account-linking rule: same verified email merges. If a Google account
    // exists with this email, attach a password to it instead of erroring.
    if (existing[0].googleSub && !existing[0].passwordHash) {
      const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
      await db.update(schema.users).set({ passwordHash }).where(eq(schema.users.id, existing[0].id));
      await createSession(res, existing[0].id);
      return sendResponse(res, 200, { merged: true }, "Account linked");
    }
    throw ApiError.badRequest("Invalid credentials"); // generic on purpose
  }
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const id = nanoid();
  await db.insert(schema.users).values({ id, email, name, timezone, passwordHash });
  await createSession(res, id);
  sendResponse(res, 201, { id }, "Account created");
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const rows = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  const user = rows[0];
  // Generic error regardless of which check failed.
  if (!user?.passwordHash || !(await argon2.verify(user.passwordHash, password)))
    throw ApiError.unauthorized("Invalid credentials");
  await createSession(res, user.id);
  sendResponse(res, 200, { id: user.id }, "Logged in");
});

/* ── Google OAuth (login only — NO Gmail scopes here; integrations are a
 *    separate, explicit choice on the Connections page) ── */

export const googleStart = asyncHandler(async (_req: Request, res: Response) => {
  const state = randomBytes(16).toString("hex");
  res.cookie("oauth_state", state, { httpOnly: true, sameSite: "lax", maxAge: 600_000 });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", env.GOOGLE_REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile"); // minimum scopes
  url.searchParams.set("state", state);
  res.redirect(url.toString());
});

export const googleCallback = asyncHandler(async (req: Request, res: Response) => {
  const { code, state } = req.query as Record<string, string>;
  if (!code || !state || state !== req.cookies?.oauth_state) throw ApiError.badRequest("OAuth state mismatch");
  res.clearCookie("oauth_state");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) throw ApiError.badRequest("Google sign-in failed");
  const tokens = (await tokenRes.json()) as { id_token: string };
  const claims = JSON.parse(Buffer.from(tokens.id_token.split(".")[1]!, "base64url").toString()) as {
    sub: string;
    email: string;
    name?: string;
    email_verified?: boolean;
  };
  if (!claims.email_verified) throw ApiError.badRequest("Google email not verified");

  // Merge-on-verified-email rule.
  const rows = await db.select().from(schema.users).where(eq(schema.users.email, claims.email)).limit(1);
  let userId: string;
  if (rows[0]) {
    userId = rows[0].id;
    if (!rows[0].googleSub)
      await db
        .update(schema.users)
        .set({ googleSub: claims.sub, emailVerified: true })
        .where(eq(schema.users.id, userId));
  } else {
    userId = nanoid();
    await db.insert(schema.users).values({
      id: userId,
      email: claims.email,
      name: claims.name ?? claims.email,
      googleSub: claims.sub,
      emailVerified: true,
    });
  }
  await createSession(res, userId);
  // First stop after login: the Connections page. User decides what to wire up.
  res.redirect(`${env.WEB_ORIGIN}/connections`);
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.id, token));
  res.clearCookie(SESSION_COOKIE);
  sendResponse(res, 200, { loggedOut: true }, "Logged out");
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const u = req.user!;
  sendResponse(res, 200, { id: u.id, email: u.email, name: u.name, timezone: u.timezone, settings: u.settings });
});
