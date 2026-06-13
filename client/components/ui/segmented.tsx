"use client";

import { cn } from "@/lib/utils";

/** Generic segmented control. Active segment uses the neutral active tokens. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex rounded-lg border border-line bg-surface p-0.5", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              active ? "bg-[rgb(var(--active-bg))] text-[rgb(var(--active-fg))]" : "text-muted hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
