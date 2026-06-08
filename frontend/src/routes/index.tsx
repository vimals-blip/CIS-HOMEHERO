import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Clock, ShieldCheck, BadgeCheck, Star, ArrowRight, Quote,
  Sparkles, Users, Heart, Zap, ChevronDown, Download, MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { serviceIcon } from "@/lib/icons";
import { EmptyState } from "@/components/shared/EmptyState";
import { BannerSlider, type Slide } from "@/components/home/BannerSlider";
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

const CITIES = ["Bengaluru", "Mumbai", "Delhi", "Hyderabad", "Pune", "Gurugram", "Noida", "Thane", "Chennai", "Kolkata", "Ahmedabad", "Jaipur"];

const FAQS = [
  { q: "How quickly does an expert arrive?", a: "In most areas, a verified expert arrives within 10 minutes of booking confirmation. Scheduled bookings guarantee your chosen time slot." },
  { q: "Are the experts background-verified?", a: "Yes. Every expert goes through Aadhaar and PAN verification before joining. We also run continuous quality checks and review every booking." },
  { q: "What if I'm not happy with the service?", a: "Report the issue within 24 hours through the app. We'll investigate and, if warranted, issue a full refund or send another expert at no extra cost — no questions asked." },
  { q: "Can I book a recurring service?", a: "Absolutely. After a booking is completed, you can rebook the same expert and set a recurring schedule (daily, weekly, or custom) directly from the app." },
  { q: "How do I pay?", a: "We accept all major cards, UPI (GPay, PhonePe, Paytm), net banking, and HomeHero Wallet credits. Payment is collected at booking; no cash needed." },
  { q: "What happens if I need to cancel?", a: "Cancel free of charge up to 30 minutes before your scheduled start time. Cancellations closer to the start time may incur a small fee. See our Cancellation & Refund Policy for details." },
  { q: "How do I become a HomeHero expert?", a: "Click 'Become an expert', complete your profile, upload your Aadhaar and PAN, and our team will verify and onboard you — usually within 48 hours." },
];

// Built-in showcase slides — used when no CMS banners are configured.
const HERO_SLIDES: Slide[] = [
  {
    image_url: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1400&q=75",
    title: "Sparkling clean homes, on demand",
    subtitle: "Trained, verified experts at your door in ~10 minutes.",
  },
  {
    image_url: "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1400&q=75",
    title: "Kitchen & dishwashing help",
    subtitle: "Hand over the mess — book by the hour, instant or scheduled.",
  },
  {
    image_url: "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=1400&q=75",
    title: "Laundry, folded and sorted",
    subtitle: "Reliable help for the chores you'd rather skip.",
  },
  {
    image_url: "https://images.unsplash.com/photo-1466637574441-749b8f19452f?auto=format&fit=crop&w=1400&q=75",
    title: "Home-style cooking assistance",
    subtitle: "Fresh meals prepped by trained kitchen experts.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium hover:text-primary transition-colors"
      >
        {q}
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
      </button>
      <div className={cn("overflow-hidden transition-all duration-300", open ? "max-h-40 pb-4" : "max-h-0")}>
        <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

function Home() {
  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: () => apiFetch("/services"),
  });

  const { data: banners = [] } = useQuery({
    queryKey: ["banners"],
    queryFn: () => apiFetch("/cms/banners"),
  });
  // Use CMS banners when configured; otherwise the built-in showcase slides.
  const slides: Slide[] = (banners as any[]).length > 0
    ? (banners as any[]).map((b) => ({
        image_url: b.image_url,
        title: b.title,
        subtitle: b.subtitle,
        link_url: b.link_url,
      }))
    : HERO_SLIDES;

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

          {/* Hero slider */}
          <div className="mx-auto mt-12 max-w-4xl">
            <BannerSlider slides={slides} />
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="container mx-auto scroll-mt-20 px-4 py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold md:text-3xl">What do you need help with?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pick a service and book by the hour</p>
          </div>
          {!isLoading && (services as any[]).length > 0 && (
            <span className="hidden shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary sm:inline-block">
              {(services as any[]).length} services
            </span>
          )}
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
          <div className="text-center">
            <h2 className="text-2xl font-bold md:text-3xl">How it works</h2>
            <p className="mt-2 text-sm text-muted-foreground">Help at your doorstep in three simple steps</p>
          </div>
          <div className="relative mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-3">
            {/* connecting line on desktop */}
            <div className="absolute left-0 right-0 top-9 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block" />
            {[
              { icon: Sparkles, title: "Pick a service", desc: "Choose what you need help with" },
              { icon: Clock, title: "Choose duration", desc: "Book instantly or schedule for later" },
              { icon: ShieldCheck, title: "Expert arrives", desc: "Track your verified expert in real time" },
            ].map((s, i) => (
              <div key={s.title} className="relative rounded-2xl border bg-card p-6 text-center transition-shadow hover:shadow-md">
                <div className="relative mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/30">
                  <s.icon className="h-5 w-5" />
                  <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-white text-xs font-bold text-primary ring-2 ring-primary/20">{i + 1}</span>
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

      {/* FAQ */}
      <section className="container mx-auto max-w-3xl px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold md:text-3xl">Frequently asked questions</h2>
          <p className="mt-2 text-sm text-muted-foreground">Everything you need to know about HomeHero</p>
        </div>
        <div className="rounded-2xl border bg-card px-6">
          {FAQS.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
        </div>
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Still have questions?{" "}
          <Link to="/support" className="font-medium text-primary hover:underline">
            <MessageCircle className="inline h-3.5 w-3.5 mr-0.5" /> Contact support
          </Link>
        </div>
      </section>

      {/* App download strip */}
      <section className="border-y bg-muted/30">
        <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-4 py-12 md:flex-row">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-3">
              <Download className="h-3.5 w-3.5" /> Available now
            </span>
            <h3 className="text-xl font-bold md:text-2xl">Book in seconds from the app</h3>
            <p className="text-sm text-muted-foreground mt-1">Live Expert tracking, one-tap rebook, and exclusive app-only offers.</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <a href="#" className="flex items-center gap-2 rounded-xl border bg-card px-5 py-3 text-sm font-semibold transition-colors hover:border-primary/40 hover:bg-card">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" /></svg>
              App Store
            </a>
            <a href="#" className="flex items-center gap-2 rounded-xl border bg-card px-5 py-3 text-sm font-semibold transition-colors hover:border-primary/40 hover:bg-card">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M3.18 23.76c.35.19.75.2 1.12.03l11.11-6.38-2.54-2.54-9.69 8.89zm14.6-8.41L5.57 8.73 3.18.24C2.8.07 2.36.12 2.02.37L13.84 12l3.94 3.35zm2.4-5.16L17.14 8.5 13.84 12l3.3 3.5 2.93-1.68c.83-.47.83-1.24.11-1.63zM4.29.21L3.18.24 2.02.37 2 .4l1.18 1.14L5.57 8.73 15.26 3.6 4.29.21z" /></svg>
              Google Play
            </a>
          </div>
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
