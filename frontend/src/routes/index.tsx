import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Clock, ShieldCheck, BadgeCheck, Star, ArrowRight, Quote,
  Sparkles, Users, Heart, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { serviceIcon } from "@/lib/icons";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HomeHero — Trained household help at your door in minutes" },
      { name: "description", content: "Book a trained, verified expert for cleaning, dishwashing, laundry and cooking. Arrives in minutes — instant or scheduled." },
    ],
  }),
  component: Home,
});

const CITIES = ["Bengaluru", "Mumbai", "Delhi", "Hyderabad", "Pune", "Gurugram", "Noida", "Thane"];

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=400&q=70",
  "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=400&q=70",
  "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=400&q=70",
];

function Home() {
  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: () => apiFetch("/services"),
  });

  const { data: banners = [] } = useQuery({
    queryKey: ["banners"],
    queryFn: () => apiFetch("/cms/banners"),
  });
  // Use CMS banner images when configured; otherwise the built-in showcase.
  const heroImages = (banners as any[]).length > 0
    ? (banners as any[]).map((b) => b.image_url)
    : HERO_IMAGES;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-accent via-accent to-[oklch(0.28_0.06_270)] text-accent-foreground">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-primary-glow/20 blur-3xl" />
        <div className="container relative mx-auto px-4 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium backdrop-blur">
              <Zap className="h-3.5 w-3.5 text-primary-glow" /> Experts arrive in ~10 minutes
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-tight md:text-6xl">
              Household help,{" "}
              <span className="bg-gradient-to-r from-primary-glow to-primary bg-clip-text text-transparent">in minutes</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-white/70 md:text-lg">
              Book a trained, background-verified expert for cleaning, dishwashing, laundry and more.
              Pick a service, choose how long you need help, and relax.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="h-12 px-6">
                <a href="#services">Book a service <ArrowRight className="ml-1 h-4 w-4" /></a>
              </Button>
              <Button asChild size="lg" variant="secondary" className="h-12 px-6">
                <Link to="/auth/signup-expert">Become an expert</Link>
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/60">
              <span className="inline-flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-primary-glow" /> Aadhaar & PAN verified</span>
              <span className="inline-flex items-center gap-1.5"><Heart className="h-4 w-4 text-primary-glow" /> 100% female workforce</span>
              <span className="inline-flex items-center gap-1.5"><Star className="h-4 w-4 text-primary-glow" /> 4.8★ from 74,000+ reviews</span>
            </div>
          </div>

          {/* Hero image strip */}
          <div className="mx-auto mt-12 grid max-w-4xl grid-cols-3 gap-3 sm:gap-4">
            {heroImages.slice(0, 3).map((src: string, i: number) => (
              <div key={i} className={cn("overflow-hidden rounded-2xl border border-white/10 shadow-xl", i === 1 && "mt-6")}>
                <img src={src} alt="" loading="lazy" className="h-32 w-full object-cover sm:h-44" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="container mx-auto scroll-mt-20 px-4 py-16">
        <div className="mb-8">
          <h2 className="text-2xl font-bold md:text-3xl">What do you need help with?</h2>
          <p className="mt-1 text-sm text-muted-foreground">Pick a service and book by the hour</p>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border bg-card animate-pulse">
                <div className="h-36 w-full bg-muted" />
                <div className="flex items-center justify-between gap-2 p-4">
                  <div className="h-3 w-24 rounded bg-muted" />
                  <div className="h-4 w-12 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : (services as any[]).length === 0 ? (
          <EmptyState icon={Sparkles} title="No services available yet"
            description="We're adding services in your area. Please check back soon." />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {(services as any[]).map((s) => {
              const Icon = serviceIcon(s.icon_name);
              return (
                <Link key={s.id} to="/book/$serviceId" params={{ serviceId: s.id }}
                  className="group hover-lift overflow-hidden rounded-2xl border bg-card hover:border-primary/40">
                  <div className="relative h-36 overflow-hidden bg-muted">
                    {s.image_url && <img src={s.image_url} alt={s.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                    <div className="absolute bottom-2.5 left-3 flex items-center gap-2 text-white">
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/20 backdrop-blur"><Icon className="h-4 w-4" /></span>
                      <span className="font-semibold drop-shadow">{s.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 p-4">
                    <span className="truncate text-xs text-muted-foreground">{s.tagline}</span>
                    <span className="shrink-0 text-sm font-bold text-primary">₹{s.rate_per_hour}<span className="text-xs font-normal text-muted-foreground">/hr</span></span>
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
          <h2 className="text-center text-2xl font-bold md:text-3xl">How it works</h2>
          <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-3">
            {[
              { icon: Sparkles, title: "Pick a service", desc: "Choose what you need help with" },
              { icon: Clock, title: "Choose duration", desc: "Book instantly or schedule for later" },
              { icon: ShieldCheck, title: "Expert arrives", desc: "Track your verified expert in real time" },
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
      <section className="border-b bg-card">
        <div className="container mx-auto grid grid-cols-2 gap-6 px-4 py-10 md:grid-cols-4">
          {[
            { icon: Users, label: "Bookings completed", value: "62L+" },
            { icon: BadgeCheck, label: "Verified experts", value: "15,000+" },
            { icon: Star, label: "Avg. rating", value: "4.8 / 5" },
            { icon: Clock, label: "Avg. arrival", value: "~10 min" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><s.icon className="h-6 w-6" /></div>
              <div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why us */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold md:text-3xl">Trained, trusted, on time</h2>
          <p className="mt-2 text-sm text-muted-foreground">Every expert is vetted so you can invite them home with confidence</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { icon: BadgeCheck, title: "Background verified", desc: "Aadhaar & PAN checks before any expert joins." },
            { icon: Heart, title: "All-female workforce", desc: "Trained, empowered and trusted by families." },
            { icon: ShieldCheck, title: "Service guarantee", desc: "Not happy? We'll make it right — no questions asked." },
            { icon: Clock, title: "Instant or scheduled", desc: "Get help now or book a slot that fits your day." },
            { icon: Star, title: "Professionally trained", desc: "Hands-on training and continuous quality checks." },
            { icon: Zap, title: "Transparent pricing", desc: "Simple hourly rates, no hidden charges." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-6">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><f.icon className="h-5 w-5" /></div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cities */}
      <section className="border-y bg-muted/30">
        <div className="container mx-auto px-4 py-12 text-center">
          <h2 className="text-xl font-bold md:text-2xl">Now serving across India</h2>
          <div className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-2">
            {CITIES.map((c) => (
              <span key={c} className="rounded-full border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground">{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold md:text-3xl">Loved by families</h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { name: "Aditi M.", role: "Booked home cleaning", quote: "Booked in a minute and the expert arrived in ten. My home has never looked better." },
            { name: "Karthik R.", role: "Booked dishwashing", quote: "Reliable, fast and friendly. The live tracking is genuinely useful." },
            { name: "Neha S.", role: "Booked cooking help", quote: "Loved the verified badge and transparent pricing. Felt completely safe." },
          ].map((t) => (
            <div key={t.name} className="rounded-2xl border bg-card p-6">
              <Quote className="h-6 w-6 text-primary/40" />
              <p className="mt-3 text-sm leading-relaxed">{t.quote}</p>
              <div className="mt-5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-accent text-accent-foreground">
        <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-4 py-12 md:flex-row">
          <div>
            <h3 className="text-xl font-semibold md:text-2xl">Want to earn as a home expert?</h3>
            <p className="text-sm text-white/70">Flexible hours, steady bookings, and a community that supports you.</p>
          </div>
          <Button asChild size="lg" variant="secondary">
            <Link to="/auth/signup-expert">Start earning <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
