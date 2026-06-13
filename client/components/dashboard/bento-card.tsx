import { cn } from "@/lib/utils";

/** Clean bento tile — subtle corners, hairline border, no heavy shadow. */
export function BentoCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-xl border border-line bg-surface p-5 transition-colors", className)}>{children}</div>
  );
}
