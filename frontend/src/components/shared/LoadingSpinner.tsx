import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  text?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingSpinner({ className = "", text, size = "md" }: LoadingSpinnerProps) {
  const sizeMap = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-12", className)}>
      <div className="relative">
        <div className={cn("rounded-full border-2 border-primary/20", sizeMap[size])} />
        <Loader2 className={cn("absolute inset-0 animate-spin text-primary", sizeMap[size])} />
      </div>
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
      )}
    </div>
  );
}

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div className={cn("rounded-2xl border border-border/60 bg-card p-5 animate-pulse", className)}>
      <div className="flex items-start gap-4">
        <div className="h-16 w-16 rounded-2xl bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 rounded-lg bg-muted" />
          <div className="h-3 w-24 rounded-lg bg-muted" />
          <div className="h-3 w-20 rounded-lg bg-muted" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full rounded-lg bg-muted" />
        <div className="h-3 w-4/5 rounded-lg bg-muted" />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4">
        <div className="h-6 w-16 rounded-lg bg-muted" />
        <div className="h-8 w-24 rounded-xl bg-muted" />
      </div>
    </div>
  );
}
