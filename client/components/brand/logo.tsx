/**
 * Brand logo. The path is the exact SVG you provided; `fill="currentColor"`
 * makes it adapt to light/dark automatically (set the color via Tailwind text-*).
 *
 * Usage:
 *   <Logo className="h-6 w-auto text-ink" />            // wordmark glyph in title bar
 *   <Logo className="h-8 w-8 text-bg" />                // inside a colored chip
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 52 44"
      fill="none"
      role="img"
      aria-label="Momentum"
      className={className}
    >
      <path
        d="M22.8601 0.415039L51.0641 28.5049V43.5849H37.9022V33.9259L17.4173 13.5237H13.1619V43.5849H0V0.415039H22.8601ZM37.9022 15.3963V0.415039H51.0641V15.3963H37.9022Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Logo + wordmark lockup, used in the sidebar / footer / nav. */
export function LogoLockup({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold ${className ?? ""}`}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-bg">
        <Logo className="h-4 w-auto" />
      </span>
      Momentum
    </span>
  );
}
