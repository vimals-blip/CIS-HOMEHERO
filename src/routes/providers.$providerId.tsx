import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Star, MapPin, Briefcase, ArrowLeft, ChevronRight,
  BadgeCheck, CalendarDays, MessageSquare, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ReviewCard, type ReviewData } from "@/components/provider/ReviewCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/providers/$providerId")({
  component: ProviderProfile,
});

const GRADIENT_PAIRS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
  "from-pink-500 to-rose-600",
  "from-primary to-primary-glow",
];
function getGradient(name: string) {
  return GRADIENT_PAIRS[(name?.charCodeAt(0) ?? 0) % GRADIENT_PAIRS.length];
}

function StarRow({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-4 w-4",
            i < Math.floor(rating) ? "fill-amber-400 text-amber-400"
            : i < rating ? "fill-amber-400/50 text-amber-400"
            : "fill-muted text-muted-foreground/30",
          )}
        />
      ))}
      <span className="text-sm font-semibold">{Number(rating).toFixed(1)}</span>
      <span className="text-sm text-muted-foreground">({count} reviews)</span>
    </div>
  );
}

function ProviderProfile() {
  const { providerId } = Route.useParams();
  const navigate = useNavigate();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const { data: provider, isLoading } = useQuery({
    queryKey: ["provider", providerId],
    queryFn: () => apiFetch(`/provider/${providerId}`),
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews", providerId],
    queryFn: async (): Promise<ReviewData[]> => {
      const data = await apiFetch(`/reviews?provider_id=${providerId}`);
      return (data ?? []).map((r: any) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        providerReply: r.provider_reply,
        createdAt: r.created_at,
        customerName: r.customer_name ?? "Customer",
      }));
    },
  });

  if (isLoading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <LoadingSpinner />
    </div>
  );

  if (!provider) return (
    <div className="container mx-auto max-w-2xl px-4 py-20 text-center">
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-muted">
        <Briefcase className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold">Provider not found</h2>
      <p className="mt-2 text-muted-foreground">This profile doesn't exist or has been removed.</p>
      <Button asChild className="mt-6" variant="outline"><Link to="/">Back to home</Link></Button>
    </div>
  );

  const categories = (provider.provider_categories ?? [])
    .map((pc: any) => ({
      id: pc.categories?.id,
      name: pc.categories?.name ?? "Service",
      price: Number(pc.custom_price ?? provider.hourly_rate),
    }))
    .filter((c: any) => c.id);

  const isMulti = categories.length > 1;
  const activeCatId = isMulti ? selectedCategoryId : (categories[0]?.id ?? null);
  const activeCat = categories.find((c: any) => c.id === activeCatId);
  const displayPrice = activeCat?.price ?? provider.hourly_rate;

  const handleBook = () => {
    if (!activeCatId) return;
    navigate({ to: "/book/$categoryId", params: { categoryId: activeCatId }, search: { providerId } });
  };

  const name = provider.profiles?.name ?? "Provider";
  const gradient = getGradient(name);

  return (
    <div className="min-h-screen bg-muted/20">
      {/* ── Compact top bar ───────────────────────────────────────── */}
      <div className="sticky top-16 z-10 border-b bg-background/90 backdrop-blur-sm">
        <div className="container mx-auto flex h-12 items-center gap-3 px-4">
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
            <Link to="/"><ArrowLeft className="h-4 w-4" /> Back</Link>
          </Button>
          <span className="text-sm text-muted-foreground">·</span>
          <span className="text-sm font-medium truncate">{name}</span>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-8">
        {/* ── Profile header card ───────────────────────────────────── */}
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          {/* Thin colour accent strip */}
          <div className={cn("h-2 w-full bg-gradient-to-r", gradient)} />

          <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start sm:justify-between">
            {/* Left: avatar + info */}
            <div className="flex items-start gap-5">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className={cn(
                  "grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br text-2xl font-bold text-white shadow-md overflow-hidden",
                  gradient,
                )}>
                  {provider.profiles?.avatar_url ? (
                    <img src={provider.profiles.avatar_url} alt={name} className="h-full w-full object-cover" />
                  ) : name[0]?.toUpperCase()}
                </div>
                {provider.status === "ONLINE" && (
                  <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-card bg-emerald-500" title="Online now" />
                )}
              </div>

              {/* Name + meta */}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold">{name}</h1>
                  {provider.is_verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                      <BadgeCheck className="h-3.5 w-3.5" /> Verified
                    </span>
                  )}
                </div>

                <div className="mt-2">
                  <StarRow rating={Number(provider.avg_rating)} count={provider.review_count ?? 0} />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {provider.profiles?.city && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      {provider.profiles.city}
                    </span>
                  )}
                  {provider.experience_years > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      {provider.experience_years}y experience
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MessageSquare className="h-3.5 w-3.5 text-primary" />
                    {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Category tags */}
                {categories.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {categories.map((cat: any) => (
                      <Badge key={cat.id} variant="secondary" className="text-xs">{cat.name}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: price + CTA */}
            {categories.length > 0 && (
              <div className="sm:shrink-0 sm:text-right">
                <div className="text-xs text-muted-foreground">Starting at</div>
                <div className="text-3xl font-bold">₹{Number(displayPrice).toLocaleString("en-IN")}</div>
                <div className="text-xs text-muted-foreground">/hr</div>
                <Button
                  className="mt-4 w-full sm:w-auto gap-1.5"
                  size="lg"
                  disabled={isMulti && !selectedCategoryId}
                  onClick={handleBook}
                >
                  <CalendarDays className="h-4 w-4" />
                  {isMulti && !selectedCategoryId ? "Select a service" : "Book now"}
                  {(!isMulti || selectedCategoryId) && <ChevronRight className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ── Body: 2-col on desktop ────────────────────────────────── */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Left column */}
          <div className="space-y-6">
            {/* About */}
            <div className="rounded-2xl border bg-card p-6">
              <h2 className="font-semibold">About</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {provider.bio?.trim() || "This professional hasn't added a bio yet."}
              </p>
            </div>

            {/* Reviews */}
            <div className="rounded-2xl border bg-card p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Reviews</h2>
                <span className="text-sm text-muted-foreground">{reviews.length} total</span>
              </div>

              {reviews.length === 0 ? (
                <div className="mt-6 flex flex-col items-center py-8 text-center">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-muted">
                    <Star className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="mt-3 text-sm font-medium">No reviews yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">Be the first to book and review this pro.</p>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {reviews.map((r) => <ReviewCard key={r.id} r={r} />)}
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <aside className="space-y-5">
            {/* Services */}
            <div className="rounded-2xl border bg-card p-5">
              <h3 className="font-semibold">Services & Pricing</h3>
              {isMulti && (
                <p className="mt-1 text-xs text-muted-foreground">Tap a service to select it for booking</p>
              )}
              {categories.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No services listed yet.</p>
              ) : (
                <ul className="mt-4 divide-y">
                  {categories.map((cat: any) => {
                    const isSelected = isMulti && selectedCategoryId === cat.id;
                    return (
                      <li
                        key={cat.id}
                        onClick={() => isMulti && setSelectedCategoryId(cat.id)}
                        role={isMulti ? "button" : undefined}
                        tabIndex={isMulti ? 0 : undefined}
                        onKeyDown={(e) => isMulti && (e.key === "Enter" || e.key === " ") && setSelectedCategoryId(cat.id)}
                        className={cn(
                          "flex items-center justify-between py-3 text-sm",
                          isMulti && "cursor-pointer rounded-lg px-2 transition-colors hover:bg-muted/60",
                          isSelected && "bg-primary/8 ring-1 ring-inset ring-primary/30 rounded-lg px-2",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {isSelected && <BadgeCheck className="h-3.5 w-3.5 text-primary" />}
                          <span className={isSelected ? "font-medium text-primary" : ""}>{cat.name}</span>
                        </div>
                        <span className="font-semibold">₹{Number(cat.price).toLocaleString("en-IN")}/hr</span>
                      </li>
                    );
                  })}
                </ul>
              )}

              {categories.length > 0 && (
                <Button
                  className="mt-5 w-full gap-1.5"
                  disabled={isMulti && !selectedCategoryId}
                  onClick={handleBook}
                >
                  <CalendarDays className="h-4 w-4" />
                  {isMulti && !selectedCategoryId ? "Select a service above" : "Book now"}
                </Button>
              )}
            </div>

            {/* Quick stats */}
            <div className="rounded-2xl border bg-card p-5">
              <h3 className="font-semibold">Quick stats</h3>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Rating</span>
                  <span className="font-semibold">{Number(provider.avg_rating).toFixed(1)} / 5.0</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total reviews</span>
                  <span className="font-semibold">{provider.review_count ?? 0}</span>
                </div>
                {provider.experience_years > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Experience</span>
                    <span className="font-semibold">{provider.experience_years} years</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Availability</span>
                  <span className={cn("font-semibold", provider.status === "ONLINE" ? "text-emerald-600" : "text-muted-foreground")}>
                    {provider.status === "ONLINE" ? "Available now" : provider.status === "BUSY" ? "Busy" : "Offline"}
                  </span>
                </div>
                {provider.profiles?.city && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-semibold">{provider.profiles.city}</span>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
