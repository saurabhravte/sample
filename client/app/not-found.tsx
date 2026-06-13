import Link from 'next/link';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-bg px-4">
      <div className="text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-surface-2 text-muted">
          <Compass className="h-6 w-6" />
        </span>
        <h1 className="mt-6 text-6xl font-semibold tracking-tight">404</h1>
        <p className="mt-2 text-muted">This page drifted off-center. Let&apos;s get you back.</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-bg transition-transform hover:scale-[1.02]"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
