"use client";

import { cn } from "@/lib/utils";

/**
 * Accessible toggle switch. Used for per-tool connect control (Fix #4) and the
 * summary on/off preference. Themed via tokens; the "on" track is neutral ink
 * (matches the warm/neutral palette) rather than indigo.
 */
export function Switch({
  checked,
  onChange,
  disabled,
  label,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      id={id}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors outline-none",
        "focus-visible:ring-2 focus-visible:ring-accent/40",
        checked ? "bg-ink" : "bg-surface-2",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-bg shadow-soft transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
