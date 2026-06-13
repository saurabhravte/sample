'use client';

import { motion } from 'framer-motion';
import { Sun, Command, Inbox, CalendarPlus, Search, BellRing } from 'lucide-react';
import { cn } from '@/lib/utils';

const FEATURES = [
  {
    icon: Sun,
    title: 'Catch Me Up',
    body: 'One button answers "I was offline — what do I actually need to know?" across all four tools, ranked by urgency.',
    span: 'md:col-span-2',
  },
  {
    icon: Command,
    title: 'Action command bar',
    body: '⌘K acts across every tool. "Reschedule my 3pm and tell Raj." Every write lands as a proposal you approve.',
    span: '',
  },
  {
    icon: Inbox,
    title: 'Priority inbox',
    body: 'Every email classified — urgent, needs-reply, waiting, FYI — the instant it arrives.',
    span: '',
  },
  {
    icon: CalendarPlus,
    title: 'Email → event in one click',
    body: '"Can we meet Thursday at 4?" becomes a calendar chip with attendees pre-filled from the thread.',
    span: '',
  },
  {
    icon: Search,
    title: 'Sub-second search',
    body: 'Semantic search across every cached email in under a second — no API round-trip.',
    span: '',
  },
  {
    icon: BellRing,
    title: 'Pre-meeting briefs',
    body: 'A short brief pushed 10 minutes before every meeting, plus a 6pm shutdown ritual.',
    span: 'md:col-span-2',
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-20">
      <div className="mb-10 max-w-2xl">
        <p className="text-sm font-medium text-accent">Built for focus</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Less tab-switching. More momentum.
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
            className={cn(
              'group rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-accent/40',
              f.span,
            )}
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface-2 text-ink transition-colors group-hover:bg-accent-soft group-hover:text-accent">
              <f.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-lg font-medium">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
