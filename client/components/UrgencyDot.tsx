export function UrgencyDot({ urgency }: { urgency: number }) {
  const cls = urgency >= 85 ? "bg-urgent" : urgency >= 60 ? "bg-reply" : urgency >= 40 ? "bg-waiting" : "bg-fyi";
  return <span className={`h-2 w-2 shrink-0 rounded-full ${cls}`} title={`urgency ${urgency}`} />;
}
