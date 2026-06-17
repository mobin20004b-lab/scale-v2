export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-secondary/40 ${className ?? ''}`} />;
}
