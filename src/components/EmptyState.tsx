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
    <div className={cn("glass-card rounded-2xl p-12 text-center", className)}>
      <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-muted/50 mb-4 empty-state-icon">
        <Icon className="h-8 w-8 text-muted-foreground/40" />
      </div>
      <h3 className="text-sm font-medium text-foreground/70 mb-1 empty-state-text">{title}</h3>
      <p className="text-sm text-muted-foreground empty-state-text-delay">{description}</p>
    </div>
  );
}
