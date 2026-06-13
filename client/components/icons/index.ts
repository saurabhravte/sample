/**
 * Clean line-icon set in the spirit of https://design.dev/free-icons/ — 24x24,
 * 1.75 stroke, currentColor so they theme automatically. Use anywhere a crisp
 * outline icon is wanted instead of a filled lucide glyph.
 *
 *   <Icon.Sparkle className="h-4 w-4 text-accent" />
 */
type IconProps = { className?: string };

const base = (children: React.ReactNode) => (props: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={props.className}
    aria-hidden
  >
    {children}
  </svg>
);

export const Icon = {
  Sparkle: base(
    <>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M12 8.5 13.2 11l2.3 1-2.3 1L12 15.5 10.8 13l-2.3-1 2.3-1L12 8.5Z" />
    </>,
  ),
  Bolt: base(<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />),
  Calendar: base(
    <>
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M3 9h18M8 2.5v4M16 2.5v4" />
    </>,
  ),
  Check: base(<path d="m4.5 12.5 5 5 10-11" />),
  Plus: base(<path d="M12 5v14M5 12h14" />),
  Grid: base(
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </>,
  ),
  Chart: base(
    <>
      <path d="M4 4v16h16" />
      <path d="M8 14l3-4 3 3 4-6" />
    </>,
  ),
  Tag: base(
    <>
      <path d="M3.5 11.5 11 4h7.5V11.5L11 19l-7.5-7.5Z" />
      <circle cx="15" cy="8" r="1.3" />
    </>,
  ),
  ChevronLeft: base(<path d="m14 6-6 6 6 6" />),
  ChevronRight: base(<path d="m10 6 6 6-6 6" />),
  Robot: base(
    <>
      <rect x="4" y="8" width="16" height="11" rx="3" />
      <path d="M12 4v4M8.5 13h.01M15.5 13h.01M9 17h6" />
    </>,
  ),
};
