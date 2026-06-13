# Building the history: 24 commits that tell the story

The goal isn't to fake work — it's to commit *real* work in the logical order you'd
actually build it, so the history reads like a project, not a single dump. Below is a
24-step sequence. Each step = one commit. Stage only the listed files, write the
message, commit. Do them top to bottom.

## One-time setup
```bash
cd client                      # or wherever this frontend lives in your repo
git init                       # skip if already inside the existing repo
git config user.name  "Your Name"
git config user.email "you@example.com"
```

## The sequence
> Pattern for each step:
> `git add <files>` → `git commit -m "<message>"`

| #  | Files to stage | Commit message |
|----|----------------|----------------|
| 1  | `package.json` `.gitignore` | `chore: scaffold next 14 client with typescript` |
| 2  | `tsconfig.json` `next-env.d.ts` `next.config.mjs` | `build: typescript + next config, no js allowed` |
| 3  | `postcss.config.mjs` `tailwind.config.ts` | `style: tailwind with monochrome token scale` |
| 4  | `app/globals.css` | `style: light/dark css variables + focus + reduced-motion` |
| 5  | `lib/utils.ts` | `chore: cn() class merge helper` |
| 6  | `components/theme-provider.tsx` `components/theme-toggle.tsx` | `feat: dark/light theme provider and toggle` |
| 7  | `app/layout.tsx` | `feat: root layout with clerk, poppins, theme` |
| 8  | `.env.example` | `docs: env example for clerk + api proxy` |
| 9  | `middleware.ts` | `feat: clerk middleware guarding /dashboard` |
| 10 | `app/sign-in/**` `app/sign-up/**` | `feat: clerk sign-in and sign-up routes` |
| 11 | `components/ui/badge.tsx` | `feat: status badge pills (warning/success/error)` |
| 12 | `components/navbar.tsx` | `feat: navbar fixed at top, floats on scroll` |
| 13 | `components/landing/flow-showcase.tsx` | `feat: react flow hub-and-spoke connection canvas` |
| 14 | `components/landing/hero.tsx` | `feat: hero pairing headline with live flow canvas` |
| 15 | `components/landing/features.tsx` | `feat: bento feature grid` |
| 16 | `components/landing/pricing.tsx` | `feat: interactive INR pricing with monthly/annual toggle` |
| 17 | `components/landing/faq.tsx` | `feat: faq accordion` |
| 18 | `components/landing/footer.tsx` `app/page.tsx` | `feat: assemble landing page` |
| 19 | `app/loading.tsx` `app/not-found.tsx` `app/error.tsx` | `feat: loading, 404 and error pages` |
| 20 | `components/dashboard/sidebar.tsx` | `feat: dashboard sidebar with connections tab` |
| 21 | `components/dashboard/topbar.tsx` | `feat: topbar showing profile name, not email` |
| 22 | `components/dashboard/bento-card.tsx` `app/dashboard/layout.tsx` `app/dashboard/loading.tsx` | `feat: dashboard shell with rounded bento cards` |
| 23 | `app/dashboard/page.tsx` | `feat: bento overview with toggles and activity pills` |
| 24 | `app/dashboard/connections/page.tsx` `README.md` `docs/` | `feat: connections page with per-tool how-to + docs` |

## Push to GitHub
```bash
# create an EMPTY repo on github.com first (no README), then:
git remote add origin https://github.com/<you>/<repo>.git
git branch -M main
git push -u origin main
```

## Tips for believable, honest history
- **Spread the dates** if you're committing all at once (optional, only on your own repo):
  ```bash
  GIT_AUTHOR_DATE="2026-06-01T10:00:00" GIT_COMMITTER_DATE="2026-06-01T10:00:00" \
    git commit -m "chore: scaffold next 14 client with typescript"
  ```
  Bump the date a few hours/days per commit.
- Keep messages in the **conventional-commits** style (`feat:`, `fix:`, `chore:`,
  `style:`, `docs:`, `build:`) — it reads professionally on the commit graph.
- If you later tweak a component, that's a real `fix:`/`refactor:` commit — let the
  history grow naturally past 24. Don't pad with empty commits; reviewers spot it.
- Want it semi-automated? Put the 24 add/commit pairs in a shell script and run once.
