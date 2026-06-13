import type { Config } from "tailwindcss";

/**
 * Single source of truth for the design system.
 *
 * The app previously had TWO competing token sets — the clean monochrome one
 * (bg / surface / ink / muted / accent) used by /dashboard, and an older
 * "ink-100..950 + urgent/reply/..." set used by every feature page that was
 * never defined anywhere (so those pages rendered unstyled). Both are now
 * defined here and in globals.css, all driven by CSS variables so light/dark
 * just swap values.
 */
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-poppins)", "system-ui", "sans-serif"],
        // Headings use the same family; the class just signals intent + tracking.
        display: ["var(--font-poppins)", "system-ui", "sans-serif"],
      },
      colors: {
        // ── Clean monochrome system (the screenshots) ──────────────────────
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        faint: "rgb(var(--faint) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-soft": "rgb(var(--accent-soft) / <alpha-value>)",

        // ── ink: a single foreground color AND a 100..950 neutral scale ────
        // Low numbers = strongest text, high numbers = backgrounds. Theme-aware
        // so text-ink-300 stays "secondary text" and bg-ink-900 stays "surface"
        // in both light and dark.
        ink: {
          DEFAULT: "rgb(var(--ink) / <alpha-value>)",
          100: "rgb(var(--ink-100) / <alpha-value>)",
          200: "rgb(var(--ink-200) / <alpha-value>)",
          300: "rgb(var(--ink-300) / <alpha-value>)",
          400: "rgb(var(--ink-400) / <alpha-value>)",
          500: "rgb(var(--ink-500) / <alpha-value>)",
          600: "rgb(var(--ink-600) / <alpha-value>)",
          700: "rgb(var(--ink-700) / <alpha-value>)",
          800: "rgb(var(--ink-800) / <alpha-value>)",
          850: "rgb(var(--ink-850) / <alpha-value>)",
          900: "rgb(var(--ink-900) / <alpha-value>)",
          950: "rgb(var(--ink-950) / <alpha-value>)",
        },

        // ── Semantic priority hues (inbox triage). Used as text-X and bg-X/15.
        urgent: "rgb(var(--urgent) / <alpha-value>)",
        reply: "rgb(var(--reply) / <alpha-value>)",
        waiting: "rgb(var(--waiting) / <alpha-value>)",
        fyi: "rgb(var(--fyi) / <alpha-value>)",
        news: "rgb(var(--news) / <alpha-value>)",

        // Brand colors for the four tools (used only when a node is connected).
        gmail: "#EA4335",
        gcal: "#1A73E8",
        slack: "#611F69",
        github: "#24292F",
      },
      borderRadius: {
        lg: "0.5rem",
        xl: "0.625rem",
        "2xl": "0.75rem",
        "3xl": "0.875rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px -12px rgb(0 0 0 / 0.12)",
        "soft-lg": "0 1px 2px rgb(0 0 0 / 0.05), 0 24px 48px -24px rgb(0 0 0 / 0.22)",
        float: "0 10px 40px -12px rgb(0 0 0 / 0.18)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        "pulse-line": {
          "0%, 100%": { opacity: "0.25" },
          "50%": { opacity: "0.9" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        rise: "rise 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        "pulse-soft": "pulse-soft 1.8s ease-in-out infinite",
        "pulse-line": "pulse-line 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
