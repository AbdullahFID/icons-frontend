import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

export default function TableSkeleton({ rows = 5, cols = 5 }: TableSkeletonProps) {
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* header */}
      <div className="flex gap-4 px-5 py-3 border-b border-border/50">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1 rounded" />
        ))}
      </div>
      {/* rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-5 py-3.5 border-b border-border/30">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1 rounded" style={{ maxWidth: c === 0 ? "120px" : undefined }} />
          ))}
        </div>
      ))}
    </div>
  );
}
