import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  className?: string;
  variant?: "provider" | "booking" | "stat";
}

export function SkeletonCard({ className, variant = "provider" }: SkeletonCardProps) {
  if (variant === "stat") {
    return (
      <div className={cn("rounded-2xl border border-border/60 bg-card p-5 animate-pulse", className)}>
        <div className="h-10 w-10 rounded-xl bg-muted" />
        <div className="mt-3 h-7 w-20 rounded-lg bg-muted" />
        <div className="mt-1.5 h-3 w-24 rounded-lg bg-muted" />
      </div>
    );
  }

  if (variant === "booking") {
    return (
      <div className={cn("rounded-2xl border border-border/60 bg-card p-5 animate-pulse", className)}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-muted" />
            <div className="space-y-2">
              <div className="h-4 w-28 rounded-lg bg-muted" />
              <div className="h-3 w-20 rounded-lg bg-muted" />
            </div>
          </div>
          <div className="h-6 w-16 rounded-full bg-muted" />
        </div>
        <div className="mt-4 flex gap-4">
          <div className="h-3 w-24 rounded-lg bg-muted" />
          <div className="h-3 w-20 rounded-lg bg-muted" />
          <div className="h-3 w-32 rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  // provider variant (default)
  return (
    <div className={cn("rounded-2xl border border-border/60 bg-card p-5 animate-pulse", className)}>
      <div className="flex items-start gap-4">
        <div className="h-16 w-16 rounded-2xl bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 rounded-lg bg-muted" />
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-3.5 w-3.5 rounded-sm bg-muted" />
            ))}
          </div>
          <div className="h-3 w-24 rounded-lg bg-muted" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full rounded-lg bg-muted" />
        <div className="h-3 w-4/5 rounded-lg bg-muted" />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4">
        <div className="space-y-1">
          <div className="h-2.5 w-14 rounded bg-muted" />
          <div className="h-5 w-16 rounded-lg bg-muted" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-16 rounded-xl bg-muted" />
          <div className="h-8 w-20 rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}
