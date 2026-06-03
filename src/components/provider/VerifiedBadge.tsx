import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerifiedBadgeProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export function VerifiedBadge({ size = 14, className, showText = true }: VerifiedBadgeProps) {
  return (
    <span
      title="Verified provider"
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-600 ring-1 ring-blue-500/20",
        className
      )}
    >
      <ShieldCheck style={{ width: size, height: size }} className="shrink-0" />
      {showText && <span>Verified</span>}
    </span>
  );
}
