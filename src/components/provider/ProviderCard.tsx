import { Link } from "@tanstack/react-router";
import { Star, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "./VerifiedBadge";

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
}

export function ProviderCard({ p }: { p: ProviderCardData }) {
  return (
    <div className="group flex flex-col gap-4 rounded-2xl border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5">
      <div className="flex items-start gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-lg font-semibold text-primary-foreground">
          {p.avatarUrl ? (
            <img src={p.avatarUrl} alt={p.name} className="h-full w-full rounded-2xl object-cover" />
          ) : (
            p.name[0]?.toUpperCase() ?? "P"
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold">{p.name}</h3>
            {p.isVerified && <VerifiedBadge />}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-warning text-warning" />
              <span className="font-medium text-foreground">{p.avgRating.toFixed(1)}</span>
              <span>({p.reviewCount})</span>
            </span>
            {p.city && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {p.city}
              </span>
            )}
            {p.experienceYears != null && p.experienceYears > 0 && (
              <span>{p.experienceYears}y exp</span>
            )}
          </div>
        </div>
      </div>

      {p.bio && <p className="line-clamp-2 text-sm text-muted-foreground">{p.bio}</p>}

      <div className="mt-auto flex items-center justify-between border-t pt-4">
        <div>
          <div className="text-xs text-muted-foreground">Starting at</div>
          <div className="text-lg font-semibold">
            ₹{p.hourlyRate}
            <span className="text-xs font-normal text-muted-foreground">/hr</span>
          </div>
        </div>
        <Button asChild size="sm">
          <Link to="/providers/$providerId" params={{ providerId: p.id }}>
            View
          </Link>
        </Button>
      </div>
    </div>
  );
}
