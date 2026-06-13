export default function DashboardLoading() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-40 animate-pulse rounded-3xl border border-line bg-surface"
          style={{ animationDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
  );
}
