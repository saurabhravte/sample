'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type Cycle = 'monthly' | 'annual';
type Plan = {
  name: string;
  monthly: number;
  blurb: string;
  features: string[];
  cta: string;
  highlight: boolean;
};

/** Fallback used if /api/pricing is unreachable (e.g. server down in dev). */
const FALLBACK_PLANS: Plan[] = [
  {
    name: 'Starter',
    monthly: 0,
    blurb: 'For trying Momentum with a single inbox.',
    features: ['1 connected tool', 'Priority inbox', 'Manual catch-up', 'Community support'],
    cta: 'Start free',
    highlight: false,
  },
  {
    name: 'Pro',
    monthly: 799,
    blurb: 'The full command center for one person.',
    features: [
      'All 4 tools connected',
      '⌘K action bar + proposals',
      'Catch Me Up + pre-meeting briefs',
      'Sub-second semantic search',
      'Undo send & shutdown ritual',
    ],
    cta: 'Go Pro',
    highlight: true,
  },
  {
    name: 'Team',
    monthly: 1499,
    blurb: 'Shared context across a small team.',
    features: ['Everything in Pro', 'Up to 10 seats', 'Shared activity log', 'Priority support'],
    cta: 'Contact sales',
    highlight: false,
  },
];

const inr = (n: number) => new Intl.NumberFormat('en-IN').format(n);

export function Pricing() {
  const [cycle, setCycle] = useState<Cycle>('annual');
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);
  const [annualDiscount, setAnnualDiscount] = useState(0.2);
  const [currency, setCurrency] = useState('₹');

  // Dynamic: pricing comes from the public /api/pricing endpoint.
  useEffect(() => {
    let alive = true;
    fetch('/api/pricing', { credentials: 'include' })
      .then((r) => r.json())
      .then((body) => {
        if (!alive || !body?.success) return;
        const d = body.data;
        if (Array.isArray(d.plans)) setPlans(d.plans);
        if (typeof d.annualDiscount === 'number') setAnnualDiscount(d.annualDiscount);
        if (typeof d.currency === 'string') setCurrency(d.currency);
      })
      .catch(() => {
        /* keep fallback */
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section id="pricing" className="mx-auto max-w-6xl px-4 py-20">
      <div className="mb-10 text-center">
        <p className="text-sm font-medium text-accent">Pricing</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Simple plans, in rupees.
        </h2>

        <div className="mt-6 inline-flex items-center gap-1 rounded-full border border-line bg-surface p-1 text-sm">
          {(['monthly', 'annual'] as Cycle[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCycle(c)}
              className={cn(
                'relative rounded-full px-4 py-1.5 font-medium capitalize transition-colors',
                cycle === c ? 'text-bg' : 'text-muted hover:text-ink',
              )}
            >
              {cycle === c && (
                <motion.span
                  layoutId="cycle-pill"
                  className="absolute inset-0 rounded-full bg-ink"
                  transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                />
              )}
              <span className="relative z-10">{c}</span>
              {c === 'annual' && (
                <span className="relative z-10 ml-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-500">
                  −20%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {plans.map((p) => {
          const price = cycle === 'annual' ? Math.round(p.monthly * (1 - annualDiscount)) : p.monthly;
          return (
            <div
              key={p.name}
              className={cn(
                'relative flex flex-col rounded-3xl border p-6 transition-shadow',
                p.highlight
                  ? 'border-accent/50 bg-surface shadow-soft-lg'
                  : 'border-line bg-surface',
              )}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <p className="mt-1 text-sm text-muted">{p.blurb}</p>

              <div className="mt-5 flex items-end gap-1">
                <span className="text-sm text-muted">{currency}</span>
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={price}
                    initial={{ y: 8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -8, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-4xl font-semibold tracking-tight"
                  >
                    {inr(price)}
                  </motion.span>
                </AnimatePresence>
                <span className="mb-1 text-sm text-muted">/mo</span>
              </div>
              {cycle === 'annual' && p.monthly > 0 && (
                <p className="mt-1 text-xs text-faint">
                  Billed {currency}{inr(price * 12)} yearly
                </p>
              )}

              <ul className="mt-6 flex-1 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/sign-up"
                className={cn(
                  'mt-6 rounded-full px-4 py-2.5 text-center text-sm font-medium transition-transform hover:scale-[1.02]',
                  p.highlight
                    ? 'bg-accent text-white'
                    : 'border border-line bg-bg text-ink hover:bg-surface-2',
                )}
              >
                {p.cta}
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
