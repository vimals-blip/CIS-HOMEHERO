import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles, Wrench, Zap, Hammer, PaintBucket, AirVent,
  Search, Shield, Clock, Star, ArrowRight, BadgeCheck,
  Users, ThumbsUp, Quote, Phone, Calendar, Award,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { ProviderCard, type ProviderCardData } from "@/components/provider/ProviderCard";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HomeHero — Book trusted home services" },
      { name: "description", content: "Verified cleaners, plumbers, electricians, carpenters and more, at your doorstep in under 60 minutes." },
    ],
  }),
  component: Home,
});

const ICONS: Record<string, LucideIcon> = {
  Sparkles, Wrench, Zap, Hammer, PaintBucket, AirVent,
};

const CITIES = ["Bengaluru", "Mumbai", "Delhi", "Hyderabad", "Chennai", "Pune"];

function Home() {
  const [city, setCity] = useState("Bengaluru");
  const [q, setQ] = useState("");

  const { data: categories = [], isLoading: catLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      return await apiFetch('/categories');
    },
  });

  const { data: featured = [], isLoading: fLoading } = useQuery({
    queryKey: ["featured-providers"],
    queryFn: async (): Promise<ProviderCardData[]> => {
      const data = await apiFetch('/providers?verified=true&limit=6');
      return (data ?? []).map((row: any) => ({
        id: row.id,
        name: row.name ?? "Provider",
        avatarUrl: row.avatar_url,
        bio: row.bio,
        hourlyRate: Number(row.hourly_rate),
        avgRating: Number(row.avg_rating) || 0,
        reviewCount: row.review_count,
        isVerified: row.is_verified,
        city: row.city,
        experienceYears: row.experience_years,
      }));
    },
  });

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-accent via-accent to-[oklch(0.28_0.06_270)] text-accent-foreground">
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-primary-glow/20 blur-3xl" />

        <div className="container relative mx-auto px-4 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary-glow" />
              15,000+ verified professionals
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-tight md:text-6xl">
              Trusted home services,{" "}
              <span className="bg-gradient-to-r from-primary-glow to-primary bg-clip-text text-transparent">
                at your doorstep
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-white/70 md:text-lg">
              Book background-verified professionals in 60 seconds. Cleaning, plumbing, electrical, and more — done right, guaranteed.
            </p>

            <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur sm:flex-row">
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="rounded-xl bg-white/10 px-4 py-3 text-sm outline-none ring-0 focus:bg-white/15"
              >
                {CITIES.map((c) => <option key={c} value={c} className="text-foreground">{c}</option>)}
              </select>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="What do you need? e.g. AC repair"
                  className="h-12 border-0 bg-white/10 pl-10 text-white placeholder:text-white/50 focus-visible:ring-primary-glow"
                />
              </div>
              <Button size="lg" className="h-12 px-6">Search</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold md:text-3xl">Popular services</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pick a category to see available pros</p>
          </div>
        </div>

        {catLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((c: any) => {
              const Icon = ICONS[c.icon_name] ?? Sparkles;
              return (
                <Link
                  key={c.id}
                  to="/book/$categoryId"
                  params={{ categoryId: c.id }}
                  className="group flex flex-col items-center gap-3 rounded-2xl border bg-card p-6 text-center transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
                >
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-xs text-muted-foreground">from ₹{c.base_price}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="border-y bg-muted/30">
        <div className="container mx-auto px-4 py-16">
          <h2 className="text-center text-2xl font-bold md:text-3xl">How HomeHero works</h2>
          <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-3">
            {[
              { icon: Search, title: "Pick a service", desc: "Choose from 30+ home services" },
              { icon: Clock, title: "Book a slot", desc: "Select your preferred date and time" },
              { icon: Shield, title: "Relax", desc: "A verified pro arrives at your door" },
            ].map((s) => (
              <div key={s.title} className="rounded-2xl border bg-card p-6 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-card">
        <div className="container mx-auto grid grid-cols-2 gap-6 px-4 py-10 md:grid-cols-4">
          {[
            { icon: Users, label: "Happy customers", value: "120K+" },
            { icon: BadgeCheck, label: "Verified pros", value: "15,000+" },
            { icon: ThumbsUp, label: "Avg. rating", value: "4.8 / 5" },
            { icon: Award, label: "Cities live", value: "22" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <s.icon className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured providers */}
      <section className="container mx-auto px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold md:text-3xl">Top rated pros</h2>
            <p className="mt-1 text-sm text-muted-foreground">Highest rated in {city}</p>
          </div>
        </div>

        {fLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(featured.length > 0 ? featured : DEMO_PROS).map((p) => (
              <ProviderCard key={p.id} p={p} />
            ))}
          </div>
        )}

        {featured.length === 0 && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Showing sample pros — real pros will appear here as they join.
          </p>
        )}
      </section>

      {/* Why HomeHero */}
      <section className="border-y bg-muted/30">
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold md:text-3xl">Why HomeHero</h2>
            <p className="mt-2 text-sm text-muted-foreground">Standards that make every booking effortless</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { icon: BadgeCheck, title: "Background verified", desc: "ID, address & skill checks before any pro joins our platform." },
              { icon: Shield, title: "Service guarantee", desc: "Not happy? We'll re-do the job or refund — no questions asked." },
              { icon: Phone, title: "24/7 support", desc: "Real humans available round the clock on chat and call." },
              { icon: Calendar, title: "Flexible slots", desc: "Same-day, weekends, evenings — book what fits your day." },
              { icon: Star, title: "Trained pros", desc: "Hands-on training and continuous quality monitoring." },
              { icon: ThumbsUp, title: "Transparent pricing", desc: "Upfront prices, no hidden charges or surprise add-ons." },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border bg-card p-6">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold md:text-3xl">Loved by customers</h2>
          <p className="mt-2 text-sm text-muted-foreground">Real reviews from real bookings</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="rounded-2xl border bg-card p-6">
              <Quote className="h-6 w-6 text-primary/40" />
              <p className="mt-3 text-sm leading-relaxed">{t.quote}</p>
              <div className="mt-5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA strip */}
      <section className="bg-accent text-accent-foreground">
        <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-4 py-12 md:flex-row">
          <div>
            <h3 className="text-xl font-semibold md:text-2xl">Are you a service professional?</h3>
            <p className="text-sm text-white/70">Get bookings, grow your income, and build trust.</p>
          </div>
          <Button asChild size="lg" variant="secondary">
            <Link to="/auth/signup-provider">Start earning <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

const DEMO_PROS: ProviderCardData[] = [
  { id: "demo-1", name: "Rahul Sharma", bio: "Expert AC technician with 8+ years experience. Quick diagnosis and honest pricing.", hourlyRate: 499, avgRating: 4.9, reviewCount: 312, isVerified: true, city: "Bengaluru", experienceYears: 8 },
  { id: "demo-2", name: "Priya Patel", bio: "Deep cleaning specialist. Eco-friendly products, attention to every corner.", hourlyRate: 299, avgRating: 4.8, reviewCount: 268, isVerified: true, city: "Bengaluru", experienceYears: 5 },
  { id: "demo-3", name: "Anil Verma", bio: "Licensed electrician handling wiring, fittings, and emergency repairs.", hourlyRate: 449, avgRating: 4.9, reviewCount: 421, isVerified: true, city: "Bengaluru", experienceYears: 12 },
  { id: "demo-4", name: "Sunita Reddy", bio: "Master plumber. Leaks, installations, and full bathroom fits.", hourlyRate: 399, avgRating: 4.7, reviewCount: 189, isVerified: true, city: "Bengaluru", experienceYears: 6 },
  { id: "demo-5", name: "Vikram Singh", bio: "Carpenter & furniture restoration. Custom builds and on-site repairs.", hourlyRate: 499, avgRating: 4.8, reviewCount: 156, isVerified: true, city: "Bengaluru", experienceYears: 10 },
  { id: "demo-6", name: "Meera Iyer", bio: "Interior painter — clean lines, premium finishes, on-time delivery.", hourlyRate: 1999, avgRating: 4.9, reviewCount: 94, isVerified: true, city: "Bengaluru", experienceYears: 7 },
];

const TESTIMONIALS = [
  { name: "Aditi M.", role: "Booked deep cleaning", quote: "Took 2 minutes to book and the team showed up early. House looks brand new." },
  { name: "Karthik R.", role: "Booked AC repair", quote: "Honest diagnosis, fair price, fixed in under an hour. Easily my go-to now." },
  { name: "Neha S.", role: "Booked electrician", quote: "Loved the transparent pricing and the verified badge. Felt safe inviting them home." },
];
