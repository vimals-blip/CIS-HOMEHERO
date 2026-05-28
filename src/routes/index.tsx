import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles, Wrench, Zap, Hammer, PaintBucket, AirVent,
  Search, Shield, Clock, Star, ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
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
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: featured = [], isLoading: fLoading } = useQuery({
    queryKey: ["featured-providers"],
    queryFn: async (): Promise<ProviderCardData[]> => {
      const { data, error } = await supabase
        .from("providers")
        .select("id, bio, experience_years, hourly_rate, is_verified, avg_rating, review_count, profiles!inner(name, avatar_url, city)")
        .eq("is_verified", true)
        .order("avg_rating", { ascending: false })
        .limit(6);
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        id: row.id,
        name: row.profiles?.name ?? "Provider",
        avatarUrl: row.profiles?.avatar_url,
        bio: row.bio,
        hourlyRate: Number(row.hourly_rate),
        avgRating: Number(row.avg_rating) || 0,
        reviewCount: row.review_count,
        isVerified: row.is_verified,
        city: row.profiles?.city,
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

      {/* Featured providers */}
      <section className="container mx-auto px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold md:text-3xl">Top rated pros</h2>
            <p className="mt-1 text-sm text-muted-foreground">Highest rated in your city</p>
          </div>
        </div>

        {fLoading ? (
          <LoadingSpinner />
        ) : featured.length === 0 ? (
          <div className="rounded-2xl border bg-gradient-to-br from-primary/5 to-transparent p-10 text-center">
            <Star className="mx-auto h-8 w-8 text-primary" />
            <h3 className="mt-3 font-semibold">Be the first pro on HomeHero</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              No providers in your area yet. Join us and start earning.
            </p>
            <Button asChild className="mt-4">
              <Link to="/auth/signup-provider">Become a provider <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => <ProviderCard key={p.id} p={p} />)}
          </div>
        )}
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
