import { Star, CornerDownRight } from "lucide-react";
import { formatDistanceToNow, parseISO, isValid } from "date-fns";
import { cn } from "@/lib/utils";

export interface ReviewData {
  id: string;
  customerName: string;
  rating: number;
  comment?: string | null;
  providerReply?: string | null;
  createdAt: string;
}

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < rating
              ? "fill-amber-400 text-amber-400"
              : "fill-muted text-muted-foreground/25"
          )}
        />
      ))}
    </div>
  );
}

const AVATAR_COLORS = [
  "bg-violet-500", "bg-blue-500", "bg-emerald-500",
  "bg-orange-500", "bg-pink-500", "bg-teal-500",
];

function getAvatarColor(name: string) {
  const idx = (name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function formatDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return dateStr;
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export function ReviewCard({ r }: { r: ReviewData }) {
  const avatarColor = getAvatarColor(r.customerName);

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white",
            avatarColor
          )}>
            {r.customerName[0]?.toUpperCase() ?? "C"}
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">{r.customerName}</div>
            <div className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StarRating rating={r.rating} />
          <span className="text-xs font-medium text-muted-foreground">{r.rating}/5</span>
        </div>
      </div>

      {r.comment && (
        <p className="mt-3 text-sm leading-relaxed text-foreground/80">{r.comment}</p>
      )}

      {r.providerReply && (
        <div className="mt-4 ml-4 rounded-xl border border-primary/15 bg-primary/5 p-3.5">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-primary">
            <CornerDownRight className="h-3.5 w-3.5" />
            Provider's reply
          </div>
          <p className="text-sm text-foreground/75 leading-relaxed">{r.providerReply}</p>
        </div>
      )}
    </div>
  );
}
