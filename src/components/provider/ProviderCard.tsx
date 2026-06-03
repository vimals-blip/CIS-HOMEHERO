import { Link } from "@tanstack/react-router";
import { Star, MapPin, Clock, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "./VerifiedBadge";
import { cn } from "@/lib/utils";

export interface ProviderCardData {
  id: string;
  name: string;
  avatarUrl?: string | null;
  bio?: string | null;
  hourlyRate: number;
  avgRating: number;
  reviewCount: number;
  isVerified: boolean;
  city?: string | null;
  experienceYears?: number;
  isOnline?: boolean;
  categories?: string[];
}

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < Math.floor(rating)
              ? "fill-amber-400 text-amber-400"
              : i < rating
              ? "fill-amber-400/50 text-amber-400"
              : "fill-muted text-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
}

const GRADIENT_PAIRS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
  "from-pink-500 to-rose-600",
  "from-primary to-primary-glow",
];

function getGradient(name: string) {
  const idx = (name?.charCodeAt(0) ?? 0) % GRADIENT_PAIRS.length;
  return GRADIENT_PAIRS[idx];
}

export function ProviderCard({ p }: { p: ProviderCardData }) {
  const gradient = getGradient(p.name);
  const isOnline = p.isOnline ?? true;

  return (
    <div className="group relative flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-5 transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5">
      {/* Availability dot */}
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <div className={cn(
            "grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br text-xl font-bold text-white shadow-md overflow-hidden",
            gradient
          )}>
            {p.avatarUrl ? (
              <img src={p.avatarUrl} alt={p.name} className="h-full w-full object-cover" />
            ) : (
              p.name[0]?.toUpperCase() ?? "P"
            )}
          </div>
          {/* Online indicator */}
          <span className={cn(
            "absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-card",
            isOnline ? "bg-success" : "bg-muted-foreground/40"
          )} title={isOnline ? "Online" : "Offline"} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate font-semibold text-foreground">{p.name}</h3>
            {p.isVerified && <VerifiedBadge size={12} showText={false} />}
          </div>

          <div className="mt-1 flex items-center gap-1.5">
            <StarRating rating={p.avgRating} />
            <span className="text-xs font-semibold text-foreground">{p.avgRating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({p.reviewCount})</span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {p.city && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {p.city}
              </span>
            )}
            {p.experienceYears != null && p.experienceYears > 0 && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> {p.experienceYears}y exp
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Category chips */}
      {p.categories && p.categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {p.categories.slice(0, 3).map((cat) => (
            <span
              key={cat}
              className="rounded-full bg-primary/8 px-2.5 py-0.5 text-xs font-medium text-primary"
            >
              {cat}
            </span>
          ))}
        </div>
      )}

      {p.bio && (
        <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">{p.bio}</p>
      )}

      <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-4">
        <div>
          <div className="text-xs text-muted-foreground">Starting at</div>
          <div className="text-lg font-bold text-foreground">
            ₹{p.hourlyRate}
            <span className="text-xs font-normal text-muted-foreground">/hr</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="h-8 text-xs">
            <Link to="/providers/$providerId" params={{ providerId: p.id }}>
              Profile
            </Link>
          </Button>
          <Button asChild size="sm" className="h-8 text-xs shadow-sm shadow-primary/20">
            <Link to="/providers/$providerId" params={{ providerId: p.id }}>
              <CalendarCheck className="mr-1 h-3.5 w-3.5" />
              Book Now
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
