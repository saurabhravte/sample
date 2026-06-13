import Link from "next/link";
import { Github, Mail } from "lucide-react";
import { Logo } from "@/components/brand/logo";

/* X (Twitter) has no lucide glyph — small inline SVG. */
function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

// 👉 EDIT THESE to your real handles.
const SOCIALS = [
  { label: "Email", href: "mailto:you@example.com", Icon: Mail },
  { label: "GitHub", href: "https://github.com/saurabhravte", Icon: Github },
  { label: "Twitter", href: "https://twitter.com/yourhandle", Icon: XIcon },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-6 py-10 sm:flex-row sm:justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink text-bg">
            <Logo className="h-4 w-auto" />
          </span>
          Momentum
        </Link>

        <div className="flex items-center gap-4">
          {SOCIALS.map(({ label, href, Icon }) => (
            <Link
              key={label}
              href={href}
              aria-label={label}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
              className="text-muted transition-colors hover:text-ink"
            >
              <Icon className="h-5 w-5" />
            </Link>
          ))}
        </div>

        <p className="text-xs text-faint">© {year} Momentum</p>
      </div>
    </footer>
  );
}
