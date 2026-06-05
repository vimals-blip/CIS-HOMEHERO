import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  max?: number;
  size?: number;
  interactive?: boolean;
  onChange?: (v: number) => void;
  className?: string;
}

export function StarRating({ value, max = 5, size = 16, interactive = false, onChange, className }: StarRatingProps) {
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className={cn(
            "transition-colors",
            i < value ? "fill-warning text-warning" : "text-muted-foreground/30",
            interactive && "cursor-pointer hover:text-warning hover:fill-warning"
          )}
          onClick={interactive && onChange ? () => onChange(i + 1) : undefined}
        />
      ))}
    </div>
  );
}
