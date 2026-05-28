import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Star, MapPin, Briefcase, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { VerifiedBadge } from "@/components/provider/VerifiedBadge";
import { ReviewCard, type ReviewData } from "@/components/provider/ReviewCard";
import { EmptyState } from "@/components/shared/EmptyState";

export const Route = createFileRoute("/providers/$providerId")({
  head: () => ({ meta: [{ title: "Provider — HomeHero" }] }),
  component: ProviderProfile,
});

function ProviderProfile() {
  const { providerId } = Route.useParams();

  const { data: provider, isLoading } = useQuery({
    queryKey: ["provider", providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("id, bio, experience_years, hourly_rate, is_verified, avg_rating, review_count, profiles!inner(name, avatar_url, city), provider_categories(custom_price, categories(id, name))")
        .eq("id", providerId)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews", providerId],
    queryFn: async (): Promise<ReviewData[]> => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, comment, provider_reply, created_at, profiles!reviews_customer_id_fkey(name)")
        .eq("provider_id", providerId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        providerReply: r.provider_reply,
        createdAt: r.created_at,
        customerName: r.profiles?.name ?? "Customer",
      }));
    },
  });

  if (isLoading) return <LoadingSpinner className="min-h-[60vh]" />;
  if (!provider) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <EmptyState title="Provider not found" />
      </div>
    );
  }

  const firstCat = provider.provider_categories?.[0]?.categories?.id;

  return (
    <div>
      {/* Cover */}
      <div className="relative h-40 bg-gradient-to-br from-accent via-accent to-primary/40 md:h-56">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,oklch(0.62_0.13_165/0.25),transparent_60%)]" />
        <div className="container mx-auto px-4 pt-4">
          <Button asChild variant="ghost" size="sm" className="text-white/80 hover:bg-white/10 hover:text-white">
            <Link to="/"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link>
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4">
        <div className="-mt-14 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-4">
            <div className="grid h-28 w-28 place-items-center rounded-3xl border-4 border-background bg-gradient-to-br from-primary to-primary-glow text-3xl font-bold text-primary-foreground shadow-lg">
              {provider.profiles?.avatar_url ? (
                <img src={provider.profiles.avatar_url} alt={provider.profiles.name} className="h-full w-full rounded-2xl object-cover" />
              ) : (
                provider.profiles?.name?.[0]?.toUpperCase() ?? "P"
              )}
            </div>
            <div className="pb-2">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold md:text-3xl">{provider.profiles?.name}</h1>
                {provider.is_verified && <VerifiedBadge />}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Star className="h-4 w-4 fill-warning text-warning" />
                  <span className="font-semibold text-foreground">{Number(provider.avg_rating).toFixed(1)}</span>
                  <span>({provider.review_count} reviews)</span>
                </span>
                {provider.profiles?.city && (
                  <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {provider.profiles.city}</span>
                )}
                <span className="inline-flex items-center gap-1"><Briefcase className="h-4 w-4" /> {provider.experience_years}y experience</span>
              </div>
            </div>
          </div>
          {firstCat && (
            <Button asChild size="lg">
              <Link to="/book/$categoryId" params={{ categoryId: firstCat }}>
                Book now · ₹{provider.hourly_rate}/hr
              </Link>
            </Button>
          )}
        </div>

        <div className="mt-10 grid gap-8 md:grid-cols-[1fr_320px]">
          <div className="space-y-8">
            <section>
              <h2 className="text-lg font-semibold">About</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {provider.bio ?? "This pro hasn't added a bio yet."}
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">Reviews ({reviews.length})</h2>
              {reviews.length === 0 ? (
                <div className="mt-3"><EmptyState title="No reviews yet" description="Be the first to book this pro." /></div>
              ) : (
                <div className="mt-4 space-y-4">
                  {reviews.map((r) => <ReviewCard key={r.id} r={r} />)}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border bg-card p-5">
              <h3 className="font-semibold">Services offered</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {provider.provider_categories?.length ? provider.provider_categories.map((pc: any) => (
                  <li key={pc.categories?.id} className="flex items-center justify-between">
                    <span>{pc.categories?.name}</span>
                    <span className="font-medium">₹{pc.custom_price ?? provider.hourly_rate}</span>
                  </li>
                )) : <li className="text-muted-foreground">No services added</li>}
              </ul>
            </div>
          </aside>
        </div>
        <div className="h-16" />
      </div>
    </div>
  );
}
