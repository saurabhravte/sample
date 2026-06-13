import { Sparkles } from 'lucide-react';

export default function Loading() {
  return (
    <div className="grid min-h-screen place-items-center bg-bg">
      <div className="flex flex-col items-center gap-4">
        <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-ink text-bg">
          <Sparkles className="h-6 w-6" />
          <span className="absolute inset-0 animate-ping rounded-2xl border border-accent/40" />
        </span>
        <p className="text-sm text-muted">Gathering your momentum…</p>
      </div>
    </div>
  );
}
