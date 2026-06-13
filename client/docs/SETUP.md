# Running Momentum locally

This is the **`client/`** (Next.js 14 + TypeScript) frontend. It talks to your
existing Express backend in `server/` through a proxy (`/api/*` → `:4000`).

## 1. Prerequisites
- Node.js 20+
- pnpm 9 (the repo is a pnpm workspace) — or npm if you run the client standalone

## 2. Clerk setup (Google auth + email verification)
1. Create a free project at https://dashboard.clerk.com
2. In **User & Authentication → Social Connections**, enable **Google**.
3. In **Email, Phone, Username**, turn on **Email address** and set verification to
   **Email verification link** (or code). Clerk handles the verification flow for you —
   unverified users can't reach `/dashboard` because `middleware.ts` guards it.
4. Copy your keys from **API Keys** into `.env.local` (see below).

## 3. Environment
```bash
cp .env.example .env.local
```
Fill in:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_API_URL=http://localhost:4000   # your Express server
```

## 4. Install & run
Standalone (just the client):
```bash
npm install
npm run dev          # http://localhost:3000
```
Within the monorepo (recommended — runs client + server together):
```bash
pnpm install
docker compose up -d     # Postgres + pgvector
pnpm dev                 # client :3000, server :4000
```

## 5. Useful scripts
```bash
npm run typecheck    # tsc --noEmit
npm run build        # production build
npm run start        # serve the build
```

## What's where
```
app/
  page.tsx                     landing (navbar, hero+React Flow, features, pricing, FAQ)
  loading.tsx / error.tsx / not-found.tsx
  sign-in / sign-up            Clerk catch-all routes
  dashboard/
    layout.tsx                 sidebar + topbar shell
    page.tsx                   bento overview (toggles + status pills)
    connections/page.tsx       connect Gmail/Calendar/Slack/GitHub + how-to
components/
  navbar.tsx                   fixed → floating on scroll
  landing/flow-showcase.tsx    the React Flow hub-and-spoke canvas (signature)
  dashboard/*, ui/badge.tsx, theme-*.tsx
lib/utils.ts, middleware.ts, tailwind.config.ts, app/globals.css (token system)
```

## Notes
- TypeScript only — no `.js` source files. `tsconfig` sets `"allowJs": false`.
- Theme tokens live in `app/globals.css` (`:root` light / `.dark` dark). The single
  bright `--accent` is the only color used on active/selected states.
- Your backend already does its own Google OAuth + email/password. Clerk here is the
  **app-login gate**; the per-tool OAuth (Gmail/Calendar via Corsair) stays on the
  Connections page and is handled by `server/`. Keep them separate.
