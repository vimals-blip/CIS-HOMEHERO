import { Calendar, MapPin, Clock, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";

export interface BookingCardData {
  id: string;
  category_name?: string | null;
  provider_name?: string | null;
  scheduled_date: string;
  scheduled_time: string;
  address: string;
  status: string;
  total_amount: number;
  notes?: string | null;
}

interface BookingCardProps {
  booking: BookingCardData;
  onCancel?: (id: string) => void;
  onReview?: (id: string) => void;
  cancelling?: boolean;
}

const SERVICE_ICONS: Record<string, string> = {
  Cleaning: "🧹",
  Plumbing: "🔧",
  Electrical: "⚡",
  Carpentry: "🪚",
  Painting: "🎨",
  "AC Repair": "❄️",
};

function getServiceEmoji(name?: string | null) {
  if (!name) return "🏠";
  for (const [key, emoji] of Object.entries(SERVICE_ICONS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return emoji;
  }
  return "🏠";
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string) {
  try {
    const [h, m] = timeStr.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  } catch {
    return timeStr;
  }
}

export function BookingCard({ booking: b, onCancel, onReview, cancelling }: BookingCardProps) {
  const canCancel = ["PENDING", "CONFIRMED"].includes(b.status);
  const canReview = b.status === "COMPLETED";
  const emoji = getServiceEmoji(b.category_name);

  return (
    <div className={cn(
      "group rounded-2xl border border-border/60 bg-card p-5 transition-all hover:border-border hover:shadow-md",
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Service icon */}
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/8 text-2xl">
            {emoji}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-foreground">{b.category_name ?? "Service"}</h3>
              <StatusBadge status={b.status} />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              with <span className="font-medium text-foreground">{b.provider_name ?? "Provider"}</span>
            </p>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary/60" />
                {formatDate(b.scheduled_date)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary/60" />
                {formatTime(b.scheduled_time)}
              </span>
              <span className="inline-flex items-center gap-1.5 max-w-xs truncate">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/60" />
                <span className="truncate">{b.address}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-lg font-bold text-foreground">₹{Number(b.total_amount).toFixed(0)}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </div>
      </div>

      {/* Actions */}
      {(canCancel || canReview) && (
        <div className="mt-4 flex items-center justify-end gap-2 border-t border-border/40 pt-4">
          {canReview && onReview && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs border-amber-500/30 text-amber-700 hover:bg-amber-500/10"
              onClick={() => onReview(b.id)}
            >
              <Star className="h-3.5 w-3.5" />
              Rate & Review
            </Button>
          )}
          {canCancel && onCancel && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={() => onCancel(b.id)}
              disabled={cancelling}
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
