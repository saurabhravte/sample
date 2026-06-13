'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { FlowShowcase } from './flow-showcase';
import { StatusBadge } from '@/components/ui/badge';

export function Hero() {
  return (
    <section id="how" className="relative mx-auto max-w-6xl px-4 pt-36 pb-20 sm:pt-40">
      {/* warm, friendly gradient backdrop (Asana-style) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-32 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(45% 45% at 50% 50%, rgb(var(--accent) / 0.18), transparent 70%), radial-gradient(40% 40% at 70% 30%, rgb(251 191 36 / 0.14), transparent 70%), radial-gradient(40% 40% at 30% 60%, rgb(236 72 153 / 0.12), transparent 70%)",
          }}
        />
        <div className="dot-grid absolute inset-0 opacity-40" />
      </div>

      <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Welcome — your calmer workday starts here
          </span>

          <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Work, finally{' '}
            <span className="text-accent">in one happy place</span>.
          </h1>

          <p className="mt-5 max-w-md text-pretty text-base leading-relaxed text-muted">
            Your work is scattered across four tabs that each think they&apos;re the
            main character. Momentum pulls Gmail, Calendar, Slack and GitHub into one
            place — where the workflow bends to you.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/sign-up"
              className="group inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-bg transition-transform hover:scale-[1.02]"
            >
              Start free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="#pricing"
              className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
            >
              See pricing
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            <StatusBadge variant="success" label="Success" withArrow={false}>
              Connected in one click
            </StatusBadge>
            <StatusBadge variant="neutral" label="Private" withArrow={false}>
              Reads everything, sends nothing without you
            </StatusBadge>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <FlowShowcase />
        </motion.div>
      </div>
    </section>
  );
}
