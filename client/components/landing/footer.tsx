"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/brand/logo";

/* Column definitions — edit labels/hrefs to match your real routes. */
const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { label: "Catch Me Up", href: "/catch-up" },
      { label: "Priority Inbox", href: "/inbox" },
      { label: "Command Bar", href: "#features" },
      { label: "Connections", href: "/connections" },
      { label: "Pricing", href: "#pricing" },
    ],
  },
  {
    heading: "Navigation",
    links: [
      { label: "About", href: "#about" },
      { label: "Features", href: "#features" },
      { label: "FAQ", href: "#faq" },
      { label: "Changelog", href: "#changelog" },
      { label: "Careers", href: "#careers" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Blog", href: "#blog" },
      { label: "Docs", href: "#docs" },
      { label: "Case Studies", href: "#cases" },
      { label: "Trust Center", href: "#trust" },
      { label: "Brand Guidelines", href: "#brand" },
    ],
  },
  {
    heading: "Contact",
    links: [
      { label: "Support", href: "#support" },
      { label: "Sales", href: "#sales" },
      { label: "Partnerships", href: "#partners" },
    ],
  },
];

/* Inline social SVGs (no extra icon dependency). */
function SocialIcon({ name }: { name: "discord" | "x" | "linkedin" | "rss" }) {
  const common = "h-5 w-5";
  switch (name) {
    case "x":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={common} aria-hidden>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={common} aria-hidden>
          <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
        </svg>
      );
    case "rss":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={common} aria-hidden>
          <path d="M6.503 20.752a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0ZM0 9.044v3.36c6.293 0 11.4 5.108 11.4 11.4h3.36C14.76 15.81 8.19 9.044 0 9.044Zm0-6.6v3.36C10.62 5.804 19.2 14.38 19.2 25h3.36C22.56 12.53 11.47 2.444 0 2.444Z" />
        </svg>
      );
    case "discord":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={common} aria-hidden>
          <path d="M20.317 4.369A19.79 19.79 0 0 0 15.885 3c-.21.375-.45.88-.617 1.282a18.27 18.27 0 0 0-5.535 0C9.565 3.88 9.318 3.375 9.107 3a19.74 19.74 0 0 0-4.435 1.369C1.846 8.59 1.077 12.7 1.461 16.756a19.9 19.9 0 0 0 6.063 3.058c.488-.668.922-1.378 1.296-2.124-.71-.267-1.39-.597-2.03-.98.17-.125.337-.255.498-.388a14.2 14.2 0 0 0 12.142 0c.163.135.33.265.5.39-.642.383-1.323.713-2.034.98.375.745.808 1.456 1.296 2.124a19.84 19.84 0 0 0 6.064-3.058c.45-4.705-.768-8.778-3.219-12.387ZM8.02 14.331c-1.182 0-2.156-1.085-2.156-2.42 0-1.333.955-2.42 2.156-2.42 1.21 0 2.176 1.096 2.156 2.42 0 1.335-.955 2.42-2.156 2.42Zm7.974 0c-1.183 0-2.157-1.085-2.157-2.42 0-1.333.955-2.42 2.157-2.42 1.21 0 2.176 1.096 2.156 2.42 0 1.335-.946 2.42-2.156 2.42Z" />
        </svg>
      );
  }
}

const SOCIALS = [
  { name: "discord" as const, href: "#discord", label: "Discord" },
  { name: "x" as const, href: "#x", label: "X" },
  { name: "linkedin" as const, href: "#linkedin", label: "LinkedIn" },
  { name: "rss" as const, href: "#rss", label: "RSS" },
];

export function Footer() {
  const [email, setEmail] = useState("");
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-line bg-surface">
      <div className="mx-auto max-w-7xl px-6 pb-0 pt-16">
        {/* top grid: 4 link columns + subscribe block */}
        <div className="grid gap-10 lg:grid-cols-[repeat(4,minmax(0,1fr))_1.4fr]">
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="text-sm font-semibold text-accent">{col.heading}</h3>
              <ul className="mt-5 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-muted transition-colors hover:text-ink">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* subscribe + agreement + socials */}
          <div>
            <div className="flex overflow-hidden rounded-xl border border-line bg-bg">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="youremail@domain.com"
                aria-label="Email address"
                className="w-full bg-transparent px-4 py-3 text-sm text-ink outline-none placeholder:text-faint"
              />
              <button
                type="button"
                className="m-1 shrink-0 rounded-lg border border-accent/40 bg-accent-soft px-4 text-sm font-medium text-accent transition hover:bg-accent hover:text-bg"
              >
                Subscribe
              </button>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-muted">
              By signing up you agree to our{" "}
              <Link href="#terms" className="text-accent underline-offset-2 hover:underline">
                Terms of Use
              </Link>{" "}
              and authorize Momentum to send occasional product updates. You can opt out any time; your data is handled
              under our{" "}
              <Link href="#privacy" className="text-accent underline-offset-2 hover:underline">
                Privacy Policy
              </Link>
              .
            </p>

            <div className="mt-6 flex items-center gap-5 text-faint">
              {SOCIALS.map((s) => (
                <Link key={s.name} href={s.href} aria-label={s.label} className="transition-colors hover:text-ink">
                  <SocialIcon name={s.name} />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* giant outlined wordmark — outline only, accent stroke */}
        <div aria-hidden className="pointer-events-none select-none pt-16">
          <span
            className="block text-center font-extrabold leading-none tracking-tight text-transparent"
            style={{
              fontSize: "clamp(4rem, 18vw, 13rem)",
              WebkitTextStroke: "1.5px rgb(var(--accent) / 0.55)",
            }}
          >
            Momentum
          </span>
        </div>

        {/* bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-line py-6 sm:flex-row">
          <div className="flex items-center gap-6 text-xs text-muted">
            <Link href="#terms" className="underline-offset-2 hover:text-ink hover:underline">
              Terms of Service
            </Link>
            <Link href="#privacy" className="underline-offset-2 hover:text-ink hover:underline">
              Privacy Policy
            </Link>
            <span className="text-faint">Momentum, Inc. © {year}</span>
          </div>
          <Logo className="h-5 w-auto text-faint" />
        </div>
      </div>
    </footer>
  );
}
