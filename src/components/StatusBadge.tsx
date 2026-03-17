import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  variant: "available" | "checked-out" | "returned";
  label?: string;
}

export default function StatusBadge({ variant, label }: StatusBadgeProps) {
  const text =
    label ||
    (variant === "available"
      ? "Available"
      : variant === "checked-out"
        ? "Checked Out"
        : "Returned");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variant === "available" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
        variant === "checked-out" && "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
        variant === "returned" && "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          variant === "available" && "bg-emerald-500",
          variant === "checked-out" && "bg-amber-500",
          variant === "returned" && "bg-slate-400"
        )}
      />
      {text}
    </span>
  );
}
