'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const FAQS = [
  {
    q: 'Does signing in with Google connect my inbox?',
    a: 'No. Logging in connects nothing. The Connections tab is the front door — you choose each tool to connect, with the minimum scopes, and can disconnect (with full data purge) anytime.',
  },
  {
    q: 'Will Momentum send emails or messages on its own?',
    a: 'Never without you. The agent can read what you connect, but every outbound action — email, invite, Slack post, GitHub issue — waits in an approval queue until you click.',
  },
  {
    q: 'Which tools can I connect?',
    a: 'Gmail and Google Calendar via OAuth, and Slack and GitHub via API key. More integrations are on the way.',
  },
  {
    q: 'How fast is search?',
    a: 'Sub-second. Emails are cached and embedded locally, so semantic search returns in under a second without a round-trip to Gmail.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Plans are month-to-month (or annual for a discount). Cancel whenever — your connected data is purged on disconnect.',
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-20">
      <div className="mb-10 text-center">
        <p className="text-sm font-medium text-accent">FAQ</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Questions, answered.
        </h2>
      </div>

      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {FAQS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="font-medium">{item.q}</span>
                <Plus
                  className={cn(
                    'h-4 w-4 shrink-0 text-muted transition-transform',
                    isOpen && 'rotate-45 text-accent',
                  )}
                />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-4 text-sm leading-relaxed text-muted">{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
