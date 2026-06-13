'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { Logo } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '#how', label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
];

export function Navbar() {
  // Fixed and flush at the top; lifts into a floating pill once you scroll.
  const [floating, setFloating] = useState(false);

  useEffect(() => {
    const onScroll = () => setFloating(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-4">
      <motion.nav
        initial={false}
        animate={{
          marginTop: floating ? 12 : 0,
          width: floating ? 'min(72rem, 100%)' : '100%',
          borderRadius: floating ? 999 : 0,
        }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        className={cn(
          'flex items-center justify-between gap-4 px-4 py-3 sm:px-6',
          floating
            ? 'border border-line bg-bg/80 shadow-float backdrop-blur-xl'
            : 'border-b border-line/60 bg-bg/60 backdrop-blur-md',
        )}
      >
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink text-bg">
            <Logo className="h-4 w-auto" />
          </span>
          Momentum
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <SignedOut>
            <Link
              href="/sign-in"
              className="hidden rounded-full px-3 py-1.5 text-sm text-muted hover:text-ink sm:block"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-bg transition-transform hover:scale-[1.02]"
            >
              Get started
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              href="/dashboard"
              className="rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-bg"
            >
              Dashboard
            </Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </motion.nav>
    </div>
  );
}
