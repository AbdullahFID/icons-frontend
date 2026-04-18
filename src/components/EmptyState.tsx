// EmptyState — shown in place of a table/list when there's nothing to display.
// The three stagger animations (`empty-*` classes, defined in index.css) give
// the card a bit of life rather than a dead blank card.

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export default function EmptyState({ icon: Icon, title, description, className }: EmptyStateProps) {
  return (
    <div className={cn("glass-card rounded-2xl p-10 sm:p-12 text-center", className)}>
      <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-muted/60 to-muted/30 mb-4 empty-state-icon ring-1 ring-border/40">
        <Icon className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h3 className="text-sm font-semibold text-foreground/80 mb-1 empty-state-text">{title}</h3>
      <p className="text-sm text-muted-foreground empty-state-text-delay max-w-sm mx-auto">{description}</p>
    </div>
  );
}
