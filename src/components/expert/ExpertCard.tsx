import { Star, MapPin, BadgeCheck, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ExpertCardData {
  id: string;
  name: string;
  avatarUrl?: string | null;
  bio?: string | null;
  avgRating: number;
  reviewCount: number;
  totalJobs?: number;
  isVerified: boolean;
  city?: string | null;
  experienceYears?: number;
  status?: string;
}

const GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
  "from-pink-500 to-rose-600",
  "from-primary to-primary-glow",
];

function gradientFor(name: string) {
  return GRADIENTS[(name?.charCodeAt(0) ?? 0) % GRADIENTS.length];
}

export function ExpertCard({ e }: { e: ExpertCardData }) {
  return (
    <div className="group flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-5 transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5">
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <div className={cn(
            "grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br text-xl font-bold text-white shadow-md",
            gradientFor(e.name),
          )}>
            {e.avatarUrl ? <img src={e.avatarUrl} alt={e.name} className="h-full w-full object-cover" /> : (e.name[0]?.toUpperCase() ?? "E")}
          </div>
          {e.status === "ONLINE" && (
            <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-card bg-emerald-500" title="Online" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate font-semibold">{e.name}</h3>
            {e.isVerified && <BadgeCheck className="h-4 w-4 text-primary" />}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-semibold">{e.avgRating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({e.reviewCount})</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {e.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {e.city}</span>}
            {e.totalJobs != null && e.totalJobs > 0 && (
              <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" /> {e.totalJobs} jobs</span>
            )}
          </div>
        </div>
      </div>

      {e.bio && <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{e.bio}</p>}
    </div>
  );
}
