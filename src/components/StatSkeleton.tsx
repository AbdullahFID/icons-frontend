// StatSkeleton — three shimmering placeholder cards shown while the
// Dashboard fetches its first payload. Skeleton screens beat spinners
// because they preserve layout (no jank when data arrives).

import { Skeleton } from "@/components/ui/skeleton";

export default function StatSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-7 w-16 rounded" />
            </div>
            <Skeleton className="h-10 w-10 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
