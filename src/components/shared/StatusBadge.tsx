import { cn } from "@/lib/utils";

type BookingStatus = "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string; dot: string }> = {
  PENDING: {
    label: "Pending",
    className: "bg-amber-500/12 text-amber-700 ring-1 ring-amber-500/20",
    dot: "bg-amber-500",
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-blue-500/12 text-blue-700 ring-1 ring-blue-500/20",
    dot: "bg-blue-500",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "bg-violet-500/12 text-violet-700 ring-1 ring-violet-500/20",
    dot: "bg-violet-500 animate-pulse",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-500/20",
    dot: "bg-emerald-500",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-red-500/12 text-red-700 ring-1 ring-red-500/20",
    dot: "bg-red-500",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground ring-1 ring-border",
    dot: "bg-muted-foreground",
  };

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
      config.className,
      className
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}
