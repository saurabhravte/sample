# Momentum

> **Everything revolves around one center.**
> A Superhuman-style command center for **Gmail, Google Calendar, Slack and GitHub**, built on **Corsair** for the Corsair hackathon.

Your work is scattered across four tabs that each think they're the main character. Momentum pulls them into one place — where the workflow bends to *you*, not the other way around.

---

## The pitch in 30 seconds

- **☀ Catch Me Up** — one button that answers *"I was offline for 3 hours / a weekend — what do I actually need to know?"* across Gmail + Slack + GitHub + Calendar, ranked by urgency, with inline actions (reply, snooze, → task).
- **⚡ Action command bar** (⌘K) — not a search box: *"reschedule my 3pm and tell Raj on Slack."* One input acts across all four tools. Every write lands as a **proposal you approve** — Momentum never sends without you.
- **Priority inbox** — every email classified (urgent / needs-reply / waiting / FYI / newsletter) + smart labels (client / invoice / interview / project) the instant it arrives via **Corsair webhooks**.
- **Email → Calendar in one click** — "can we meet Thursday at 4?" becomes an event chip with attendees pre-filled from the thread. The most direct answer to *"sending a calendar invite is too many steps."*
- **Sub-second search** — Corsair caches every email; we embed them into **pgvector** and search semantically in <1s, no Gmail API round-trip.
- **Pre-meeting briefs pushed 10 min before** · **6pm shutdown ritual** · **undo send** · **Cost-of-Context weekly stat**.

## Architecture

```
client/                          Next.js 14 (App Router, Tailwind, IBM Plex Mono) — the entire frontend
server/                          The entire backend — Express app served by a pure node:http server
  src/
    server.ts                    runs at the root of src — node:http entry, starts the server
    app.ts                       Express server setup (helmet, cors, json, module routers, error middleware)
    modules/                     one folder per feature, each self-contained:
      auth/                      dto/  auth.controller.ts  auth.middleware.ts  auth.model.ts  auth.routes.ts
      inbox/                     dto/  inbox.controller.ts  inbox.model.ts  inbox.routes.ts  inbox.service.ts
      calendar/                  dto/  controller / routes / service
      catchup/                   controller / routes / service / model
      command/                   dto/  controller / routes / service (the agent) / model
      search/                    dto/  controller / routes
      tasks/                     dto/  controller / routes / model
      connections/               dto/  controller / routes / model
      integrations/              dto/  controller / routes / slack.service.ts / github.service.ts / model
      webhooks/                  controller / routes / model
    common/
      config/                    env.ts (zod-validated) · db.ts (pg Pool + Drizzle) · corsair.ts · schema.ts (model barrel)
      dto/                       base.dto.ts (shared zod helpers + API envelope types)
      middleware/                validate.middleware.ts · rateLimit.middleware.ts · error.middleware.ts
      utils/                     apiError.ts · apiResponse.ts · asyncHandler.ts · webhookSignature.ts
      services/                  activity.service.ts · ai/ (classifier, drafts, embeddings, extract, llm)
      jobs/                      pg-boss queues + workers
      models/                    activity.model.ts (cross-cutting audit log)
      types/                     express.d.ts
    tests/                       vitest suites
packages/
  shared/                        Zod DTOs shared end-to-end
```

Every successful response uses the custom `ApiResponse` envelope
`{ success, statusCode, message, data }`; every failure flows through the
central error middleware as `{ success: false, statusCode, message, error: { code, message } }`
(a custom `ApiError` carries status + code; `asyncHandler` forwards rejections — controllers have no try/catch).

| Concern | Choice |
|---|---|
| Integrations | **Corsair** (`gmail`, `googlecalendar`, `slack`, `github` plugins), `multiTenancy: true` |
| Database | Postgres (+ **pgvector**) via **Drizzle ORM**; one pool shared with Corsair & pg-boss |
| Jobs | **pg-boss** — snooze wake, reminders, **undo-send delay**, pre-meeting briefs, shutdown ritual, weekly summary, notification bundling. No Redis. |
| AI | Anthropic — Haiku for classification (no tools, JSON-only), Sonnet for the agent (proposals only) |
| Auth | Google OAuth (`openid email profile` only) **and** email/password (argon2id). Same verified email ⇒ accounts merge. |
| Validation | Zod middleware on every input; typed `ApiResponse` envelope |
| Server | `node:http.createServer(expressApp)` — per spec |
| Frontend state | **zustand** (one tiny UI store: focus mode, ⌘K palette, help sheet — no provider tree) |
| Forms | **react-hook-form** (login, Slack/GitHub token modal) — zero-dep, ~3 kB on the pages that use it |
| Formatting | **prettier** repo-wide (`pnpm format`), enforced in CI |

### How Corsair is used

Connection flows match each plugin's real auth type:
- **gmail / googlecalendar** — OAuth via `generateOAuthUrl` → one shared `/api/connections/callback` → `processOAuthCallback` (the state is HMAC-signed and carries plugin + tenant; we additionally require it to match the session).
- **slack / github** — API-key auth: the UI collects a bot token / PAT and the server stores it with `tenant.<plugin>.keys.set_api_key(...)` (KEK envelope encryption).
- **Disconnect** — nulls every credential field via the key manager, then purges `corsair_entities` / `corsair_events` for that tenant + integration, plus our derived rows.


```ts
const corsair = createCorsair({
  plugins: [gmail(), googlecalendar(), slack(), github()],
  database: pgPool,          // same Postgres as the app
  kek: env.CORSAIR_KEK,      // token encryption key
  multiTenancy: true,        // ⬅ user A can NEVER read user B's mail
});
const tenant = corsair.withTenant(userId);   // every call is tenant-scoped
await tenant.gmail.api.messages.list(...)    // live API
await tenant.github.db.pullRequests.search() // Corsair's local cache → instant
```

- `api.*` for live operations (send, create event), `db.*` for instant reads from Corsair's cache.
- **Webhooks** (`POST /api/webhooks/corsair`) ingest new mail/events in realtime — classified + embedded the moment they arrive. HMAC signature verified, stale timestamps rejected, deliveries deduped.
- **Disconnect = revoke + purge**: token revoked, `corsair_entities`/`corsair_events` rows for that account deleted, our derived `email_meta` purged.

## Consent-first by design

Logging in with Google **connects nothing**. The `/connections` page is the front door: each service shows exactly what it will be used for, asks for **minimum incremental scopes**, and can be disconnected (with full purge) at any time. The agent can *read* whatever you've connected, but every outbound action — email, invite, Slack post, GitHub issue — sits in an **approval queue** until you click. There's also a permanent **activity log** of everything Momentum did.

## Bonus-task checklist

| Bonus | Status |
|---|---|
| Agent chat via Corsair MCP / Anthropic tools | ✅ ⌘K "Act" mode — proposals + approval gate |
| Realtime Corsair webhooks (no polling) | ✅ signature-verified, replay-protected, idempotent |
| LLM priority filtering | ✅ Haiku classifier + deterministic heuristic fallback |
| Keyboard shortcuts | ✅ `g i`/`g c`… nav, `j/k` list, `r` reply, `s` snooze, `f` focus, `?` sheet |
| Corsair search API UI | ✅ ⌘K "Search" → gmail engine with advanced-operator builder |
| pgvector fast local search | ✅ <1s semantic search over Corsair's cached entities (shows `tookMs`) |

## Getting started

```bash
# 0. prerequisites: Node 20+, pnpm 9, Docker
git clone <repo> && cd momentum
pnpm install

# 1. Postgres with pgvector
docker compose up -d

# 2. environment
cp .env.example .env
#   CORSAIR_KEK:    openssl rand -base64 32   (different per environment; losing it loses stored tokens)
#   SESSION_SECRET: openssl rand -base64 32
#   Google OAuth client (redirect: http://localhost:4000/api/auth/google/callback)
#   ANTHROPIC_API_KEY (optional — heuristics keep everything functional without it)

# 3. schema
pnpm db:push              # app tables (Drizzle)
pnpm db:migrate:corsair   # Corsair's 4 tables + pgvector extension

# 4. run
pnpm dev                  # client :3000 (proxies /api → :4000), server :4000

# 5. webhooks in dev (optional)
ngrok http 4000           # set WEBHOOK_PUBLIC_URL to the ngrok URL
```

Open http://localhost:3000 → sign in → **choose** what to connect → hit **☀ Catch Me Up**.

## Security posture (the short version)

- **Tenant isolation**: `tenant_id` derived from the session only, never from the client; every table user-scoped; Corsair `multiTenancy: true`; **the #1 test in CI proves user A cannot read user B's data**.
- **Prompt injection**: emails/Slack are untrusted. Classification calls get **zero tools**; untrusted content is fenced in prompts; the agent's write tools only create proposals behind an explicit UI approval.
- **Email HTML**: DOMPurify + `<iframe sandbox>` + remote images blocked by default (tracking-pixel protection with a "load images" opt-in).
- **Sessions**: httpOnly/Secure/SameSite cookies, argon2id, generic auth errors, per-user rate limits, Helmet, strict CORS, 256kb body cap, central error handler that never leaks, **no email bodies or tokens in logs — IDs only**.
- **Webhooks**: HMAC-SHA256 over `timestamp.body`, ±300s window, `timingSafeEqual`, idempotency table.
- Secrets: `.env` gitignored from commit #1, `.env.example` provided, gitleaks + `pnpm audit` in CI.

## Testing

```bash
pnpm test          # vitest everywhere
```
- `tenant-isolation.test.ts` — the one that matters: A registers, B registers, A requests B's resources → 403/404; plus a loop asserting every protected route 401s unauthenticated.
- `logic.test.ts` — pure units: conflict overlap math, free-slot generation, heuristic classifier, email→meeting date extraction (always-future, weekday rollover), stale-PR threshold, standup detection.
- `webhook.test.ts` — valid signature accepted; tampered, stale, and missing signatures rejected.
- CI (GitHub Actions, `ci.yml`): gitleaks → audit → **prettier check** → typecheck → schema push → tests against a pgvector Postgres service → build.
- Perf budgets (`perf.yml`): boots the **built** API against a throwaway pgvector Postgres and asserts p95 latency budgets on the hot endpoints — `/healthz` 50ms, `/api/auth/me` 120ms, inbox/tasks 250ms, connections 300ms, login 1.5s (argon2id is slow on purpose). A slow backend fails the PR.

```bash
pnpm format        # prettier --write across the monorepo
pnpm format:check  # what CI runs
pnpm perf          # latency budgets against a running API (PERF_BASE_URL to point elsewhere)
```

## Deploying

Any Node host works (Railway/Render/Fly + Vercel for the web app, or one box for both):

1. Postgres 16 with the `vector` extension (Neon/Supabase/RDS all fine).
2. `pnpm build`, run `server/dist/server.js` (it's a plain `node:http` server) and `next start` in `client/`.
3. Same-origin is simplest: reverse-proxy `/api/*` → Express. Otherwise set `NEXT_PUBLIC_API_URL` and `WEB_ORIGIN`.
4. Set `WEBHOOK_PUBLIC_URL` to the public API origin so Corsair webhooks arrive.
5. Fresh `CORSAIR_KEK` + `SESSION_SECRET` for prod; Google OAuth redirect updated to the prod URL.

## Demo path (what to show, in order)

1. Login → **consent page** ("Google login connected *nothing* — I choose").
2. Inbox syncs → priorities & labels appear live; open a thread → **meeting detected → Create event** chip.
3. **☀ Catch Me Up** ("the weekend") → ranked digest → inline AI reply → **Send with undo**.
4. ⌘K → *"reschedule my 3pm and tell Raj on Slack"* → two proposal cards → approve → activity log updates.
5. ⌘K Search → "that invoice thing from last month" → **local pgvector, ~XXms** badge.
6. Close with the **Cost-of-Context** stat and the security line: *"the agent reads everything, sends nothing without me."*

---

Built for the Corsair hackathon · MIT licensed · `pnpm` · TypeScript end-to-end
