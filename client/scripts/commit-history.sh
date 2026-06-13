#!/usr/bin/env bash
# Creates a 24-commit history from the current files, in build order.
# Run ONCE from the client/ root after `git init`. Edit NAME/EMAIL/START below.
set -euo pipefail

NAME="Your Name"
EMAIL="you@example.com"
START="2026-06-01T10:00:00"   # first commit timestamp; each commit bumps +6h

git config user.name "$NAME"
git config user.email "$EMAIL"

i=0
c() { # c "message" file1 file2 ...
  local msg="$1"; shift
  git add "$@"
  local ts
  ts=$(date -d "$START +$((i*6)) hours" --iso-8601=seconds 2>/dev/null || echo "$START")
  GIT_AUTHOR_DATE="$ts" GIT_COMMITTER_DATE="$ts" git commit -m "$msg" >/dev/null
  echo "[$((i+1))] $msg"
  i=$((i+1))
}

c "chore: scaffold next 14 client with typescript" package.json .gitignore
c "build: typescript + next config, no js allowed" tsconfig.json next-env.d.ts next.config.mjs
c "style: tailwind with monochrome token scale" postcss.config.mjs tailwind.config.ts
c "style: light/dark css variables + focus + reduced-motion" app/globals.css
c "chore: cn() class merge helper" lib/utils.ts
c "feat: dark/light theme provider and toggle" components/theme-provider.tsx components/theme-toggle.tsx
c "feat: root layout with clerk, poppins, theme" app/layout.tsx
c "docs: env example for clerk + api proxy" .env.example
c "feat: clerk middleware guarding /dashboard" middleware.ts
c "feat: clerk sign-in and sign-up routes" "app/sign-in" "app/sign-up"
c "feat: status badge pills (warning/success/error)" components/ui/badge.tsx
c "feat: navbar fixed at top, floats on scroll" components/navbar.tsx
c "feat: react flow hub-and-spoke connection canvas" components/landing/flow-showcase.tsx
c "feat: hero pairing headline with live flow canvas" components/landing/hero.tsx
c "feat: bento feature grid" components/landing/features.tsx
c "feat: interactive INR pricing with monthly/annual toggle" components/landing/pricing.tsx
c "feat: faq accordion" components/landing/faq.tsx
c "feat: assemble landing page" components/landing/footer.tsx app/page.tsx
c "feat: loading, 404 and error pages" app/loading.tsx app/not-found.tsx app/error.tsx
c "feat: dashboard sidebar with connections tab" components/dashboard/sidebar.tsx
c "feat: topbar showing profile name, not email" components/dashboard/topbar.tsx
c "feat: dashboard shell with rounded bento cards" components/dashboard/bento-card.tsx app/dashboard/layout.tsx app/dashboard/loading.tsx
c "feat: bento overview with toggles and activity pills" app/dashboard/page.tsx
c "feat: connections page with per-tool how-to + docs" app/dashboard/connections/page.tsx README.md docs scripts

echo "Done — $i commits. Now: git remote add origin <url> && git push -u origin main"
